# Implementation Plan: Discovery Flow with Timezone-Aware Slot Filtering

**Session:** session-01
**Date:** 2025-11-27
**Status:** ✅ Completed

---

## 1. Objective

Implement complete discovery flow with timezone-aware slot filtering, rich seed data across multiple cities, and 3-screen UI following discovery.md and design specs.

## 2. Affected Areas

- **Database (DB)**: Prisma schema pricing model update, Prisma 7 configuration
- **API**: Discovery module with filtering, timezone conversion, sorting
- **UI**: Three-screen flow (index → budget → offers)
- **Seed Data**: 8 providers, 83 slots across NY, SF, LA
- **Timezone Handling**: City-specific timezone conversion for slot filtering

## 3. Files to Touch

### Database & Configuration
- `apps/api/prisma/schema.prisma` (update) - New pricing model
- `apps/api/prisma.config.ts` (create) - Prisma 7 config
- `apps/api/prisma/seed.ts` (update) - Rich seed data with timezone logic
- `apps/api/src/prisma/prisma.service.ts` (update) - Prisma Pg adapter

### API - Discovery Module
- `apps/api/src/app.module.ts` (update) - Import DiscoveryModule
- `apps/api/src/discovery/discovery.controller.ts` (create) - POST /api/discovery
- `apps/api/src/discovery/discovery.service.ts` (create) - Business logic
- `apps/api/src/discovery/discovery.module.ts` (create) - NestJS module
- `apps/api/src/discovery/dto/discovery-request.dto.ts` (create) - Request validation
- `apps/api/src/discovery/dto/discovery-response.dto.ts` (create) - Response types
- `apps/api/src/discovery/index.ts` (create) - Barrel export
- `apps/api/src/discovery/README.md` (create) - Documentation

### UI - Discovery Flow
- `apps/web/src/app/page.tsx` (update) - Index screen with service/city/time selectors
- `apps/web/src/app/layout.tsx` (update) - Layout metadata
- `apps/web/src/app/budget/page.tsx` (create) - Budget selector screen
- `apps/web/src/app/offers/page.tsx` (create) - Live offers with API integration

### UI - Components
- `apps/web/src/components/MatchBadge.tsx` (create) - Match likelihood badge
- `apps/web/src/components/ProviderCard.tsx` (create) - Provider display card
- `apps/web/src/components/SlotItem.tsx` (create) - Slot detail item
- `apps/web/src/components/index.ts` (create) - Component exports

### UI - Types
- `apps/web/src/types/discovery.ts` (create) - TypeScript types
- `apps/web/src/types/index.ts` (create) - Type exports

## 4. Implementation Sequence

### Phase 1: Database & Schema (db-modeler)
1. Update Prisma schema with new slot pricing model:
   - Change from `minPriceCents/maxPriceCents` to `basePrice/maxDiscount/maxDiscountedPrice`
   - Update Negotiation model: `finalPriceCents` → `offerPriceCents`
2. Create Prisma 7 configuration file (`prisma.config.ts`)
3. Update PrismaService with Pg adapter and dotenv import
4. Generate and run migration

### Phase 2: Seed Data with Timezone Logic (db-modeler)
5. Create rich seed data:
   - 8 providers across 3 cities (3 NYC, 3 SF, 2 LA)
   - 4 service categories (MASSAGE, NAILS, HAIR, FACIALS_AND_SKIN)
   - 83 total slots with varied discounts and time windows
6. Add timezone conversion logic:
   - Define `CITY_TIMEZONE_OFFSETS` for EST (UTC-5) and PST (UTC-8)
   - Update `createSlotTime()` to accept city and convert local hours to UTC
   - Fix base date to use `Date.UTC()` instead of server local time
7. Run seed script and verify data

### Phase 3: Discovery API (api-impl)
8. Create discovery module structure (controller, service, module, DTOs)
9. Implement POST /api/discovery endpoint with request validation
10. Implement discovery service business logic:
    - Filter providers by city and service category
    - Filter slots by time window with timezone awareness
    - Calculate distance (placeholder for MVP)
    - Sort providers by lowest price, rating, distance
    - Sort slots by price, then time
11. Add timezone conversion to `isSlotInTimeWindow()`:
    - Accept city parameter
    - Convert UTC slot time to city's local time
    - Check if local hour falls in requested time window
12. Test API with curl for all cities and time windows

