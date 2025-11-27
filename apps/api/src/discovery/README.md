# Discovery API Module

This module implements the OpenSlots discovery endpoint as specified in `claude/docs/specs/discovery.md` and `claude/docs/specs/slot.md`.

## Endpoint

**POST** `/api/discovery`

## Request Body

```typescript
{
  serviceCategory: ServiceCategory  // MASSAGE, NAILS, HAIR, FACIALS_AND_SKIN, LASHES_AND_BROWS, ACUPUNCTURE
  city: string                      // Case-insensitive city name
  zipCode?: string                  // Optional for MVP
  timeWindow: "Morning" | "Afternoon" | "Evening" | "Custom"
}
```

## Response Body

```typescript
{
  providers: Array<{
    providerId: string
    name: string
    rating: number
    distance: number  // miles from user
    address: string
    city: string
    slots: Array<{
      slotId: string
      startTime: string  // ISO datetime
      endTime: string
      basePrice: number  // in cents
      maxDiscount: number  // percentage (0.0-1.0)
      maxDiscountedPrice: number  // in cents
      serviceName: string
      durationMin: number
    }>
    lowestPrice: number  // lowest maxDiscountedPrice among slots
  }>
}
```

## Implementation Details

### 1. Validation
- All required fields (serviceCategory, city, timeWindow) must be present
- Returns 400 Bad Request if validation fails

### 2. Provider Filtering
- Matches city (case-insensitive)
- Matches serviceCategory via the provider's services
- Only returns providers with at least one valid slot

### 3. Slot Filtering
- Only includes slots with status = OPEN
- Filters by time window:
  - **Morning**: 9:00 AM - 12:00 PM
  - **Afternoon**: 12:00 PM - 4:00 PM
  - **Evening**: 4:00 PM - 8:00 PM
  - **Custom**: All hours (for MVP)

### 4. Pricing Calculation
Each slot's `maxDiscountedPrice` is computed as:
```
maxDiscountedPrice = Math.round(basePrice * (1 - maxDiscount))
```

### 5. Slot Sorting (within each provider)
1. By maxDiscountedPrice (ascending)
2. By startTime (ascending)

### 6. Provider Sorting
1. By lowestPrice (lowest maxDiscountedPrice slot) (ascending)
2. By rating (descending)
3. By distance (ascending)

### 7. Distance Calculation
For MVP, uses a deterministic hash-based calculation from provider ID that returns 1-11 miles.

In production, this would use the Haversine formula with:
- User's latitude/longitude (from zipCode or IP)
- Provider's latitude/longitude

## Example Request

```bash
curl -X POST http://localhost:3000/api/discovery \
  -H "Content-Type: application/json" \
  -d '{
    "serviceCategory": "MASSAGE",
    "city": "New York",
    "timeWindow": "Evening"
  }'
```

## Example Response

```json
{
  "providers": [
    {
      "providerId": "clxyz123",
      "name": "Zen Flow Massage Studio",
      "rating": 4.85,
      "distance": 3,
      "address": "123 Madison Ave",
      "city": "New York",
      "lowestPrice": 8640,
      "slots": [
        {
          "slotId": "clxyz456",
          "startTime": "2025-11-27T16:00:00.000Z",
          "endTime": "2025-11-27T17:00:00.000Z",
          "basePrice": 10000,
          "maxDiscount": 0.18,
          "maxDiscountedPrice": 8200,
          "serviceName": "Swedish Massage",
          "durationMin": 60
        }
      ]
    }
  ]
}
```

## Error Handling

### 400 Bad Request
- Missing required fields
- Invalid serviceCategory
- Invalid timeWindow

### 200 OK with empty array
- No providers found matching criteria
- No slots available in specified time window

## Files Structure

```
src/discovery/
├── discovery.module.ts           # NestJS module
├── discovery.controller.ts       # API endpoint controller
├── discovery.service.ts          # Business logic
├── dto/
│   ├── discovery-request.dto.ts  # Request validation
│   └── discovery-response.dto.ts # Response structure
├── index.ts                      # Module exports
└── README.md                     # This file
```

## Testing

To test the endpoint with seed data:

1. Ensure database is seeded: `npm run db:seed`
2. Start the API: `npm run start:dev`
3. Use the example curl command above

Available test data:
- **New York**: MASSAGE, NAILS, HAIR providers
- **San Francisco**: FACIALS_AND_SKIN, MASSAGE, HAIR providers
- **Los Angeles**: FACIALS_AND_SKIN, NAILS providers

All time windows (Morning, Afternoon, Evening) have available slots.
