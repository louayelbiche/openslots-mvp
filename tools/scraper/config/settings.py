"""
Scraper Settings

Configuration management for the scraper.
Loads from environment variables with sensible defaults.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from functools import lru_cache

# Load .env from project root
try:
    from dotenv import load_dotenv
    project_root = Path(__file__).parent.parent.parent.parent
    env_path = project_root / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # python-dotenv not installed, use system env vars


@dataclass
class Settings:
    """Scraper configuration settings."""

    # Paths
    base_dir: Path = field(default_factory=lambda: Path(__file__).parent.parent)
    output_dir: Path = field(default_factory=lambda: Path(__file__).parent.parent / "output")
    cache_dir: Path = field(default_factory=lambda: Path(__file__).parent.parent / "cache")

    # Google API (optional - for Places API)
    google_api_key: str = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""))
    google_places_enabled: bool = field(
        default_factory=lambda: bool(os.getenv("GOOGLE_API_KEY"))
    )

    # HTTP settings
    http_timeout: int = 30  # seconds
    http_max_retries: int = 3
    user_agent: str = "OpenSlots-Scraper/0.1 (+https://openslots.example.com/bot)"

    # Rate limiting
    default_requests_per_minute: int = 10
    default_delay_between_requests: float = 2.0  # seconds

    # Scraping behavior
    respect_robots_txt: bool = True
    max_pages_per_domain: int = 100
    max_providers_per_run: int = 500

    # Logging
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))

    # Token tracking
    token_tracking_enabled: bool = True

    def __post_init__(self):
        """Ensure directories exist."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        (self.cache_dir / "robots").mkdir(exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
