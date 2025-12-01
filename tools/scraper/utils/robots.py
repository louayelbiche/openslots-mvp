"""
Robots.txt Checker

Parses and caches robots.txt files to ensure compliant scraping.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

from ..config import get_settings


@dataclass
class RobotsCacheEntry:
    """Cached robots.txt data."""
    parser: RobotFileParser
    fetched_at: datetime
    crawl_delay: Optional[float] = None


class RobotsChecker:
    """
    Robots.txt compliance checker with caching.

    Usage:
        checker = RobotsChecker()
        if await checker.can_fetch("https://example.com/page"):
            # Safe to scrape
            delay = await checker.get_crawl_delay("https://example.com")
    """

    def __init__(self, cache_ttl_hours: int = 24):
        self.settings = get_settings()
        self.cache_ttl = timedelta(hours=cache_ttl_hours)
        self._cache: dict[str, RobotsCacheEntry] = {}
        self._lock = asyncio.Lock()
        self._cache_dir = self.settings.cache_dir / "robots"

    def _get_robots_url(self, url: str) -> str:
        """Get robots.txt URL for a given page URL."""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}/robots.txt"

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        parsed = urlparse(url)
        return parsed.netloc

    def _get_cache_path(self, domain: str) -> Path:
        """Get file path for cached robots.txt."""
        safe_domain = domain.replace(":", "_").replace("/", "_")
        return self._cache_dir / f"{safe_domain}.txt"

    async def _load_from_disk(self, domain: str) -> Optional[RobotsCacheEntry]:
        """Load cached robots.txt from disk."""
        cache_path = self._get_cache_path(domain)
        if not cache_path.exists():
            return None

        # Check if cache is expired
        stat = cache_path.stat()
        fetched_at = datetime.fromtimestamp(stat.st_mtime)
        if datetime.now() - fetched_at > self.cache_ttl:
            return None

        try:
            content = cache_path.read_text()
            parser = RobotFileParser()
            parser.parse(content.splitlines())

            # Extract crawl delay
            crawl_delay = None
            for line in content.splitlines():
                if line.lower().startswith("crawl-delay:"):
                    try:
                        crawl_delay = float(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass

            return RobotsCacheEntry(
                parser=parser,
                fetched_at=fetched_at,
                crawl_delay=crawl_delay,
            )
        except Exception:
            return None

    async def _save_to_disk(self, domain: str, content: str) -> None:
        """Save robots.txt content to disk cache."""
        cache_path = self._get_cache_path(domain)
        cache_path.write_text(content)

    async def _fetch_robots(self, url: str) -> Optional[RobotsCacheEntry]:
        """Fetch and parse robots.txt for a URL."""
        domain = self._get_domain(url)
        robots_url = self._get_robots_url(url)

        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(robots_url, timeout=10) as resp:
                    if resp.status == 200:
                        content = await resp.text()
                        await self._save_to_disk(domain, content)

                        parser = RobotFileParser()
                        parser.parse(content.splitlines())

                        # Extract crawl delay
                        crawl_delay = None
                        for line in content.splitlines():
                            if line.lower().startswith("crawl-delay:"):
                                try:
                                    crawl_delay = float(line.split(":", 1)[1].strip())
                                except ValueError:
                                    pass

                        return RobotsCacheEntry(
                            parser=parser,
                            fetched_at=datetime.now(),
                            crawl_delay=crawl_delay,
                        )
                    else:
                        # No robots.txt = allow all
                        parser = RobotFileParser()
                        parser.allow_all = True
                        return RobotsCacheEntry(
                            parser=parser,
                            fetched_at=datetime.now(),
                        )
        except Exception:
            # On error, allow by default but log
            parser = RobotFileParser()
            parser.allow_all = True
            return RobotsCacheEntry(
                parser=parser,
                fetched_at=datetime.now(),
            )

    async def _get_entry(self, url: str) -> RobotsCacheEntry:
        """Get or fetch robots.txt entry for URL."""
        domain = self._get_domain(url)

        async with self._lock:
            # Check memory cache
            if domain in self._cache:
                entry = self._cache[domain]
                if datetime.now() - entry.fetched_at < self.cache_ttl:
                    return entry

            # Check disk cache
            entry = await self._load_from_disk(domain)
            if entry:
                self._cache[domain] = entry
                return entry

            # Fetch fresh
            entry = await self._fetch_robots(url)
            if entry:
                self._cache[domain] = entry
                return entry

            # Fallback: allow all
            parser = RobotFileParser()
            parser.allow_all = True
            entry = RobotsCacheEntry(parser=parser, fetched_at=datetime.now())
            self._cache[domain] = entry
            return entry

    async def can_fetch(self, url: str, user_agent: Optional[str] = None) -> bool:
        """
        Check if the URL can be fetched according to robots.txt.

        Args:
            url: URL to check
            user_agent: User agent to check for (uses default if None)

        Returns:
            True if fetching is allowed
        """
        if not self.settings.respect_robots_txt:
            return True

        entry = await self._get_entry(url)
        agent = user_agent or self.settings.user_agent.split("/")[0]

        # RobotFileParser.can_fetch expects full URL
        return entry.parser.can_fetch(agent, url)

    async def get_crawl_delay(self, url: str) -> Optional[float]:
        """
        Get the crawl delay specified in robots.txt.

        Args:
            url: URL to check

        Returns:
            Crawl delay in seconds, or None if not specified
        """
        entry = await self._get_entry(url)
        return entry.crawl_delay

    def clear_cache(self) -> None:
        """Clear the in-memory cache."""
        self._cache.clear()
