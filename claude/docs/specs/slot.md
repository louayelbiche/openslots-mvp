# Slot Specification
Defines the structure, rules, and behavior of time slots within the OpenSlots discovery, bidding, and booking flows.

---

## 1. Purpose
Slots represent the actual bookable inventory from providers.  
They serve three sequential roles:
1. **Discovery** — used to show availability.
2. **Bidding** — used to compute match likelihood and Best Offer.
3. **Booking** — used to finalize the user’s chosen time.

Slots must be deterministic, immutable once returned, and consistent across all flows.

---

## 2. Required Slot Fields (MVP)

```
Slot {
  slotId: string
  providerId: string
  startTime: datetime
  endTime: datetime
  basePrice: number
  maxDiscount: number
  maxDiscountedPrice: number
}
```

### Definitions:
- **slotId** — unique ID for the slot.
- **providerId** — parent provider.
- **startTime** — exact datetime slot starts.
- **endTime** — exact datetime slot ends.
- **basePrice** — provider's standard rate (in cents).
- **maxDiscount** — maximum discount percentage (0.0 to 1.0, e.g., 0.15 = 15% off).
- **maxDiscountedPrice** — computed lowest possible price, shown in discovery (in cents).

---

## 3. Slot Pricing Rules

### 3.1 Base Price
Always provided by the provider.  
Non-null, non-negative.

### 3.2 Max Discount
Represents the maximum discount percentage the provider is willing to offer (0.0 to 1.0).
Used to compute maxDiscountedPrice deterministically.

### 3.3 Max Discounted Price Calculation
Formula:
```
maxDiscountedPrice = basePrice - (basePrice * maxDiscount)
```

Or equivalently:
```
maxDiscountedPrice = basePrice * (1 - maxDiscount)
```

Rules:
- Must be deterministic and consistent across all providers
- Must not vary between screens
- Once calculated, maxDiscountedPrice must not change unless provider updates the slot

**Note:** The actual agreed price from negotiation is called **offerPrice** and is stored in the Negotiation/Booking record, not in the Slot.

---

## 4. Slot Immutability
Once slots are returned in discovery:
- Their data cannot change.
- Times cannot shift.
- Prices cannot auto-update.
- Discounts cannot auto-update.

If underlying data updates in the database:
- New call = new immutable snapshot.
- Old snapshot must remain unchanged for the user’s flow.

---

## 5. Time Window Alignment
Slots must only be included if their **startTime** is inside the selected user time window.

Time window definitions:
- Morning: 9:00–12:00
- Afternoon: 12:00–16:00
- Evening: 16:00–20:00
- Custom: user-defined range

Slots outside these ranges must be excluded entirely.

---

## 6. Best Offer Candidate
During discovery:
- The lowest maxDiscountedPrice slot of each provider is marked as candidate.
- Only one candidate per provider.
- Marking happens before bidding logic.
- Candidate status does not appear in UI until bidding step.

---

## 7. Slot Ordering
Slot ordering inside each provider card:
1. Max discounted price (ascending)
2. Start time (ascending)

User chooses from this list in the Live Offers screen.

---

## 8. Slot Selection Rules

### 8.1 In Live Offers
User may choose any visible slot from provider’s slot list.  
Selection:
- freezes slot  
- is carried to Booking Summary  

### 8.2 In Booking Summary
The slot is locked:
- no dropdowns
- no alternative selection
- cannot modify time window
- cannot adjust budget  
Slot must display in a clean, fixed, one-screen summary.

---

## 9. Slot Validation Rules
A slot must be rejected if:
- basePrice is missing
- maxDiscount is missing
- startTime or endTime invalid
- providerId missing

Never return partial slot data.

---

## 10. Failure States

### 10.1 No Slots Matching Time Window
Return empty state at discovery:
“ No time slots available in this window. Try a different range.”

### 10.2 Provider Has Zero Valid Slots
Provider is omitted from discovery entirely.

---

## 11. Performance
Slot processing must be:
- precomputed where possible  
- cached where reasonable  
- never blocking UI  

---

## 12. Final Rule
Slots are the atomic unit of availability.  
Their structure must remain stable, immutable, and guaranteed to support discovery, bidding, and booking without contradiction.
