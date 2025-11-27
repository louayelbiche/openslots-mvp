# Match Likelihood Specification

Defines the exact algorithm for calculating match likelihood between user bids and provider slot pricing in the OpenSlots MVP.

---

## 1. Purpose

Match likelihood exists to:
- Give users transparent feedback on their bid's success probability
- Guide users toward realistic pricing expectations
- Enable sorting providers by match score
- Provide visual indicators (colors) for quick decision-making

Match likelihood must be:
- **Deterministic**: Same inputs always produce same output
- **Transparent**: Formula is documented and explainable
- **Real-time**: Updates instantly as user adjusts budget slider
- **Pre-negotiation**: Calculated before any negotiation starts

---

## 2. Match Likelihood Categories

There are **4 match likelihood categories**, displayed with specific colors:

| Category | Color | Meaning |
|----------|-------|---------|
| **Very High** | Dark Green (#059669) | User's bid meets or exceeds provider's max price |
| **High** | Light Green (#10B981) | User's bid is within provider's acceptable range |
| **Low** | Orange (#F59E0B) | User's bid is slightly below acceptable range but negotiable |
| **Very Low** | Red (#EF4444) | User's bid is significantly below provider's minimum |

---

## 3. Match Threshold Formulas

### 3.1 Input Variables

For each slot, we have:
- `userBid` - User's current offer price (in cents)
- `slot.minPriceCents` - Minimum price provider will accept (basePrice - maxDiscount)
- `slot.maxPriceCents` - Provider's original/base price

### 3.2 Formula

```typescript
function calculateMatchLikelihood(
  userBid: number,
  minPriceCents: number,
  maxPriceCents: number
): MatchLikelihood {
  // Very High: User bid meets or exceeds max price
  if (userBid >= maxPriceCents) {
    return 'VERY_HIGH';
  }

  // High: User bid is within acceptable range
  if (userBid >= minPriceCents) {
    return 'HIGH';
  }

  // Low: User bid is 90% or more of minimum (negotiable)
  const lowThreshold = minPriceCents * 0.90;
  if (userBid >= lowThreshold) {
    return 'LOW';
  }

  // Very Low: User bid is below 90% of minimum
  return 'VERY_LOW';
}
```

### 3.3 Threshold Summary

| Condition | Category | Formula |
|-----------|----------|---------|
| `userBid >= maxPriceCents` | Very High | ≥ 100% of max price |
| `userBid >= minPriceCents && userBid < maxPriceCents` | High | 100% of min to <100% of max |
| `userBid >= (minPriceCents * 0.90) && userBid < minPriceCents` | Low | 90% to <100% of min price |
| `userBid < (minPriceCents * 0.90)` | Very Low | < 90% of min price |

### 3.4 Example Calculations

**Slot pricing:**
- `maxPriceCents` = 10000 ($100 original price)
- `minPriceCents` = 7000 ($70 minimum after max discount)

**Match likelihood by user bid:**
```
userBid = $100 (10000¢) → Very High (≥ $100)
userBid = $85  (8500¢)  → High ($70 ≤ bid < $100)
userBid = $70  (7000¢)  → High (exactly at minimum)
userBid = $65  (6500¢)  → Low ($63 ≤ bid < $70, where $63 = 90% of $70)
userBid = $62  (6200¢)  → Very Low (< $63, below 90% threshold)
```

---

## 4. Match Score (Internal Sorting)

### 4.1 Purpose

Match score is a numeric value (0-100) used internally for sorting providers.
It is NOT displayed to users - only the likelihood category (Very High/High/Low/Very Low) is shown.

### 4.2 Formula

```typescript
function calculateMatchScore(
  userBid: number,
  minPriceCents: number,
  maxPriceCents: number
): number {
  // Very High: 90-100 points
  if (userBid >= maxPriceCents) {
    const excess = userBid - maxPriceCents;
    const maxExcess = maxPriceCents * 0.10; // Cap at 10% over
    const excessRatio = Math.min(excess / maxExcess, 1.0);
    return 90 + (excessRatio * 10); // 90-100
  }

  // High: 70-90 points
  if (userBid >= minPriceCents) {
    const range = maxPriceCents - minPriceCents;
    const position = userBid - minPriceCents;
    const ratio = position / range;
    return 70 + (ratio * 20); // 70-90
  }

  // Low: 40-70 points
  const lowThreshold = minPriceCents * 0.90;
  if (userBid >= lowThreshold) {
    const range = minPriceCents - lowThreshold;
    const position = userBid - lowThreshold;
    const ratio = position / range;
    return 40 + (ratio * 30); // 40-70
  }

  // Very Low: 0-40 points
  const veryLowRange = lowThreshold * 0.50; // Bottom 50% of low threshold
  const position = Math.max(0, userBid - (lowThreshold * 0.50));
  const ratio = Math.min(position / veryLowRange, 1.0);
  return ratio * 40; // 0-40
}
```

### 4.3 Score Distribution

- **90-100**: Very High (bid meets or exceeds max price)
- **70-89**: High (bid within acceptable range)
- **40-69**: Low (bid negotiable but below minimum)
- **0-39**: Very Low (bid significantly below minimum)

---

## 5. Real-Time Recalculation

### 5.1 When to Recalculate

Match likelihood and score recalculate when:
- User adjusts budget slider
- User manually enters bid in numeric input
- User selects different time window (slots change)
- User selects different city/zip (providers change)

### 5.2 Performance Requirements

- Recalculation must complete in < 50ms
- Must not cause UI lag or stutter
- Client-side calculation preferred (no API call needed)

### 5.3 Implementation Notes

```typescript
// Client-side implementation (React/Vue/etc)
useEffect(() => {
  const updatedProviders = providers.map(provider => ({
    ...provider,
    slots: provider.slots.map(slot => ({
      ...slot,
      matchLikelihood: calculateMatchLikelihood(
        userBid,
        slot.minPriceCents,
        slot.maxPriceCents
      ),
      matchScore: calculateMatchScore(
        userBid,
        slot.minPriceCents,
        slot.maxPriceCents
      )
    }))
  }));

  setProviders(updatedProviders);
}, [userBid]); // Recalculate when bid changes
```

---

## 6. Visual Display Rules

### 6.1 Color Application

**Budget Selector Screen:**
- Show match indicator next to recommended price
- Update color as slider moves

**Live Offers Screen:**
- Each provider card shows match likelihood badge
- Badge color matches category (dark green, light green, orange, red)
- Badge text: "Very High Match", "High Match", "Low Match", "Very Low Match"

**Slot Items:**
- Individual slots within provider card show match likelihood
- Smaller badge or colored dot indicator

### 6.2 Badge Design

```
┌──────────────────┐
│ Very High Match  │  ← Dark green background, white text
└──────────────────┘

┌──────────────────┐
│   High Match     │  ← Light green background, dark text
└──────────────────┘

┌──────────────────┐
│   Low Match      │  ← Orange background, dark text
└──────────────────┘

┌──────────────────┐
│  Very Low Match  │  ← Red background, white text
└──────────────────┘
```

### 6.3 Accessibility

- Color is not the only indicator (text label included)
- Sufficient contrast ratios (WCAG AA minimum)
- Screen reader announces match level

---

## 7. Sorting by Match Score

### 7.1 Provider Sorting

When multiple providers are displayed, sort by:

1. **Best Offer** (if present) - slot price closest to user bid
2. **Match Score** (descending) - higher scores first
3. **Distance** (ascending) - closer providers first
4. **Rating** (descending) - higher rated providers first

### 7.2 Tie-Breaking

If two providers have identical match scores:
- Sort by distance (closer wins)
- If distance tied, sort by rating (higher wins)
- If all tied, maintain stable sort order (first in list stays first)

---

## 8. Edge Cases

### 8.1 Zero or Negative Bid

If `userBid <= 0`:
- Default to Very Low match
- Score = 0
- Show warning: "Please enter a valid offer amount"

### 8.2 Missing Slot Pricing

If `minPriceCents` or `maxPriceCents` is null/undefined:
- Exclude slot from results
- Log error for monitoring
- Do not show match likelihood

### 8.3 Invalid Pricing (min > max)

If `minPriceCents > maxPriceCents`:
- Log data error
- Use `maxPriceCents` as both min and max
- Show "High Match" if bid >= max

### 8.4 Exact Min Price Match

If `userBid === minPriceCents`:
- Category: High (not Low)
- User bid is exactly at acceptable threshold

---

## 9. Testing Requirements

### 9.1 Unit Tests

Test cases must cover:
- All 4 match categories
- Boundary conditions (exactly at thresholds)
- Edge cases (zero bid, missing data)
- Score calculation for each category
- Sorting with mixed match scores

### 9.2 Example Test Cases

```typescript
describe('calculateMatchLikelihood', () => {
  const min = 7000; // $70
  const max = 10000; // $100

  it('returns VERY_HIGH when bid >= max', () => {
    expect(calculateMatchLikelihood(10000, min, max)).toBe('VERY_HIGH');
    expect(calculateMatchLikelihood(12000, min, max)).toBe('VERY_HIGH');
  });

  it('returns HIGH when min <= bid < max', () => {
    expect(calculateMatchLikelihood(7000, min, max)).toBe('HIGH');
    expect(calculateMatchLikelihood(8500, min, max)).toBe('HIGH');
    expect(calculateMatchLikelihood(9999, min, max)).toBe('HIGH');
  });

  it('returns LOW when 90% of min <= bid < min', () => {
    expect(calculateMatchLikelihood(6300, min, max)).toBe('LOW'); // exactly 90%
    expect(calculateMatchLikelihood(6500, min, max)).toBe('LOW');
    expect(calculateMatchLikelihood(6999, min, max)).toBe('LOW');
  });

  it('returns VERY_LOW when bid < 90% of min', () => {
    expect(calculateMatchLikelihood(6299, min, max)).toBe('VERY_LOW');
    expect(calculateMatchLikelihood(5000, min, max)).toBe('VERY_LOW');
  });
});
```

---

## 10. Final Rule

Match likelihood calculation must be:
- **Transparent**: Formula documented and never changed silently
- **Deterministic**: Same inputs always produce same output
- **Fast**: Recalculates in < 50ms
- **Client-side**: No server call needed for real-time updates

The 90% threshold for Low/Very Low boundary is fixed and must not change without updating this spec.
