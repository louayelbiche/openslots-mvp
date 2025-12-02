"""
Service Name Cleanup Rules (Section 5 of scraper.md)

This module cleans scraped service names according to the documented rules:
1. Remove non-service text (reviews, marketing, credentials, etc.)
2. Remove personal info (emails, phones, addresses)
3. Fix formatting (numbered prefixes, slugs, punctuation, title case)
4. Normalize & merge duplicates (case, duration, staff names, plurals)
5. Add universal service (e.g., "Massage (All Types)")
6. LLM-assisted filtering for ambiguous cases
"""

import re
import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path

# Load .env file
from dotenv import load_dotenv
load_dotenv()  # Loads from .env in current dir or parent dirs

# Try to import anthropic for LLM filtering
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


# Keywords that indicate non-service text
REJECT_PATTERNS = [
    # Reviews/testimonials
    r'^I\s+',
    r'^my\s+',
    r'^we\s+',
    r'^the\s+best',
    r'^amazing',
    r'^great\s+',
    r'^love\s+',
    r'^highly\s+recommend',
    r'never\s+had\s+a\s+massage',

    # Marketing copy
    r'^welcome\s+to',
    r'#\d+\s+',
    r'all\s+rights\s+reserved',
    r'copyright',
    r'®|™',
    r'gift\s*box',
    r'holiday\s+season',
    r'head\s+start',
    r'share\s+relaxation',
    r'when\s+gifting',
    r'extra\s+minutes',
    r'selected\s+experiences',
    r'it\'?s\s+your\s+chance',
    r'get\s+your\s+',
    r'discover\s+true',
    r'best\s+relaxation',
    r'\bfor\s*$',  # Ends with "FOR"

    # Business names and locations
    r'massage\s+spa\s+in\s+',
    r'day\s+spa\s+–',
    r'spa\s+in\s+\w+\s+nyc',
    r'\bnyc\b.*\b(massage|spa)\b',
    r'\b(massage|spa)\b.*\bnyc\b',
    r'chinatown',
    r'tribeca',
    r'manhattan',
    r'brooklyn',
    r'union\s+sq',

    # Credentials
    r'\bLMT\b',
    r'\bCMT\b',
    r'licensed\s+massage\s+therapist',
    r'certified\s+',

    # Benefits/descriptions
    r'massage\s+benefits',
    r'affordable',
    r'pricepoint',
    r'relaxation\s+and\s+',
    r'^of\s+massage$',

    # Package counts
    r'^\d+\s+massages?\s*$',

    # Personal info
    r'@[\w.-]+\.\w+',  # Email
    r'\(\d{3}\)\s*\d{3}[-.]?\d{4}',  # Phone
    r'\d{3}[-.]?\d{3}[-.]?\d{4}',  # Phone

    # URL slugs
    r'^[\w-]+-[\w-]+-[\w-]+-[\w-]+',
    r'amenities',
    r'welcome-treats',

    # Incomplete/fragment patterns
    r'^&\s+\w+$',
    r'^\w+\s+&$',
    r'^more$',
    r'^skincare\s+&\s+more$',

    # Taglines and slogans
    r'^an?\s+oasis\s+of',
    r'and\s+rituals$',
    r'^massages\s+and\s+',
    r'experience\s+the\s+',
    r'your\s+journey',
    r'escape\s+to',
    r'indulge\s+in',

    # Questions/article titles (only when clearly educational, not service names)
    r'^what\s+is\s+a\s+\w+\s+massage\?',  # "What is a Swedish Massage?"
    r'^how\s+to\s+get\s+',
    r'^why\s+you\s+should\s+',
    r'benefits\s+you\s+should\s+know',

    # Numbered list article titles (must be long enough to be an article)
    r'^\d+\s+ways\s+.{20,}',  # "7 Ways a Facial Can Rescue..."
    r'^\d+\s+reasons\s+.{15,}',
    r'^\d+\s+tips\s+for\s+',

    # Testimonial fragments (specific patterns from real bad data)
    r'made\s+me\s+feel\s+welcome',
    r'one\s+of\s+the\s+best\s+.{10,}',  # Long testimonials only
    r'best\s+.{5,}\s+i\'?ve?\s+(ever\s+)?had',
    r'will\s+definitely\s+be\s+back',
    r'can\'?t\s+wait\s+to\s+come\s+back',

    # Location-based marketing (specific patterns)
    r'best\s+(massage|spa|experience)\s+in\s+(new\s+york|nyc|manhattan)',
    r'(massage|spa)\s+in\s+.{5,},?\s*(ny|nyc)\s*\d*!*$',  # "Massage in New York,ny 10011!"

    # Marketing with trailing "with" (incomplete sentence)
    r'experience\s+in\s+new\s+york\s+with\s*$',
    r'enhance\s+your\s+.{10,}\s+with\s*$',

    # CTA/booking patterns (not service names)
    r'^book\s+(your|a|now)',  # "Book Your Personalized...", "Book a..."
    r'book\s+now\s*$',
    r'schedule\s+(your|a)\s+',

    # SEO keywords
    r'\bnear\s+me\b',  # "Massage Near Me"

    # Article titles with "Ways", "Reasons" (more specific)
    r'^\d+\s+ways\s+',  # "5 Ways Massage Therapy..."
    r'^why\s+you\s+(need|should)',  # "Why You Need Massage"

    # Business name patterns (with separators)
    r'\s+\|\s+.{5,}$',  # "Service | Business Name"
    r'^.{5,}\s+\|\s+',  # "Business Name | Service"

    # Marketing phrases
    r'\bdelivers\s+.{10,}\s+therapy\b',  # "...Delivers Deep, Targeted Therapy..."
    r'\bcan\s+release\s+',  # "Massage Can Release Yourself"
    r'\bgoes\s+beyond\s+',  # "Goes Beyond Relaxation"

    # URLs
    r'^https?://',  # Full URLs
    r'\.com/',  # Partial URLs

    # Gift cards (not services)
    r'\bgift\s*card\b',  # "Couples Massage Gift Card"

    # Taglines/descriptions (not specific services)
    r'^health\s*&\s*relaxation$',  # "Health & Relaxation"
    r'beyond\s+relaxation:',  # "Beyond Relaxation: the Deeper Benefits"

    # Business names with dashes or in header format
    r'^[A-Z][\w\s]+-\s+[A-Z][\w\s,]+$',  # "Business Name - Description"

    # Tips/guides (not services)
    r'\btips\b(?!\s+massage)',  # "Prenatal Tips" but not "Tips Massage"

    # Copyright notices
    r'©\d{4}',  # ©2025
    r'版权所有',  # Chinese copyright
    r'all\s+rights',  # "All Rights Reserved"

    # Article titles (colon in middle typically means article/blog post)
    r'^[A-Z][^:]+:\s+[A-Z].{15,}$',  # "Taking Care of...: Off-site Chair Massage"

    # Questions (more specific - must be actual question format)
    r'^what\s+is\s+\w+\?$',  # "What Is Shiatsu?"
    r'^how\s+does\s+',

    # Concatenated domain names or business names (no spaces, camelCase/allcaps)
    r'^[A-Z]?[a-z]+[A-Z][a-z]+[a-z]+$',  # "Malemassagenewyork"

    # Taglines starting with "A " and containing "&"
    r'^a\s+sanctuary\s+of',  # "A Sanctuary of Thai Healing..."
    r'holistic\s+renewal',

    # Email capture CTAs
    r'enter\s+your\s+email',
    r'save\s+on\s+your\s+first',
    r'sign\s+up\s+for',

    # Business descriptions starting with "Specializing"
    r'^specializing\s+in\s+',

    # Sentences that describe what a service "is" or "does"
    r'is\s+designed\s+to\s+',  # "A Swedish Massage Is Designed to Relax..."
    r'\bmakes\s+bodies\s+better\b',  # "Massage Makes Bodies Better"

    # Taglines with "Authentic" and "Upscale"
    r'^an?\s+authentic\s+',
    r'\bupscale\s+(thai\s+)?(spa|experience)\b',

    # Comparison article titles
    r'\bvs\.?\s+\d+-handed',  # "2-handed Vs. 4-handed..."
    r'which\s+one\s+delivers',

    # "Feel X Atmosphere" patterns
    r'\bfeel\s+\w+\s+atmosphere\b',

    # Quoted testimonials/reviews
    r'^"[^"]{10,}"\s*-\s*\w+',  # '"Great massage..." - Name'
    r'^"[^"]+will\s+be\s+back',

    # "Reserve" CTAs
    r'^reserve\s+(your|a)\s+',

    # "About X" pages
    r'^about\s+\w+\s+',

    # Description sentences with "can help to"
    r'\bcan\s+help\s+to\s+',

    # Website/copyright footers
    r'website\s+made\s+by',
    r'^©\s*\d{4}\s+by\s+',
    r'–\s+website$',

    # Marketing/promotional patterns
    r'\bends\s+\d{1,2}/\d{1,2}\b',  # "Ends 10/31"
    r'\bbogo\b',  # "BOGO"
    r'buy\s+.+get\s+.+free',
    r'\baward-winning\b',
    r'^looking\s+for\s+',
    r'\bnearby\s+me\b',

    # "Find your X" / "Book X" CTAs
    r'^find\s+your\s+',
    r'^book\s+massage$',

    # Navigation/page elements
    r'\bmassage\s+types$',

    # Person names (standalone) - REMOVED: too aggressive
    # r'^[A-Z][a-z]+\s+[A-Z][a-z]+$',  # "Claire Nagel" (just first+last name)

    # "Brought from X to Y" marketing
    r'\bbrought\s+from\s+',

    # Long testimonial sentences
    r'^a\s+wonderful\s+spa\s+',
    r'absolutely\s+rejuvenating',
]

