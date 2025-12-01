"""
Hybrid Enricher

Combines Playwright-based booking system scraper with static website enricher.
Automatically detects the best approach for each provider.
"""

import json
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass

from .booking_scraper import BookingScraper, BookingSystem
from .website_enricher import WebsiteEnricher, ExtractedService, EnrichmentResult


@dataclass
class HybridEnrichmentResult:
    """Result from hybrid enrichment."""
    provider_name: str
    url: str
    success: bool
    services: list[ExtractedService]
    method: str  # "playwright", "static", "none"
    booking_system: Optional[str] = None
    error: Optional[str] = None


class HybridEnricher:
    """
    Smart enricher that uses Playwright for booking systems
    and falls back to static scraper for regular websites.
    """

    def __init__(self, headless: bool = True):
        self.headless = headless
        self._booking_scraper: Optional[BookingScraper] = None
        self._static_enricher: Optional[WebsiteEnricher] = None

    async def __aenter__(self):
        self._booking_scraper = BookingScraper(headless=self.headless)
        await self._booking_scraper.__aenter__()

        self._static_enricher = WebsiteEnricher()
        await self._static_enricher.__aenter__()

        return self

    async def __aexit__(self, *args):
        if self._booking_scraper:
            await self._booking_scraper.__aexit__(*args)
        if self._static_enricher:
            await self._static_enricher.__aexit__(*args)

    async def enrich_provider(self, provider: dict) -> HybridEnrichmentResult:
        """
        Enrich a single provider using the best method.

        1. Check if URL is a known booking system -> use Playwright
        2. Otherwise -> use static scraper
        """
        name = provider.get("name", "Unknown")
        url = provider.get("bookingUrl") or provider.get("websiteUrl")

        if not url:
            return HybridEnrichmentResult(
                provider_name=name,
                url="",
                success=False,
                services=[],
                method="none",
                error="No URL available"
            )

        # Detect booking system
        booking_info = self._booking_scraper.detect_booking_system(url)

        if booking_info.system != BookingSystem.UNKNOWN:
            # Use Playwright for booking systems
            try:
                services = await self._booking_scraper._scrape_booking_system(booking_info)
                if services:
                    return HybridEnrichmentResult(
                        provider_name=name,
                        url=url,
                        success=True,
                        services=services,
                        method="playwright",
                        booking_system=booking_info.system.value
                    )
            except Exception as e:
                print(f"    Playwright failed: {e}, falling back to static")

        # Fall back to static scraper
        try:
            result = await self._static_enricher.enrich_provider(provider)
            return HybridEnrichmentResult(
                provider_name=name,
                url=url,
                success=result.success,
                services=result.services,
                method="static" if result.services else "none",
                error=result.error
            )
        except Exception as e:
            return HybridEnrichmentResult(
                provider_name=name,
                url=url,
                success=False,
                services=[],
                method="none",
                error=str(e)
            )

    async def enrich_file(
        self,
        input_path: Path,
        output_path: Optional[Path] = None,
        use_playwright: bool = True
    ) -> Path:
        """
        Enrich all providers in a JSON file.

        Args:
            input_path: Path to scraped providers JSON
            output_path: Optional output path
            use_playwright: Whether to use Playwright for booking systems

        Returns:
            Path to enriched output file
        """
        with open(input_path) as f:
            data = json.load(f)

        providers = data.get("providers", [])
        enriched_providers = []

        stats = {
            "total": len(providers),
            "enriched": 0,
            "playwright": 0,
            "static": 0,
            "failed": 0,
            "booking_systems": {}
        }

        print(f"Enriching {len(providers)} providers...")
        print(f"  Playwright enabled: {use_playwright}")

        for i, provider in enumerate(providers):
            name = provider.get("name", "Unknown")
            print(f"  [{i+1}/{len(providers)}] {name}")

            if use_playwright:
                result = await self.enrich_provider(provider)
            else:
                # Static only
                static_result = await self._static_enricher.enrich_provider(provider)
                result = HybridEnrichmentResult(
                    provider_name=name,
                    url=provider.get("websiteUrl", ""),
                    success=static_result.success,
                    services=static_result.services,
                    method="static" if static_result.services else "none"
                )

            if result.success and result.services:
                # Update provider with services
                provider["services"] = [
                    {
                        "name": s.name,
                        "category": s.category,
                        "durationMin": s.duration_min or 60,
                        "basePrice": s.price_cents or 10000,
                        "description": s.description,
                    }
                    for s in result.services
                ]
                stats["enriched"] += 1

                if result.method == "playwright":
                    stats["playwright"] += 1
                    if result.booking_system:
                        stats["booking_systems"][result.booking_system] = \
                            stats["booking_systems"].get(result.booking_system, 0) + 1
                    print(f"    ✓ {len(result.services)} services via {result.booking_system}")
                else:
                    stats["static"] += 1
                    print(f"    ✓ {len(result.services)} services via static")
            else:
                stats["failed"] += 1
                print(f"    ✗ {result.error or 'No services found'}")

            enriched_providers.append(provider)

            # Small delay between providers
            await asyncio.sleep(0.5)

        # Build output
        output_data = {
            "metadata": {
                **data.get("metadata", {}),
                "enriched_at": datetime.now(timezone.utc).isoformat(),
                "enrichment_stats": stats,
                "enrichment_method": "hybrid" if use_playwright else "static",
            },
            "providers": enriched_providers,
        }

        # Write output
        if output_path is None:
            suffix = "_hybrid" if use_playwright else "_enriched"
            output_path = input_path.parent / f"{suffix}_{input_path.name}"

        with open(output_path, "w") as f:
            json.dump(output_data, f, indent=2, default=str)

        # Print summary
        print(f"\n{'='*50}")
        print("Enrichment Complete")
        print(f"{'='*50}")
        print(f"  Total providers: {stats['total']}")
        print(f"  Successfully enriched: {stats['enriched']}")
        print(f"    - Via Playwright: {stats['playwright']}")
        print(f"    - Via static scraper: {stats['static']}")
        print(f"  Failed: {stats['failed']}")

        if stats["booking_systems"]:
            print(f"\n  Booking systems scraped:")
            for system, count in sorted(stats["booking_systems"].items()):
                print(f"    - {system}: {count}")

        print(f"\n  Output: {output_path}")

        return output_path


