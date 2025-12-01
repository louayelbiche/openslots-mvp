"""
Rate Limiting Configuration

Defines rate limits for different source types and implements
a rate limiter with exponential backoff.
"""

import asyncio
import time
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Optional


@dataclass
class RateLimitConfig:
    """Configuration for a single rate limit."""
    requests_per_minute: int
    daily_limit: Optional[int] = None
    delay_between_requests: float = 1.0  # seconds


# Default rate limits by source type
RATE_LIMITS: dict[str, RateLimitConfig] = {
    "google_places": RateLimitConfig(
        requests_per_minute=50,  # Stay under Google's 60/min limit
        daily_limit=5000,  # Support large scrapes (Text Search + Place Details)
        delay_between_requests=1.2,  # Slightly conservative
    ),
    "website": RateLimitConfig(
        requests_per_minute=10,
        daily_limit=None,
        delay_between_requests=2.0,
    ),
    "directory": RateLimitConfig(
        requests_per_minute=20,
        daily_limit=None,
        delay_between_requests=1.0,
    ),
}

# Backoff configuration
BACKOFF_CONFIG = {
    "initial_delay": 1.0,
    "max_delay": 60.0,
    "multiplier": 2.0,
    "max_retries": 5,
}


class RateLimiter:
    """
    Rate limiter with per-domain tracking and exponential backoff.

    Usage:
        limiter = RateLimiter()
        await limiter.acquire("website", "example.com")
        # ... make request ...
        limiter.record_success("example.com")
        # or
        limiter.record_failure("example.com")
    """

    def __init__(self):
        self._last_request: dict[str, float] = defaultdict(float)
        self._request_counts: dict[str, int] = defaultdict(int)
        self._daily_counts: dict[str, int] = defaultdict(int)
        self._failure_counts: dict[str, int] = defaultdict(int)
        self._lock = asyncio.Lock()

    async def acquire(self, source_type: str, domain: str) -> None:
        """
        Wait until we can make a request to the given domain.

        Args:
            source_type: Type of source (google_places, website, directory)
            domain: Domain being requested
        """
        async with self._lock:
            config = RATE_LIMITS.get(source_type, RATE_LIMITS["website"])

            # Check daily limit
            if config.daily_limit and self._daily_counts[source_type] >= config.daily_limit:
                raise RateLimitExceeded(
                    f"Daily limit of {config.daily_limit} exceeded for {source_type}"
                )

            # Calculate required delay
            now = time.time()
            last = self._last_request[domain]
            min_interval = 60.0 / config.requests_per_minute

            # Add backoff for failures
            failure_count = self._failure_counts[domain]
            if failure_count > 0:
                backoff = min(
                    BACKOFF_CONFIG["initial_delay"] * (BACKOFF_CONFIG["multiplier"] ** failure_count),
                    BACKOFF_CONFIG["max_delay"],
                )
                min_interval = max(min_interval, backoff)

            # Ensure minimum delay between requests
            min_interval = max(min_interval, config.delay_between_requests)

            # Wait if needed
            elapsed = now - last
            if elapsed < min_interval:
                wait_time = min_interval - elapsed
                await asyncio.sleep(wait_time)

            # Update tracking
            self._last_request[domain] = time.time()
            self._request_counts[domain] += 1
            self._daily_counts[source_type] += 1

    def record_success(self, domain: str) -> None:
        """Record a successful request, resetting failure count."""
        self._failure_counts[domain] = 0

    def record_failure(self, domain: str) -> None:
        """Record a failed request, incrementing failure count for backoff."""
        self._failure_counts[domain] += 1

    def get_stats(self) -> dict:
        """Get current rate limiter statistics."""
        return {
            "request_counts": dict(self._request_counts),
            "daily_counts": dict(self._daily_counts),
            "failure_counts": dict(self._failure_counts),
        }

    def reset_daily_counts(self) -> None:
        """Reset daily counts (call at midnight)."""
        self._daily_counts.clear()


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded."""
    pass
