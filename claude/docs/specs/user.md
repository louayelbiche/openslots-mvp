# User Specification

Defines how user data, authentication, profile completion, and session context work in the OpenSlots MVP.

---

## 1. Purpose

User data exists to:
- Enable booking confirmation
- Enable personalized discovery
- Reduce repeated inputs across sessions
- Maintain session continuity

No additional user features, preferences, or personalization beyond what is necessary for discovery, negotiation, and booking.

---

## 2. User Types (MVP)

There are two user types:
- **CONSUMER** (customer booking services)
- **PROVIDER** (business offering services)

This specification focuses on **CONSUMER** accounts.
Provider accounts are detailed in `provider.md`.

---

## 3. User Data Model

### 3.1 Core Account Fields

```typescript
interface User {
  id: string;
  email: string;                  // Required, unique
  name?: string;                  // Optional initially, collected in profile completion
  role: UserRole;                 // CONSUMER | PROVIDER | ADMIN

  // Profile completion fields (captured post-signup)
  phone?: string;                 // Optional initially, required in profile completion
  address?: string;               // Collected in profile completion
  addressLine2?: string;          // Optional (suite, unit, floor)
  addressCity?: string;           // From profile completion
  addressState?: string;          // From profile completion
  addressZip?: string;            // From profile completion
  profileCompleted: boolean;      // Default: false

  // Browse context (persisted from index screen)
  selectedCity?: string;          // Last selected city for browsing
  selectedZipCode?: string;       // Last selected zip for browsing
  selectedCategory?: ServiceCategory; // Last selected service category

  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Field Requirements

**Required at signup:**
- email (validated format)

**Required in post-signup profile completion:**
- name (first + last combined or separate)
- phone (E.164 format or local pattern)
- address (street address)
- addressCity
- addressState
- addressZip

**Optional:**
- addressLine2 (apartment, suite, floor)

**NOT included in MVP:**
- password/passwordHash (magic link only)
- gender
- birthdate
- marketing preferences

---

## 4. Authentication

### 4.1 Primary Method: Magic Link

**Signup Flow:**
1. User enters email
2. System sends magic link to email
3. User clicks link
4. System creates account and session
5. Redirect to profile completion (new users only)

**Login Flow:**
1. User enters email
2. System sends magic link
3. User clicks link
4. System creates session
5. Redirect to previous page or home

### 4.2 Alternative Method: Phone + OTP

**Signup Flow:**
1. User enters phone number
2. System sends 6-digit OTP via SMS
3. User enters code
4. System creates account and session
5. Redirect to profile completion

**Login Flow:**
1. User enters phone
2. System sends OTP
3. User enters code
4. System creates session
5. Redirect to previous page

### 4.3 Session Persistence

Sessions persist via:
- **Secure HTTP-only cookies** (recommended)
- OR JWT tokens stored in localStorage
- Session duration: 30 days (configurable)

### 4.4 Authentication Timing

Users can browse and negotiate **without** authentication:
- Index screen (service selection)
- Budget selector
- Live Offers (provider/slot browsing)
- Negotiation initiation

Authentication **required** before:
- Booking confirmation
- Profile viewing
- Booking history

---

## 5. Post-Signup Profile Completion

### 5.1 When Profile Completion Triggers

After first-time login via magic link or OTP:
- If `user.profileCompleted === false`
- Redirect to profile completion screen
- Block booking until completion

### 5.2 Profile Completion Screen

Collect:
1. **Name** (text input)
2. **Phone** (if not provided during OTP signup)
3. **Address** (street address)
4. **City** (text input or select)
5. **State** (dropdown or text)
6. **Zip Code** (5-digit validation)

**Validation Rules:**
- Name: required, min 2 characters
- Phone: E.164 format (e.g., +1234567890) or local format
- Address: required, min 5 characters
- City: required
- State: required (2-letter code for US)
- Zip: required, 5-digit format for US

**On Submit:**
- Set `user.profileCompleted = true`
- Save all fields
- Redirect to intended destination (booking or home)

### 5.3 City/Zip Validation

When user enters zip code in profile completion:
- Validate zip matches selected city
- If mismatch: show warning "Zip code doesn't match [City]. Please verify."
- Allow override (user may have correct info, system may be wrong)

---

## 6. Browse Context Persistence

### 6.1 Fields Persisted Across Sessions

After user selects on Index Screen:
- `user.selectedCity` → city chosen for browsing
- `user.selectedZipCode` → zip code (optional) for narrowing distance
- `user.selectedCategory` → service category (e.g., MASSAGE, NAILS)

These are automatically saved to user record and pre-filled on next visit.

### 6.2 Fields NOT Persisted

Do NOT persist after booking completes:
- Budget/offer price
- Selected provider
- Selected slot
- Negotiation state
- Match likelihood

Reason: User should start fresh search each time, not auto-resume previous booking flow.

---

## 7. User Creation Rules

### 7.1 Account Creation Timing

User account is created:
- **Explicitly**: User enters email/phone and requests magic link/OTP
- **Implicitly at first booking**: User completes negotiation and clicks "Confirm Booking" without account

Both paths lead to same profile completion flow.

### 7.2 Data Source Priority

- **City/Zip for browsing**: From Index Screen selection
- **Address for booking**: From profile completion (may differ from browse city)

Example: User browses in "New York" but lives in "Brooklyn" with different zip.

### 7.3 Validation

- Email: Must match RFC 5322 format
- Phone: E.164 international format or US local format (10 digits)
- Zip: 5-digit format for US addresses
- All fields: No HTML, script tags, or special characters beyond normal punctuation

---

## 8. Privacy and Data Rules

### 8.1 Minimal Data Collection

Store **only** data required for:
- Authentication (email or phone)
- Booking confirmation (name, address for directions)
- Discovery improvement (last selected city/category)

### 8.2 No Silent Updates

User data changes **only** when:
- User explicitly edits profile
- User makes new selection on Index Screen (city/category)
- User completes profile completion form

No background updates, no derived fields.

### 8.3 Address Privacy

- User address is **never** shown to providers before booking
- User address is used only for:
  - Distance calculations (if zip provided)
  - Future features (delivery, home services)
- Provider sees only city during negotiation

---

## 9. User State Transitions

```
[First Visit]
    → [Browse Without Account] (Index → Budget → Live Offers)
    → [Negotiate] (optional)
    → [Accept Offer] → [Auth Required]
    → [Login via Magic Link]
    → [New User] → [Profile Completion]
    → [Profile Completed]
    → [Booking Confirmed]
