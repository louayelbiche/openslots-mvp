# Claude must igonre this file
This is a notepad and is for drafting purpose is only. Claude is forbidden from parsing it or loading it into context.

----------------------------------------------
*PAST*
# fix Cross-Spec Conflicts:
1. Bidding and booking
- We have the user bids a price, provider receives it, they can counter bid in a negotiation loop until negotiation time expires or provider accepts user bid, or we reach the time when it's 30 minutes till the appointment. negotiation window expires in a minute.
- Booking should be adjusted accordingly. figure out what fields are needed to define it.
2. Address Field: 
- No address field required to browse initially. only city (and optionally zip code to browse with more accuracy)
but address should be captured later when in the post-signup onboarding (after customer logs in with magic link)
Booking address is the provider address. we use to create link to give users direction for example, as well as display it on booking confirmation screen.
3. Best Offer Timing
Best offer is simply the offer with the price closest to customer bid. it changes as customer updates their bid. and that's before starting any negotiations
4. Match Colors 
Colors not a concern for now. Just follow what we have currently on the mock UI

# Key question answers
1. negotiation window expires 60 seconds from when a provider starts negotiation (issues counter bid). Initiating a bid should not be possible when it's only 30 minutes left till appointment time
2. a consumer can only negotiate one slot a time. a provider can negotiate multiple unique slots at a time.
3. Provider receive bids via websockets. After onboarding, provider has 2 main screens, which they can switch between with tabs: Availability (where they see their slots published and can publish more on selection), and Offers (where they see cards of incoming offers with accept/counter-offer)
4. No reject. They can counter offer within their range yes: original price, and last price  (original price with maxDiscount)
5. - No address field required to browse initially. only city (and optionally zip code to browse with more accuracy)
but address should be captured later when in the post-signup profile completion (after customer logs in with magic link)
Booking address is the provider address. we use to create link to give users direction for example, as well as display it on booking confirmation screen. Required in post-signup profile completion

# 1. New Data Models Required
apply suggestions

# 3. Spec Updates Needed: 
minor changes
- Section 2: time constrainst is 1 minute. no bidding possible when only 30 minutes before time slot.
- Section 4: Post-Signup Onboarding should be called post-signup profile completion to not confuse with initial onboarding

# Gaps vs Specs: 
complete these.

# Divergences from Design:
- Currently implemented design is mock an natually will change
- Service category slection should be Massage, Acupuncture, Nails, Hair, Facials & Skin, Lashes & Brows
- City & Zip are two different fields. However, we should validate that zip entered matches city selected. User first selects city so we don't delay browsing. Then once they add zip we narrow the distance. City is required in index screen. zip is optional there and required in post-signup onboarding
- No slider component: add
- No Best Offer badge add
- Match colors: fix where appropriate. we use orange when low probability match and red when very low probability

# incoming
I will provide you with # Missing Elements: and # Blocking Issues (Cannot implement without resolution) resolutions

----------------------------------------------
*CURRENT*

yes. 

----------------------------------------------
*FUTURE*
# Missing Elements:
  - No responsibility boundaries per agent
  - No file ownership matrix
  - No error escalation paths
  - No inter-agent communication protocol
  - No "done" criteria for delegated tasks
  Are these solved?


# Blocking Issues (Cannot implement without resolution)
  1. Match Threshold Formula Missing (bidding.md:line 4)
    - Specs defer to "Claude determines" but provide no formula
    - Budget selector requires real-time match calculation
    - Required: Define exact percentage thresholds (e.g., Very High ≥100%, High
  95-100%, Low <95%)
  2. finalPrice Calculation Undefined (slot.md:line 3.3)
    - "Claude determines formula" - no formula provided
    - Critical for Best Offer and bidding logic
    - Required: Define formula (basePrice - maxDiscount * X?)
  3. 8 Specialist Agents Undefined
    - Build-lead references 8 agents that don't exist
    - Cannot delegate work without agent definitions
    - Required: Write all 8 agent definition files
  4. Missing Core Screens
    - Live Offers screen (main UI)
    - Booking Summary screen (pre-confirmation)
    - Required: Design docs for user flow continuity