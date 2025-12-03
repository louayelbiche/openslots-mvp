# OpenSlots MVP

A marketplace platform connecting consumers with wellness service providers through real-time slot bidding.

## Overview

OpenSlots enables consumers to discover available wellness service appointments and negotiate prices through a bidding system. Providers can offer last-minute availability at discounted rates, while consumers find deals that match their budget.

## Tech Stack

**Monorepo**: pnpm workspaces + Turborepo

| App/Package | Technology | Purpose |
|-------------|-----------|---------|
| `apps/api` | NestJS, Prisma, PostgreSQL | REST API backend |
| `apps/web` | Next.js 16, React 19, Tailwind CSS 4 | Consumer-facing web app |
| `packages/` | Shared types & utilities | (planned) |

## Features

### Consumer Flow
1. **Service Discovery** - Browse by category (Massage, Nails, Hair, Facials, Acupuncture, Lashes & Brows)
2. **Location Selection** - Filter by city and optional zip code
3. **Time Window** - Choose Morning (9-12), Afternoon (12-4), or Evening (4-8)
4. **Budget Setting** - Set offer price with match likelihood indicator
5. **Live Offers** - View matching providers with sorting (Price/Rating/Distance)
6. **Slot Selection** - Dropdown with best offer highlighting
7. **Booking Summary** - Review before confirmation
8. **Confirmation** - Success screen with booking details

### Provider Badges
- **Best Offer** (amber) - Closest to user's budget
- **Highest Rated** (blue) - Top-rated provider
- **Closest** (emerald) - Nearest location

## Project Structure

```
openslots-mvp/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Seed data (60 providers)
│   │   └── src/
│   │       ├── discovery/      # Discovery API module
│   │       └── prisma/         # Prisma service
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── page.tsx            # Home - service selection
│           │   ├── budget/page.tsx     # Budget setting
│           │   ├── offers/page.tsx     # Live offers
│           │   └── booking/
│           │       ├── summary/        # Booking summary
│           │       └── confirmation/   # Success screen
│           ├── components/
│           │   ├── ProviderCard.tsx    # Provider display
│           │   ├── SlotDropdown.tsx    # Slot selector
│           │   ├── SlotItem.tsx        # Individual slot
│           │   └── MatchBadge.tsx      # Match likelihood
│           └── types/
│               └── discovery.ts        # TypeScript types
├── claude-docs/                # AI agent configuration
│   ├── agents/                 # Agent definitions
│   ├── policies/               # Git rules, standards
│   └── reports/                # UAT reports
└── turbo.json                  # Turborepo config
```

## Database Schema

Core models:
- **User** - Consumers and provider owners
- **Provider** - Business with location, rating
- **Service** - Offered services with category, duration, base price
- **Slot** - Time slots with pricing (basePrice, maxDiscount, maxDiscountedPrice)
- **Negotiation** - Price negotiation between user and provider
- **Booking** - Confirmed appointments

Service categories: `MASSAGE`, `ACUPUNCTURE`, `NAILS`, `HAIR`, `FACIALS_AND_SKIN`, `LASHES_AND_BROWS`

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 10+
- PostgreSQL database

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit .env files with your database connection and API URL
```

### Database Setup

```bash
# Generate Prisma client
cd apps/api
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed data (60 providers across 6 categories, 3 cities)
pnpm run db:seed
```

### Development

```bash
# Start all apps (from root)
pnpm dev

# Or start individually:
# API (port 3001)
cd apps/api && pnpm dev

# Web (port 3000)
cd apps/web && pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

## API Endpoints

### Discovery API

**POST** `/api/discovery`

Request:
```json
{
  "serviceCategory": "MASSAGE",
  "city": "San Francisco",
  "zipCode": "94102",
  "timeWindow": "Morning"
}
```

Response:
```json
{
  "providers": [
    {
      "providerId": "...",
      "name": "Serenity Spa",
      "rating": 4.85,
      "distance": 2.3,
      "address": "123 Main St",
      "city": "San Francisco",
      "lowestPrice": 8000,
      "slots": [
        {
          "slotId": "...",
          "startTime": "2025-11-28T10:00:00",
          "endTime": "2025-11-28T11:00:00",
          "basePrice": 10000,
          "maxDiscount": 20,
          "maxDiscountedPrice": 8000,
          "serviceName": "Swedish Massage",
          "durationMin": 60
        }
      ]
    }
  ]
}
```

**Note**: Prices are in cents (8000 = $80.00)

## Environment Variables

### API (`apps/api/.env`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/openslots
```

### Web (`apps/web/.env`)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Seed Data

The seed script creates:
- 60 providers (10 per service category)
- 3 cities: New York, San Francisco, Los Angeles
- 10 slots per provider across Morning, Afternoon, Evening windows
- Price ranges: $60-$200 depending on service type
- Discounts: 10-30%

## License

UNLICENSED - Private repository
