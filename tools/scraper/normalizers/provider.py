"""
Provider Normalizer

Normalizes and validates scraped provider data.
"""

import re
from typing import Optional

from ..schemas import ScrapedProvider
from ..utils.hash import normalize_phone, normalize_address


class ProviderNormalizer:
    """
    Normalizes provider data for consistency.

    Normalizations:
    - Standardize phone numbers to E.164 format
    - Normalize address abbreviations
    - Clean up business names
    - Validate required fields
    """

    def normalize(self, provider: ScrapedProvider) -> ScrapedProvider:
        """
        Normalize a scraped provider.

        Args:
            provider: Raw scraped provider data

        Returns:
            Normalized provider
        """
        # Normalize name
        provider.name = self._normalize_name(provider.name)

        # Normalize address
        provider.address = normalize_address(provider.address)

        # Normalize city
        provider.city = self._normalize_city(provider.city)

        # Normalize state
        provider.state = self._normalize_state(provider.state)

        # Normalize phone
        if provider.phone:
            provider.phone = normalize_phone(provider.phone)

        # Normalize email
        if provider.email:
            provider.email = provider.email.lower().strip()

        # Normalize URL
        if provider.website_url:
            provider.website_url = self._normalize_url(provider.website_url)

        return provider

    def _normalize_name(self, name: str) -> str:
        """Normalize business name."""
        if not name:
            return name

        # Remove extra whitespace
        name = re.sub(r"\s+", " ", name.strip())

        # Remove common suffixes that don't add value
        suffixes = [
            r",?\s*(llc|inc|corp|ltd|llp)\.?$",
            r"\s*-\s*home$",
            r"\s*\|\s*.*$",  # Remove "| City Name" etc
        ]
        for suffix in suffixes:
            name = re.sub(suffix, "", name, flags=re.IGNORECASE)

        # Title case if all caps or all lower
        if name.isupper() or name.islower():
            name = name.title()

        return name.strip()

    def _normalize_city(self, city: str) -> str:
        """Normalize city name."""
        if not city:
            return city

        # Remove extra whitespace
        city = re.sub(r"\s+", " ", city.strip())

        # Title case
        city = city.title()

        return city

    def _normalize_state(self, state: str) -> str:
        """Normalize state to 2-letter abbreviation."""
        if not state:
            return state

        state = state.strip().upper()

        # If already 2 letters, return as-is
        if len(state) == 2:
            return state

        # Map full names to abbreviations
        state_map = {
            "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
            "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
            "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI", "IDAHO": "ID",
            "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
            "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
            "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
            "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
            "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
            "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
            "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
            "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
            "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
            "WISCONSIN": "WI", "WYOMING": "WY", "DISTRICT OF COLUMBIA": "DC",
        }

        return state_map.get(state, state)

    def _normalize_url(self, url: str) -> str:
        """Normalize URL."""
        url = url.strip()

        # Add scheme if missing
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        # Remove trailing slash
        url = url.rstrip("/")

        return url

    def validate(self, provider: ScrapedProvider) -> list[str]:
        """
        Validate provider data.

        Returns:
            List of validation errors (empty if valid)
        """
        return provider.validate()

    def merge(
        self,
        existing: ScrapedProvider,
        new: ScrapedProvider,
    ) -> ScrapedProvider:
        """
        Merge two provider records, preferring data from higher-priority sources.

        Args:
            existing: Existing provider record
            new: New provider record

        Returns:
            Merged provider
        """
        # Determine which has higher priority
        existing_priority = max(
            (s.type.value for s in existing.sources),
            default=0,
            key=lambda t: {"GOOGLE_MAPS": 3, "WEBSITE": 2, "DIRECTORY": 1, "SEARCH": 0}.get(t, 0),
        )
        new_priority = max(
            (s.type.value for s in new.sources),
            default=0,
            key=lambda t: {"GOOGLE_MAPS": 3, "WEBSITE": 2, "DIRECTORY": 1, "SEARCH": 0}.get(t, 0),
        )

        # Use higher priority as base
        if new_priority > existing_priority:
            base, secondary = new, existing
        else:
            base, secondary = existing, new

        # Fill in missing fields from secondary
        merged = ScrapedProvider(
            name=base.name or secondary.name,
            address=base.address or secondary.address,
            city=base.city or secondary.city,
            state=base.state or secondary.state,
            zip_code=base.zip_code or secondary.zip_code,
            country=base.country or secondary.country,
            legal_name=base.legal_name or secondary.legal_name,
            website_url=base.website_url or secondary.website_url,
            latitude=base.latitude or secondary.latitude,
            longitude=base.longitude or secondary.longitude,
            phone=base.phone or secondary.phone,
            email=base.email or secondary.email,
            booking_url=base.booking_url or secondary.booking_url,
            services=base.services or secondary.services,
            opening_hours=base.opening_hours or secondary.opening_hours,
            google_rating=base.google_rating or secondary.google_rating,
            google_review_count=base.google_review_count or secondary.google_review_count,
            social_links=base.social_links or secondary.social_links,
            sources=base.sources + secondary.sources,
            confidence=max(base.confidence, secondary.confidence),
        )

        return merged
