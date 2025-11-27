# Budget Selector Design
The budget selector screen lets the user set their offer price with clarity, control, and immediate feedback.  
This screen must feel simple, fast, and confidence-building.

---

## 1. Purpose
The screen serves to:
- set the user’s bid/offer
- show recommended price by default
- communicate match likelihood visually
- proceed into live offers immediately

It bridges the gap between discovery and bidding.

---

## 2. Layout (Mobile-First)

### 2.1 Header
Title: **“Set Your Offer”**  
Subtitle: **“Adjust your price to improve your match”**

### 2.2 Price Display Card
Large card at top showing:
- Recommended price (default)
- Current offer (when adjusted)
- Match likelihood label with color-coded badge:
  - **Very High Match** - dark green (#059669)
  - **High Match** - light green (#10B981)
  - **Low Match** - orange (#F59E0B)
  - **Very Low Match** - red (#EF4444)

Rules:
- Only one label visible at a time
- Card updates in real time as slider moves
- Badge has rounded corners, white/dark text for contrast

### 2.3 Budget Slider Component

**Horizontal range slider with synchronized numeric input:**

**Slider Specifications:**
- Type: Range input (HTML5 `<input type="range">` or custom component)
- Orientation: Horizontal
- Min value: Lowest slot minPriceCents across all providers (e.g., $45)
- Max value: Highest slot maxPriceCents across all providers (e.g., $120)
- Step: $1 increments (100 cents)
- Default: Recommended price (typically median of available range)
- Track color: Light gray for unfilled, brand color for filled
- Thumb: Circular, draggable, with subtle shadow

**Numeric Input Integration:**
- Positioned directly below or next to slider (based on mobile width)
- Type: Number input with currency formatting
- Prefix: "$" symbol
- Allows direct text entry
- Auto-formats on blur (e.g., "75" becomes "$75")
- Validates to range: min ≤ value ≤ max

**Two-Way Binding Requirements:**
- Slider change → updates numeric input immediately
- Numeric input change → updates slider position immediately
- Both update match likelihood badge in real-time
- No debouncing (instant feedback)
- Both are always synchronized (single source of truth)

### 2.4 Numeric Input Field
Next to slider or directly below depending on mobile width.

Rules:
- Direct text entry allowed
- Automatically formats as currency
- Validates to range: min ≤ value ≤ max
- No auto-correction without user action

### 2.5 Info Line (Optional)
Inline helper text:
- “Higher offers increase your chances.”
- “Recommended price aims for fast matching.”

No extra paragraphs. Short and factual.

### 2.6 Continue Button
Primary button: **“See Live Offers”**

Disabled until:
- A valid numeric offer is set
- Slider and numeric field are synchronized

Action:
- Saves offer to state  
- Navigates to Live Offers screen  

---

## 3. Interaction Rules

### 3.1 Default State
Offer = recommended price  
Match likelihood defaults to High or Very High depending on logic.

### 3.2 Real-Time Updates
Changing slider:
- updates numeric field  
- updates match indicator  
- updates card label color  

### 3.3 No Dead-Ends
If user enters invalid amount:
- Numeric field highlights in subtle orange outline
- Continue disabled
- No popups, no modals

### 3.4 Persistence
Persist across screens:
- offer value  
- match likelihood state  

Do not persist:
- slider min/max  
- UI-specific artifacts

### 3.5 Error Handling
If fetch data fails:
- retry quietly  
- never block slider  
- never remove card  

---

## 4. Visual Requirements

### 4.1 Color

**Match Likelihood Colors:**
- **Dark Green (#059669)**: Very High Match
- **Light Green (#10B981)**: High Match
- **Orange (#F59E0B)**: Low Match
- **Red (#EF4444)**: Very Low Match

**Additional Colors:**
- Price card background: White or very light gray
- Price text: Large, dark, easy to read
- Slider track: Light gray (unfilled), brand color (filled)
- Continue button: Primary brand color when enabled, gray when disabled

### 4.2 Motion
No animations other than the pre-selected pulse from previous screen if context applies.  
Slider movement is the only dynamic element.

### 4.3 Spacing
Generous padding around slider and price card.
Numeric input should not feel cramped.

---

## 5. Failure States

### 5.1 Out-of-Range Value
- Block continue
- Highlight numeric field in orange
- Inline message: “Enter a value between X and Y.”

### 5.2 No Available Slots After Price Selection
This is handled on Live Offers, not here.  
Budget selector must always succeed.

---

## 6. Success Path
1. User lands on screen with recommended price selected  
2. User adjusts slider or keeps default  
3. Match likelihood updates  
4. User taps Continue  
5. Navigates to Live Offers screen  

---

## 7. Final Rule
The budget selector must feel fast, logical, and empowering.  
The user should instantly understand how their price affects their chances.