### Phase 4: UI - Index Screen (ui-impl)
13. Update main page.tsx with discovery index:
    - Service category selector (6 options)
    - City and zip code inputs
    - Time window selector (Morning/Afternoon/Evening/Custom)
    - Navigation to budget page with query params

### Phase 5: UI - Budget Screen (ui-impl)
14. Create budget selector page:
    - Slider component ($30-$200 range)
    - Numeric input synchronized with slider
    - Navigation to offers page with budget param

### Phase 6: UI - Offers Screen (ui-impl)
15. Create live offers page:
    - Fetch from API with city/category/timeWindow
    - Calculate Best Offer (slot closest to user bid)
    - Calculate match likelihood for each slot
    - Display provider cards with slots
    - Sort providers (Best Offer first, then by match score)
16. Create reusable components:
    - `MatchBadge`: Color-coded match likelihood (Very High/High/Low/Very Low)
    - `ProviderCard`: Provider info, rating, distance, slot list
    - `SlotItem`: Slot time, service, price, match badge
17. Create TypeScript types for API contracts

### Phase 7: Testing & Validation
18. Test timezone filtering:
    - New York (EST): Morning (9am-12pm), Afternoon (12pm-4pm), Evening (4pm-8pm)
    - San Francisco (PST): Same local time ranges, different UTC times
    - Verify slots appear in correct time windows
19. Test full UI flow:
    - Index → Budget → Offers
    - Verify match likelihood calculation
    - Verify Best Offer badge appears
    - Check provider sorting
20. Verify API returns correct data for all combinations

### Phase 8: Documentation & Commit
21. Run TypeScript compilation check
22. Verify all tests pass (if any)
23. Stage all changes with `git add`
24. Create commit with message:
    ```
    feat(mvp): implement discovery flow with timezone-aware slot filtering

    API:
    - Update Prisma schema with basePrice/maxDiscount/maxDiscountedPrice model
    - Configure Prisma 7 with pg adapter and prisma.config.ts
    - Add discovery module with city/category/timeWindow filtering
    - Implement timezone conversion (EST/PST) for accurate slot filtering
    - Seed 8 providers across 3 cities with 83 slots in 4 categories

    Web:
    - Build 3-screen discovery flow (index → budget → offers)
    - Add provider cards with match likelihood and best offer display
    - Create reusable components (MatchBadge, ProviderCard, SlotItem)
    - Implement client-side match calculation and slot sorting

    Fixes timezone handling so Morning/Afternoon/Evening filters work correctly
    for each city's local time (UTC storage, city-specific display).
    ```
25. Push to remote repository

## 5. Success Criteria

- [ ] Prisma schema updated with new pricing model
- [ ] Prisma 7 configured with pg adapter
- [ ] Database seeded with 8 providers, 83 slots across 3 cities
- [ ] Discovery API endpoint returns filtered providers and slots
- [ ] Timezone filtering works correctly for EST and PST
- [ ] Morning/Afternoon/Evening time windows return correct results per city
- [ ] UI displays 3-screen flow with proper navigation
- [ ] Match likelihood calculated correctly
- [ ] Best Offer badge appears on closest slot to user bid
- [ ] Provider cards sorted by Best Offer, match score, distance, rating
- [ ] TypeScript compiles with no errors
- [ ] All changes committed and pushed

## 6. Risks & Mitigation

**Risk:** Timezone conversion errors causing incorrect slot filtering
**Mitigation:** Test with both EST and PST cities, verify UTC storage and local display

**Risk:** Prisma 7 adapter configuration issues
**Mitigation:** Follow Prisma 7 migration guide, test connection before seed

**Risk:** UI state management complexity across 3 screens
**Mitigation:** Use URL query params for state persistence, simple navigation flow

**Risk:** Match likelihood calculation doesn't match specs
**Mitigation:** Reference matching.md formulas, test with known bid/price values

## 7. Dependencies

- Prisma 7 with @prisma/adapter-pg
- NestJS for API framework
- Next.js App Router for UI
- TailwindCSS for styling
- PostgreSQL database

## 8. Notes

- This is the first major feature implementation for discovery MVP
- Timezone handling is critical for user experience across cities
- Match likelihood follows specs: ≥100% (Very High), ≥95% (High), ≥85% (Low), <85% (Very Low)
- Best Offer is slot with price closest to user bid (not necessarily cheapest)
- All dates stored in UTC, converted to local time for filtering only
