# Booking Summary Design (Pre-Confirmation)

The review screen that appears after a successful negotiation and before final booking confirmation. This is the user's last chance to review all details before committing.

---

## 1. Purpose

The Booking Summary screen:
- Shows all slot and provider details for final review
- Displays the final agreed price from negotiation
- Allows user to confirm or cancel before booking is created
- Provides confidence and transparency before commitment
- Prevents accidental bookings with clear, reviewable information

This is a **decision checkpoint** - not a success state.

---

## 2. When This Screen Appears

User reaches Booking Summary after:
- Provider accepts their bid, OR
- User accepts provider's counter-offer, OR
- Mutual agreement reached during negotiation

**Critical:** No booking exists yet. This is pre-confirmation review only.

---

## 3. Layout (Mobile-First)

### 3.1 Header

**Title:** "Review Your Booking"
**Subtitle:** "Check the details before confirming"

Simple, clear, non-celebratory (not confirmed yet).

### 3.2 Provider Card

Large, prominent provider information block:

```
┌─────────────────────────────────────┐
│ Zen Flow Massage ★ 4.85 (127)       │
│ 2.3 miles away                       │
│                                      │
│ 123 Main Street                      │
│ New York, NY 10001                   │
│                                      │
│ Massage • Licensed • Verified        │
└─────────────────────────────────────┘
```

**Includes:**
- Provider name (large, bold)
- Star rating + review count
- Distance from user (if available)
- Full address (street, city, state, zip)
- Service category
- Provider badges (Licensed, Verified, etc.) if applicable

### 3.3 Appointment Details Block

```
┌─────────────────────────────────────┐
│ **Your Appointment**                │
│                                      │
│ Service: Deep Tissue Massage         │
│ Date: Friday, December 1, 2025       │
│ Time: 6:30 PM - 7:30 PM              │
│ Duration: 60 minutes                 │
└─────────────────────────────────────┘
```

**Includes:**
- Service type/category (explicit)
- Full date (day of week, month, day, year)
- Start time - End time (12-hour format with AM/PM)
- Duration in minutes

**Rules:**
- Date must be unambiguous (full format, not "Tomorrow")
- Time must show exact slot boundaries
- No dropdowns or edit controls

### 3.4 Price Summary Block

```
┌─────────────────────────────────────┐
│ **Price**                            │
│                                      │
│ Agreed Price: $70                    │
│                                      │
│ (Original Price: $85)                │
│ You saved: $15                       │
└─────────────────────────────────────┘
```

**Includes:**
- Final agreed price (large, bold, primary display)
- Original base price (smaller, gray, strikethrough optional)
- Savings amount (if discount applied)

**Rules:**
- Agreed price is the negotiated offer price
- If no discount: show only agreed price, hide savings
- Price cannot change on this screen

### 3.5 Cancellation Policy (Optional for MVP)

If provider has cancellation policy:
```
┌─────────────────────────────────────┐
│ **Cancellation Policy**              │
│ Free cancellation up to 2 hours      │
│ before appointment                   │
└─────────────────────────────────────┘
```

**Rules:**
- Only show if policy exists
- Keep text short and clear
- Link to full policy if needed (future)

### 3.6 Payment Information (If Applicable)

```
┌─────────────────────────────────────┐
│ **Payment**                          │
│ Pay at provider • Cash or Card       │
└─────────────────────────────────────┘
```

**For MVP:**
- Assume payment happens at provider location
- Show accepted payment methods if known
- No credit card collection on this screen

### 3.7 Action Buttons

Two clear buttons at bottom:

```
┌─────────────────────────────────────┐
│ [Confirm Booking]  (primary, large) │
│                                      │
│ [Cancel]           (secondary, text)│
└─────────────────────────────────────┘
```

**Primary Button:**
- Text: "Confirm Booking" or "Book Now"
- Color: Primary brand color (high contrast)
- Size: Large touch target (minimum 44px height)
- Action: Creates booking, navigates to Booking Confirmation

**Secondary Button:**
- Text: "Cancel" or "Go Back"
- Style: Text link or outline button
- Action: Returns to Live Offers screen, negotiation is abandoned

---

## 4. Interaction Rules

### 4.1 Initial Load

- All data pre-filled from negotiation result
- No loading states (data already available)
- Scroll position at top
- Focus on primary action button

### 4.2 Confirm Booking Action

When user taps "Confirm Booking":

1. **Show loading state** on button ("Confirming...")
2. **Create booking record** via API
3. **On success:** Navigate to Booking Confirmation screen
4. **On failure:** Show inline error, allow retry

