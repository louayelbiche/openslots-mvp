# Live Offers Screen Design

The Live Offers screen displays provider cards with available slots, match likelihood, and the Best Offer designation. This is where users compare options and initiate negotiations.

---

## 1. Purpose

The screen serves to:
- Display all available providers and their slots matching user's criteria
- Show match likelihood for each provider/slot based on user's current bid
- Highlight the single "Best Offer" - the slot price closest to user's bid
- Allow users to select a slot and initiate negotiation
- Provide real-time updates during active negotiations

This is the primary decision screen before booking.

---

## 2. Layout (Mobile-First)

### 2.1 Header

**Title:** "Available Slots"
**Subtitle:** City name + Time window (e.g., "New York • Evening (5pm-9pm)")

**Quick Context Bar:**
- Service category icon + name
- Current bid amount (editable - tapping opens budget adjustment)
- Filter/sort icon (future enhancement, hidden for MVP)

### 2.2 Provider Cards (Scrollable List)

Vertical list of provider cards, sorted by:
1. Best Offer provider (always first)
2. Highest match score
3. Closest distance
4. Highest rating

**Each provider card contains:**

┌─────────────────────────────────────┐
│ **BEST OFFER** (badge, if applicable)│
│                                      │
│ Zen Flow Massage ★ 4.85              │
│ 2.3 miles • Massage                  │
│                                      │
│ [High Match] (colored badge)         │
│                                      │
│ From $70 (lowest slot price)         │
│                                      │
│ Available Slots:                     │
│ ┌─────────────────────────────────┐ │
│ │ 5:00 PM - 6:00 PM  $75  [Bid] │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 6:30 PM - 7:30 PM  $70  [Bid] │ │  ← Best Offer slot
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 8:00 PM - 9:00 PM  $80  [Bid] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

### 2.3 Best Offer Badge (Provider Level)

