"""
Service Normalizer

Normalizes and categorizes scraped service data.
"""

import re
from typing import Optional

from ..schemas import ScrapedService, ServiceCategory


# Keywords that map to service categories
CATEGORY_KEYWORDS: dict[ServiceCategory, list[str]] = {
    ServiceCategory.MASSAGE: [
        "massage", "swedish", "deep tissue", "hot stone", "thai massage",
        "sports massage", "prenatal massage", "aromatherapy massage",
        "shiatsu", "reflexology", "body work", "therapeutic massage",
    ],
    ServiceCategory.ACUPUNCTURE: [
        "acupuncture", "cupping", "moxibustion", "chinese medicine",
        "tcm", "traditional chinese", "dry needling", "meridian",
    ],
    ServiceCategory.NAILS: [
        "manicure", "pedicure", "nail", "gel polish", "acrylic nails",
        "nail art", "shellac", "dip powder", "nail extension",
    ],
    ServiceCategory.HAIR: [
        "haircut", "hair color", "highlights", "balayage", "blowout",
        "hair styling", "keratin", "perm", "hair treatment", "barber",
        "trim", "cut and style", "hair", "coloring", "ombre",
    ],
    ServiceCategory.FACIALS_AND_SKIN: [
        "facial", "skincare", "skin care", "microdermabrasion", "chemical peel",
        "hydrafacial", "dermaplaning", "skin treatment", "anti-aging",
        "acne treatment", "skin rejuvenation", "led therapy",
    ],
    ServiceCategory.LASHES_AND_BROWS: [
        "lash", "eyelash", "lash extension", "lash lift", "brow",
        "eyebrow", "brow shaping", "brow tint", "microblading",
        "lash tint", "brow lamination", "lash perm",
    ],
}


def categorize_service(name: str, description: Optional[str] = None) -> ServiceCategory:
    """
    Categorize a service based on its name and description.

    Args:
        name: Service name
        description: Optional service description

    Returns:
        Best matching ServiceCategory
    """
    text = f"{name} {description or ''}".lower()

    # Count keyword matches for each category
    scores: dict[ServiceCategory, int] = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[category] = score

    # Return highest scoring category, or default to MASSAGE
    if scores:
        return max(scores, key=lambda c: scores[c])

    return ServiceCategory.MASSAGE


class ServiceNormalizer:
    """
    Normalizes service data for consistency.

    Normalizations:
    - Standardize service names
    - Ensure category is set
    - Normalize prices to cents
    - Validate duration values
    """

    def normalize(self, service: ScrapedService) -> ScrapedService:
        """
        Normalize a scraped service.

        Args:
            service: Raw scraped service data

        Returns:
            Normalized service
        """
        # Normalize name
        service.name = self._normalize_name(service.name)

        # Normalize description
        if service.description:
            service.description = self._normalize_description(service.description)

        # Ensure category is set
        if not service.category:
            service.category = categorize_service(service.name, service.description)

        # Validate prices
        if service.base_price_cents is not None and service.base_price_cents < 0:
            service.base_price_cents = None

        if service.price_range_min_cents is not None and service.price_range_min_cents < 0:
            service.price_range_min_cents = None

        if service.price_range_max_cents is not None and service.price_range_max_cents < 0:
            service.price_range_max_cents = None

        # Validate duration
        if service.duration_min is not None and service.duration_min <= 0:
            service.duration_min = None

        return service

    def _normalize_name(self, name: str) -> str:
        """Normalize service name."""
        if not name:
            return name

        # Remove extra whitespace
        name = re.sub(r"\s+", " ", name.strip())

        # Title case if needed
        if name.isupper() or name.islower():
            name = name.title()

        return name

    def _normalize_description(self, description: str) -> str:
        """Normalize service description."""
        if not description:
            return description

        # Remove extra whitespace
        description = re.sub(r"\s+", " ", description.strip())

        # Limit length
        if len(description) > 500:
            description = description[:497] + "..."

        return description

    def parse_price(self, price_str: str) -> Optional[int]:
        """
        Parse a price string to cents.

        Args:
            price_str: Price string (e.g., "$50", "50.00", "$50-$100")

        Returns:
            Price in cents, or None if unparseable
        """
        if not price_str:
            return None

        # Remove currency symbols and whitespace
        cleaned = re.sub(r"[$\s]", "", price_str)

        # Handle range (take first value)
        if "-" in cleaned:
            cleaned = cleaned.split("-")[0]

        # Try to parse
        try:
            # Handle decimal
            if "." in cleaned:
                dollars = float(cleaned)
            else:
                dollars = int(cleaned)

            return int(dollars * 100)

        except ValueError:
            return None

    def parse_duration(self, duration_str: str) -> Optional[int]:
        """
        Parse a duration string to minutes.

        Args:
            duration_str: Duration string (e.g., "60 min", "1 hour", "1h 30m")

        Returns:
            Duration in minutes, or None if unparseable
        """
        if not duration_str:
            return None

        duration_str = duration_str.lower()
        total_minutes = 0

        # Look for hours
        hour_match = re.search(r"(\d+)\s*(?:hour|hr|h)", duration_str)
        if hour_match:
            total_minutes += int(hour_match.group(1)) * 60

        # Look for minutes
        min_match = re.search(r"(\d+)\s*(?:minute|min|m)", duration_str)
        if min_match:
            total_minutes += int(min_match.group(1))

        # If no units found, assume minutes
        if total_minutes == 0:
            try:
                total_minutes = int(re.sub(r"[^\d]", "", duration_str))
            except ValueError:
                return None

        return total_minutes if total_minutes > 0 else None
