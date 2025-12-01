#!/usr/bin/env python3
"""
Sample Scraping Script

Demonstrates how to use the scraper to fetch provider data
from a known set of websites.

Usage:
    python examples/scrape_sample.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scraper.sources import WebsiteSource
from scraper.normalizers import ProviderNormalizer, ServiceNormalizer, Deduplicator
from scraper.storage import JsonStore


# Sample provider websites for testing
# These are example URLs - replace with real provider websites
SAMPLE_URLS = [
    # Add real provider website URLs here for testing
    # "https://example-spa.com",
    # "https://example-salon.com",
]


async def main():
    """Scrape sample provider websites."""
    print("OpenSlots Sample Scraper")
    print("=" * 50)
    print()

    if not SAMPLE_URLS:
        print("No sample URLs configured.")
        print("Edit examples/scrape_sample.py to add provider website URLs.")
        print()
        print("Example usage with the CLI:")
        print("  python -m scraper search --city='Miami' --category='MASSAGE'")
        print("  python -m scraper fetch --url='https://example.com'")
        return

    source = WebsiteSource()
    normalizer = ProviderNormalizer()
    service_normalizer = ServiceNormalizer()
    dedup = Deduplicator()
    store = JsonStore()

    print(f"Scraping {len(SAMPLE_URLS)} URLs...")
    print()

    for url in SAMPLE_URLS:
        print(f"Fetching: {url}")

        result = await source.fetch(url)

        if result.success and result.provider:
            # Normalize provider
            provider = normalizer.normalize(result.provider)

            # Normalize services
            for service in provider.services:
                service_normalizer.normalize(service)

            # Check for duplicates
            is_new, merged = dedup.add(provider)

            if is_new:
                print(f"  Found: {merged.name}")
                print(f"  Address: {merged.address}, {merged.city}, {merged.state}")
                print(f"  Services: {len(merged.services)}")
            else:
                print(f"  Merged with existing: {merged.name}")

        else:
            print(f"  Error: {result.error}")

        print()

    # Save results
    providers = dedup.get_all()
    if providers:
        path = store.save_providers(providers, "sample", "mixed")
        print(f"Saved {len(providers)} providers to {path}")
    else:
        print("No providers found")


if __name__ == "__main__":
    asyncio.run(main())
