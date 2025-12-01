"""
Website Source

Scrapes provider data directly from business websites.
"""

from datetime import datetime
from typing import AsyncIterator, Optional

from ..config import get_settings, RateLimiter
from ..schemas import (
    ScrapedProvider,
    ScrapedService,
    ScrapedSource,
    ServiceCategory,
    SourceType,
)
from ..utils import HttpClient, RobotsChecker, content_hash
from .base import BaseSource, SourceResult


# Keywords that suggest a page contains service/menu information
SERVICE_PAGE_KEYWORDS = [
    "services", "menu", "treatments", "pricing", "rates",
    "our services", "what we offer", "book now",
]


class WebsiteSource(BaseSource):
    """
    Scrapes provider websites for service and contact information.

    This source:
    - Respects robots.txt
    - Follows rate limits
    - Extracts services, prices, hours, contact info
    - Uses heuristics to find service pages
    """

    def __init__(
        self,
        rate_limiter: Optional[RateLimiter] = None,
        robots_checker: Optional[RobotsChecker] = None,
    ):
        self.settings = get_settings()
        self.rate_limiter = rate_limiter or RateLimiter()
        self.robots_checker = robots_checker or RobotsChecker()

    @property
    def source_type(self) -> SourceType:
        return SourceType.WEBSITE

    def get_priority(self) -> int:
        return 60  # Higher than directory, lower than Google Maps

    async def validate_access(self, url: str) -> bool:
        """Check robots.txt before accessing."""
        return await self.robots_checker.can_fetch(url)

    async def fetch(self, url: str) -> SourceResult:
        """
        Fetch and parse a single website.

        Args:
            url: Website URL to scrape

        Returns:
            SourceResult with parsed provider data
        """
        # Check robots.txt
        if not await self.validate_access(url):
            return SourceResult(
                error=f"Access denied by robots.txt: {url}",
                source_url=url,
                source_type=self.source_type,
            )

        try:
            async with HttpClient(rate_limiter=self.rate_limiter) as client:
                response = await client.get(url, source_type="website")

                if not response.ok:
                    return SourceResult(
                        error=f"HTTP {response.status}: {url}",
                        source_url=url,
                        source_type=self.source_type,
                    )

                # Parse the page
                provider = await self._parse_website(url, response.content)

                if provider:
                    # Add source metadata
                    provider.sources.append(ScrapedSource(
                        type=self.source_type,
                        url=url,
                        fetched_at=datetime.utcnow(),
                        raw_data_hash=content_hash(response.content),
                    ))

                    return SourceResult(
                        provider=provider,
                        raw_data=response.content,
                        source_url=url,
                        source_type=self.source_type,
                    )
                else:
                    return SourceResult(
                        error="Could not extract provider data",
                        raw_data=response.content,
                        source_url=url,
                        source_type=self.source_type,
                    )

        except Exception as e:
            return SourceResult(
                error=str(e),
                source_url=url,
                source_type=self.source_type,
            )

    async def search(
        self,
        city: str,
        category: str,
        **kwargs,
    ) -> AsyncIterator[SourceResult]:
        """
        Website source doesn't support search directly.
        Use GooglePlacesSource or DirectorySource to find URLs first.
        """
        # Website scraping requires known URLs
        # This would be called with URLs from another source
        urls = kwargs.get("urls", [])

        for url in urls:
            result = await self.fetch(url)
            yield result

    async def _parse_website(self, url: str, html: str) -> Optional[ScrapedProvider]:
        """
        Parse website HTML to extract provider data.

        This is a placeholder for more sophisticated parsing.
        In production, this would use:
        - BeautifulSoup for HTML parsing
        - Schema.org/JSON-LD extraction
        - Heuristic service menu detection
        - Contact info extraction patterns
        """
        # Import here to avoid circular dependencies
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "html.parser")

        # Extract basic info
        name = self._extract_name(soup)
        if not name:
            return None

        # Try to extract location
        address_info = self._extract_address(soup)

        # Extract services
        services = self._extract_services(soup)

        # Extract contact info
        phone = self._extract_phone(soup)
        email = self._extract_email(soup)

        # Build provider
        provider = ScrapedProvider(
            name=name,
            address=address_info.get("address", "Unknown"),
            city=address_info.get("city", "Unknown"),
            state=address_info.get("state", "Unknown"),
            zip_code=address_info.get("zip", "00000"),
            website_url=url,
            phone=phone,
            email=email,
            services=services,
            confidence=0.6,  # Lower confidence for website scraping
        )

        return provider

    def _extract_name(self, soup) -> Optional[str]:
        """Extract business name from page."""
        # Try common patterns
        # 1. Schema.org
        schema = soup.find("script", type="application/ld+json")
        if schema:
            import json
            try:
                data = json.loads(schema.string)
                if isinstance(data, dict) and "name" in data:
                    return data["name"]
            except (json.JSONDecodeError, TypeError):
                pass

        # 2. OG title
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"]

        # 3. Title tag
        title = soup.find("title")
        if title:
            # Often "Business Name | City" or "Business Name - Services"
            text = title.get_text().strip()
            # Take first part before common separators
            for sep in ["|", "-", "–", ":"]:
                if sep in text:
                    return text.split(sep)[0].strip()
            return text

        return None

    def _extract_address(self, soup) -> dict:
        """Extract address components from page."""
        result = {}

        # Try Schema.org first
        schema = soup.find("script", type="application/ld+json")
        if schema:
            import json
            try:
                data = json.loads(schema.string)
                if isinstance(data, dict):
                    addr = data.get("address", {})
                    if isinstance(addr, dict):
                        result["address"] = addr.get("streetAddress", "")
                        result["city"] = addr.get("addressLocality", "")
                        result["state"] = addr.get("addressRegion", "")
                        result["zip"] = addr.get("postalCode", "")
                        if all(result.values()):
                            return result
            except (json.JSONDecodeError, TypeError):
                pass

        # Try common address patterns in page content
        # This would be expanded with more sophisticated regex patterns
        import re
        text = soup.get_text()

        # Look for ZIP code patterns to identify address blocks
        zip_pattern = r"\b(\d{5}(?:-\d{4})?)\b"
        zip_matches = re.findall(zip_pattern, text)
        if zip_matches:
            result["zip"] = zip_matches[0]

        return result

    def _extract_services(self, soup) -> list[ScrapedService]:
        """Extract services from page."""
        services = []

        # Look for common service/menu patterns
        # This is a simplified version - production would be more sophisticated

        # Try Schema.org offers
        schema = soup.find("script", type="application/ld+json")
        if schema:
            import json
            try:
                data = json.loads(schema.string)
                if isinstance(data, dict):
                    offers = data.get("hasOfferCatalog", {}).get("itemListElement", [])
                    for offer in offers:
                        if isinstance(offer, dict):
                            name = offer.get("name", "")
                            if name:
                                services.append(ScrapedService(
                                    category=ServiceCategory.MASSAGE,  # Would need NLP to categorize
                                    name=name,
                                    description=offer.get("description"),
                                ))
            except (json.JSONDecodeError, TypeError):
                pass

        return services

    def _extract_phone(self, soup) -> Optional[str]:
        """Extract phone number from page."""
        import re

        # Try tel: links first
        tel_link = soup.find("a", href=re.compile(r"^tel:"))
        if tel_link:
            return tel_link["href"].replace("tel:", "")

        # Try Schema.org
        schema = soup.find("script", type="application/ld+json")
        if schema:
            import json
            try:
                data = json.loads(schema.string)
                if isinstance(data, dict) and "telephone" in data:
                    return data["telephone"]
            except (json.JSONDecodeError, TypeError):
                pass

        # Try regex on page text
        text = soup.get_text()
        phone_pattern = r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
        matches = re.findall(phone_pattern, text)
        if matches:
            return matches[0]

        return None

    def _extract_email(self, soup) -> Optional[str]:
        """Extract email address from page."""
        import re

        # Try mailto: links
        mailto_link = soup.find("a", href=re.compile(r"^mailto:"))
        if mailto_link:
            email = mailto_link["href"].replace("mailto:", "")
            # Remove any query params
            if "?" in email:
                email = email.split("?")[0]
            return email

        # Try regex on page text
        text = soup.get_text()
        email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
        matches = re.findall(email_pattern, text)
        if matches:
            # Filter out common false positives
            for match in matches:
                if not any(x in match.lower() for x in ["example.com", "test.com", "email.com"]):
                    return match

        return None