# Lowercase words for title case (unless first word)
LOWERCASE_WORDS = {'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'}


def is_valid_service(name: str) -> bool:
    """Check if a string represents a valid service name."""
    if not name or len(name.strip()) < 3:
        return False

    name_lower = name.lower().strip()

    # Check against reject patterns
    for pattern in REJECT_PATTERNS:
        if re.search(pattern, name_lower, re.IGNORECASE):
            return False

    # Reject if too long (likely a description)
    if len(name) > 80:
        return False

    # Reject incomplete fragments
    if name.strip().startswith('&') and len(name.strip()) < 15:
        if not re.search(r'\d\s*hands?', name_lower):
            return False

    return True


def clean_service_name(name: str) -> str:
    """Apply formatting fixes to a service name."""
    if not name:
        return name

    original = name

    # Strip whitespace
    name = name.strip()

    # Remove numbered prefixes: "3. Deep Tissue" -> "Deep Tissue"
    name = re.sub(r'^\d+\.\s*', '', name)

    # Remove leading "&" or "& ": "& 6 Hands" -> "6 Hands"
    name = re.sub(r'^&\s*', '', name)

    # Remove trailing punctuation: ", /" or "|"
    name = re.sub(r'[,/|]+\s*$', '', name)
    name = re.sub(r'\s*[,/|]+\s*$', '', name)

    # Fix "/" formatting: "Foot/Reflexology" -> "Foot Reflexology"
    if '/' in name:
        parts = [p.strip() for p in name.split('/')]
        if len(parts) == 2 and parts[0].lower() in ['foot', 'hand', 'head', 'back', 'neck', 'body', 'full']:
            name = f"{parts[0]} {parts[1]}"

    # Remove (Add-on), (Add-ons), etc.
    name = re.sub(r'\s*\(Add-?on[s]?\)', '', name, flags=re.IGNORECASE)

    # Remove (with Name) patterns: "(with Nicole)" -> ""
    name = re.sub(r'\s*\(with\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\)', '', name, flags=re.IGNORECASE)

    # Normalize hand massage variants: "6 Handed Massage" -> "6 Hands Massage"
    name = re.sub(r'(\d+)\s*Handed\s+Massage', r'\1 Hands Massage', name, flags=re.IGNORECASE)

    # Word-to-number for hands: "Four Handed" -> "4 Hands"
    word_to_num = {'two': '2', 'three': '3', 'four': '4', 'six': '6', 'eight': '8'}
    for word, num in word_to_num.items():
        name = re.sub(rf'\b{word}\s*Handed?\s+Massage', f'{num} Hands Massage', name, flags=re.IGNORECASE)

    # Singularize "Massages" -> "Massage" (but not in context like "6 Hands Massage")
    if name.lower().endswith('massages') and not re.search(r'\d\s+massages', name.lower()):
        name = name[:-1]  # Remove trailing 's'

    # Apply title case
    name = apply_title_case(name)

    return name.strip()