**Placement:** Top-left or top-center of provider card
**Design:**
- Text: "BEST OFFER" or "Best Offer"
- Background: Gold/yellow (#F59E0B) or dark accent color
- Text color: White or dark (high contrast)
- Size: Prominent but not overwhelming
- Shape: Rounded rectangle or pill shape
- Icon: Optional star or badge icon

**Rules:**
- Exactly ONE provider card gets this badge
- Badge appears on provider with slot price closest to user's current bid
- Updates dynamically if user adjusts bid from quick context bar
- If tie (two slots equidistant), choose lower absolute price

### 2.4 Best Offer Badge (Slot Level)

**Placement:** On the specific slot item within Best Offer provider's slot list
**Design:**
- Smaller badge or gold star icon
- Text: "Best" or just icon
- Color: Gold/yellow accent
- Positioned to right of price or as overlay

**Rules:**
- Only the specific slot with price closest to user bid gets this badge
- Must be visible even when multiple slots shown
- Cannot appear on multiple slots

### 2.5 Match Likelihood Badges

**Each provider card shows overall match likelihood:**
- Badge positioned near provider name or rating
- Uses standard colors:
  - Very High Match: Dark green
  - High Match: Light green
  - Low Match: Orange
  - Very Low Match: Red

**Individual slots may show match indicators:**
- Colored dot or mini badge
- Same color system as overall match
- Optional (provider-level badge is primary)

### 2.6 Slot Action Buttons

**Each slot has a "Bid" or "Make Offer" button:**
- Tapping initiates negotiation for that specific slot
- Button disabled if:
  - User already has active negotiation
  - Slot is within 30 minutes of start time
  - Slot status is not OPEN
- Disabled state: Gray with "Unavailable" text

### 2.7 Active Negotiation Indicator

**If negotiation is active, show at top of screen:**

┌─────────────────────────────────────┐
│ **Negotiating with Zen Flow**       │
│ Your offer: $70                      │
│ Waiting for response... ⏱ 0:45      │
│                                      │
│ [View Details] [Cancel]              │
└─────────────────────────────────────┘

**Rules:**
- Sticky at top (scrolls with page)
- Countdown timer shows remaining negotiation time
- Other slots remain visible but "Bid" buttons disabled
- User can view negotiation details or cancel

---

## 3. Interaction Rules

### 3.1 Initial Load

On first load:
- Display providers sorted by criteria
- Best Offer badge on top provider (if applicable)
- Match likelihood calculated client-side from user's bid
- Scroll position at top

### 3.2 Bid Adjustment

User taps bid amount in header:
- Opens inline budget adjuster (slider + input)
- Match likelihood badges update in real-time
- Best Offer designation may move to different provider
- No navigation away from screen

### 3.3 Slot Selection

User taps "Bid" on a slot:
- Confirm dialog: "Submit bid of $X for [Time]?"
- On confirm: Create negotiation, navigate to Negotiation screen OR stay on Live Offers with active negotiation indicator
- On cancel: Return to Live Offers

### 3.4 Sorting Updates

Providers re-sort automatically when:
- User adjusts bid (match scores change)
- New providers become available (rare in MVP)
- Active negotiation completes or expires

**Sort animation:** Smooth transition, no jarring jumps

### 3.5 Empty State

If no providers match criteria:
- Large centered message: "No available slots found"
- Suggestions:
  - Try adjusting your time window
  - Try a different day
  - Increase your budget
- "Change Search" button returns to Index Screen

---

## 4. Visual Requirements

### 4.1 Provider Card Design

**Card structure:**
- White background or subtle gray
- 1px border or subtle shadow
- 12-16px padding
- 8-12px margin between cards
- Rounded corners (8px border-radius)

**Typography:**
- Provider name: 18-20px, bold
- Rating: 14-16px, with star icon
- Distance: 14px, gray text
- Slot times: 16px, medium weight
- Slot prices: 18px, bold

**Best Offer card:**
- Slightly larger or with accent border
- Gold/yellow border or glow effect (optional)
- Badge clearly visible at top

### 4.2 Slot Item Design

**Each slot within provider card:**
```
┌──────────────────────────────────┐
│ 5:00 PM - 6:00 PM       [$75]   │
│ 60 minutes              [Bid →] │
└──────────────────────────────────┘
```

- Time: Left-aligned, medium weight
- Duration: Small text below time
- Price: Right-aligned, bold
- Action button: "Bid" or "Make Offer" (8-10px padding)

**Best Offer slot:**
- Gold star or "Best" badge next to price
- Slightly highlighted background (light yellow tint)

### 4.3 Color Palette

- **Best Offer badge:** Gold (#F59E0B) or dark accent
- **Match badges:** See section 2.5
- **Provider cards:** White on light gray background
- **Slot buttons:** Primary brand color (enabled), gray (disabled)
- **Price text:** Dark, high contrast

### 4.4 Accessibility

- All badges have text labels (not just colors)
- Touch targets minimum 44x44px
- Sufficient contrast ratios (WCAG AA)
- Screen reader announces: "Best Offer, Zen Flow Massage, High Match"

---

## 5. Real-Time Features

### 5.1 Websocket Updates

**Listen for:**
- `negotiation:accepted` → Show success, navigate to Booking Summary
- `negotiation:counter-offer` → Update active negotiation indicator
- `negotiation:expired` → Hide active negotiation indicator, re-enable slot buttons
- `slot:booked` → Remove slot from available list

### 5.2 Optimistic UI Updates

When user initiates bid:
- Immediately show active negotiation indicator
- Disable other "Bid" buttons
- Don't wait for server confirmation (assume success)
- Revert if server returns error

### 5.3 Countdown Timer

**Active negotiation timer:**
- Format: "0:45" (minutes:seconds)
- Updates every second
- Turns red when < 10 seconds remaining
- Shows "Expired" when time runs out

---

## 6. Failure States

### 6.1 No Providers Found

**Display:**
- Empty state illustration (optional)
- Message: "No available slots match your criteria"
- Suggestion text
- "Adjust Search" button

### 6.2 Slot Became Unavailable

If user tries to bid on slot that just got booked:
- Inline error: "This slot is no longer available"
- Remove slot from list
- Keep user on Live Offers screen

### 6.3 Network Error

If websocket disconnects:
- Show reconnecting indicator at top
- Poll for updates every 2 seconds as fallback
- Hide indicator when reconnected

---

## 7. Success Path

1. **User arrives from Budget Selector** with bid set
2. **Screen loads providers** sorted by Best Offer first
3. **User sees Best Offer badge** on top provider and specific slot
4. **User taps "Bid"** on desired slot
5. **Negotiation initiated** - active negotiation indicator appears
6. **Provider responds** via websocket (accept or counter)
7. **If accepted:** Navigate to Booking Summary
8. **If countered:** Show negotiation screen or modal with counter-offer

---

## 8. Navigation

**From Live Offers:**
- [Back arrow] → Returns to Budget Selector
- [Bid button] → Initiates negotiation (stays on Live Offers or goes to Negotiation modal)
- [View Details] (in active negotiation) → Opens negotiation details modal

**To Live Offers:**
- From Budget Selector (after setting bid)
- From Index Screen (if user has persisted bid from previous session)

---

## 9. Performance Requirements

- Initial load: < 500ms
- Match likelihood recalculation: < 50ms (client-side)
- Best Offer recalculation: < 100ms (client-side)
- Websocket event handling: < 200ms
- Sort animation: Smooth 300ms transition

---

## 10. Final Rule

The Live Offers screen must:
- Make the **Best Offer** instantly recognizable (gold badge, top position)
- Show **match likelihood** clearly with color-coded badges
- Enable **fast decision-making** with clear slot prices and times
- Support **real-time negotiation** with websocket updates
- Never confuse the user with ambiguous states or hidden information

Best Offer is the North Star. Everything else supports comparison and confidence.
