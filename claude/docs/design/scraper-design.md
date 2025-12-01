# Scraper Design Document

## Overview

The OpenSlots Scraper is a subagent responsible for discovering and ingesting public provider data from external sources. It populates the marketplace with service providers across the 6 fixed service categories.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Scraper Agent                           │
├─────────────────────────────────────────────────────────────┤
│  CLI Entry Point (__main__.py)                              │
│  ├── search: Search for providers by city/category          │
│  ├── fetch: Scrape a single URL                             │
│  └── stats: Show scraping statistics                        │
├─────────────────────────────────────────────────────────────┤
│  Sources                                                     │
│  ├── GooglePlacesSource (priority: 100)                     │
│  ├── WebsiteSource (priority: 60)                           │
│  └── DirectorySource (priority: 40) [future]                │
├─────────────────────────────────────────────────────────────┤
│  Normalizers                                                 │
│  ├── ProviderNormalizer: address, phone, state              │
│  ├── ServiceNormalizer: category, price, duration           │
│  └── Deduplicator: merge & conflict resolution              │
├─────────────────────────────────────────────────────────────┤
│  Storage                                                     │
│  ├── JsonStore: JSON file output                            │
│  └── TokenTracker: LLM usage tracking                       │
├─────────────────────────────────────────────────────────────┤
│  Utils                                                       │
│  ├── HttpClient: async HTTP with retry                      │
│  ├── RobotsChecker: robots.txt compliance                   │
│  └── Hash utilities: dedup keys, content hashing            │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. Search Query
   └── City + Category
       └── Source Selection (Google Places > Website > Directory)
           └── Fetch Pages
               └── Parse & Extract
                   └── Normalize
                       └── Deduplicate
                           └── Store JSON
                               └── Report Stats
```

## Service Categories (Fixed)

The 6 service categories are immutable and defined in the Prisma schema:

| Category | Description |
|----------|-------------|
| MASSAGE | Massage therapy, spa treatments |
| ACUPUNCTURE | Acupuncture, TCM, cupping |
| NAILS | Manicure, pedicure, nail art |
| HAIR | Haircuts, coloring, styling |
| FACIALS_AND_SKIN | Facials, skincare, esthetics |
| LASHES_AND_BROWS | Lash extensions, brow services |

## Source Priority Resolution

When data conflicts exist between sources, higher priority wins:

| Source | Priority | Trust Level |
|--------|----------|-------------|
| Google Places | 100 | Highest - verified business data |
| Website | 60 | Medium - direct from business |
| Directory | 40 | Lower - aggregated data |

## Rate Limiting

| Source | Requests/Min | Daily Limit | Delay |
|--------|-------------|-------------|-------|
| Google Places | 60 | 1000 | 1.0s |
| Website | 10 | None | 2.0s |
| Directory | 20 | None | 1.0s |

Exponential backoff is applied on failures:
- Initial delay: 1.0s
- Max delay: 60.0s
- Multiplier: 2.0x
- Max retries: 5

## Safety & Compliance

### robots.txt
- Always check before scraping websites
- Cache robots.txt for 24 hours
- Respect Crawl-delay directive
- Default: allow if no robots.txt found

### Rate Limiting
- Per-domain tracking
- Exponential backoff on failures
- Daily limits for API sources
- Configurable delays between requests

### Data Privacy
- No PII collection beyond public business info
- No scraping of private/authenticated pages
- Respect noindex/nofollow directives

## Output Schema

### ScrapedProvider
```typescript
{
  // Identity (required)
  name: string
  address: string
  city: string
  state: string  // 2-letter code
  zipCode: string
  country: string  // default: "US"

  // Identity (optional)
  legalName?: string
  websiteUrl?: string

  // Coordinates
  latitude?: number
  longitude?: number

  // Contact
  phone?: string  // E.164 format
  email?: string
  bookingUrl?: string

  // Services (required, min 1)
  services: ScrapedService[]

  // Operations
  openingHours?: Record<string, string>

  // Reputation
  googleRating?: number
  googleReviewCount?: number

  // Metadata
  sources: ScrapedSource[]
  scrapedAt: ISO8601
  sourceVersion: string  // hash for change detection
  confidence: number  // 0-1
}
```

### ScrapedService
```typescript
{
  category: ServiceCategory
  name: string
  description?: string
  basePriceCents?: number
  priceRangeMinCents?: number
  priceRangeMaxCents?: number
  durationMin?: number
  addOns?: string[]
}
```

## CLI Usage

```bash
# Search for providers
python -m scraper search --city="Miami" --category="MASSAGE" --max-results=20

# Fetch single URL
python -m scraper fetch --url="https://example-spa.com"

# View statistics
python -m scraper stats
```

## Integration Points

### Token Tracker
- Records LLM token usage for cost tracking
- Exports to `output/tokens/` for aggregation
- Integrates with central token-tracker system

### Database Import
- JSON output can be imported via API endpoint
- Use `tools/scraper/output/providers/*.json`
- Run validation before import

### Other Agents
- **db-modeler**: Provider schema alignment
- **api-impl**: Import endpoints
- **test-runner**: Data validation

## File Structure

```
tools/scraper/
├── __init__.py          # Package init
├── __main__.py          # CLI entry point
├── schemas.py           # Data schemas
├── requirements.txt     # Python dependencies
├── config/
│   ├── __init__.py
│   ├── settings.py      # Configuration
│   └── rate_limits.py   # Rate limiting
├── sources/
│   ├── __init__.py
│   ├── base.py          # Base source class
│   ├── google_places.py # Google Places API
│   └── website.py       # Website scraping
├── normalizers/
│   ├── __init__.py
│   ├── provider.py      # Provider normalization
│   ├── service.py       # Service normalization
│   └── dedup.py         # Deduplication
├── storage/
│   ├── __init__.py
│   ├── json_store.py    # JSON file storage
│   └── token_tracker.py # Token usage tracking
├── utils/
│   ├── __init__.py
│   ├── http.py          # HTTP client
│   ├── robots.py        # Robots.txt checker
│   └── hash.py          # Hashing utilities
├── examples/
│   └── scrape_sample.py # Example script
├── tests/
│   ├── __init__.py
│   ├── test_schemas.py
│   ├── test_normalizers.py
│   └── test_utils.py
├── output/              # Scraped data output
├── cache/               # Cache directory
│   └── robots/          # Cached robots.txt
└── tests/fixtures/
    └── sample_pages/    # Test HTML fixtures
```

## Future Enhancements

1. **DirectorySource**: Scrape wellness directories (Yelp, etc.)
2. **LLM Extraction**: Use Claude for complex menu parsing
3. **Incremental Updates**: Track changes via sourceVersion hash
4. **Parallel Scraping**: Async batch processing
5. **Database Direct Import**: Prisma integration for direct writes
