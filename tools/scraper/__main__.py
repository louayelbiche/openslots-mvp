"""
Scraper CLI Entry Point

Usage:
    python -m scraper search --city="Miami" --category="MASSAGE"
    python -m scraper enrich --input providers.json [--playwright] [--llm]
    python -m scraper fetch --url="https://example.com"
    python -m scraper stats
"""

import argparse
import asyncio
import sys
import uuid
from datetime import datetime
from pathlib import Path

from .config import get_settings
from .schemas import ScrapedProvider, ScrapeRunStats, ServiceCategory
from .sources import GooglePlacesSource, WebsiteSource
from .normalizers import ProviderNormalizer, Deduplicator
from .storage import JsonStore, TokenTracker
from .enrichers.website_enricher import WebsiteEnricher
from .enrichers.hybrid_enricher import HybridEnricher


def create_parser() -> argparse.ArgumentParser:
    """Create CLI argument parser."""
    parser = argparse.ArgumentParser(
        prog="scraper",
        description="OpenSlots Provider Scraper",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Search command
    search_parser = subparsers.add_parser("search", help="Search for providers")
    search_parser.add_argument(
        "--city",
        required=True,
        help="City to search in",
    )
    search_parser.add_argument(
        "--category",
        required=True,
        choices=[c.value for c in ServiceCategory],
        help="Service category",
    )
    search_parser.add_argument(
        "--max-results",
        type=int,
        default=20,
        help="Maximum number of results (default: 20)",
    )
    search_parser.add_argument(
        "--output",
        help="Output file path (default: auto-generated)",
    )

    # Fetch command
    fetch_parser = subparsers.add_parser("fetch", help="Fetch a single provider URL")
    fetch_parser.add_argument(
        "--url",
        required=True,
        help="URL to fetch",
    )

    # Stats command
    subparsers.add_parser("stats", help="Show scraping statistics")

    # Enrich command
    enrich_parser = subparsers.add_parser(
        "enrich",
        help="Enrich providers with services scraped from their websites"
    )
    enrich_parser.add_argument(
        "--input", "-i",
        required=True,
        help="Input JSON file with providers",
    )
    enrich_parser.add_argument(
        "--output", "-o",
        help="Output file path (default: enriched_<input>)",
    )
    enrich_parser.add_argument(
        "--playwright",
        action="store_true",
        default=False,
        help="Use Playwright for JS-heavy booking systems (slower but better)",
    )
    enrich_parser.add_argument(
        "--no-llm",
        action="store_true",
        default=False,
        help="Disable LLM-assisted service name filtering",
    )
    enrich_parser.add_argument(
        "--category",
        default="MASSAGE",
        choices=[c.value for c in ServiceCategory],
        help="Service category for cleanup rules (default: MASSAGE)",
    )

    return parser


async def cmd_search(args: argparse.Namespace) -> int:
    """Execute search command."""
    settings = get_settings()
    store = JsonStore()
    dedup = Deduplicator()
    normalizer = ProviderNormalizer()
    token_tracker = TokenTracker()

    run_id = str(uuid.uuid4())[:8]
    token_tracker.set_task_id(run_id)

    stats = ScrapeRunStats(
        run_id=run_id,
        started_at=datetime.utcnow(),
    )

    print(f"Searching for {args.category} providers in {args.city}...")
    print(f"Run ID: {run_id}")
    print()

    # Use Google Places if available, otherwise just print info
    if settings.google_places_enabled:
        source = GooglePlacesSource()
        print("Using Google Places API")
    else:
        print("Google Places API not configured (set GOOGLE_API_KEY)")
        print("Skipping search - would search with configured sources")
        return 0

    providers: list[ScrapedProvider] = []

    async for result in source.search(args.city, args.category, max_results=args.max_results):
        stats.pages_attempted += 1

        if result.success and result.provider:
            stats.pages_fetched += 1

            # Normalize
            provider = normalizer.normalize(result.provider)

            # Check for duplicates
            is_new, merged = dedup.add(provider)

            if is_new:
                stats.providers_new += 1
                providers.append(merged)
                print(f"  Found: {merged.name}")
            else:
                stats.duplicates_skipped += 1
                print(f"  Merged: {merged.name}")

            stats.providers_found += 1
            stats.services_extracted += len(merged.services)

        else:
            stats.pages_errored += 1
            if result.error:
                stats.errors.append({
                    "url": result.source_url,
                    "error": result.error,
                })
                print(f"  Error: {result.error}")

    # Save results
    stats.completed_at = datetime.utcnow()

    if providers:
        path = store.save_providers(providers, args.city, args.category)
        print(f"\nSaved {len(providers)} providers to {path}")

    store.save_run_stats(stats)
    token_tracker.flush()

    # Print summary
    print(f"\n{'='*50}")
    print(f"Run completed: {run_id}")
    print(f"  Pages attempted: {stats.pages_attempted}")
    print(f"  Pages fetched: {stats.pages_fetched}")
    print(f"  Providers found: {stats.providers_found}")
    print(f"  New providers: {stats.providers_new}")
    print(f"  Duplicates merged: {stats.duplicates_skipped}")
    print(f"  Services extracted: {stats.services_extracted}")
    print(f"  Errors: {stats.pages_errored}")

    return 0


async def cmd_fetch(args: argparse.Namespace) -> int:
    """Execute fetch command."""
    source = WebsiteSource()

    print(f"Fetching {args.url}...")

    result = await source.fetch(args.url)

    if result.success and result.provider:
        print("\nProvider found:")
        print(result.provider.to_json())
        return 0
    else:
        print(f"\nError: {result.error}")
        return 1


async def cmd_enrich(args: argparse.Namespace) -> int:
    """Execute enrich command - scrape services from provider websites."""
    input_path = Path(args.input)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        return 1

    output_path = Path(args.output) if args.output else None
    use_llm = not args.no_llm
    category = args.category

    print(f"Enriching providers from {input_path}")
    print(f"  Playwright: {'enabled' if args.playwright else 'disabled'}")
    print(f"  LLM filtering: {'enabled' if use_llm else 'disabled'}")
    print(f"  Category: {category}")
    print()

    if args.playwright:
        # Use hybrid enricher with Playwright for booking systems
        async with HybridEnricher(headless=True) as enricher:
            result_path = await enricher.enrich_file(
                input_path,
                output_path,
                use_playwright=True
            )
    else:
        # Use static enricher only (faster, no browser)
        enricher = WebsiteEnricher()
        result_path = await enricher.enrich_file(
            input_path,
            output_path,
            category=category,
            use_llm=use_llm
        )

    print(f"\nOutput saved to: {result_path}")
    return 0


def cmd_stats(_args: argparse.Namespace) -> int:
    """Execute stats command."""
    store = JsonStore()

    latest = store.get_latest_run()
    if latest:
        print("Latest run:")
        print(f"  Run ID: {latest.run_id}")
        print(f"  Started: {latest.started_at}")
        print(f"  Completed: {latest.completed_at}")
        print(f"  Providers found: {latest.providers_found}")
        print(f"  New providers: {latest.providers_new}")
    else:
        print("No runs found")

    # List recent provider files
    files = store.list_provider_files()[:5]
    if files:
        print("\nRecent exports:")
        for f in files:
            print(f"  {f.name}")

    return 0


def main() -> int:
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    if args.command == "search":
        return asyncio.run(cmd_search(args))
    elif args.command == "fetch":
        return asyncio.run(cmd_fetch(args))
    elif args.command == "enrich":
        return asyncio.run(cmd_enrich(args))
    elif args.command == "stats":
        return cmd_stats(args)

    return 1


if __name__ == "__main__":
    sys.exit(main())