```

### 9.1 State Flags

- `profileCompleted`: `false` → triggers profile completion screen
- `profileCompleted`: `true` → allows direct booking

---

## 10. Session Context Management

### 10.1 Context Persisted During Flow

Within a single session (before booking):
- serviceCategory
- city
- zipCode
- timeWindow
- offerPrice (current bid)

### 10.2 Context Reset After Booking

After booking confirmation:
- Clear: provider, slot, negotiation state, offerPrice
- Keep: city, zipCode, selectedCategory (for next search)

### 10.3 Context on Return Visit

When user returns (authenticated):
- Pre-fill Index Screen with:
  - `user.selectedCity` (if set)
  - `user.selectedCategory` (if set)
- Do NOT pre-fill:
  - Budget/offer price
  - Time window
  - Zip code (show as optional even if previously entered)

---

## 11. Error Handling

### 11.1 Authentication Errors

**Magic link expired:**
- Show: "This link has expired. Request a new one."
- Provide: "Send New Link" button

**Email/phone not found:**
- For security, show: "If this email exists, you'll receive a magic link."
- (Don't reveal whether account exists)

**OTP invalid:**
- Show: "Invalid code. Please try again."
- Allow 3 attempts, then require new OTP

### 11.2 Profile Completion Errors

**Invalid zip:**
- Show inline: "Zip code must be 5 digits"
- Highlight field in red

**City/zip mismatch:**
- Show warning: "This zip code may not match [City]. Please verify."
- Allow submission (don't block)

---

## 12. Data Model Summary

```typescript
interface User {
  // Core
  id: string;
  email: string;
  name?: string;
  role: 'CONSUMER' | 'PROVIDER' | 'ADMIN';

  // Profile completion
  phone?: string;
  address?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  profileCompleted: boolean;

  // Browse context
  selectedCity?: string;
  selectedZipCode?: string;
  selectedCategory?: 'MASSAGE' | 'ACUPUNCTURE' | 'NAILS' | 'HAIR' | 'FACIALS_AND_SKIN' | 'LASHES_AND_BROWS';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 13. Final Rule

The user model must remain **minimal, clean, and strictly functional**.

It must support:
- Frictionless authentication (magic link)
- Post-signup profile completion (address for bookings)
- Browse context persistence (reduce repeated inputs)
- Booking confirmation (name, phone, address)

Nothing more. No feature creep. No hidden fields. No unnecessary complexity.
