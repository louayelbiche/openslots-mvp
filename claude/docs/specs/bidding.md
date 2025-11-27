# Bidding and Negotiation Specification

Defines how users submit bids, initiate negotiations with providers, handle counter-offers, and reach final booking agreements in the OpenSlots MVP.

---

## 1. Purpose

The bidding and negotiation system exists to:
- Let users control their offer price through a budget selector
- Enable real-time price negotiation between users and providers
- Create transparency around pricing and match probability
- Determine the single "Best Offer" based on proximity to user's bid
- Guide users toward slots most likely to result in successful bookings

Bidding and negotiation must be deterministic, transparent, and time-bounded.

---

## 2. Inputs Required

Bidding begins only when the user has selected:
- serviceCategory (one of 6 categories)
- city (required)
- zipCode (optional but recommended)
- timeWindow (Morning/Afternoon/Evening/Custom)
- offerPrice (user-selected via budget slider)

---

## 3. Pre-Negotiation: Best Offer Calculation

### 3.1 Best Offer Definition

**Best Offer** = The slot with a price **closest** to the user's current bid.

- Recalculates in real-time as user adjusts budget slider
- Appears BEFORE any negotiation starts
- Shown with special badge on provider card and slot
- Exactly ONE Best Offer across all visible providers
- If tie (two slots equidistant from bid), choose lower absolute price

### 3.2 Best Offer Display Rules

- Badge shows on provider card: "Best Offer"
- Badge shows on slot item within that provider's slots list
- Updates instantly when user moves slider
- No ties, no randomness

### 3.3 Match Likelihood Indicator

Before negotiation starts, show match probability based on user's bid relative to slot pricing:

- **Very High Match** (dark green): `userBid >= slot.maxPriceCents`
- **High Match** (light green): `userBid >= slot.minPriceCents && userBid < slot.maxPriceCents`
- **Low Match** (orange): `userBid < slot.minPriceCents && userBid >= (slot.minPriceCents * 0.90)`
- **Very Low Match** (red): `userBid < (slot.minPriceCents * 0.90)`

**Formula Summary:**
```
if (userBid >= maxPriceCents) → Very High (dark green)
else if (userBid >= minPriceCents) → High (light green)
else if (userBid >= minPriceCents * 0.90) → Low (orange)
else → Very Low (red)
```

---

## 4. Negotiation Timing Constraints

### 4.1 When Bidding is NOT Allowed

Negotiation **cannot be initiated** if:
- Current time is within 30 minutes of `slot.startTime`
- Slot status is not OPEN
- User already has an ACTIVE negotiation on another slot (only 1 at a time per user)

### 4.2 Negotiation Window Duration

- Negotiation window: **60 seconds** from when provider issues first counter-offer
- Timer starts when `negotiation.status` changes from PENDING to ACTIVE (provider counters)
- If provider accepts initial user bid immediately: no counter-offer, booking created instantly
- Expiration calculated: `min(providerFirstCounterAt + 60sec, slot.startTime - 30min)`

---

## 5. Negotiation Flow

### 5.1 Step 1: User Initiates Bid

User selects a slot from Live Offers screen and submits their current `offerPrice`:

1. System creates `Negotiation` record:
   ```typescript
   {
     slotId,
     userId,
     providerId,
     status: ACTIVE,
     initiatedAt: now(),
     expiresAt: calculated, // slot.startTime - 30min
     offerPriceCents: null // set when negotiation is accepted
   }
   ```

2. System creates first `NegotiationOffer`:
   ```typescript
   {
     negotiationId,
     offeredBy: USER,
     priceCents: userOfferPrice,
     status: PENDING
   }
   ```

3. Provider receives bid via **websocket** (real-time) on their "Offers" tab

### 5.2 Step 2: Provider Responds

Provider has two options:

**Option A: Accept User's Bid**
- Provider clicks "Accept"
- `negotiation.status` → ACCEPTED
- `negotiation.acceptedBy` → PROVIDER
- `negotiation.acceptedAt` → now()
- `negotiation.offerPriceCents` → user's original bid
- System creates Booking immediately
- User receives confirmation

**Option B: Counter-Offer**
- Provider enters counter price within range `[slot.minPriceCents, slot.maxPriceCents]`
- System creates new `NegotiationOffer`:
  ```typescript
  {
    negotiationId,
    offeredBy: PROVIDER,
    priceCents: providerCounterPrice,
    status: PENDING
  }
  ```
- Previous user offer status → COUNTERED
- **Negotiation timer starts: 60 seconds**
- `negotiation.expiresAt` updated to `min(now() + 60sec, slot.startTime - 30min)`
- User receives counter-offer via websocket (real-time)

### 5.3 Step 3: User Responds to Counter-Offer

User sees provider's counter on Live Offers screen with countdown timer.

User has three options:

**Option A: Accept Provider's Counter**
- User clicks "Accept \$X" button
- `negotiation.status` → ACCEPTED
- `negotiation.acceptedBy` → USER
- `negotiation.acceptedAt` → now()
- `negotiation.offerPriceCents` → provider's counter price
- Latest offer status → ACCEPTED
- System creates Booking
- User sees Booking Confirmation screen

