"""Tests for scraper schemas."""

import pytest
from datetime import datetime

from scraper.schemas import (
    ScrapedProvider,
    ScrapedService,
    ScrapedSource,
    ServiceCategory,
    SourceType,
)


class TestScrapedService:
    """Tests for ScrapedService dataclass."""

    def test_create_basic_service(self):
        """Test creating a basic service."""
        service = ScrapedService(
            category=ServiceCategory.MASSAGE,
            name="Swedish Massage",
        )
        assert service.category == ServiceCategory.MASSAGE
        assert service.name == "Swedish Massage"
        assert service.description is None
        assert service.base_price_cents is None

    def test_create_full_service(self):
        """Test creating a service with all fields."""
        service = ScrapedService(
            category=ServiceCategory.NAILS,
            name="Gel Manicure",
            description="Long-lasting gel polish",
            base_price_cents=3500,
            duration_min=45,
            add_ons=["Nail Art", "Cuticle Treatment"],
        )
        assert service.base_price_cents == 3500
        assert service.duration_min == 45
        assert len(service.add_ons) == 2

    def test_service_to_dict(self):
        """Test service serialization."""
        service = ScrapedService(
            category=ServiceCategory.HAIR,
            name="Haircut",
            base_price_cents=4500,
        )
        data = service.to_dict()
        assert data["category"] == "HAIR"
        assert data["name"] == "Haircut"
        assert data["basePriceCents"] == 4500


class TestScrapedProvider:
    """Tests for ScrapedProvider dataclass."""

    def test_create_minimal_provider(self):
        """Test creating a provider with minimum fields."""
        provider = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
        )
        assert provider.name == "Test Spa"
        assert provider.country == "US"
        assert provider.confidence == 1.0

    def test_provider_validation_success(self):
        """Test validation passes for valid provider."""
        provider = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
            services=[ScrapedService(
                category=ServiceCategory.MASSAGE,
                name="Swedish Massage",
            )],
            sources=[ScrapedSource(
                type=SourceType.WEBSITE,
                url="https://example.com",
                fetched_at=datetime.utcnow(),
                raw_data_hash="abc123",
            )],
        )
        errors = provider.validate()
        assert errors == []

    def test_provider_validation_missing_name(self):
        """Test validation fails when name is missing."""
        provider = ScrapedProvider(
            name="",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
        )
        errors = provider.validate()
        assert "name is required" in errors

    def test_provider_validation_no_services(self):
        """Test validation fails when services are missing."""
        provider = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
        )
        errors = provider.validate()
        assert "at least one service is required" in errors

    def test_provider_source_version(self):
        """Test source version hash generation."""
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
        )
        # Same data should produce same hash
        assert provider1.source_version == provider2.source_version

        # Different data should produce different hash
        provider3 = ScrapedProvider(
            name="Different Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
        )
        assert provider1.source_version != provider3.source_version

    def test_provider_to_dict(self):
        """Test provider serialization."""
        provider = ScrapedProvider(
            name="Test Spa",
            address="123 Main St",
            city="Miami",
            state="FL",
            zip_code="33101",
            phone="+13051234567",
            latitude=25.7617,
            longitude=-80.1918,
        )
        data = provider.to_dict()
        assert data["name"] == "Test Spa"
        assert data["zipCode"] == "33101"
        assert data["phone"] == "+13051234567"
        assert data["latitude"] == 25.7617


class TestServiceCategory:
    """Tests for ServiceCategory enum."""

    def test_all_categories_exist(self):
        """Verify all 6 categories exist."""
        categories = list(ServiceCategory)
        assert len(categories) == 6
        assert ServiceCategory.MASSAGE in categories
        assert ServiceCategory.ACUPUNCTURE in categories
        assert ServiceCategory.NAILS in categories
        assert ServiceCategory.HAIR in categories
        assert ServiceCategory.FACIALS_AND_SKIN in categories
        assert ServiceCategory.LASHES_AND_BROWS in categories

    def test_category_values(self):
        """Test category string values."""
        assert ServiceCategory.MASSAGE.value == "MASSAGE"
        assert ServiceCategory.FACIALS_AND_SKIN.value == "FACIALS_AND_SKIN"
