# Discovery Specification
Defines how OpenSlots discovers providers, slots, and availability once the user sets service, city, zip, and time window.

---

## 1. Purpose
Discovery exists to:
- find available providers
- filter them by location and service type
- extract slots within the chosen time window
- prepare data for bidding and match likelihood

Discovery must be instant, deterministic, and fully explainable.

---

## 2. Inputs Required

Discovery begins ONLY when all four fields are present:

- **serviceType**
- **city**
- **zipCode**
- **timeWindow** (Morning, Afternoon, Evening, Custom)

No fallbacks, no partial discovery.

---

## 3. Discovery Flow

### Step 1 — Validate Inputs  
All fields must be defined.  
If any field missing, block and return an error.

### Step 2 — Fetch Providers  
Fetch all providers in the selected city offering the chosen service type.

Required provider fields:
- providerId  
- name  
- rating  
- distance from user (computed)  
- available slots  
- base price  
- max discount  

### Step 3 — Filter by Time Window  
Take provider slots and keep only those whose start time falls inside the user’s selected time window.

### Step 4 — Precompute Max Discounted Prices
Each slot must expose:
- basePrice
- maxDiscount
- maxDiscountedPrice (computed deterministically: `basePrice * (1 - maxDiscount)`)

### Step 5 — Rank Providers
Preliminary sorting before bidding:
1. Slot with lowest maxDiscountedPrice
2. Highest rating
3. Closest distance  

### Step 6 — Output Provider Cards  
Each provider card must return:
- providerName  
- rating  
- distance  
- “from” price (lowest slot price)  
- available slots (list)  
- Best Offer (computed after bidding step)

Provider cards must be sorted by the logic above and ready for bidding adjustments.

---

## 4. Distance Calculation
Leave exact algorithm to Claude.  
No requirement for Haversine or any specific method.

Distance must be:
- deterministic  
- reproducible  
- consistent across calls  

---

## 5. Slot Structure (MVP)
Each slot returned must include:

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

Rules:
- Slots immutable once returned  
- No dynamic pricing in MVP beyond user’s bid interaction

---

## 6. Best Offer Rules (Discovery Phase)
At discovery stage:
- Identify provider’s lowest-priced slot  
- Mark it as candidate  
- Only one lowest-price slot per provider  
- Actual Best Offer label applied after bidding

---

## 7. Failure States

### 7.1 No Providers Found
Return:
- empty state card  
- text: “No providers available for this service and time window.”  
- CTA: “Change Time Window”  

### 7.2 Provider Data Incomplete
Skip provider if:
- missing base price  
- missing slots  
- missing service match  

Never return partial provider entries.

---

## 8. Performance Rules
- All discovery logic must respond instantly.  
- Preload or cache if necessary.  
- Never delay UI or block slider interactions later.

---

## 9. Final Rule
Discovery must deliver a clean, complete, deterministic list of providers and slots, ready for bidding logic.  
No ambiguity, no incomplete data, no soft filtering.
