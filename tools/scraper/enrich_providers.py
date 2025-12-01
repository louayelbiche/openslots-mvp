#!/usr/bin/env python3
"""
Provider Enrichment Script

Enriches scraped provider data with detailed service menus.

Usage:
    python enrich_providers.py --input output/providers/nyc_massage.json --limit 5

This script:
1. Loads providers from JSON
2. Finds websites for providers missing URLs (via Google Search)
3. Outputs providers ready for Playwright service scraping
"""

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path


async def main():
    parser = argparse.ArgumentParser(description="Enrich provider data with services")
    parser.add_argument(
        "--input",
        required=True,
        help="Input JSON file with providers",
    )
    parser.add_argument(
        "--output",
        help="Output JSON file (default: input with _enriched suffix)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Max providers to process (default: 10)",
    )
    parser.add_argument(
        "--find-websites",
        action="store_true",
        help="Use Google Search to find missing website URLs",
    )

    args = parser.parse_args()

    # Load input
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        return 1

    with open(input_path) as f:
        data = json.load(f)

    providers = data.get("providers", [])
    print(f"Loaded {len(providers)} providers from {input_path.name}")

    # Stats
    with_website = sum(1 for p in providers if p.get("websiteUrl"))
    with_services = sum(1 for p in providers if len(p.get("services", [])) > 1 or
                       (p.get("services") and p["services"][0].get("name") != "Massage"))

    print(f"  With website URL: {with_website}")
    print(f"  With detailed services: {with_services}")
    print(f"  Need service scraping: {with_website - with_services}")

    # Find missing websites if requested
    if args.find_websites:
        from sources.google_search import find_missing_websites
        print("\nFinding missing website URLs...")
        providers = await find_missing_websites(providers)

    # Identify providers needing service scraping
    to_scrape = []
    for p in providers:
        if not p.get("websiteUrl"):
            continue
        services = p.get("services", [])
        # Check if services are just placeholder "Massage"
        if not services or all(s.get("name") == "Massage" for s in services):
            to_scrape.append(p)

    print(f"\n{len(to_scrape)} providers need service menu scraping")
    print(f"Processing first {min(len(to_scrape), args.limit)}")

    # Output providers ready for Playwright scraping
    print("\n" + "=" * 60)
    print("PROVIDERS READY FOR PLAYWRIGHT SERVICE SCRAPING")
    print("=" * 60)

    for i, p in enumerate(to_scrape[:args.limit]):
        print(f"\n[{i+1}] {p['name']}")
        print(f"    Website: {p['websiteUrl']}")
        print(f"    Address: {p['address']}, {p['city']}, {p['state']}")
        print(f"    Rating: {p.get('googleRating', 'N/A')} ({p.get('googleReviewCount', 0)} reviews)")

        # Suggest menu paths to try
        menu_paths = ["/services", "/menu", "/pricing", "/spa-menu", "/massage"]
        print(f"    Try paths: {', '.join(menu_paths)}")

    # Save intermediate output
    output_path = args.output or str(input_path).replace(".json", "_enriched.json")
    output_data = {
        "metadata": {
            **data.get("metadata", {}),
            "enrichedAt": datetime.utcnow().isoformat(),
            "providersNeedingScraping": len(to_scrape),
        },
        "providers": providers,
        "toScrape": [
            {
                "name": p["name"],
                "websiteUrl": p["websiteUrl"],
                "address": p["address"],
                "city": p["city"],
            }
            for p in to_scrape[:args.limit]
        ],
    }

    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"\nSaved to {output_path}")
    print("\nNext step: Use Playwright to scrape service menus from these websites")

    return 0


if __name__ == "__main__":
    exit(asyncio.run(main()))
