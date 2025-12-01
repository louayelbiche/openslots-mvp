"""
Hashing and URL Normalization Utilities

Tools for content hashing and URL normalization for deduplication.
"""

import hashlib
import re
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode


def content_hash(content: str) -> str:
    """
    Generate SHA-256 hash of content.

    Args:
        content: String content to hash

    Returns:
        First 16 characters of hex-encoded SHA-256 hash
    """
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def normalize_url(url: str) -> str:
    """
    Normalize URL for deduplication.

    Normalizations applied:
    - Lowercase scheme and host
    - Remove default ports (80, 443)
    - Remove trailing slashes
    - Sort query parameters
    - Remove common tracking parameters
    - Remove fragments

    Args:
        url: URL to normalize

    Returns:
        Normalized URL string
    """
    parsed = urlparse(url.lower())

    # Remove default ports
    netloc = parsed.netloc
    if netloc.endswith(":80"):
        netloc = netloc[:-3]
    elif netloc.endswith(":443"):
        netloc = netloc[:-4]

    # Normalize path
    path = parsed.path.rstrip("/") or "/"

    # Remove common tracking parameters
    tracking_params = {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "fbclid", "gclid", "ref", "source", "mc_cid", "mc_eid",
    }
    query_params = parse_qs(parsed.query)
    filtered_params = {
        k: v for k, v in query_params.items()
        if k.lower() not in tracking_params
    }

    # Sort and encode query params
    sorted_query = urlencode(sorted(filtered_params.items()), doseq=True)

    # Rebuild URL without fragment
    normalized = urlunparse((
        parsed.scheme,
        netloc,
        path,
        "",  # params
        sorted_query,
        "",  # fragment
    ))

    return normalized


def normalize_phone(phone: str) -> str:
    """
    Normalize phone number to E.164-like format.

    Args:
        phone: Phone number string

    Returns:
        Normalized phone number (digits only with optional +1 prefix)
    """
    # Remove all non-digit characters except +
    digits = re.sub(r"[^\d+]", "", phone)

    # If it starts with +, keep it; otherwise assume US
    if digits.startswith("+"):
        return digits
    elif len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    else:
        return digits


def normalize_address(address: str) -> str:
    """
    Normalize address for comparison.

    Args:
        address: Address string

    Returns:
        Normalized address
    """
    # Common abbreviations
    replacements = {
        r"\bstreet\b": "st",
        r"\bavenue\b": "ave",
        r"\bboulevard\b": "blvd",
        r"\bdrive\b": "dr",
        r"\broad\b": "rd",
        r"\blane\b": "ln",
        r"\bcourt\b": "ct",
        r"\bplace\b": "pl",
        r"\bsuite\b": "ste",
        r"\bapartment\b": "apt",
        r"\bnorth\b": "n",
        r"\bsouth\b": "s",
        r"\beast\b": "e",
        r"\bwest\b": "w",
    }

    normalized = address.lower().strip()
    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)

    # Remove extra whitespace
    normalized = re.sub(r"\s+", " ", normalized)

    return normalized


def generate_provider_key(name: str, address: str, city: str) -> str:
    """
    Generate a unique key for provider deduplication.

    Args:
        name: Provider name
        address: Provider address
        city: Provider city

    Returns:
        Unique hash key for the provider
    """
    # Normalize components
    normalized_name = re.sub(r"[^\w\s]", "", name.lower()).strip()
    normalized_address = normalize_address(address)
    normalized_city = city.lower().strip()

    key_string = f"{normalized_name}|{normalized_address}|{normalized_city}"
    return hashlib.sha256(key_string.encode()).hexdigest()[:16]
