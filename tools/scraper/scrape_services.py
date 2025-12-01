#!/usr/bin/env python3
"""
Service Menu Scraper

Scrapes service menus from provider websites and enriches provider data.

This script is designed to be run with Claude Code's WebFetch tool.
It outputs prompts and processes results for batch service extraction.

Usage:
    # Generate prompts for manual WebFetch calls
    python scrape_services.py --input output/providers/nyc.json --generate-prompts

    # Process scraped results
    python scrape_services.py --input output/providers/nyc.json --results scraped_services.json
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from schemas import ScrapedService, ServiceCategory


# Standard prompt for service extraction
SERVICE_EXTRACTION_PROMPT = """Extract all massage/spa services with their names, prices, and durations from this page.

Return ONLY a JSON array with this exact format:
[{"name": "Service Name", "price": 55, "duration": 60, "category": "MASSAGE"}]

Rules:
- price: number only, no $ symbol, in dollars
- duration: number only, in minutes
- category: one of MASSAGE, ACUPUNCTURE, NAILS, HAIR, FACIALS_AND_SKIN, LASHES_AND_BROWS
- Only include services with visible prices
- If no services found, return: []

Do not include any explanation, just the JSON array."""


def load_providers(input_path: str) -> tuple[dict, list[dict]]:
    """Load providers from JSON file."""
    with open(input_path) as f:
        data = json.load(f)
    return data.get("metadata", {}), data.get("providers", [])


def get_providers_needing_services(providers: list[dict]) -> list[dict]:
    """Filter providers that need service scraping."""
    needs_scraping = []
    for p in providers:
        if not p.get("websiteUrl"):
            continue
        services = p.get("services", [])
        # Check if only has placeholder service
        if not services or all(s.get("name") == "Massage" for s in services):
            needs_scraping.append(p)
    return needs_scraping


def generate_prompts(providers: list[dict], limit: int = 10) -> list[dict]:
    """Generate WebFetch prompts for providers."""
    prompts = []
    for p in providers[:limit]:
        prompts.append({
            "provider_name": p["name"],
            "website_url": p["websiteUrl"],
            "prompt": SERVICE_EXTRACTION_PROMPT,
        })
    return prompts


def parse_service_json(json_str: str) -> list[dict]:
    """Parse service JSON from LLM response."""
    # Handle markdown code blocks
    if "```json" in json_str:
        json_str = json_str.split("```json")[1].split("```")[0]
    elif "```" in json_str:
        json_str = json_str.split("```")[1].split("```")[0]

    json_str = json_str.strip()

    try:
        services = json.loads(json_str)
        if isinstance(services, list):
            return services
    except json.JSONDecodeError:
        pass

    return []


def normalize_services(raw_services: list[dict]) -> list[dict]:
    """Normalize raw service data to schema format."""
    normalized = []

    for svc in raw_services:
        name = svc.get("name", "").strip()
        if not name:
            continue

        # Validate category
        category = svc.get("category", "MASSAGE")
        valid_categories = [c.value for c in ServiceCategory]
        if category not in valid_categories:
            category = "MASSAGE"

        # Build normalized service
        service = {
            "name": name,
            "category": category,
        }

        # Price in cents
        price = svc.get("price")
        if price and isinstance(price, (int, float)) and price > 0:
            service["basePriceCents"] = int(price * 100)

        # Duration
        duration = svc.get("duration")
        if duration and isinstance(duration, int) and duration > 0:
            service["durationMin"] = duration

        # Description
        if svc.get("description"):
            service["description"] = svc["description"][:500]

        normalized.append(service)

    return normalized


def enrich_provider(provider: dict, services: list[dict], source_url: str) -> dict:
    """Add scraped services to provider."""
    provider = provider.copy()

    if services:
        provider["services"] = services
        provider["servicesScrapedAt"] = datetime.now(timezone.utc).isoformat()
        provider["servicesSource"] = source_url

    return provider


def main():
    parser = argparse.ArgumentParser(description="Scrape service menus from provider websites")
    parser.add_argument("--input", required=True, help="Input JSON file with providers")
    parser.add_argument("--output", help="Output JSON file")
    parser.add_argument("--limit", type=int, default=10, help="Max providers to process")
    parser.add_argument("--generate-prompts", action="store_true", help="Generate WebFetch prompts")
    parser.add_argument("--results", help="JSON file with scraped results to merge")

    args = parser.parse_args()

    # Load providers
    metadata, providers = load_providers(args.input)
    print(f"Loaded {len(providers)} providers")

    # Find providers needing services
    needs_scraping = get_providers_needing_services(providers)
    print(f"Found {len(needs_scraping)} providers needing service scraping")

    if args.generate_prompts:
        # Generate prompts for WebFetch
        prompts = generate_prompts(needs_scraping, args.limit)

        print(f"\n{'='*60}")
        print("WEBFETCH PROMPTS FOR SERVICE EXTRACTION")
        print(f"{'='*60}\n")

        for i, p in enumerate(prompts):
            print(f"[{i+1}] {p['provider_name']}")
            print(f"    URL: {p['website_url']}")
            print(f"    Prompt: {SERVICE_EXTRACTION_PROMPT[:100]}...")
            print()

        # Save prompts to file
        prompts_file = Path(args.input).parent / "service_prompts.json"
        with open(prompts_file, "w") as f:
            json.dump(prompts, f, indent=2)
        print(f"Saved prompts to {prompts_file}")

    elif args.results:
        # Process scraped results
        with open(args.results) as f:
            results = json.load(f)

        # Build lookup by provider name
        results_by_name = {r["provider_name"]: r for r in results}

        # Enrich providers
        enriched = []
        enriched_count = 0

        for p in providers:
            if p["name"] in results_by_name:
                result = results_by_name[p["name"]]
                raw_services = parse_service_json(result.get("services_json", "[]"))
                services = normalize_services(raw_services)

                if services:
                    p = enrich_provider(p, services, result.get("website_url", ""))
                    enriched_count += 1
                    print(f"  {p['name']}: {len(services)} services")

            enriched.append(p)

        print(f"\nEnriched {enriched_count} providers with services")

        # Save output
        output_path = args.output or str(args.input).replace(".json", "_with_services.json")
        output_data = {
            "metadata": {
                **metadata,
                "enrichedAt": datetime.now(timezone.utc).isoformat(),
                "providersWithServices": enriched_count,
            },
            "providers": enriched,
        }

        with open(output_path, "w") as f:
            json.dump(output_data, f, indent=2)

        print(f"Saved to {output_path}")

    else:
        # Show stats
        print(f"\nUse --generate-prompts to create WebFetch prompts")
        print(f"Use --results <file> to merge scraped service data")


if __name__ == "__main__":
    main()
