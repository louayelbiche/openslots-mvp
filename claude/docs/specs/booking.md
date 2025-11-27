# Booking Specification

Defines how OpenSlots creates bookings from accepted negotiations, displays booking summaries, and confirms final appointments.

---

## 1. Purpose

Booking converts an **accepted negotiation** into a confirmed appointment.
It must be clear, fixed, and frictionless.

Bookings are created **only** when:
- A negotiation reaches ACCEPTED status (either party accepts an offer)
- The slot is still available
- User is authenticated

---

## 2. Inputs Required

Booking creation requires:
- **negotiationId** (the accepted negotiation)
- **userId** (authenticated user)
- **slotId** (frozen slot from negotiation)
- **providerId** (from negotiation)
- **offerPriceCents** (agreed price from negotiation.offerPriceCents)

Context fields (persisted from earlier flow):
- serviceCategory
- city
- zipCode
- timeWindow

---

## 3. Booking Flow

### 3.1 Trigger: Negotiation Accepted

Booking is triggered when:
1. User accepts provider's counter-offer, OR
2. Provider accepts user's bid

System automatically:
- Sets `negotiation.status` → ACCEPTED
- Sets `negotiation.acceptedBy` → USER or PROVIDER
- Sets `negotiation.acceptedAt` → now()
- Sets `negotiation.offerPriceCents` → agreed price
- Proceeds to booking creation

### 3.2 Step 1: Authentication Check

Before showing Booking Summary, verify user is authenticated:

**If authenticated:**
- Proceed directly to Booking Summary

**If NOT authenticated:**
- Show lightweight auth screen:
  - Email + magic link (primary method)
  - OR Phone + OTP (alternative)
- No additional fields required (name, address collected in post-signup profile completion)
- After auth, proceed to Booking Summary

### 3.3 Step 2: Load Booking Summary

Booking Summary displays the finalized booking details:

**Required Fields:**
- Provider name
- Provider rating (e.g., "4.85 ★" or "New")
- Service type (category)
- Date and exact time of slot (e.g., "Monday, Jan 15 at 5:00 PM")
- **Agreed offer price** (from negotiation.offerPriceCents)
- Provider address (full street address for directions)
- Distance from user's location

