"""
Website Enricher

Scrapes provider websites to extract services and pricing.
Uses BeautifulSoup for static sites, falls back to basic parsing.
"""

import re
import json
import asyncio
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from datetime import datetime, timezone

import aiohttp
from bs4 import BeautifulSoup

from ..config import get_settings, RateLimiter
from ..schemas import ServiceCategory
from ..transformers.service_cleaner import clean_all_providers


@dataclass
class ExtractedService:
    """A service extracted from a website."""
    name: str
    category: str
    price_cents: Optional[int] = None
    duration_min: Optional[int] = None
    description: Optional[str] = None


@dataclass
class EnrichmentResult:
    """Result of enriching a provider."""
    provider_name: str
    website_url: str
    success: bool
    services: list[ExtractedService]
    error: Optional[str] = None
    raw_text: Optional[str] = None


# Price patterns to extract from text
PRICE_PATTERNS = [
    r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # $100 or $1,000.00
    r'(\d{2,3})\s*(?:dollars?|usd)',  # 100 dollars
    r'(?:price|cost|rate)[:\s]*\$?(\d{2,3})',  # price: $100
]

# Duration patterns
DURATION_PATTERNS = [
    r'(\d{2,3})\s*(?:min(?:ute)?s?|mins?)',  # 60 minutes, 60 min
    r'(\d+(?:\.\d+)?)\s*(?:hr|hour)s?',  # 1.5 hours
]

# Service type patterns for categorization
SERVICE_PATTERNS = {
    ServiceCategory.MASSAGE: [
        r'massage', r'bodywork', r'deep tissue', r'swedish', r'thai',
        r'hot stone', r'sports massage', r'relaxation', r'therapeutic',
        r'shiatsu', r'reflexology', r'prenatal', r'couples massage'
    ],
    ServiceCategory.ACUPUNCTURE: [
        r'acupuncture', r'chinese medicine', r'cupping', r'moxibustion'
    ],
    ServiceCategory.NAILS: [
        r'manicure', r'pedicure', r'nail', r'gel', r'acrylic', r'shellac'
    ],
    ServiceCategory.HAIR: [
        r'haircut', r'hair\s*(?:color|coloring)', r'highlights', r'balayage',
        r'blowout', r'styling', r'keratin', r'perm'
    ],
    ServiceCategory.FACIALS_AND_SKIN: [
        r'facial', r'skin\s*care', r'microdermabrasion', r'chemical peel',
        r'hydrafacial', r'dermaplaning', r'skin treatment'
    ],
    ServiceCategory.LASHES_AND_BROWS: [
        r'lash(?:es)?', r'eyelash', r'brow', r'eyebrow', r'microblading',
        r'lash extension', r'lash lift', r'brow lamination'
    ],
}


