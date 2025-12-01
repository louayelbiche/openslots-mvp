"""
Google Places Source

Fetches provider data from Google Places API.
"""

from datetime import datetime
from typing import AsyncIterator, Optional

from ..config import get_settings, RateLimiter
from ..schemas import (
    ScrapedProvider,
    ScrapedService,
    ScrapedSource,
    ServiceCategory,
    SourceType,
)
from ..utils import HttpClient, content_hash
from .base import BaseSource, SourceResult


# Mapping from Google place types to OpenSlots categories
PLACE_TYPE_MAPPING: dict[str, ServiceCategory] = {
    "spa": ServiceCategory.MASSAGE,
    "health": ServiceCategory.MASSAGE,
    "beauty_salon": ServiceCategory.HAIR,
    "hair_care": ServiceCategory.HAIR,
    "hair_salon": ServiceCategory.HAIR,
    "nail_salon": ServiceCategory.NAILS,
}

# Search queries for each category
CATEGORY_SEARCH_QUERIES: dict[ServiceCategory, list[str]] = {
    ServiceCategory.MASSAGE: [
        "massage spa", "massage therapy", "therapeutic massage",
        "deep tissue massage", "sports massage", "thai massage",
        "swedish massage", "reflexology", "shiatsu massage",
        "hot stone massage", "prenatal massage", "couples massage",
        "aromatherapy massage", "lymphatic massage", "trigger point massage"
    ],
    ServiceCategory.ACUPUNCTURE: ["acupuncture", "acupuncture clinic", "chinese medicine"],
    ServiceCategory.NAILS: ["nail salon", "manicure pedicure", "nail spa"],
    ServiceCategory.HAIR: ["hair salon", "barber shop", "hairdresser"],
    ServiceCategory.FACIALS_AND_SKIN: ["facial spa", "skincare", "esthetician"],
    ServiceCategory.LASHES_AND_BROWS: ["lash extensions", "brow bar", "eyelash salon"],
}

# NYC neighborhoods for expanded searches - comprehensive coverage
NYC_NEIGHBORHOODS: list[str] = [
    # Manhattan
    "Lower Manhattan", "Financial District", "Tribeca", "SoHo", "NoHo", "Chinatown",
    "Little Italy", "Lower East Side", "East Village", "West Village", "Greenwich Village",
    "Chelsea", "Flatiron", "Gramercy", "Murray Hill", "Midtown East", "Midtown West",
    "Hell's Kitchen", "Times Square", "Upper East Side", "Upper West Side",
    "Harlem", "East Harlem", "Washington Heights", "Inwood",
    # Brooklyn
    "Brooklyn", "Williamsburg", "Greenpoint", "Bushwick", "Park Slope", "DUMBO",
    "Brooklyn Heights", "Carroll Gardens", "Cobble Hill", "Boerum Hill", "Fort Greene",
    "Clinton Hill", "Bed-Stuy", "Crown Heights", "Prospect Heights", "Bay Ridge",
    "Sunset Park", "Bensonhurst", "Flatbush", "Sheepshead Bay", "Coney Island",
    # Queens
    "Queens", "Astoria", "Long Island City", "Sunnyside", "Woodside", "Jackson Heights",
    "Elmhurst", "Flushing", "Forest Hills", "Rego Park", "Jamaica", "Bayside",
    "Ridgewood", "Glendale", "Fresh Meadows", "Whitestone",
    # Bronx
    "Bronx", "South Bronx", "Mott Haven", "Hunts Point", "Fordham", "Riverdale",
    "Kingsbridge", "Pelham Bay", "Throggs Neck", "Morris Park", "Belmont",
    # Staten Island
    "Staten Island", "St. George", "Stapleton", "Tompkinsville", "New Dorp",
    "Tottenville", "Great Kills"
]

# Coordinate-based search points for dense coverage (lat, lng, radius_meters)
NYC_SEARCH_POINTS: list[tuple[float, float, int]] = [
    # Manhattan grid
    (40.7128, -74.0060, 2000),   # Lower Manhattan
    (40.7282, -73.9942, 2000),   # NoHo/East Village
    (40.7484, -73.9857, 2000),   # Midtown
    (40.7614, -73.9776, 2000),   # Upper Midtown
    (40.7794, -73.9632, 2000),   # Upper East Side
    (40.7870, -73.9754, 2000),   # Upper West Side
    (40.8116, -73.9465, 2000),   # Harlem
    # Brooklyn
    (40.6892, -73.9857, 2000),   # Downtown Brooklyn
    (40.7081, -73.9571, 2000),   # Williamsburg
    (40.6782, -73.9442, 2000),   # Crown Heights
    (40.6501, -73.9496, 2000),   # Flatbush
    # Queens
    (40.7580, -73.9855, 2000),   # Long Island City
    (40.7644, -73.9235, 2000),   # Astoria
    (40.7614, -73.8303, 2000),   # Flushing
    # Bronx
    (40.8448, -73.8648, 2000),   # South Bronx
    (40.8818, -73.8787, 2000),   # Fordham
]


