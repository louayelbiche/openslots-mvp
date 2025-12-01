"""
Service Menu Scraper

Scrapes service menus from provider websites using Playwright.
Extracts service names, prices, and durations.
"""

import asyncio
import json
import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urljoin, urlparse

from ..schemas import ScrapedService, ServiceCategory
from ..normalizers.service import categorize_service, ServiceNormalizer


@dataclass
class ExtractedService:
    """Raw extracted service data before normalization."""
    name: str
    price_text: Optional[str] = None
    duration_text: Optional[str] = None
    description: Optional[str] = None


@dataclass
class MenuScrapeResult:
    """Result of scraping a provider's service menu."""
    success: bool
    services: list[ScrapedService] = field(default_factory=list)
    menu_url: Optional[str] = None
    error: Optional[str] = None
    raw_text: Optional[str] = None  # For LLM fallback


class ServiceMenuScraper:
    """
    Scrapes service menus from provider websites.

    This scraper is designed to be called from the main conversation
    where Playwright MCP is available. It provides the logic for
    finding menu pages and extracting service data.
    """

    def __init__(self):
        self.normalizer = ServiceNormalizer()
        # Common paths where service menus are found
        self.menu_paths = [
            "/services", "/menu", "/pricing", "/prices",
            "/our-services", "/treatments", "/service-menu",
            "/massage-services", "/spa-services", "/spa-menu",
            "/book", "/booking", "/appointments",
        ]
        # Keywords that indicate a menu/services page
        self.menu_keywords = [
            "services", "menu", "pricing", "treatments",
            "massage", "spa", "book now", "our services",
        ]

    def find_menu_links(self, page_text: str, base_url: str) -> list[str]:
        """
        Find potential menu page links from page content.

        Args:
            page_text: HTML or text content of the page
            base_url: Base URL for resolving relative links

        Returns:
            List of potential menu page URLs
        """
        links = []

        # Look for href attributes
        href_pattern = r'href=["\']([^"\']+)["\']'
        matches = re.findall(href_pattern, page_text, re.IGNORECASE)

        for href in matches:
            href_lower = href.lower()
            # Check if link contains menu-related keywords
            if any(kw in href_lower for kw in self.menu_keywords):
                full_url = urljoin(base_url, href)
                if full_url not in links:
                    links.append(full_url)

        # Also try standard menu paths
        parsed = urlparse(base_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        for path in self.menu_paths:
            full_url = base + path
            if full_url not in links:
                links.append(full_url)

        return links[:10]  # Limit to 10 URLs

    def extract_services_from_text(self, text: str) -> list[ExtractedService]:
        """
        Extract service information from page text.

        This uses regex patterns to find service-like content.
        For complex menus, use LLM parsing instead.

        Args:
            text: Page text content

        Returns:
            List of extracted services
        """
        services = []

        # Common patterns for service listings
        # Pattern: "Service Name - $XX" or "Service Name ... $XX"
        price_pattern = r'([A-Za-z][A-Za-z\s&\'-]+?)[\s\.\-–—]+\$(\d+(?:\.\d{2})?)'

        matches = re.findall(price_pattern, text)
        for name, price in matches:
            name = name.strip()
            if len(name) > 3 and len(name) < 100:  # Reasonable service name length
                services.append(ExtractedService(
                    name=name,
                    price_text=f"${price}",
                ))

        # Pattern: "XX min/minutes Service Name"
        duration_pattern = r'(\d+)\s*(?:min|minutes?)\s+([A-Za-z][A-Za-z\s&\'-]+?)(?:\s*[\-–—]\s*\$(\d+))?'

        matches = re.findall(duration_pattern, text, re.IGNORECASE)
        for duration, name, price in matches:
            name = name.strip()
            if len(name) > 3 and len(name) < 100:
                svc = ExtractedService(
                    name=name,
                    duration_text=f"{duration} min",
                )
                if price:
                    svc.price_text = f"${price}"
                # Don't add duplicates
                if not any(s.name.lower() == name.lower() for s in services):
                    services.append(svc)

        return services

    def normalize_services(
        self,
        extracted: list[ExtractedService],
        default_category: ServiceCategory = ServiceCategory.MASSAGE,
    ) -> list[ScrapedService]:
        """
        Normalize extracted services into ScrapedService objects.

        Args:
            extracted: Raw extracted services
            default_category: Default category if none detected

        Returns:
            List of normalized ScrapedService objects
        """
        services = []

        for ext in extracted:
            # Determine category
            category = categorize_service(ext.name, ext.description)

            # Parse price
            price_cents = None
            if ext.price_text:
                price_cents = self.normalizer.parse_price(ext.price_text)

            # Parse duration
            duration_min = None
            if ext.duration_text:
                duration_min = self.normalizer.parse_duration(ext.duration_text)

            service = ScrapedService(
                category=category,
                name=ext.name,
                description=ext.description,
                base_price_cents=price_cents,
                duration_min=duration_min,
            )

            services.append(service)

        return services

    def get_scrape_instructions(self, website_url: str) -> dict:
        """
        Get instructions for scraping a website with Playwright.

        Returns a dict that can be used to guide Playwright MCP calls.

        Args:
            website_url: Provider website URL

        Returns:
            Dict with scraping instructions
        """
        return {
            "start_url": website_url,
            "menu_paths": self.menu_paths,
            "menu_keywords": self.menu_keywords,
            "steps": [
                "1. Navigate to start_url",
                "2. Take a snapshot to find menu/services links",
                "3. Click on menu/services link if found",
                "4. Take snapshot of menu page",
                "5. Extract all visible service names, prices, durations",
                "6. Return extracted data for parsing",
            ],
        }


def parse_services_with_llm_prompt(page_text: str, provider_name: str) -> str:
    """
    Generate a prompt for LLM to parse service menu from page text.

    Args:
        page_text: Raw page text content
        provider_name: Name of the provider

    Returns:
        Prompt string for LLM
    """
    return f"""Extract massage/spa services from this webpage content for "{provider_name}".

For each service found, extract:
- name: Service name (e.g., "Swedish Massage", "Deep Tissue 60min")
- price: Price in dollars (e.g., 80, 120) - just the number
- duration: Duration in minutes (e.g., 60, 90) - just the number
- category: One of MASSAGE, ACUPUNCTURE, NAILS, HAIR, FACIALS_AND_SKIN, LASHES_AND_BROWS

Return JSON array only, no explanation:
[{{"name": "...", "price": 80, "duration": 60, "category": "MASSAGE"}}]

If no services found, return: []

Page content:
{page_text[:8000]}"""


async def scrape_services_for_providers(
    providers: list[dict],
    max_providers: int = 10,
) -> list[dict]:
    """
    Scrape services for a list of providers.

    NOTE: This function provides the framework. Actual Playwright
    calls should be made from the main conversation where MCP is available.

    Args:
        providers: List of provider dicts with websiteUrl
        max_providers: Maximum providers to process

    Returns:
        Updated providers list with scraped services
    """
    scraper = ServiceMenuScraper()

    # Filter providers with websites that need service scraping
    to_scrape = []
    for p in providers:
        if not p.get("websiteUrl"):
            continue
        # Check if services are just placeholder
        services = p.get("services", [])
        if not services or all(s.get("name") == "Massage" for s in services):
            to_scrape.append(p)

    print(f"Found {len(to_scrape)} providers needing service scraping")
    print(f"Processing first {min(len(to_scrape), max_providers)}")

    # Return instructions for manual Playwright scraping
    for p in to_scrape[:max_providers]:
        instructions = scraper.get_scrape_instructions(p["websiteUrl"])
        print(f"\nProvider: {p['name']}")
        print(f"  Website: {p['websiteUrl']}")
        print(f"  Try these paths: {', '.join(instructions['menu_paths'][:5])}")

    return providers
