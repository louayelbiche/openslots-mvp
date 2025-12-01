"""Tests for scraper utilities."""

import pytest

from scraper.utils.hash import (
    content_hash,
    normalize_url,
    normalize_phone,
    normalize_address,
    generate_provider_key,
)


class TestContentHash:
    """Tests for content_hash function."""

    def test_hash_consistency(self):
        """Test that same content produces same hash."""
        content = "Hello, World!"
        hash1 = content_hash(content)
        hash2 = content_hash(content)
        assert hash1 == hash2

    def test_hash_length(self):
        """Test hash is 16 characters."""
        assert len(content_hash("test")) == 16

    def test_hash_different_content(self):
        """Test different content produces different hash."""
        hash1 = content_hash("Hello")
        hash2 = content_hash("World")
        assert hash1 != hash2


class TestNormalizeUrl:
    """Tests for normalize_url function."""

    def test_lowercase_scheme_and_host(self):
        """Test URL is lowercased."""
        assert normalize_url("HTTPS://EXAMPLE.COM/Page") == "https://example.com/page"

    def test_remove_default_ports(self):
        """Test default ports are removed."""
        assert normalize_url("https://example.com:443/path") == "https://example.com/path"
        assert normalize_url("http://example.com:80/path") == "http://example.com/path"

    def test_remove_trailing_slash(self):
        """Test trailing slashes are removed."""
        assert normalize_url("https://example.com/") == "https://example.com"

    def test_remove_tracking_params(self):
        """Test tracking parameters are removed."""
        url = "https://example.com/page?utm_source=test&real_param=value"
        assert "utm_source" not in normalize_url(url)
        assert "real_param=value" in normalize_url(url)

    def test_remove_fragment(self):
        """Test fragments are removed."""
        url = "https://example.com/page#section"
        assert "#" not in normalize_url(url)


class TestNormalizePhone:
    """Tests for normalize_phone function."""

    def test_format_10_digit(self):
        """Test 10-digit number gets +1 prefix."""
        assert normalize_phone("3051234567") == "+13051234567"

    def test_format_with_dashes(self):
        """Test number with dashes."""
        assert normalize_phone("305-123-4567") == "+13051234567"

    def test_format_with_parens(self):
        """Test number with parentheses."""
        assert normalize_phone("(305) 123-4567") == "+13051234567"

    def test_keep_plus_prefix(self):
        """Test existing + prefix is kept."""
        assert normalize_phone("+13051234567") == "+13051234567"

    def test_11_digit_with_1(self):
        """Test 11-digit starting with 1."""
        assert normalize_phone("13051234567") == "+13051234567"


class TestNormalizeAddress:
    """Tests for normalize_address function."""

    def test_lowercase(self):
        """Test address is lowercased."""
        assert "main" in normalize_address("123 Main Street")

    def test_abbreviate_street(self):
        """Test street is abbreviated."""
        assert normalize_address("123 Main Street") == "123 main st"

    def test_abbreviate_avenue(self):
        """Test avenue is abbreviated."""
        assert normalize_address("456 Park Avenue") == "456 park ave"

    def test_abbreviate_directions(self):
        """Test directions are abbreviated."""
        result = normalize_address("123 North Main Street")
        assert "n" in result
        assert "north" not in result


class TestGenerateProviderKey:
    """Tests for generate_provider_key function."""

    def test_same_provider_same_key(self):
        """Test same provider generates same key."""
        key1 = generate_provider_key("Test Spa", "123 Main St", "Miami")
        key2 = generate_provider_key("Test Spa", "123 Main St", "Miami")
        assert key1 == key2

    def test_case_insensitive(self):
        """Test keys are case insensitive."""
        key1 = generate_provider_key("Test Spa", "123 Main St", "Miami")
        key2 = generate_provider_key("TEST SPA", "123 MAIN ST", "MIAMI")
        assert key1 == key2

    def test_key_length(self):
        """Test key is 16 characters."""
        key = generate_provider_key("Test Spa", "123 Main St", "Miami")
        assert len(key) == 16

    def test_different_provider_different_key(self):
        """Test different providers have different keys."""
        key1 = generate_provider_key("Test Spa", "123 Main St", "Miami")
        key2 = generate_provider_key("Other Spa", "456 Oak Ave", "Miami")
        assert key1 != key2