class GooglePlacesSource(BaseSource):
    """
    Fetches provider data from Google Places API.

    This source:
    - Requires GOOGLE_API_KEY environment variable
    - Has highest priority for conflict resolution
    - Provides structured data (name, address, hours, rating)
    - Rate limited to protect API quota
    """

    def __init__(self, rate_limiter: Optional[RateLimiter] = None):
        self.settings = get_settings()
        self.rate_limiter = rate_limiter or RateLimiter()
        self.api_key = self.settings.google_api_key
        self.base_url = "https://maps.googleapis.com/maps/api/place"

    @property
    def source_type(self) -> SourceType:
        return SourceType.GOOGLE_MAPS

    def get_priority(self) -> int:
        return 100  # Highest priority

    @property
    def is_enabled(self) -> bool:
        return bool(self.api_key)

    async def fetch(self, place_id: str) -> SourceResult:
        """
        Fetch details for a single place by ID.

        Args:
            place_id: Google Place ID

        Returns:
            SourceResult with provider data
        """
        if not self.is_enabled:
            return SourceResult(
                error="Google Places API not configured (missing GOOGLE_API_KEY)",
                source_url=f"places:{place_id}",
                source_type=self.source_type,
            )

        try:
            async with HttpClient(rate_limiter=self.rate_limiter) as client:
                url = f"{self.base_url}/details/json"
                params = {
                    "place_id": place_id,
                    "key": self.api_key,
                    "fields": ",".join([
                        "name",
                        "formatted_address",
                        "address_components",
                        "geometry",
                        "formatted_phone_number",
                        "website",
                        "opening_hours",
                        "rating",
                        "user_ratings_total",
                        "types",
                    ]),
                }

                full_url = f"{url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
                response = await client.get(full_url, source_type="google_places")

                if not response.ok:
                    return SourceResult(
                        error=f"Google API error: HTTP {response.status}",
                        source_url=full_url,
                        source_type=self.source_type,
                    )

                import json
                data = json.loads(response.content)

                if data.get("status") != "OK":
                    return SourceResult(
                        error=f"Google API error: {data.get('status')}",
                        source_url=full_url,
                        source_type=self.source_type,
                    )

                provider = self._parse_place_details(data.get("result", {}))

                if provider:
                    provider.sources.append(ScrapedSource(
                        type=self.source_type,
                        url=f"https://www.google.com/maps/place/?q=place_id:{place_id}",
                        fetched_at=datetime.utcnow(),
                        raw_data_hash=content_hash(response.content),
                    ))

                    return SourceResult(
                        provider=provider,
                        raw_data=response.content,
                        source_url=full_url,
                        source_type=self.source_type,
                    )

                return SourceResult(
                    error="Could not parse place details",
                    raw_data=response.content,
                    source_url=full_url,
                    source_type=self.source_type,
                )

        except Exception as e:
            return SourceResult(
                error=str(e),
                source_url=f"places:{place_id}",
                source_type=self.source_type,
            )

    async def search(
        self,
        city: str,
        category: str,
        **kwargs,
    ) -> AsyncIterator[SourceResult]:
        """
        Search for providers in a city by category.

        Args:
            city: City name to search
            category: Service category (e.g., "MASSAGE")
            **kwargs: Additional parameters (max_results, etc.)

        Yields:
            SourceResult for each found provider
        """
        if not self.is_enabled:
            yield SourceResult(
                error="Google Places API not configured",
                source_url="",
                source_type=self.source_type,
            )
            return

        max_results = kwargs.get("max_results", 60)

        # Get search queries for this category
        try:
            cat = ServiceCategory(category)
        except ValueError:
            yield SourceResult(
                error=f"Invalid category: {category}",
                source_url="",
                source_type=self.source_type,
            )
            return

        queries = CATEGORY_SEARCH_QUERIES.get(cat, [cat.value.lower()])
        results_count = 0
        seen_place_ids: set[str] = set()

        # Determine locations to search
        is_nyc = city.lower() in ["new york city", "nyc", "new york"]
        use_coordinates = kwargs.get("use_coordinates", True) and is_nyc

        # Phase 1: Text-based neighborhood searches
        locations = NYC_NEIGHBORHOODS if is_nyc else [city]

        for location in locations:
            if results_count >= max_results:
                break

            for query in queries:
                if results_count >= max_results:
                    break

                search_query = f"{query} in {location}, NYC" if is_nyc else f"{query} in {city}"
                async for result in self._text_search(search_query, cat, max_results - results_count, seen_place_ids):
                    yield result
                    if result.success:
                        results_count += 1
                    if results_count >= max_results:
                        break

        # Phase 2: Coordinate-based nearby searches (for dense NYC coverage)
        if use_coordinates and results_count < max_results:
            for lat, lng, radius in NYC_SEARCH_POINTS:
                if results_count >= max_results:
                    break

                for query in queries[:3]:  # Use top 3 queries for coordinate searches
                    if results_count >= max_results:
                        break

                    async for result in self._nearby_search(
                        query, lat, lng, radius, cat, max_results - results_count, seen_place_ids
                    ):
                        yield result
                        if result.success:
                            results_count += 1
                        if results_count >= max_results:
                            break

    async def _text_search(
        self,
        query: str,
        category: ServiceCategory,
        max_results: int,
        seen_place_ids: set[str] | None = None,
    ) -> AsyncIterator[SourceResult]:
        """Perform text search and yield results."""
        if seen_place_ids is None:
            seen_place_ids = set()

        try:
            async with HttpClient(rate_limiter=self.rate_limiter) as client:
                url = f"{self.base_url}/textsearch/json"
                params = {
                    "query": query,
                    "key": self.api_key,
                    "type": "establishment",
                }

                next_page_token = None
                results_yielded = 0

                while results_yielded < max_results:
                    if next_page_token:
                        params["pagetoken"] = next_page_token

                    full_url = f"{url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
                    response = await client.get(full_url, source_type="google_places")

                    if not response.ok:
                        yield SourceResult(
                            error=f"Search failed: HTTP {response.status}",
                            source_url=full_url,
                            source_type=self.source_type,
                        )
                        return

                    import json
                    data = json.loads(response.content)

                    status = data.get("status")
                    if status not in ["OK", "ZERO_RESULTS"]:
                        # Handle rate limiting with backoff
                        if status in ["OVER_QUERY_LIMIT", "REQUEST_DENIED"]:
                            import asyncio
                            await asyncio.sleep(5)  # Wait and continue to next query
                        yield SourceResult(
                            error=f"Search error: {status}",
                            source_url=full_url,
                            source_type=self.source_type,
                        )
                        return

                    # Process results
                    for place in data.get("results", []):
                        if results_yielded >= max_results:
                            return

                        place_id = place.get("place_id")
                        if place_id:
                            # Skip already seen places (dedup at API level)
                            if place_id in seen_place_ids:
                                continue
                            seen_place_ids.add(place_id)

                            # Fetch full details
                            result = await self.fetch(place_id)

                            # Add category-based service if we have a provider
                            if result.provider and not result.provider.services:
                                result.provider.services.append(ScrapedService(
                                    category=category,
                                    name=category.value.replace("_", " ").title(),
                                ))

                            yield result
                            results_yielded += 1

                    # Check for more pages
                    next_page_token = data.get("next_page_token")
                    if not next_page_token:
                        break

                    # Google requires delay before using page token
                    import asyncio
                    await asyncio.sleep(2)

        except Exception as e:
            yield SourceResult(
                error=str(e),
                source_url="",
                source_type=self.source_type,
            )

    async def _nearby_search(
        self,
        keyword: str,
        lat: float,
        lng: float,
        radius: int,
        category: ServiceCategory,
        max_results: int,
        seen_place_ids: set[str] | None = None,
    ) -> AsyncIterator[SourceResult]:
        """Perform nearby search by coordinates and yield results."""
        if seen_place_ids is None:
            seen_place_ids = set()

        try:
            async with HttpClient(rate_limiter=self.rate_limiter) as client:
                url = f"{self.base_url}/nearbysearch/json"
                params = {
                    "location": f"{lat},{lng}",
                    "radius": str(radius),
                    "keyword": keyword,
                    "key": self.api_key,
                    "type": "spa",  # Filter to spa-type businesses
                }

                next_page_token = None
                results_yielded = 0

                while results_yielded < max_results:
                    if next_page_token:
                        params["pagetoken"] = next_page_token

                    full_url = f"{url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
                    response = await client.get(full_url, source_type="google_places")

                    if not response.ok:
                        yield SourceResult(
                            error=f"Nearby search failed: HTTP {response.status}",
                            source_url=full_url,
                            source_type=self.source_type,
                        )
                        return

                    import json
                    data = json.loads(response.content)

                    status = data.get("status")
                    if status not in ["OK", "ZERO_RESULTS"]:
                        # Handle rate limiting with backoff
                        if status in ["OVER_QUERY_LIMIT", "REQUEST_DENIED"]:
                            import asyncio
                            await asyncio.sleep(5)
                        yield SourceResult(
                            error=f"Nearby search error: {status}",
                            source_url=full_url,
                            source_type=self.source_type,
                        )
                        return

                    # Process results
                    for place in data.get("results", []):
                        if results_yielded >= max_results:
                            return

                        place_id = place.get("place_id")
                        if place_id:
                            # Skip already seen places
                            if place_id in seen_place_ids:
                                continue
                            seen_place_ids.add(place_id)

                            # Fetch full details
                            result = await self.fetch(place_id)

                            # Add category-based service if we have a provider
                            if result.provider and not result.provider.services:
                                result.provider.services.append(ScrapedService(
                                    category=category,
                                    name=category.value.replace("_", " ").title(),
                                ))

                            yield result
                            results_yielded += 1

                    # Check for more pages
                    next_page_token = data.get("next_page_token")
                    if not next_page_token:
                        break

                    # Google requires delay before using page token
                    import asyncio
                    await asyncio.sleep(2)

        except Exception as e:
            yield SourceResult(
                error=str(e),
                source_url="",
                source_type=self.source_type,
            )

    def _parse_place_details(self, place: dict) -> Optional[ScrapedProvider]:
        """Parse Google Places API response into ScrapedProvider."""
        name = place.get("name")
        if not name:
            return None

        # Parse address components
        address_parts = self._parse_address_components(place.get("address_components", []))

        # Parse opening hours
        opening_hours = {}
        hours_data = place.get("opening_hours", {})
        if hours_data.get("weekday_text"):
            for day_text in hours_data["weekday_text"]:
                parts = day_text.split(": ", 1)
                if len(parts) == 2:
                    day = parts[0].lower()
                    opening_hours[day] = parts[1]

        # Determine category from place types
        place_types = place.get("types", [])
        category = ServiceCategory.MASSAGE  # Default
        for ptype in place_types:
            if ptype in PLACE_TYPE_MAPPING:
                category = PLACE_TYPE_MAPPING[ptype]
                break

        # Get coordinates
        geometry = place.get("geometry", {})
        location = geometry.get("location", {})

        provider = ScrapedProvider(
            name=name,
            address=address_parts.get("street", place.get("formatted_address", "Unknown")),
            city=address_parts.get("city", "Unknown"),
            state=address_parts.get("state", "Unknown"),
            zip_code=address_parts.get("zip", "00000"),
            latitude=location.get("lat"),
            longitude=location.get("lng"),
            phone=place.get("formatted_phone_number"),
            website_url=place.get("website"),
            opening_hours=opening_hours,
            google_rating=place.get("rating"),
            google_review_count=place.get("user_ratings_total"),
            services=[ScrapedService(
                category=category,
                name=category.value.replace("_", " ").title(),
            )],
            confidence=0.95,  # High confidence for Google data
        )

        return provider

    def _parse_address_components(self, components: list[dict]) -> dict:
        """Parse Google address components into structured address."""
        result = {
            "street": "",
            "city": "",
            "state": "",
            "zip": "",
        }

        street_parts = []

        for component in components:
            types = component.get("types", [])

            if "street_number" in types:
                street_parts.insert(0, component.get("short_name", ""))
            elif "route" in types:
                street_parts.append(component.get("short_name", ""))
            elif "locality" in types:
                result["city"] = component.get("long_name", "")
            elif "administrative_area_level_1" in types:
                result["state"] = component.get("short_name", "")
            elif "postal_code" in types:
                result["zip"] = component.get("short_name", "")

        result["street"] = " ".join(street_parts)
        return result