**Error handling:**
- If slot became unavailable: "This slot is no longer available. Please select another."
- If network error: "Could not complete booking. Please try again."
- Keep user on Booking Summary, don't lose their data

### 4.3 Cancel Action

When user taps "Cancel":

- **Confirmation dialog:** "Are you sure? This will end the negotiation."
  - Option: "Yes, Cancel"
  - Option: "No, Go Back"
- On "Yes": Mark negotiation as CANCELLED, return to Live Offers
- On "No": Stay on Booking Summary

**Alternative (simpler for MVP):**
- No confirmation dialog
- Direct return to Live Offers
- Negotiation marked as ABANDONED

### 4.4 Back Button Behavior

Hardware/system back button:
- Same behavior as "Cancel" button
- Should prompt user or abandon negotiation

---

## 5. Visual Requirements

### 5.1 Overall Layout

- Clean, spacious, easy to scan
- White or light background
- Each information block clearly separated
- Consistent padding (16-20px)
- Card-based design with subtle borders or shadows

### 5.2 Typography

- Screen title: 24-28px, bold
- Section headers: 16-18px, bold, uppercase optional
- Provider name: 20-22px, bold
- Body text: 16px, regular weight
- Price (agreed): 24-28px, bold
- Secondary info: 14px, gray

### 5.3 Provider Card Emphasis

- Slightly larger than other blocks
- Provider name most prominent text on screen (after title)
- Rating with star icon clearly visible
- Address readable without truncation

### 5.4 Color Palette

- Primary button: Brand color (e.g., blue, green)
- Text: High contrast black on white
- Secondary text: Gray (#6B7280 or similar)
- Savings text: Green (positive reinforcement)
- Error messages: Red
- Borders: Light gray (#E5E7EB)

### 5.5 Accessibility

- Touch targets minimum 44x44px
- Sufficient contrast (WCAG AA)
- Screen reader announces all key details in logical order
- Focus management: Primary button should be focusable
- Labels for all interactive elements

---

## 6. Data Requirements

To render this screen, you need:

**From Negotiation:**
- `negotiation.offerPriceCents` (agreed price)
- `negotiation.slotId` (to fetch slot details)

**From Slot:**
- `slot.startTime`
- `slot.endTime`
- `slot.basePrice` (original price)
- `slot.providerId`

**From Provider:**
- `provider.name`
- `provider.rating` (average)
- `provider.reviewCount`
- `provider.address` (full)
- `provider.distance` (from user, if available)
- `provider.serviceCategory`
- `provider.badges` (Verified, Licensed, etc.)

**Computed:**
- Savings = `basePrice - offerPriceCents`
- Duration = `endTime - startTime` in minutes
- Formatted date/time strings

---

## 7. Edge Cases

### 7.1 Slot Expired During Review

If user takes too long and slot becomes unavailable:
- Show error on "Confirm Booking": "This slot is no longer available"
- Disable confirm button
- Show "Return to Search" button

### 7.2 Negotiation Already Expired

If user navigates to this screen but negotiation is expired:
- Redirect to Live Offers
- Show toast: "Negotiation expired. Please try again."

### 7.3 Missing Provider Data

If provider data fails to load:
- Show generic placeholder: "Provider details unavailable"
- Allow booking to proceed (slot data is sufficient)
- Log error for investigation

### 7.4 No Internet Connection

- Confirm button should be disabled if offline
- Show warning: "No internet connection. Please check your network."

---

## 8. Success Path

1. **User arrives** from successful negotiation (accepted bid or accepted counter-offer)
2. **Screen loads** with all details pre-filled
3. **User reviews** provider, time, price
4. **User taps "Confirm Booking"**
5. **Booking created** successfully
6. **Navigate to Booking Confirmation** screen (success state)

---

## 9. Navigation

**To Booking Summary:**
- From negotiation flow (when agreement reached)

**From Booking Summary:**
- [Confirm Booking] → Booking Confirmation screen
- [Cancel] → Live Offers screen
- [Back button] → Cancel flow (return to Live Offers)

---

## 10. Performance Requirements

- Initial load: < 200ms (data already in memory)
- Confirm booking API call: < 1 second
- Button loading state: Immediate visual feedback
- No unnecessary re-renders or layout shifts

---

## 11. Final Rule

The Booking Summary screen must:
- **Show all essential information** clearly and completely
- **Make the confirm action** obvious and easy to tap
- **Prevent accidental bookings** with clear review opportunity
- **Build confidence** through transparency and detail
- **Never surprise the user** - everything shown here is final

This is the user's checkpoint. If they confirm here, the booking is committed.
