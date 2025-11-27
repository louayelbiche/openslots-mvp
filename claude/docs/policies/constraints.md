# System Constraints Policy
Hard constraints that govern every Claude agent, across logic, UI, data, and code.  
No agent may violate any item in this document.

---

# 1. Scope Enforcement

## 1.1 No Feature Drift
Agents must not introduce new screens, flows, features, user inputs, API endpoints, or data fields unless explicitly instructed.

## 1.2 No Hidden Functionality
Everything must be visible, traceable, documented, and predictable.

## 1.3 No Reinterpretation
Agents must not reinterpret requirements or apply personal judgment.  
If unclear, agents halt and escalate ambiguity.

---

# 2. Behavioral Constraints

## 2.1 Determinism
All internal logic must be consistent and deterministic.  
No randomness or probabilistic heuristics.

## 2.2 Transparency
Any computed value must be documented, explainable, and stable.

## 2.3 Zero Dead-Ends
No UI or logic state may trap the user without a clear forward or exit.

## 2.4 No Circular Dependencies
Agents must surface and halt on any circular UI components, API handlers, database models, or logic modules.

---

# 3. UX / UI Constraints

## 3.1 Mobile-First Only
Portrait mobile is the primary reference.

## 3.2 Information Priority
Service, time, value, match likelihood, Best Offer must remain visible.  
Never collapse these without approval.

## 3.3 Color Rule
Low match uses orange, never red.

## 3.4 Single Best Offer
Exactly one Best Offer per provider list.  
No ties, no gaps.

## 3.5 Booking Summary Layout
Booking Summary must fit into a single screen.  
No overflow or scrolling.

## 3.6 Motion Constraints
Only recommended cards may pulse.  
No other animations unless explicitly approved.

---

# 4. Data Model Constraints

## 4.1 No Phantom Fields
Agents cannot add DB or API fields without purpose.

## 4.2 Persistence Rules
Only persist: service, city, zip code, time window, budget.

## 4.3 No Silent Mutations
Agents cannot alter user input unless user-triggered.

---

# 5. Logic Constraints

## 5.1 No Background Bookings
No hidden commits, bidding, or booking operations.

## 5.2 Match Score Determinism
Match likelihood must follow explicit formulas.  
No guesswork.

## 5.3 Sorting
Sorting is internal-only, no UI controls for MVP.

## 5.4 Slot Freezing
Once on Booking Summary, slot cannot change, no alternatives appear, no dropdowns.

## 5.5 Discovery Trigger
Discovery only after service, city, zip, and time window are selected.

---

# 6. Engineering Constraints

## 6.1 Clean Boundaries
Strict separation between UI, API, logic modules, and data models.

## 6.2 Minimal Changes
All refactors must be minimal.  
No rewrites unless authorized.

## 6.3 Fail Fast
If unclear, agents stop, report conflict, and propose two or three options.

---

# 7. Documentation Constraints

## 7.1 Update on Change
Implementation changes must update relevant docs.

## 7.2 No Orphan Logic
Every behavior must be documented.

## 7.3 Doc-Keeper Priority
If code and documentation disagree, fix documentation first.

---

# 8. Responsibility Boundaries (Global)

Each agent has strict MUST / MUST NOT domains:

**ui-impl**  
- MUST: UI components, screens, layouts, styling  
- MUST NOT: backend logic, data models, business logic  

**api-impl**  
- MUST: endpoints, validation, responses  
- MUST NOT: UI or DB schema changes  

**db-modeler**  
- MUST: Prisma schema, migrations  
- MUST NOT: business logic or UI  

**bidding-logic**  
- MUST: bidding engine  
- MUST NOT: UI, API, DB  

**slot-matcher**  
- MUST: availability filtering  
- MUST NOT: UI, DB, API  

**menu-parser**  
- MUST: provider menu normalization  
- MUST NOT: persistence, UI  

**test-runner**  
- MUST: test suites only  
- MUST NOT: production logic  

**doc-keeper**  
- MUST: documentation consistency  
- MUST NOT: code implementation  

If a request crosses boundaries, Build Lead must split it.

---

# 9. File Ownership Matrix

Primary responsibility per folder:

- apps/web/** → ui-impl  
- apps/api/** → api-impl  
- packages/db/schema.prisma → db-modeler  
- packages/core/bidding/** → bidding-logic  
- packages/core/slot-matching/** → slot-matcher  
- packages/core/menu-parser/** → menu-parser  
- **/*.test.* → test-runner  
- claude/docs/** → doc-keeper  

Primary agent must implement. Secondary may suggest but not merge.

---

# 10. Error Escalation Protocol

Agents must halt and produce an “Escalation Report” for:
- missing or ambiguous requirements  
- design vs spec conflicts  
- repo code contradicting higher truth  
- forbidden-domain tasks  
- circular dependencies  
- undefined behavior  

Report includes:
- problem  
- impact  
- files involved  
- 2–3 resolution options  
- requested decision  

Agents may never guess.

---

# 11. Inter-Agent Communication Protocol

Only Build Lead orchestrates multi-agent work.  
Sub-agents never communicate directly.  

Each delegated task must include:  
- Task ID  
- Agent  
- Input files  
- Output files  
- Constraints  
- Definition of Done  

Agents must not begin work without these.

---

# 12. Definition of Done (DoD)

Task is NOT done unless:
- acceptance criteria satisfied  
- specs and design matched exactly  
- no scope drift  
- minimal diffs  
- no TODOs or commented-out logic  
- files compile and type-check  
- deterministic behavior  
- summary of changes provided  

Any missing item means task is not done.

---

# 13. Final Constraint
No agent may violate clarity.  
No agent may increase friction.  
No agent may ship complexity that does not serve the user.
