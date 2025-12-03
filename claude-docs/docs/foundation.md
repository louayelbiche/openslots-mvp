# OpenSlots Foundation Document
The non-negotiable product principles, behavioral rules, and system philosophy that every agent must follow.  
This file overrides all agent reasoning and all lower-level documents whenever conflicts arise.

---

## 1. Product Identity
OpenSlots is a mobile-first marketplace that matches users with nearby wellness providers through discovery, bidding, and real-time availability.

The product unlocks two outcomes:
1. Users find the right service at the right time at the right price.
2. Providers fill unused capacity and earn more per hour.

Everything in the system must reinforce:
- speed to decision  
- clarity of pricing  
- ease of comparison  
- trust and transparency  
- zero dead-ends  
- lowest friction from discovery to booking  

---

## 2. Core Experience Pillars
All agents must design and implement according to these pillars:

### 2.1 Speed
- Minimize steps to reach actionable results.
- Every action must produce immediate visible progress.
- Reduce waiting, reduce typing, reduce jumps between screens.

### 2.2 Clarity
- Always show: service, location, time window, offer price, match likelihood, and Best Offer.
- Zero ambiguous states.
- Zero hidden logic.

### 2.3 Control
- User must feel in control of budget, scheduling, selection, and confirmation.
- No auto-commit actions.
- Nothing happens "in the background" without explicit user trigger.

### 2.4 Transparency
- Never hide provider ratings, distance, timing, or offer conditions.
- “Best Offer” must always be objectively determined, one per list.
- Match likelihood indicators must always be justified by underlying logic.

### 2.5 Flow
- Never trap the user.  
- There is always a clear path forward or a simple way back home.  
- No looping screens.  
- Navigation must always be obvious.

---

## 3. MVP Boundaries
These apply across UI, API, DB, and logic unless explicitly changed later.

### 3.0 Service Categories
MVP supports exactly **6 service categories**:
1. **Massage**
2. **Acupuncture**
3. **Nails**
4. **Hair**
5. **Facials & Skin**
6. **Lashes & Brows**

These categories are fixed and must not be expanded without explicit approval.
All UI, data models, and logic must reference these exact categories.

### 3.1 Mobile-First
All design and structure must assume portrait mobile usage.
Desktop support is secondary and derives from mobile.

### 3.2 Essential Inputs Only
Every field, step, and choice must directly serve:
- discovery  
- matching  
- bidding  
- booking  

Any field that does not materially improve these flows must be removed or deferred.

### 3.3 Persistent User Context
The system must preserve:
- selected service  
- city  
- zip code  
- time window  
- budget slider position  
- match likelihood state  
- selected slot  

This context must remain stable across screens unless explicitly reset.

### 3.4 Minimal Screens
Each screen must:
- have one primary purpose  
- push the flow forward  
- avoid multi-purpose clutter  

Complexity goes into logic, not UI.

---

## 4. Global UX Principles

### 4.1 Visual Priority Rules
Highest priority information:
1. Service type  
2. Time window  
3. Offer price  
4. Match likelihood  
5. Best Offer designation  
6. Provider proximity  
7. Available slots  

If UI becomes crowded, lower-priority items collapse or move, but the top items must always remain highly visible.

### 4.2 Match Likelihood Colors
- **Very High** likelihood: dark green
- **High** likelihood: light green
- **Low** likelihood: orange
- **Very Low** likelihood: red

Colors must be used consistently across all screens showing match probability.

### 4.3 Best Offer Rules
- Exactly one Best Offer per provider list.
- **Best Offer** = slot with price **closest** to user's current bid.
- Updates dynamically in real-time as user adjusts budget slider.
- Label must appear on provider card *and* on the slot.
- If tie (two slots equidistant from bid), choose lower absolute price.
- No randomness, no subjective logic.

### 4.4 Input Interactions
- Sliders must always have a numeric input that stays synced.
- Dropdowns must not nest more than one level.
- Budget slider always shows recommended price by default.

### 4.5 Motion
- Pre-selected recommended card uses a subtle pulse animation.
- Motion must be minimal, purposeful, and never distracting.

---

## 5. System Logic Principles

### 5.1 Discovery
- Starts immediately after service + location are selected.  
- Time window is mandatory for any search.  
- All discovery logic must be deterministic and explainable.

### 5.2 Slot Structure
Each slot must include:
- provider ID  
- start time  
- end time  
- base price  
- max discount  
- final price (calculated)  
Slots must be immutable once returned unless user changes inputs.

### 5.3 Bidding and Negotiation Logic
- User submits bid on selected slot, initiating negotiation.
- Provider receives bid via websocket and can accept or counter-offer.
- Negotiation window: 60 seconds from provider's first counter-offer.
- Cannot bid within 30 minutes of slot start time.
- User can negotiate only 1 slot at a time; provider can negotiate multiple unique slots.
- Match likelihood recalculates in real time as user adjusts budget slider.
- All negotiation logic must be deterministic and transparent.

### 5.4 Sorting Logic
Default sort order:
1. Best Offer (if present)  
2. Highest match score  
3. Closest distance  
4. Highest rating  

Sorting must remain internal, never exposed as user-configurable for MVP.

### 5.5 Booking
- Time slot is frozen on Booking Summary.  
- No dropdown here.  
- No scroll overflow; the summary must fit within one screen.  
- Booking confirmation must be final, clean, and frictionless.

---

## 6. Data Philosophy

### 6.1 Data Models Are Not Final
Agents may propose improved models any time if:
- fields reduce design friction  
- flows become simpler  
- logic becomes more deterministic  

### 6.2 Persist What Helps
Persist fields that reduce redundant steps:
- service selection  
- zip code  
- city  
- budget  
Never persist anything that would force unexpected prefilled fields that confuse the user.

### 6.3 No Silent Data Creation
All derived fields must be transparent and documented.

---

## 7. Agent Governance

### 7.1 Source-of-Truth Hierarchy
1. `claude-docs/foundation.md`  
2. `claude-docs/docs/specs/*`  
3. `claude-docs/docs/design/*`  
4. `claude-docs/policies/*`  
5. Agent files (`claude-docs/agents/...`)  
6. Codebase  
7. Agent reasoning  

### 7.2 Conflict Resolution
If a conflict arises:
- The agent must stop  
- Surface the conflict clearly  
- Propose options to resolve  
- Wait for approval  

### 7.3 No Scope Drift
Agents may improve implementation but cannot introduce:
- new features  
- new UX patterns  
- new screens  
- new flows  
unless explicitly requested.

---

## 8. Philosophy for Allowed Agent Autonomy
Agents may:
- simplify  
- optimize  
- refactor  
- consolidate  
- restructure  
- propose data model improvements  
- propose UX clarifications  
as long as consistency and simplicity improve.

Agents may not:
- reinvent core flows  
- modify fundamental user decisions  
- hide information  
- bypass validation  
- introduce probabilistic UX behavior  

---

## 9. Final Principle
**If any step, field, or screen does not decrease friction or increase clarity, it must be removed.**

Everything must serve the user’s intent to get a service quickly, confidently, and at the right price.
