# Index Screen Design
Primary entry point for the OpenSlots mobile experience.  
This screen must drive service selection, location capture, and time-window initialization with zero friction.

---

## 1. Purpose
The index screen exists to:
- let the user select the service category
- collect city and zip code
- move directly into discovery and bidding flows
- preserve context persistently (service, city, zip)

This is the earliest actionable surface.  
Clarity and speed dominate.

---

## 2. Layout (Mobile-First)

### 2.1 Header
- Clean title: **“What are you looking for?”**
- Subtle supporting line if needed: **“Choose your service to begin”**
- No clutter, no secondary CTAs.

### 2.2 Service Category Cards
Grid of large touch-friendly cards:
- Massage
- Nails
- Hair
- Waxing
- Brows
- Lashes
- Facial
- Spa

Card requirements:
- Full-width on narrow screens, two-per-row on regular mobile
- Icon + label
- High contrast
- Tap sets `serviceType` and advances

Pre-selected card (if context persists):
- Subtle pulse animation  
- Tag text: **“Recommended for you”**

### 2.3 City + Zip Selector
Placed immediately below service cards.

Two fields on same horizontal block:
- City (dropdown + type-ahead)
- Zip code (5-digit input)

Requirements:
- Both fields required before continuing
- Autofill zip if user has previously entered it
- Autofill city if location services enabled
- Persisted for session

### 2.4 Time Window Dropdown
Appears after service + city + zip are filled.

Dropdown options:
- Morning (9 AM – 12 PM)
- Afternoon (12 PM – 4 PM)
- Evening (4 PM – 8 PM)
- Custom Range (opens picker)

Constraints:
- Mandatory for discovery
- Only one dropdown level
- Must be visually prominent

### 2.5 Continue Button
Single primary button:
Text: **“Find Availability”**

Disabled until:
- service selected
- city provided
- zip provided
- time window selected

When pressed:
- Saves context to state
- Triggers discovery flow
- Navigates to Budget Selector

---

## 3. Interaction Rules

### 3.1 Persistence
Persist:
- serviceType
- city
- zip
- timeWindow

Do not persist:
- budget
- match likelihood
- slot selection

### 3.2 No Dead-Ends
Any incomplete state must be fixable without leaving the screen.

### 3.3 Accessibility
- Large tap targets
- High contrast text
- Minimal scrolling

---

## 4. Visual Requirements

### 4.1 Color
- Follow OpenSlots palette
- Service cards use clean neutrals with accent on hover/tap
- No red on this screen

### 4.2 Motion
Only pulse appears on recommended pre-selected card.
No slides, fades, or distracting animations.

### 4.3 Spacing
Generous vertical spacing to reduce cognitive load.
Everything must feel breathable and premium.

---

## 5. Failure States

### 5.1 Missing Zip or City
Inline error:
- “Please enter a valid city and zip to continue.”

### 5.2 Invalid Zip
- Prevent continue
- Highlight field in subtle orange outline (never red)

---

## 6. Success Path
1. User taps service  
2. Enters city  
3. Enters zip  
4. Selects time window  
5. Presses Continue  
6. Goes to Budget Selector  

No intermediate screens.  
No interruptions.

---

## 7. Final Rule
The index screen must get the user into the flow instantly, without friction or distraction.  
It must feel fast, modern, and obvious with every tap.