**Option B: Counter-Offer Back**
- User adjusts price and clicks "Counter"
- System creates new `NegotiationOffer`:
  ```typescript
  {
    negotiationId,
    offeredBy: USER,
    priceCents: userNewPrice,
    status: PENDING
  }
  ```
- Provider's offer status → COUNTERED
- Timer continues (does not reset)
- Provider receives new counter via websocket

**Option C: Let Negotiation Expire**
- User does nothing for 60 seconds
- `negotiation.status` → EXPIRED
- All pending offers status → EXPIRED
- Slot returns to OPEN status
- User can initiate new bid if desired

### 5.4 Step 4: Negotiation Loop Continues

- Back-and-forth can continue until:
  - Either party accepts
  - 60-second timer expires
  - 30 minutes before slot startTime reached

### 5.5 Step 5: Final Acceptance

When either party accepts:
1. `negotiation.status` → ACCEPTED
2. `negotiation.offerPriceCents` → accepted price
3. `slot.status` → BOOKED
4. Booking record created with `negotiationId` reference
5. Other negotiations on same slot (if any) → CANCELLED

---

## 6. Negotiation Constraints

### 6.1 User Constraints

- **One negotiation at a time**: User can only have 1 ACTIVE negotiation simultaneously
- Must wait for current negotiation to complete (accepted/expired/cancelled) before starting new one
- Can view other slots but cannot bid on them while negotiation is active

### 6.2 Provider Constraints

- **Multiple negotiations allowed**: Provider can negotiate multiple unique slots simultaneously
- Counter-offers must be within range: `slot.minPriceCents` ≤ counter ≤ `slot.maxPriceCents`
- No explicit "reject" button (implicit rejection = let timer expire)
- Cannot counter if <30 minutes until slot start time

---

## 7. Provider Sorting During Negotiation

### 7.1 Before Negotiation Starts

Sort providers by:
1. **Best Offer** (slot price closest to user bid)
2. **Match Score** (Very High > High > Low > Very Low)
3. **Distance** (ascending)
4. **Rating** (descending)

### 7.2 During Active Negotiation

- Active negotiation slot appears at top with countdown timer
- Other providers/slots remain sorted as normal
- User cannot scroll away or hide active negotiation

---

## 8. Negotiation State Machine

```
USER_INITIATED
    ↓
[Provider: Accept] → ACCEPTED → CREATE_BOOKING
    OR
[Provider: Counter] → ACTIVE
    ↓
    ↓── [User: Accept] → ACCEPTED → CREATE_BOOKING
    ↓── [User: Counter] → ACTIVE (loop continues)
    ↓── [Timer: Expire] → EXPIRED
    ↓── [30min before slot] → EXPIRED
```

---

## 9. Data Persistence

### 9.1 What to Persist

- All `Negotiation` records (full history)
- All `NegotiationOffer` records (full back-and-forth)
- `negotiation.offerPriceCents` (agreed price)
- `negotiation.acceptedBy` (who accepted final offer)

### 9.2 What NOT to Persist

- Match likelihood labels (recomputed on every page load)
- Best Offer badges (recalculated real-time)
- Timer countdown state (recalculated from expiresAt)

---

## 10. Real-Time Communication

### 10.1 Websocket Events

**Customer Side:**
- `negotiation:counter-offer-received` → Provider sent counter
- `negotiation:accepted` → Provider accepted your bid
- `negotiation:expired` → Time ran out

**Provider Side:**
- `negotiation:new-bid` → Customer initiated bid
- `negotiation:counter-offer-received` → Customer sent counter
- `negotiation:accepted` → Customer accepted your counter
- `negotiation:expired` → Time ran out

### 10.2 Fallback for Disconnection

If websocket disconnects:
- Poll `/negotiations/{id}` every 2 seconds while ACTIVE
- Show reconnecting indicator
- Resume when connection restored

---

## 11. Error Handling

### 11.1 Negotiation Conflicts

If slot becomes unavailable during negotiation (e.g., another user booked it):
- `negotiation.status` → CANCELLED
- Show user: "This slot is no longer available. Please select another."
- Return user to Live Offers screen

### 11.2 Invalid Counter-Offers

If provider counters outside range:
- Reject counter-offer
- Return error to provider: "Price must be between \$X and \$Y"
- Do not create `NegotiationOffer` record

### 11.3 Expired Negotiations

- Automatically set `negotiation.status` → EXPIRED when `now() > expiresAt`
- Background job runs every 10 seconds to expire stale negotiations
- Slot returns to OPEN status

---

## 12. Performance Requirements

- Negotiation creation: < 100ms
- Websocket event delivery: < 200ms
- Counter-offer processing: < 150ms
- Timer expiration detection: within 2 seconds of expiry time

---

## 13. Final Rule

All bidding and negotiation logic must be:
- **Deterministic**: Same inputs always produce same results
- **Transparent**: User knows exact price, time remaining, and what happens next
- **Time-bounded**: Clear expiration rules prevent indefinite negotiations
- **Fair**: Both parties can counter within defined constraints

Best Offer calculation is dynamic and client-side for instant feedback.
Negotiation state is server-authoritative and real-time synchronized.
