"""Scraper data source modules."""

from .base import BaseSource, SourceResult
from .website import WebsiteSource
from .google_places import GooglePlacesSource

__all__ = [
    "BaseSource",
    "SourceResult",
    "WebsiteSource",
    "GooglePlacesSource",
]
