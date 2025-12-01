"""
Base Source Class

Abstract base class for all data sources (websites, APIs, directories).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import AsyncIterator, Optional

from ..schemas import ScrapedProvider, SourceType


@dataclass
class SourceResult:
    """Result from a source fetch operation."""
    provider: Optional[ScrapedProvider] = None
    raw_data: Optional[str] = None
    error: Optional[str] = None
    source_url: str = ""
    source_type: SourceType = SourceType.WEBSITE
    fetched_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def success(self) -> bool:
        return self.provider is not None and self.error is None


class BaseSource(ABC):
    """
    Abstract base class for data sources.

    Subclasses must implement:
    - source_type: The type of source (WEBSITE, GOOGLE_MAPS, DIRECTORY)
    - fetch(): Fetch data from a single URL/ID
    - search(): Search for providers matching criteria
    """

    @property
    @abstractmethod
    def source_type(self) -> SourceType:
        """The type of this source."""
        pass

    @abstractmethod
    async def fetch(self, identifier: str) -> SourceResult:
        """
        Fetch data for a single provider.

        Args:
            identifier: URL, place ID, or other identifier

        Returns:
            SourceResult with provider data or error
        """
        pass

    @abstractmethod
    async def search(
        self,
        city: str,
        category: str,
        **kwargs,
    ) -> AsyncIterator[SourceResult]:
        """
        Search for providers matching criteria.

        Args:
            city: City to search in
            category: Service category to search for
            **kwargs: Additional search parameters

        Yields:
            SourceResult objects for each found provider
        """
        pass

    async def validate_access(self, url: str) -> bool:
        """
        Check if we can access the given URL (robots.txt, rate limits, etc.)

        Args:
            url: URL to check

        Returns:
            True if access is allowed
        """
        return True

    def get_priority(self) -> int:
        """
        Get priority for conflict resolution (higher = more trusted).

        Returns:
            Priority value (default 50)
        """
        return 50