class WebsiteEnricher:
    """
    Enriches provider data by scraping their websites for services.
    """

    def __init__(self, rate_limiter: Optional[RateLimiter] = None):
        self.settings = get_settings()
        self.rate_limiter = rate_limiter or RateLimiter()
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={"User-Agent": self.settings.user_agent}
        )
        return self

    async def __aexit__(self, *args):
        if self._session:
            await self._session.close()

    async def enrich_provider(self, provider: dict) -> EnrichmentResult:
        """
        Enrich a single provider by scraping their website.

        Args:
            provider: Provider dict with at least 'name' and 'bookingUrl' or 'websiteUrl'

        Returns:
            EnrichmentResult with extracted services
        """
        name = provider.get("name", "Unknown")
        url = provider.get("bookingUrl") or provider.get("websiteUrl")

        if not url:
            return EnrichmentResult(
                provider_name=name,
                website_url="",
                success=False,
                services=[],
                error="No website URL"
            )

        try:
            # Fetch the page
            html = await self._fetch_page(url)
            if not html:
                return EnrichmentResult(
                    provider_name=name,
                    website_url=url,
                    success=False,
                    services=[],
                    error="Failed to fetch page"
                )

            # Parse and extract services
            services = self._extract_services(html, url)

            return EnrichmentResult(
                provider_name=name,
                website_url=url,
                success=True,
                services=services,
                raw_text=html[:5000] if services else None  # Keep sample for debugging
            )

        except Exception as e:
            return EnrichmentResult(
                provider_name=name,
                website_url=url,
                success=False,
                services=[],
                error=str(e)
            )

    async def enrich_file(self, input_path: Path, output_path: Optional[Path] = None) -> Path:
        """
        Enrich all providers in a scraped JSON file.

        Args:
            input_path: Path to scraped providers JSON
            output_path: Optional output path (defaults to enriched_*.json)

        Returns:
            Path to enriched output file
        """
        with open(input_path) as f:
            data = json.load(f)

        providers = data.get("providers", [])
        enriched_providers = []
        stats = {"total": len(providers), "enriched": 0, "failed": 0}

        async with self:
            for i, provider in enumerate(providers):
                print(f"  Enriching {i+1}/{len(providers)}: {provider.get('name', 'Unknown')}")

                result = await self.enrich_provider(provider)

                if result.success and result.services:
                    # Update provider with enriched services
                    provider["services"] = [
                        {
                            "name": s.name,
                            "category": s.category,
                            "durationMin": s.duration_min or 60,
                            "basePrice": s.price_cents or 10000,
                            "description": s.description,
                        }
                        for s in result.services
                    ]
                    stats["enriched"] += 1
                else:
                    stats["failed"] += 1

                enriched_providers.append(provider)

                # Small delay between requests
                await asyncio.sleep(0.5)

        # Build output
        output_data = {
            "metadata": {
                **data.get("metadata", {}),
                "enriched_at": datetime.now(timezone.utc).isoformat(),
                "enrichment_stats": stats,
            },
            "providers": enriched_providers,
        }

        # Clean services using service_cleaner (Section 5 rules)
        print("\nCleaning service names...")
        category = data.get("metadata", {}).get("category", "MASSAGE").upper()
        output_data = clean_all_providers(output_data, category=category, use_llm=True)

        # Update stats with cleaning results
        total_services = sum(len(p.get('services', [])) for p in output_data.get('providers', []))
        output_data["metadata"]["cleaning_stats"] = {
            "total_services_after_cleaning": total_services
        }
        print(f"  Services after cleaning: {total_services}")

        # Write output
        if output_path is None:
            output_path = input_path.parent / f"enriched_{input_path.name}"

        with open(output_path, "w") as f:
            json.dump(output_data, f, indent=2, default=str)

        print(f"\nEnrichment complete:")
        print(f"  Total: {stats['total']}")
        print(f"  Enriched: {stats['enriched']}")
        print(f"  Failed: {stats['failed']}")

        return output_path

    async def _fetch_page(self, url: str) -> Optional[str]:
        """Fetch a webpage."""
        if not self._session:
            return None

        try:
            # Add delay for rate limiting
            await asyncio.sleep(self.settings.default_delay_between_requests)

            async with self._session.get(url, allow_redirects=True) as response:
                if response.status == 200:
                    return await response.text()
                return None
        except Exception:
            return None

    def _extract_services(self, html: str, url: str) -> list[ExtractedService]:
        """Extract services from HTML."""
        soup = BeautifulSoup(html, "html.parser")
        services = []

        # Try structured data first (Schema.org)
        schema_services = self._extract_schema_services(soup)
        if schema_services:
            return schema_services

        # Try to find service/menu sections
        text = soup.get_text(separator="\n")
        services = self._extract_services_from_text(text)

        return services

    def _extract_schema_services(self, soup: BeautifulSoup) -> list[ExtractedService]:
        """Extract services from Schema.org JSON-LD."""
        services = []

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    for item in data:
                        services.extend(self._parse_schema_item(item))
                else:
                    services.extend(self._parse_schema_item(data))
            except (json.JSONDecodeError, TypeError):
                pass

        return services

    def _parse_schema_item(self, data: dict) -> list[ExtractedService]:
        """Parse a Schema.org item for services."""
        services = []

        if not isinstance(data, dict):
            return services

        # Check for Service type
        schema_type = data.get("@type", "")
        if schema_type in ["Service", "Product", "Offer"]:
            name = data.get("name", "")
            if name:
                price = self._extract_price_from_schema(data)
                category = self._categorize_service(name)
                services.append(ExtractedService(
                    name=name,
                    category=category.value if category else "MASSAGE",
                    price_cents=price,
                    description=data.get("description"),
                ))

        # Check for offer catalog
        offers = data.get("hasOfferCatalog", {}).get("itemListElement", [])
        for offer in offers:
            if isinstance(offer, dict):
                name = offer.get("name", "")
                if name:
                    services.append(ExtractedService(
                        name=name,
                        category=self._categorize_service(name).value if self._categorize_service(name) else "MASSAGE",
                        description=offer.get("description"),
                    ))

        return services

    def _extract_price_from_schema(self, data: dict) -> Optional[int]:
        """Extract price from Schema.org data."""
        # Check offers
        offers = data.get("offers", {})
        if isinstance(offers, dict):
            price = offers.get("price")
            if price:
                try:
                    return int(float(price) * 100)  # Convert to cents
                except (ValueError, TypeError):
                    pass
        return None

    def _extract_services_from_text(self, text: str) -> list[ExtractedService]:
        """Extract services from raw text using patterns."""
        services = []
        seen_names = set()

        # Split into lines and look for service-like patterns
        lines = text.split("\n")

        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) > 200:
                continue

            # Look for lines that might be service names
            category = self._categorize_service(line)
            if not category:
                continue

            # Avoid duplicates
            name_key = line.lower()[:50]
            if name_key in seen_names:
                continue
            seen_names.add(name_key)

            # Try to extract price from this line or nearby lines
            price = self._extract_price_from_text(line)
            if not price and i + 1 < len(lines):
                price = self._extract_price_from_text(lines[i + 1])

            # Try to extract duration
            duration = self._extract_duration_from_text(line)
            if not duration and i + 1 < len(lines):
                duration = self._extract_duration_from_text(lines[i + 1])

            # Clean up the name
            name = self._clean_service_name(line)
            if len(name) < 3 or len(name) > 100:
                continue

            services.append(ExtractedService(
                name=name,
                category=category.value,
                price_cents=price,
                duration_min=duration,
            ))

            # Limit to reasonable number of services
            if len(services) >= 20:
                break

        return services

    def _categorize_service(self, text: str) -> Optional[ServiceCategory]:
        """Determine the service category from text."""
        text_lower = text.lower()

        for category, patterns in SERVICE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return category

        return None

    def _extract_price_from_text(self, text: str) -> Optional[int]:
        """Extract price in cents from text."""
        for pattern in PRICE_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    price_str = match.group(1).replace(",", "")
                    price = float(price_str)
                    return int(price * 100)
                except (ValueError, TypeError):
                    pass
        return None

    def _extract_duration_from_text(self, text: str) -> Optional[int]:
        """Extract duration in minutes from text."""
        for pattern in DURATION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    value = float(match.group(1))
                    # Check if it's hours
                    if "hour" in text.lower() or "hr" in text.lower():
                        return int(value * 60)
                    return int(value)
                except (ValueError, TypeError):
                    pass
        return None

    def _clean_service_name(self, text: str) -> str:
        """Clean up a service name."""
        # Remove prices
        for pattern in PRICE_PATTERNS:
            text = re.sub(pattern, "", text)

        # Remove durations
        for pattern in DURATION_PATTERNS:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)

        # Clean whitespace
        text = " ".join(text.split())

        # Remove trailing punctuation
        text = text.strip(".,;:-–—")

        return text.strip()


async def enrich_latest(city: str = "new_york_city", category: str = "massage") -> Path:
    """
    Enrich the latest scraped file for a city/category.

    Args:
        city: City name (lowercase, underscores)
        category: Category name (lowercase)

    Returns:
        Path to the enriched file
    """
    providers_dir = Path(__file__).parent.parent / "output" / "providers"

    # Find latest file
    pattern = f"{city}_{category}_*.json"
    files = sorted(providers_dir.glob(pattern), reverse=True)

    if not files:
        raise FileNotFoundError(f"No files found matching {pattern}")

    latest = files[0]
    enricher = WebsiteEnricher()
    return await enricher.enrich_file(latest)


if __name__ == "__main__":
    import sys

    async def main():
        if len(sys.argv) > 1:
            input_path = Path(sys.argv[1])
            enricher = WebsiteEnricher()
            output_path = await enricher.enrich_file(input_path)
            print(f"Enriched: {input_path} -> {output_path}")
        else:
            output_path = await enrich_latest("new_york_city", "massage")
            print(f"Enriched latest to: {output_path}")

    asyncio.run(main())
