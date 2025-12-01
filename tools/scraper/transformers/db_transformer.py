"""
Database Transformer

Converts scraped provider data into database-ready format matching Prisma schema.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field, asdict


@dataclass
class DbService:
    """Service record matching Prisma Service model."""
    name: str
    category: str  # ServiceCategory enum value
    durationMin: int
    basePrice: int  # Price in cents
    description: Optional[str] = None


@dataclass
class DbProvider:
    """Provider record matching Prisma Provider model."""
    name: str
    address: str
    city: str
    state: str
    zipCode: str

    # Optional fields
    description: Optional[str] = None
    addressLine2: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: Optional[float] = None
    bookingUrl: Optional[str] = None

    # Related services
    services: list[DbService] = field(default_factory=list)

    # Source metadata (not in Prisma, for tracking)
    sourceId: Optional[str] = None  # Google Place ID or similar
    googleMapsUrl: Optional[str] = None
    phone: Optional[str] = None
    openingHours: Optional[dict] = None


@dataclass
class DbImportPayload:
    """Payload format for database import endpoint."""
    providers: list[DbProvider]
    metadata: dict = field(default_factory=dict)


class DatabaseTransformer:
    """
    Transforms scraped provider data into database-ready format.

    Reads from: tools/scraper/output/providers/*.json
    Writes to: tools/scraper/output/db_ready/*.json
    """

    # Default service durations by category (minutes)
    DEFAULT_DURATIONS = {
        "MASSAGE": 60,
        "ACUPUNCTURE": 45,
        "NAILS": 45,
        "HAIR": 60,
        "FACIALS_AND_SKIN": 60,
        "LASHES_AND_BROWS": 90,
    }

    # Default base prices by category (cents)
    DEFAULT_PRICES = {
        "MASSAGE": 12000,  # $120
        "ACUPUNCTURE": 10000,  # $100
        "NAILS": 5000,  # $50
        "HAIR": 8000,  # $80
        "FACIALS_AND_SKIN": 15000,  # $150
        "LASHES_AND_BROWS": 20000,  # $200
    }

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path(__file__).parent.parent / "output" / "db_ready"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def transform_file(self, input_path: Path) -> Path:
        """
        Transform a scraped providers file to database-ready format.

        Args:
            input_path: Path to scraped JSON file

        Returns:
            Path to the output database-ready JSON file
        """
        with open(input_path) as f:
            data = json.load(f)

        providers = []
        for raw_provider in data.get("providers", []):
            db_provider = self._transform_provider(raw_provider)
            if db_provider:
                providers.append(db_provider)

        # Build output payload
        payload = DbImportPayload(
            providers=providers,
            metadata={
                "source_file": str(input_path.name),
                "transformed_at": datetime.utcnow().isoformat(),
                "original_count": len(data.get("providers", [])),
                "transformed_count": len(providers),
                "city": data.get("metadata", {}).get("city"),
                "category": data.get("metadata", {}).get("category"),
            }
        )

        # Write output
        output_filename = f"db_ready_{input_path.stem}.json"
        output_path = self.output_dir / output_filename

        with open(output_path, "w") as f:
            json.dump(self._to_dict(payload), f, indent=2, default=str)

        return output_path

    def _transform_provider(self, raw: dict) -> Optional[DbProvider]:
        """Transform a single raw provider to database format."""
        # Skip providers with incomplete required data
        if not all([
            raw.get("name"),
            raw.get("address"),
            raw.get("city"),
            raw.get("state"),
            raw.get("zipCode"),
        ]):
            return None

        # Transform services
        services = []
        for raw_service in raw.get("services", []):
            db_service = self._transform_service(raw_service)
            if db_service:
                services.append(db_service)

        # If no services found, create a single default service based on category
        # This preserves real scraped data without mixing in fake variations
        if not services and raw.get("services"):
            category = raw["services"][0].get("category", "MASSAGE")
            services.append(DbService(
                name=self._default_service_name(category),
                category=category,
                durationMin=self.DEFAULT_DURATIONS.get(category, 60),
                basePrice=self.DEFAULT_PRICES.get(category, 10000),
            ))

        # Extract Google Maps URL from sources
        google_maps_url = None
        for source in raw.get("sources", []):
            if source.get("type") == "GOOGLE_MAPS":
                google_maps_url = source.get("url")
                break

        return DbProvider(
            name=raw["name"],
            address=raw["address"],
            city=raw["city"],
            state=raw["state"],
            zipCode=raw["zipCode"],
            description=raw.get("description"),
            addressLine2=raw.get("addressLine2"),
            latitude=raw.get("latitude"),
            longitude=raw.get("longitude"),
            rating=raw.get("googleRating"),
            bookingUrl=raw.get("websiteUrl"),
            services=services,
            sourceId=self._extract_place_id(raw),
            googleMapsUrl=google_maps_url,
            phone=raw.get("phone"),
            openingHours=raw.get("openingHours"),
        )

    def _transform_service(self, raw: dict) -> Optional[DbService]:
        """Transform a single raw service to database format."""
        category = raw.get("category")
        if not category:
            return None

        name = raw.get("name") or self._default_service_name(category)

        return DbService(
            name=name,
            category=category,
            durationMin=raw.get("durationMin") or self.DEFAULT_DURATIONS.get(category, 60),
            basePrice=raw.get("basePrice") or self.DEFAULT_PRICES.get(category, 10000),
            description=raw.get("description"),
        )

    def _default_service_name(self, category: str) -> str:
        """Generate default service name from category."""
        names = {
            "MASSAGE": "Massage Therapy",
            "ACUPUNCTURE": "Acupuncture Session",
            "NAILS": "Manicure & Pedicure",
            "HAIR": "Haircut & Style",
            "FACIALS_AND_SKIN": "Facial Treatment",
            "LASHES_AND_BROWS": "Lash Extensions",
        }
        return names.get(category, category.replace("_", " ").title())

    def _extract_place_id(self, raw: dict) -> Optional[str]:
        """Extract Google Place ID from sources."""
        for source in raw.get("sources", []):
            if source.get("type") == "GOOGLE_MAPS":
                url = source.get("url", "")
                # URL format: https://www.google.com/maps/place/?q=place_id:ChIJ...
                if "place_id:" in url:
                    return url.split("place_id:")[1].split("&")[0]
        return None

    def _to_dict(self, obj) -> dict:
        """Convert dataclass to dict, handling nested dataclasses."""
        if hasattr(obj, "__dataclass_fields__"):
            result = {}
            for field_name in obj.__dataclass_fields__:
                value = getattr(obj, field_name)
                if isinstance(value, list):
                    result[field_name] = [self._to_dict(item) for item in value]
                elif hasattr(value, "__dataclass_fields__"):
                    result[field_name] = self._to_dict(value)
                else:
                    result[field_name] = value
            return result
        return obj


def transform_latest(city: str = "new_york_city", category: str = "massage") -> Path:
    """
    Transform the latest scraped file for a city/category.

    Args:
        city: City name (lowercase, underscores)
        category: Category name (lowercase)

    Returns:
        Path to the transformed file
    """
    providers_dir = Path(__file__).parent.parent / "output" / "providers"

    # Find latest file matching pattern
    pattern = f"{city}_{category}_*.json"
    files = sorted(providers_dir.glob(pattern), reverse=True)

    if not files:
        raise FileNotFoundError(f"No files found matching {pattern} in {providers_dir}")

    latest = files[0]
    transformer = DatabaseTransformer()
    return transformer.transform_file(latest)


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        input_path = Path(sys.argv[1])
        transformer = DatabaseTransformer()
        output_path = transformer.transform_file(input_path)
        print(f"Transformed: {input_path} -> {output_path}")
    else:
        # Transform latest NYC massage file
        output_path = transform_latest("new_york_city", "massage")
        print(f"Transformed latest to: {output_path}")