**Display Rules:**
- Must fit on one screen (no scrolling overflow)
- Slot details are **frozen** (no dropdowns, no changes allowed)
- Price shown is the negotiated offer price (not user's original bid)
- Provider address is shown (not user's address)

**Example Layout:**
```
┌─────────────────────────────────┐
│  Booking Summary                │
├─────────────────────────────────┤
│  Zen Flow Massage ★ 4.85        │
│  60-Minute Deep Tissue Massage  │
│                                 │
│  Monday, January 15, 2025       │
│  5:00 PM - 6:00 PM              │
│                                 │
│  123 Main Street                │
│  New York, NY 10001             │
│  2.3 miles away                 │
│                                 │
│  Agreed Price: $75              │
│                                 │
│  [Confirm Booking]              │
└─────────────────────────────────┘
```

### 3.4 Step 3: User Confirms

User taps **"Confirm Booking"** button:
- No additional prompts
- No price changes
- No slot selection changes

### 3.5 Step 4: Create Booking Record

System creates `Booking` record:

```typescript
{
  id: generateId(),
  userId: user.id,
  slotId: negotiation.slotId,
  negotiationId: negotiation.id,
  priceCents: negotiation.offerPriceCents,
  status: CONFIRMED,
  createdAt: now()
}
```

### 3.6 Step 5: Update Slot Status

Immediately mark slot as booked:
- `slot.status` → BOOKED
- Slot no longer appears in discovery
- Other active negotiations on this slot (if any) → CANCELLED

### 3.7 Step 6: Redirect to Confirmation Screen

User sees **Booking Confirmation** screen immediately:
- Success message
- Booking details
- Add to calendar button
- Provider address with directions link

---

## 4. Data Model

```typescript
interface Booking {
  id: string;
  userId: string;
  slotId: string;
  negotiationId: string;  // Reference to accepted negotiation

  priceCents: number;     // Final agreed price from negotiation
  status: BookingStatus;  // PENDING | CONFIRMED | CANCELLED

  createdAt: Date;
  updatedAt: Date;
}

enum BookingStatus {
  PENDING = "PENDING",       // Created but not yet confirmed (rare)
  CONFIRMED = "CONFIRMED",   // Booking is confirmed
  CANCELLED = "CANCELLED"    // User or provider cancelled
}
```

**Related Models:**
- Booking has one Negotiation (via negotiationId)
- Booking has one Slot (via slotId)
- Booking has one User (via userId)
- Slot belongs to one Provider
- Slot belongs to one Service

---

## 5. Validation Rules

### 5.1 Negotiation Status Check

Before creating booking, verify:
- `negotiation.status === ACCEPTED`
- `negotiation.offerPriceCents` is set
- `negotiation.acceptedBy` is either USER or PROVIDER

If invalid:
- Show error: "Negotiation is not in accepted state"
- Return to Live Offers screen

### 5.2 Slot Availability Check

Before creating booking, verify:
- `slot.status === OPEN` (not already booked)
- Slot still exists in database
- `slot.providerId` matches `negotiation.providerId`

If slot unavailable:
- Set `negotiation.status` → CANCELLED
- Show error: "This slot is no longer available. Please select another."
- Return to Live Offers screen

### 5.3 Price Consistency

- Price displayed in Booking Summary must equal `negotiation.offerPriceCents`
- No recalculation allowed
- If mismatch detected, log error and use negotiation price as source of truth

### 5.4 Provider Address Display

- Show provider's full address (from `provider.address`, `provider.city`, `provider.state`, `provider.zipCode`)
- NOT user's address
- Address must be complete and valid for mapping/directions

---

## 6. Failure Handling

### 6.1 Slot Became Unavailable

If slot was booked by another user between negotiation acceptance and booking creation:
- Show inline error: "This slot is no longer available"
- Set `negotiation.status` → CANCELLED
- Keep user's context (city, zip, category, timeWindow)
- Return to Live Offers screen

### 6.2 Negotiation Expired During Booking

If negotiation expired while user was on Booking Summary:
- Show error: "Your negotiation has expired"
- Return to Live Offers screen
- User can initiate new bid if desired

### 6.3 Provider Became Unavailable

If provider deleted or deactivated:
- Show error: "This provider is no longer available"
- Return to discovery with persisted inputs

### 6.4 Backend / Network Error

Minimal user-facing message:
- "Unable to complete booking. Please try again."
- Retry button
- Never show stack traces or technical details

---

## 7. Persistence

### 7.1 What to Persist (User Context)

Persist across booking flow:
- serviceCategory
- city
- zipCode
- timeWindow

### 7.2 What NOT to Persist

Do NOT persist after booking completes:
- Selected provider
- Selected slot
- Negotiation details
- offerPriceCents

Reason: User should start fresh for next search, not auto-prefill previous booking.

---

## 8. Authentication Flow

### 8.1 Magic Link (Primary)

1. User enters email
2. System sends magic link to email
3. User clicks link
4. System creates session
5. User returned to Booking Summary (if booking in progress)

### 8.2 Phone + OTP (Alternative)

1. User enters phone number
2. System sends 6-digit OTP via SMS
3. User enters code
4. System verifies and creates session
5. User returned to Booking Summary

### 8.3 Post-Signup Profile Completion

After first login (new user):
- Redirect to profile completion screen
- Collect: name, phone (if not provided), address, zip (confirmation)
- Set `user.profileCompleted` → true
- Then allow booking

---

## 9. Success Path

Complete booking flow:

1. **Negotiation accepted** (either party accepts offer)
2. **Auth check** (magic link if not logged in)
3. **Booking Summary displayed** (frozen details, agreed offer price)
4. **User confirms booking**
5. **Booking record created** (with negotiationId)
6. **Slot marked BOOKED**
7. **Confirmation screen shown** (with calendar add + directions)

Clean, simple, definitive.

---

## 10. Booking Confirmation Screen

After successful booking, show:
- Success message: "You're all set!"
- Provider name
- Service type
- Date and time
- Provider address
- Agreed price
- **Add to Calendar** button (Apple Calendar / Google Calendar integration)
- **Get Directions** button (opens Maps with provider address)
- **Back to Home** button

Do NOT show:
- Negotiation history
- Alternative slots
- Other providers

---

## 11. Final Rule

Booking must be:
- **Definitive**: Once confirmed, it's final
- **Transparent**: User sees exact price, time, and location
- **Frictionless**: Minimal steps from negotiation acceptance to confirmation
- **Single source of truth**: All booking details come from the accepted negotiation

Zero ambiguity. Zero hidden steps. The booking is the contract.