def apply_title_case(name: str) -> str:
    """Apply proper title case to a service name."""
    words = name.split()
    result = []

    for i, word in enumerate(words):
        # Keep numbers and short acronyms as-is
        if word.isdigit() or (word.isupper() and len(word) <= 3):
            result.append(word)
        elif i == 0:
            # First word always capitalized
            result.append(word.capitalize())
        elif word.lower() in LOWERCASE_WORDS:
            result.append(word.lower())
        else:
            result.append(word.capitalize())

    return ' '.join(result)


def extract_duration(name: str) -> tuple:
    """
    Extract duration from service name.
    Returns (cleaned_name, duration_minutes or None)
    """
    # Match patterns like "Deep Tissue 60", "Massage 90 min", "60m Couple Massage", "Ancient Massage 60'"

    # Pattern 1: Duration at end - "Deep Tissue 60" or "Massage 90 min" or "Ancient Massage 60'"
    match = re.search(r'\s+(\d{2,3})\s*(?:min(?:utes?)?|[\'m])?\s*$', name, re.IGNORECASE)
    if match:
        duration = int(match.group(1))
        if 15 <= duration <= 180:
            cleaned = name[:match.start()].strip()
            return cleaned, duration

    # Pattern 2: Duration at start - "60m Couple Massage" or "90 min Deep Tissue"
    match = re.search(r'^(\d{2,3})\s*(?:min(?:utes?)?|m)?\s+(.+)$', name, re.IGNORECASE)
    if match:
        duration = int(match.group(1))
        if 15 <= duration <= 180:
            cleaned = match.group(2).strip()
            return cleaned, duration

    return name, None


