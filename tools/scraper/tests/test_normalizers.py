"""Tests for scraper normalizers."""

import pytest

from scraper.schemas import ScrapedProvider, ScrapedService, ServiceCategory
from scraper.normalizers import (
    ProviderNormalizer,
    ServiceNormalizer,
    categorize_service,
    Deduplicator,
)


class TestProviderNormalizer:
    """Tests for ProviderNormalizer."""

    def test_normalize_name_removes_suffix(self):
        """Test that LLC/Inc suffixes are removed."""
        normalizer = ProviderNormalizer()
        provider = ScrapedProvider(
            name="Amazing Spa LLC",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
        )
        result = normalizer.normalize(provider)
        assert result.name == "Amazing Spa"

    def test_normalize_name_title_case(self):
        """Test that names are title cased."""
        normalizer = ProviderNormalizer()
        provider = ScrapedProvider(
            name="THE BEST SPA EVER",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
        )
        result = normalizer.normalize(provider)
        assert result.name == "The Best Spa Ever"

    def test_normalize_phone(self):
        """Test phone number normalization."""
        normalizer = ProviderNormalizer()
        provider = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
            phone="(305) 123-4567",
        )
        result = normalizer.normalize(provider)
        assert result.phone == "+13051234567"

    def test_normalize_state_full_name(self):
        """Test state full name to abbreviation."""
        normalizer = ProviderNormalizer()
        provider = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="Florida",
            zip_code="33101",
        )
        result = normalizer.normalize(provider)
        assert result.state == "FL"

    def test_normalize_url_adds_https(self):
        """Test URL normalization adds https."""
        normalizer = ProviderNormalizer()
        provider = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
            website_url="example.com",
        )
        result = normalizer.normalize(provider)
        assert result.website_url == "https://example.com"


class TestServiceNormalizer:
    """Tests for ServiceNormalizer."""

    def test_parse_price_dollars(self):
        """Test parsing dollar amounts."""
        normalizer = ServiceNormalizer()
        assert normalizer.parse_price("$50") == 5000
        assert normalizer.parse_price("50.00") == 5000
        assert normalizer.parse_price("$125.50") == 12550

    def test_parse_price_range(self):
        """Test parsing price ranges returns first value."""
        normalizer = ServiceNormalizer()
        assert normalizer.parse_price("$50-$100") == 5000

    def test_parse_duration_minutes(self):
        """Test parsing minute durations."""
        normalizer = ServiceNormalizer()
        assert normalizer.parse_duration("60 min") == 60
        assert normalizer.parse_duration("90 minutes") == 90
        assert normalizer.parse_duration("30m") == 30

    def test_parse_duration_hours(self):
        """Test parsing hour durations."""
        normalizer = ServiceNormalizer()
        assert normalizer.parse_duration("1 hour") == 60
        assert normalizer.parse_duration("1h 30m") == 90
        assert normalizer.parse_duration("2 hours") == 120


class TestCategorizeService:
    """Tests for categorize_service function."""

    def test_categorize_massage(self):
        """Test massage service categorization."""
        assert categorize_service("Swedish Massage") == ServiceCategory.MASSAGE
        assert categorize_service("Deep Tissue") == ServiceCategory.MASSAGE
        assert categorize_service("Hot Stone Therapy") == ServiceCategory.MASSAGE

    def test_categorize_nails(self):
        """Test nail service categorization."""
        assert categorize_service("Gel Manicure") == ServiceCategory.NAILS
        assert categorize_service("Pedicure") == ServiceCategory.NAILS
        assert categorize_service("Acrylic Nails") == ServiceCategory.NAILS

    def test_categorize_hair(self):
        """Test hair service categorization."""
        assert categorize_service("Haircut") == ServiceCategory.HAIR
        assert categorize_service("Color & Highlights") == ServiceCategory.HAIR
        assert categorize_service("Blowout") == ServiceCategory.HAIR

    def test_categorize_facials(self):
        """Test facial service categorization."""
        assert categorize_service("Hydrafacial") == ServiceCategory.FACIALS_AND_SKIN
        assert categorize_service("Anti-Aging Facial") == ServiceCategory.FACIALS_AND_SKIN

    def test_categorize_lashes(self):
        """Test lash/brow service categorization."""
        assert categorize_service("Lash Extensions") == ServiceCategory.LASHES_AND_BROWS
        assert categorize_service("Brow Shaping") == ServiceCategory.LASHES_AND_BROWS
        assert categorize_service("Microblading") == ServiceCategory.LASHES_AND_BROWS

    def test_categorize_acupuncture(self):
        """Test acupuncture service categorization."""
        assert categorize_service("Acupuncture Session") == ServiceCategory.ACUPUNCTURE
        assert categorize_service("Cupping Therapy") == ServiceCategory.ACUPUNCTURE

    def test_categorize_default(self):
        """Test unknown services default to massage."""
        assert categorize_service("Unknown Service XYZ") == ServiceCategory.MASSAGE


class TestDeduplicator:
    """Tests for Deduplicator."""

    def test_add_new_provider(self):
        """Test adding a new provider."""
        dedup = Deduplicator()
        provider = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
        )
        is_new, result = dedup.add(provider)
        assert is_new is True
        assert result.name == "Test Spa"
        assert dedup.count() == 1

    def test_add_duplicate_exact_match(self):
        """Test adding exact duplicate is merged."""
        dedup = Deduplicator()
        provider1 = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
        )
        provider2 = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
            phone="+13051234567",  # Additional info
        )

        dedup.add(provider1)
        is_new, result = dedup.add(provider2)

        assert is_new is False
        assert result.phone == "+13051234567"
        assert dedup.count() == 1

    def test_add_duplicate_by_phone(self):
        """Test duplicate detection by phone number."""
        dedup = Deduplicator()
        provider1 = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
            phone="+13051234567",
        )
        provider2 = ScrapedProvider(
            name="Test Spa (New Name)",
            address="456 Other St",
            city="Miami",
            state="FL",
            zip_code="33102",
            phone="+13051234567",  # Same phone
        )

        dedup.add(provider1)
        is_new, _ = dedup.add(provider2)

        assert is_new is False
        assert dedup.count() == 1

    def test_find_duplicates(self):
        """Test finding potential duplicates."""
        dedup = Deduplicator()
        provider1 = ScrapedProvider(
            name="Amazing Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
            phone="+13051234567",
        )
        dedup.add(provider1)

        # Search for potential duplicates
        provider2 = ScrapedProvider(
            name="Amazing Spa & Wellness",
            address="456 Other St",
            city="Miami",
            state="FL",
            zip_code="33102",
        )

        matches = dedup.find_duplicates(provider2)
        assert len(matches) > 0
        assert matches[0].match_reasons == ["fuzzy_name"]