async def enrich_with_booking_systems(
    city: str = "new_york_city",
    category: str = "massage",
    headless: bool = True
) -> Path:
    """
    Run hybrid enrichment on the latest scraped file.

    Args:
        city: City name
        category: Category name
        headless: Run browser in headless mode

    Returns:
        Path to enriched file
    """
    providers_dir = Path(__file__).parent.parent / "output" / "providers"

    # Find latest file
    pattern = f"{city}_{category}_*.json"
    files = sorted(providers_dir.glob(pattern), reverse=True)

    if not files:
        # Try enriched files
        pattern = f"enriched_{city}_{category}_*.json"
        files = sorted(providers_dir.glob(pattern), reverse=True)

    if not files:
        raise FileNotFoundError(f"No files found matching pattern in {providers_dir}")

    latest = files[0]
    print(f"Using input file: {latest}")

    async with HybridEnricher(headless=headless) as enricher:
        return await enricher.enrich_file(latest)


if __name__ == "__main__":
    import sys

    async def main():
        headless = "--visible" not in sys.argv

        if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
            input_path = Path(sys.argv[1])
            async with HybridEnricher(headless=headless) as enricher:
                output_path = await enricher.enrich_file(input_path)
                print(f"\nOutput: {output_path}")
        else:
            output_path = await enrich_with_booking_systems(headless=headless)
            print(f"\nOutput: {output_path}")

    asyncio.run(main())