def deduplicate_services(services: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate services, merging by normalized name."""
    seen = {}
    result = []

    for service in services:
        name = service.get('name', '')
        if not name:
            continue

        # Extract duration if present
        cleaned_name, duration = extract_duration(name)
        service['name'] = cleaned_name
        if duration and 'durationMin' not in service:
            service['durationMin'] = duration

        # Use lowercase for dedup key
        key = cleaned_name.lower()

        if key not in seen:
            seen[key] = len(result)
            result.append(service)
        else:
            # Merge duration if the existing one doesn't have it
            existing = result[seen[key]]
            if duration and 'durationMin' not in existing:
                existing['durationMin'] = duration

    return result


# ============================================================================
# LLM-Assisted Filtering
# ============================================================================

async def filter_services_with_llm(
    service_names: List[str],
    category: str = "MASSAGE",
    batch_size: int = 50
) -> Dict[str, bool]:
    """
    Use Claude to filter ambiguous service names.

    Args:
        service_names: List of service names to validate
        category: Service category (e.g., "MASSAGE")
        batch_size: Number of services to process per API call

    Returns:
        Dict mapping service name -> is_valid (True/False)
    """
    if not HAS_ANTHROPIC:
        print("Warning: anthropic package not installed, skipping LLM filtering")
        return {name: True for name in service_names}

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("Warning: ANTHROPIC_API_KEY not set, skipping LLM filtering")
        return {name: True for name in service_names}

    client = anthropic.Anthropic(api_key=api_key)
    results = {}

    # Process in batches
    for i in range(0, len(service_names), batch_size):
        batch = service_names[i:i + batch_size]

        prompt = f"""You are filtering service names for a {category.lower()} booking platform.

For each service name below, respond with ONLY "valid" or "invalid":
- "valid" = This is an actual {category.lower()} service that a customer could book (e.g., "Deep Tissue Massage", "Swedish", "Hot Stone Therapy", "Couples Massage", "Reflexology")
- "invalid" = This is NOT a bookable service - it's one of these:
  - Marketing copy or taglines ("An Oasis of Relaxation", "Experience True Relaxation")
  - Business descriptions ("Massages and Rituals", "Spa Services")
  - Reviews or testimonials
  - Business names or locations
  - Credentials or certifications
  - Benefits descriptions
  - Incomplete fragments
  - Website copy or navigation text

Service names to evaluate:
{chr(10).join(f'{j+1}. {name}' for j, name in enumerate(batch))}

Respond with ONLY a JSON object like: {{"1": "valid", "2": "invalid", ...}}
No explanations, just the JSON."""

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response
            response_text = response.content[0].text.strip()
            # Extract JSON from response
            json_match = re.search(r'\{[^}]+\}', response_text)
            if json_match:
                batch_results = json.loads(json_match.group())
                for j, name in enumerate(batch):
                    key = str(j + 1)
                    is_valid = batch_results.get(key, 'valid').lower() == 'valid'
                    results[name] = is_valid
            else:
                # If parsing fails, assume all valid
                for name in batch:
                    results[name] = True

        except Exception as e:
            print(f"LLM filtering error: {e}")
            # On error, assume all valid
            for name in batch:
                results[name] = True

    return results


def filter_services_with_llm_sync(
    service_names: List[str],
    category: str = "MASSAGE",
    batch_size: int = 50
) -> Dict[str, bool]:
    """Synchronous wrapper for LLM filtering."""
    try:
        loop = asyncio.get_running_loop()
        # We're in an async context, can't use asyncio.run()
        # Return empty dict to skip LLM filtering (will be handled by async version)
        return {}
    except RuntimeError:
        # No event loop running, safe to use asyncio.run()
        return asyncio.run(filter_services_with_llm(service_names, category, batch_size))


# ============================================================================
# Main Cleaning Functions
# ============================================================================

def clean_provider_services(
    provider: Dict[str, Any],
    category: str = "MASSAGE",
    llm_results: Optional[Dict[str, bool]] = None
) -> Dict[str, Any]:
    """
    Clean all services for a provider according to Section 5 rules.

    Args:
        provider: Provider dict with 'services' list
        category: Service category for universal service name
        llm_results: Optional pre-computed LLM validation results

    Returns:
        Provider with cleaned services
    """
    services = provider.get('services', [])

    # Universal service name based on category
    universal_service = {
        'MASSAGE': 'Massage (All Types)',
        'FACIAL': 'Facial (All Types)',
        'NAILS': 'Nails (All Types)',
        'HAIR': 'Hair (All Types)',
    }.get(category, f'{category.title()} (All Types)')

    # Step 1-3: Filter and clean each service
    cleaned = []
    for service in services:
        name = service.get('name', '')

        # Skip invalid services (regex-based)
        if not is_valid_service(name):
            continue

        # Clean the name
        cleaned_name = clean_service_name(name)

        # Skip if cleaning made it invalid
        if not cleaned_name or len(cleaned_name) < 3:
            continue

        # Skip if LLM said invalid
        if llm_results and not llm_results.get(cleaned_name, True):
            continue

        service['name'] = cleaned_name
        cleaned.append(service)

    # Step 4: Deduplicate
    cleaned = deduplicate_services(cleaned)

    # Step 5: Add universal service at the beginning and remove plain category name
    # Remove plain "Massage" since we're adding "Massage (All Types)"
    category_name = category.title()  # e.g., "Massage"
    cleaned = [s for s in cleaned if s.get('name', '').lower() != category_name.lower()]

    has_universal = any(s.get('name', '').lower() == universal_service.lower() for s in cleaned)
    if not has_universal:
        cleaned.insert(0, {'name': universal_service})

    provider['services'] = cleaned
    return provider


async def clean_all_providers_async(
    data: Dict[str, Any],
    category: str = "MASSAGE",
    use_llm: bool = True
) -> Dict[str, Any]:
    """
    Async version: Clean services for all providers in a dataset.

    Args:
        data: Dict with 'providers' list
        category: Service category
        use_llm: Whether to use LLM for ambiguous filtering

    Returns:
        Cleaned data
    """
    providers = data.get('providers', [])

    # Collect all unique service names for LLM batch processing
    llm_results = None
    if use_llm and HAS_ANTHROPIC and os.environ.get('ANTHROPIC_API_KEY'):
        all_names = set()
        for provider in providers:
            for service in provider.get('services', []):
                name = service.get('name', '')
                if is_valid_service(name):
                    cleaned_name = clean_service_name(name)
                    if cleaned_name and len(cleaned_name) >= 3:
                        all_names.add(cleaned_name)

        if all_names:
            print(f"Running LLM filtering on {len(all_names)} unique service names...")
            llm_results = await filter_services_with_llm(list(all_names), category)
            valid_count = sum(1 for v in llm_results.values() if v)
            print(f"LLM kept {valid_count}/{len(all_names)} services")

    for provider in providers:
        clean_provider_services(provider, category, llm_results)

    return data


def clean_all_providers(
    data: Dict[str, Any],
    category: str = "MASSAGE",
    use_llm: bool = True
) -> Dict[str, Any]:
    """
    Sync version: Clean services for all providers in a dataset.
    For async contexts, use clean_all_providers_async instead.

    Args:
        data: Dict with 'providers' list
        category: Service category
        use_llm: Whether to use LLM for ambiguous filtering

    Returns:
        Cleaned data
    """
    providers = data.get('providers', [])

    # Collect all unique service names for LLM batch processing
    llm_results = None
    if use_llm and HAS_ANTHROPIC and os.environ.get('ANTHROPIC_API_KEY'):
        all_names = set()
        for provider in providers:
            for service in provider.get('services', []):
                name = service.get('name', '')
                if is_valid_service(name):
                    cleaned_name = clean_service_name(name)
                    if cleaned_name and len(cleaned_name) >= 3:
                        all_names.add(cleaned_name)

        if all_names:
            print(f"Running LLM filtering on {len(all_names)} unique service names...")
            llm_results = filter_services_with_llm_sync(list(all_names), category)
            if llm_results:  # Empty dict means we're in async context
                valid_count = sum(1 for v in llm_results.values() if v)
                print(f"LLM kept {valid_count}/{len(all_names)} services")
            else:
                print("Skipping LLM filtering (in async context, use clean_all_providers_async)")

    for provider in providers:
        clean_provider_services(provider, category, llm_results)

    return data


# ============================================================================
# CLI
# ============================================================================

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python service_cleaner.py <input_file> [output_file] [--no-llm]")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = None
    use_llm = True

    for arg in sys.argv[2:]:
        if arg == '--no-llm':
            use_llm = False
        elif not output_path:
            output_path = Path(arg)

    with open(input_path) as f:
        data = json.load(f)

    # Clean the data
    cleaned = clean_all_providers(data, use_llm=use_llm)

    # Stats
    total_services = sum(len(p.get('services', [])) for p in cleaned.get('providers', []))
    print(f"Cleaned {len(cleaned.get('providers', []))} providers, {total_services} services")

    # Output
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(cleaned, f, indent=2)
        print(f"Saved to {output_path}")
    else:
        # Print sample
        for p in cleaned.get('providers', [])[:3]:
            print(f"\n{p.get('name')}:")
            for s in p.get('services', [])[:5]:
                print(f"  - {s.get('name')}")
