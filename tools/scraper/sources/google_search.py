"""
Google Custom Search Source

Finds provider websites using Google Custom Search API.
"""

import os
from typing import Optional
from dotenv import load_dotenv

import aiohttp

from ..config import get_settings, RateLimiter

# Load environment variables
load_dotenv()


class GoogleSearchSource:
    """
    Finds provider websites using Google Custom Search API.

    Usage:
        search = GoogleSearchSource()
        url = await search.find_website("Renew Day Spa", "New York", "NY")
    """

    def __init__(self, rate_limiter: Optional[RateLimiter] = None):
        self.settings = get_settings()
        self.rate_limiter = rate_limiter or RateLimiter()
        self.api_key = os.getenv("GOOGLE_SEARCH_API_KEY", "")
        self.search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID", "")
        self.base_url = "https://www.googleapis.com/customsearch/v1"

    @property
    def is_enabled(self) -> bool:
        return bool(self.api_key and self.search_engine_id)

    async def find_website(
        self,
        provider_name: str,
        city: str,
        state: str,
    ) -> Optional[str]:
        """
        Find a provider's website URL using Google Search.

        Args:
            provider_name: Name of the provider
            city: City name
            state: State code

        Returns:
            Website URL if found, None otherwise
        """
        if not self.is_enabled:
            return None

        # Build search query
        query = f"{provider_name} {city} {state} website"

        try:
            await self.rate_limiter.acquire("google_search", "googleapis.com")

            async with aiohttp.ClientSession() as session:
                params = {
                    "key": self.api_key,
                    "cx": self.search_engine_id,
                    "q": query,
                    "num": 5,  # Get top 5 results
                }

                async with session.get(self.base_url, params=params) as resp:
                    if resp.status != 200:
                        self.rate_limiter.record_failure("googleapis.com")
                        return None

                    data = await resp.json()
                    self.rate_limiter.record_success("googleapis.com")

                    # Find best matching result
                    return self._extract_best_url(data, provider_name)

        except Exception as e:
            print(f"Google Search error: {e}")
            return None

    def _extract_best_url(self, data: dict, provider_name: str) -> Optional[str]:
        """Extract the most likely provider website from search results."""
        items = data.get("items", [])
        if not items:
            return None

        # Normalize provider name for matching
        name_lower = provider_name.lower()
        name_words = set(name_lower.split())

        # Skip these domains - they're directories, not provider sites
        skip_domains = {
            "yelp.com", "facebook.com", "instagram.com", "twitter.com",
            "linkedin.com", "yellowpages.com", "tripadvisor.com",
            "google.com", "mapquest.com", "bbb.org", "manta.com",
        }

        for item in items:
            url = item.get("link", "")
            display_link = item.get("displayLink", "").lower()

            # Skip directory sites
            if any(skip in display_link for skip in skip_domains):
                continue

            # Prefer URLs that contain provider name words
            title = item.get("title", "").lower()
            if any(word in title or word in display_link for word in name_words if len(word) > 3):
                return url

        # Fallback: return first non-directory result
        for item in items:
            url = item.get("link", "")
            display_link = item.get("displayLink", "").lower()
            if not any(skip in display_link for skip in skip_domains):
                return url

        return None


async def find_missing_websites(providers: list[dict]) -> list[dict]:
    """
    Find websites for providers missing websiteUrl.

    Args:
        providers: List of provider dicts

    Returns:
        Updated providers list with found websites
    """
    search = GoogleSearchSource()

    if not search.is_enabled:
        print("Google Search API not configured, skipping website discovery")
        return providers

    updated = []
    found_count = 0

    for provider in providers:
        if provider.get("websiteUrl"):
            updated.append(provider)
            continue

        # Try to find website
        url = await search.find_website(
            provider["name"],
            provider["city"],
            provider["state"],
        )

        if url:
            provider["websiteUrl"] = url
            provider["websiteSource"] = "GOOGLE_SEARCH"
            found_count += 1
            print(f"  Found website for {provider['name']}: {url}")

        updated.append(provider)

    print(f"Found websites for {found_count} providers missing URLs")
    return updated
