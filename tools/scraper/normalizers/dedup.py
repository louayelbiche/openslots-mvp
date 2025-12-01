"""
Deduplicator

Handles provider deduplication and conflict resolution.
"""

from dataclasses import dataclass, field
from typing import Optional

from ..schemas import ScrapedProvider
from ..utils.hash import generate_provider_key, normalize_address
from .provider import ProviderNormalizer


@dataclass
class DuplicateMatch:
    """A potential duplicate match."""
    provider: ScrapedProvider
    similarity_score: float
    match_reasons: list[str] = field(default_factory=list)


class Deduplicator:
    """
    Detects and resolves duplicate provider records.

    Strategies:
    1. Exact match on normalized name + address + city
    2. Fuzzy match on name with same address
    3. Same phone number
    4. Same website URL
    """

    def __init__(self):
        self._index: dict[str, ScrapedProvider] = {}
        self._phone_index: dict[str, str] = {}  # phone -> provider_key
        self._url_index: dict[str, str] = {}  # url -> provider_key
        self.normalizer = ProviderNormalizer()

    def add(self, provider: ScrapedProvider) -> tuple[bool, Optional[ScrapedProvider]]:
        """
        Add a provider, detecting duplicates.

        Args:
            provider: Provider to add

        Returns:
            Tuple of (is_new, merged_provider)
            - is_new: True if this is a new provider
            - merged_provider: The final provider (merged if duplicate found)
        """
        key = generate_provider_key(provider.name, provider.address, provider.city)

        # Check for exact match
        if key in self._index:
            existing = self._index[key]
            merged = self.normalizer.merge(existing, provider)
            self._index[key] = merged
            return False, merged

        # Check for phone match
        if provider.phone and provider.phone in self._phone_index:
            existing_key = self._phone_index[provider.phone]
            existing = self._index[existing_key]
            merged = self.normalizer.merge(existing, provider)
            self._index[existing_key] = merged
            return False, merged

        # Check for URL match
        if provider.website_url and provider.website_url in self._url_index:
            existing_key = self._url_index[provider.website_url]
            existing = self._index[existing_key]
            merged = self.normalizer.merge(existing, provider)
            self._index[existing_key] = merged
            return False, merged

        # New provider
        self._index[key] = provider
        if provider.phone:
            self._phone_index[provider.phone] = key
        if provider.website_url:
            self._url_index[provider.website_url] = key

        return True, provider

    def find_duplicates(self, provider: ScrapedProvider) -> list[DuplicateMatch]:
        """
        Find potential duplicates for a provider.

        Args:
            provider: Provider to check

        Returns:
            List of potential duplicate matches
        """
        matches = []

        # Check exact key match
        key = generate_provider_key(provider.name, provider.address, provider.city)
        if key in self._index:
            matches.append(DuplicateMatch(
                provider=self._index[key],
                similarity_score=1.0,
                match_reasons=["exact_key"],
            ))
            return matches  # Exact match found

        # Check phone match
        if provider.phone and provider.phone in self._phone_index:
            existing_key = self._phone_index[provider.phone]
            matches.append(DuplicateMatch(
                provider=self._index[existing_key],
                similarity_score=0.9,
                match_reasons=["phone"],
            ))

        # Check URL match
        if provider.website_url and provider.website_url in self._url_index:
            existing_key = self._url_index[provider.website_url]
            if not any(m.provider == self._index[existing_key] for m in matches):
                matches.append(DuplicateMatch(
                    provider=self._index[existing_key],
                    similarity_score=0.85,
                    match_reasons=["website"],
                ))

        # Check fuzzy name match in same city
        for existing_key, existing in self._index.items():
            if existing.city.lower() == provider.city.lower():
                name_similarity = self._name_similarity(provider.name, existing.name)
                if name_similarity > 0.8:
                    if not any(m.provider == existing for m in matches):
                        matches.append(DuplicateMatch(
                            provider=existing,
                            similarity_score=name_similarity,
                            match_reasons=["fuzzy_name"],
                        ))

        return sorted(matches, key=lambda m: m.similarity_score, reverse=True)

    def _name_similarity(self, name1: str, name2: str) -> float:
        """Calculate similarity between two business names."""
        # Simple normalized comparison
        n1 = set(name1.lower().split())
        n2 = set(name2.lower().split())

        if not n1 or not n2:
            return 0.0

        intersection = n1 & n2
        union = n1 | n2

        return len(intersection) / len(union)

    def get_all(self) -> list[ScrapedProvider]:
        """Get all unique providers."""
        return list(self._index.values())

    def count(self) -> int:
        """Get count of unique providers."""
        return len(self._index)

    def clear(self) -> None:
        """Clear all indexed providers."""
        self._index.clear()
        self._phone_index.clear()
        self._url_index.clear()
