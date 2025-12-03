# Booking Confirmation Design
The final confirmation screen after a user selects a provider, slot, and completes the booking summary.  
This screen must be instant, clean, celebratory, and frictionless.

---

## 1. Purpose
The booking confirmation screen:
- acknowledges the confirmed booking
- reinforces trust and satisfaction
- gives the user essential details
- provides clear next steps

No extra choices. No upsells in MVP.

---

## 2. Layout (Mobile-First)

### 2.1 Success Header
Large, unmissable confirmation state:
- Icon: checkmark inside circle
- Text: **“Booking Confirmed”**
- Subtext: **“You’re all set.”**

Must be centered and visible above the fold.

### 2.2 Essential Details Block
A simple, bordered container showing:
- Service type  
- Provider name  
- Date and time (exact slot chosen)  
- Location (provider address)  
- Price paid  

Rules:
- Time slot must be final and unchangeable.  
- No dropdowns.  
- No alternative slots.  
- No scroll overflow.

### 2.3 Calendar Add Button
Single action:
**“Add to Calendar”**

Opens native device calendar with prefilled event:
- Title: “Your [Service] Appointment”
- Time: start and end from slot
- Address: provider location
- Notes: “Booked via OpenSlots”

### 2.4 Back to Home Button
Secondary action:
**“Back to Home”**

Returns to index screen and resets:
- ongoing booking state  
- selected provider  
- selected slot  

Does NOT clear persisted context (service, city, zip).

---

## 3. Interaction Rules

### 3.1 No Dead-Ends
User must always be able to return home without friction.

### 3.2 No Scroll Overflow
All content must fit on one screen height:
- adjust vertical spacing  
- reduce margins before allowing scrolling  

### 3.3 Persistence
Persist:
- service  
- city  
- zip  

Do not persist:
- slot  
- provider  
- price  
- booking confirmation details  

### 3.4 Zero Ambiguity
No optional interpretation of:
- time  
- date  
- price  
- provider  

Everything must be definitive and locked.

---

## 4. Visual Requirements

### 4.1 Color
- Success green only for confirmation icon  
- Standard palette for text  
- Avoid red entirely  

### 4.2 Motion
Optional subtle confetti burst.  
If added:
- must be lightweight  
- must not obstruct text  
- must run once, then stop  

No loops, no continuous animations.

### 4.3 Spacing
Layout must feel premium, calm, and dense with clarity but not clutter.

---

## 5. Failure States
No traditional failure states here.  
Booking has already succeeded.

If data reload required (rare):
- show cached details  
- retry silently  
- never show spinner blocking confirmation screen  

---

## 6. Success Path
1. User confirms booking  
2. Lands on confirmation screen instantly  
3. Reads short success message  
4. Reviews booking details  
5. Adds to calendar or returns home  

Clean, fast, decisive.

---

## 7. Final Rule
This screen must make the user feel confident, relieved, and satisfied.  
It must deliver closure without noise.