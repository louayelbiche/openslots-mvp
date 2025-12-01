"""
HTTP Client Utility

Async HTTP client with retry logic, timeout handling, and rate limiting integration.
"""

import asyncio
from dataclasses import dataclass
from typing import Optional
import aiohttp
from aiohttp import ClientTimeout, ClientError

from ..config import get_settings, RateLimiter


@dataclass
class HttpResponse:
    """HTTP response wrapper."""
    url: str
    status: int
    content: str
    content_type: str
    headers: dict
    elapsed_ms: float

    @property
    def ok(self) -> bool:
        return 200 <= self.status < 300

    @property
    def is_html(self) -> bool:
        return "text/html" in self.content_type.lower()

    @property
    def is_json(self) -> bool:
        return "application/json" in self.content_type.lower()


class HttpClient:
    """
    Async HTTP client with retry and rate limiting.

    Usage:
        async with HttpClient() as client:
            response = await client.get("https://example.com")
            if response.ok:
                print(response.content)
    """

    def __init__(
        self,
        rate_limiter: Optional[RateLimiter] = None,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None,
    ):
        self.settings = get_settings()
        self.rate_limiter = rate_limiter or RateLimiter()
        self.timeout = timeout or self.settings.http_timeout
        self.max_retries = max_retries or self.settings.http_max_retries
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self) -> "HttpClient":
        self._session = aiohttp.ClientSession(
            timeout=ClientTimeout(total=self.timeout),
            headers={
                "User-Agent": self.settings.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            await self._session.close()

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc

    async def get(
        self,
        url: str,
        source_type: str = "website",
        headers: Optional[dict] = None,
    ) -> HttpResponse:
        """
        Perform GET request with retry logic.

        Args:
            url: URL to fetch
            source_type: Type for rate limiting (website, google_places, directory)
            headers: Additional headers to send

        Returns:
            HttpResponse object

        Raises:
            HttpError: If all retries fail
        """
        if not self._session:
            raise RuntimeError("HttpClient must be used as async context manager")

        domain = self._get_domain(url)
        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries):
            try:
                # Apply rate limiting
                await self.rate_limiter.acquire(source_type, domain)

                import time
                start = time.time()

                async with self._session.get(url, headers=headers) as resp:
                    content = await resp.text()
                    elapsed = (time.time() - start) * 1000

                    response = HttpResponse(
                        url=str(resp.url),
                        status=resp.status,
                        content=content,
                        content_type=resp.headers.get("Content-Type", ""),
                        headers=dict(resp.headers),
                        elapsed_ms=elapsed,
                    )

                    if response.ok:
                        self.rate_limiter.record_success(domain)
                    else:
                        self.rate_limiter.record_failure(domain)

                    return response

            except asyncio.TimeoutError as e:
                last_error = e
                self.rate_limiter.record_failure(domain)

            except ClientError as e:
                last_error = e
                self.rate_limiter.record_failure(domain)

            # Exponential backoff between retries
            if attempt < self.max_retries - 1:
                await asyncio.sleep(2 ** attempt)

        raise HttpError(f"Failed to fetch {url} after {self.max_retries} attempts: {last_error}")

    async def get_json(
        self,
        url: str,
        source_type: str = "website",
        headers: Optional[dict] = None,
    ) -> dict:
        """Fetch URL and parse as JSON."""
        response = await self.get(url, source_type, headers)
        if not response.ok:
            raise HttpError(f"HTTP {response.status} for {url}")

        import json
        return json.loads(response.content)


class HttpError(Exception):
    """HTTP request error."""
    pass
