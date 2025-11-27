# Provider Specification

Defines the provider data structure, physical location, rating system, and how providers interact with the OpenSlots marketplace.

---

## 1. Purpose

Providers are wellness service businesses that:
- Offer slots for booking through the OpenSlots platform
- Receive and respond to customer bids via negotiation
- Fill unused capacity by accepting last-minute bookings
- Maintain a public-facing profile with ratings and physical address

---

## 2. Core Data Model

### 2.1 Required Fields

```typescript
interface Provider {
  id: string;                 // Unique identifier
  name: string;              // Business name
  description?: string;      // Optional business description

  // Physical address (shown in booking confirmations)
  address: string;           // Street address
  addressLine2?: string;     // Suite, unit, floor (optional)
  city: string;              // City
  state: string;             // State/province
  zipCode: string;           // Postal code
  latitude?: number;         // For distance calculations (Decimal 10,8)
  longitude?: number;        // For distance calculations (Decimal 11,8)

  // Rating and reputation
  rating?: number;           // Average rating 0.00-5.00 (Decimal 3,2)

  // Ownership
  ownerId: string;           // User who owns this provider profile

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Provider Discovery

### 3.1 Location Matching

Providers are discovered based on user's selected city and optional zip code:

1. **City-only search:**
   - Match all providers where `provider.city === user.selectedCity`
   - Calculate distance using provider lat/long and city center coordinates

2. **City + Zip search:**
   - Match providers where `provider.city === user.selectedCity`
   - Filter to include only providers within reasonable distance of zip code
   - Distance threshold: TBD (e.g., 10 miles / 16 km)

### 3.2 Distance Calculation

Distance must be deterministic and reproducible:
- Use Haversine formula with provider.latitude/longitude
- If provider coordinates missing, use city center as fallback
- Distance rounded to 1 decimal place (e.g., "2.3 miles")
- Unit: miles for US, km for international (MVP: miles only)

---

## 4. Rating System

### 4.1 Rating Calculation

- Rating is average of all completed booking reviews
- Scale: 0.00 to 5.00 (two decimal precision)
- Displayed as: "4.85 ★" or "New" if no ratings yet
- MVP: Rating is manually seeded, no review submission flow

### 4.2 Rating Display Rules

- If `rating === null` or no reviews: show "New"
- If `rating >= 4.50`: consider "highly rated"
- Rating displayed on provider cards alongside distance
- Used as tiebreaker in sorting (higher rating wins)

---

## 5. Provider Screens (Provider-Side App)

### 5.1 Post-Onboarding Tabs

Providers have 2 main screens accessible via tabs:

**Tab 1: Availability**
- View published slots (open, held, booked, expired status)
- Create new slots by selecting time ranges
- Set base price and max discount per slot
- Publish slots to make them discoverable

**Tab 2: Offers**
- View incoming customer bids in real-time (via websockets)
- See offer cards with:
  - Customer name (if available)
  - Service requested
  - Time slot
  - Customer's bid price
  - Time remaining for negotiation
- Actions: Accept or Counter-offer

### 5.2 Negotiation Constraints (Provider Side)

- Provider can negotiate multiple unique slots simultaneously
- Provider can only counter within range: `slot.minPriceCents` to `slot.maxPriceCents`
- No explicit "reject" button (implicit rejection = let negotiation expire)
- Negotiation window: 60 seconds from provider's first counter-offer
- Cannot initiate negotiation if <30 minutes until slot start time

---

## 6. Provider Address Usage

### 6.1 Display Contexts

Provider address is shown in:
1. **Booking confirmation screen** - Full address with map link
2. **Booking email/SMS** - Address for directions
3. **Provider profile** (future) - City and state only

### 6.2 Privacy Rules

- Full street address is NOT shown during discovery or bidding
- Only city and distance shown pre-booking
- Full address revealed only after booking is confirmed

---

## 7. Provider Validation Rules

### 7.1 Creation Requirements

To create a provider profile:
- User must have `role = PROVIDER` or `role = ADMIN`
- Address fields are required (cannot be null)
- Coordinates (lat/long) are optional but recommended for accurate distance

### 7.2 Data Integrity

- One user can own multiple provider profiles
- Provider name must be unique within a city
- Address must be validated (basic format check for MVP)
- Zip code must match city (validation rule)

---

## 8. Provider State Transitions

```
[Account Created]
    → [Provider Profile Created]
    → [First Slot Published]
    → [First Bid Received]
    → [First Negotiation Active]
    → [First Booking Confirmed]
```

### 8.1 Provider Statuses (Implicit)

Providers do not have explicit status field, but can be categorized by:
- **Active**: Has at least 1 OPEN slot
- **Inactive**: No OPEN slots (all booked, expired, or none published)
- **New**: No completed bookings yet (rating === null)

---

## 9. Sorting and Ranking

When multiple providers are discovered, they are sorted by:

1. **Best Offer** (if user has submitted a bid)
   - Provider with slot price closest to user's current bid appears first

2. **Match Score** (if negotiation not yet initiated)
   - Calculated based on likelihood of acceptance

3. **Distance** (ascending)
   - Closer providers ranked higher

4. **Rating** (descending)
   - Higher rated providers ranked higher

See `bidding.md` for detailed sorting logic during negotiation phase.

---

## 10. Future Enhancements (Post-MVP)

- Provider photos and gallery
- Multiple service categories per provider
- Provider availability calendar (recurring slots)
- Review submission and moderation
- Provider response time tracking
- Verified address badges
- Provider cancellation policies

---

## 11. Non-Goals for MVP

- No provider search by name
- No provider favorites/bookmarks
- No provider-initiated discounts or promotions
- No provider analytics dashboard
- No multi-location providers
- No provider messaging (all communication through bids/booking)
- No menu parsing (services entered manually)

---
