# Usage Review: 2025-11-30 v004

Model Usage Analysis Since Model Selection Guidelines

Period: 2025-11-30 (commits 79c0f75 through f77aca9)

---

## Executive Summary

Analysis of 16 commits since model selection guidelines were added to build-lead.md. This report evaluates adherence to the Opus/Sonnet/Haiku model assignment rules.

**Key Stats**

- 16 commits in analysis period
- 50 files changed, 3,988 insertions, 987 deletions
- Estimated 3-4 working sessions
- Estimated total tokens: ~280,000-350,000
- Estimated cost: ~$4-6

---

## Model Selection Guidelines (Reference)

Per build-lead.md Section 6.1:

**Opus**: Multi-domain features (DB + API + UI), architectural decisions, complex debugging, session orchestration

**Sonnet**: Single-domain features, documentation, code refactoring, test implementation, straightforward bug fixes

**Haiku**: File exploration, simple questions, quick lookups, reading/summarizing files

---

## Commits by Recommended Model

### Should Use Opus (4 commits)

**f77aca9: perf: add Redis caching and optimize API performance**
- Scope: API + caching + frontend (React Query)
- Domains: Backend services, caching layer, frontend state
- Verdict: Multi-domain, correctly requires Opus
- Estimated tokens: ~80,000-100,000

**7e3b224: feat(web): add dual-persona app with bottom navigation**
- Scope: UI context, navigation, multiple new components
- Domains: UI architecture, state management, routing
- Verdict: Architectural UI work, Opus appropriate
- Estimated tokens: ~50,000-70,000

**8b0274e: feat(discovery): add service type selection step to booking flow**
- Scope: New API endpoint + frontend flow changes
- Domains: API + UI
- Verdict: Multi-domain, correctly requires Opus
- Estimated tokens: ~40,000-50,000

**e4b948a: fix(discovery): filter service types by timeWindow and show slot dates**
- Scope: API DTO + service logic + frontend
- Domains: API + UI
- Verdict: Multi-domain fix, Opus appropriate
- Estimated tokens: ~30,000-40,000

**Opus subtotal**: ~200,000-260,000 tokens (~$4.00-5.20)

### Should Use Sonnet (10 commits)

**3085e7b: perf(db): add indexes for discovery query optimization**
- Scope: Prisma schema only
- Domains: DB
- Verdict: Single-domain, Sonnet appropriate
- Estimated tokens: ~15,000-20,000

**ab3dc67: fix(discovery): add timezone mappings for New York City and Bali**
- Scope: Single service file
- Domains: API
- Verdict: Simple fix, Sonnet appropriate
- Estimated tokens: ~8,000-12,000

**b071ee6: feat(agents): improve token tracking and enforce testing hierarchy**
- Scope: Agent markdown files
- Domains: Documentation
- Verdict: Doc updates, Sonnet appropriate
- Estimated tokens: ~20,000-25,000

**f671975: fix(budget): set consistent min-height on price cards**
- Scope: Single UI file, 4 line change
- Domains: UI
- Verdict: Trivial fix, Sonnet (or even Haiku)
- Estimated tokens: ~5,000-8,000

**fe4579c: feat(budget): dynamic slider range based on actual slot prices**
- Scope: Single UI file
- Domains: UI
- Verdict: Single-domain, Sonnet appropriate
- Estimated tokens: ~15,000-20,000

**f00d001: feat(budget): redesign price card with dynamic color states**
- Scope: Single UI file
- Domains: UI
- Verdict: Single-domain, Sonnet appropriate
- Estimated tokens: ~15,000-20,000

**6084dac: feat(agents): require plan confirmation before build-lead executes changes**
- Scope: Agent markdown
- Domains: Documentation
- Verdict: Doc update, Sonnet appropriate
- Estimated tokens: ~10,000-15,000

**13b9fd8: feat(agents): add mandatory instruction verification step to build-lead**
- Scope: Agent markdown
- Domains: Documentation
- Verdict: Doc update, Sonnet appropriate
- Estimated tokens: ~10,000-15,000

**73486ed: fix(budget): show Recommended Price when budget matches recommended value**
- Scope: Single UI file
- Domains: UI
- Verdict: Single-domain fix, Sonnet appropriate
- Estimated tokens: ~10,000-15,000

**9963b5b: fix(budget): add loading skeleton to prevent $75 flash on page load**
- Scope: UI file + seed data
- Domains: UI + DB seed
- Verdict: Mostly UI, Sonnet appropriate
- Estimated tokens: ~15,000-20,000

**95b298d: feat(budget): show recommended price based on all slots for service+city**
- Scope: UI + API changes
- Domains: Could be Opus, but changes are isolated
- Verdict: Borderline - Sonnet acceptable for isolated changes
- Estimated tokens: ~20,000-25,000

**Sonnet subtotal**: ~143,000-195,000 tokens (~$0.86-1.17)

### Should Use Haiku (2 commits)

**79c0f75: feat(agents): rename usage-tracker to token-tracker, add model selection guidelines**
- Scope: Rename + doc updates
- Domains: Documentation
- Verdict: Could use Haiku for file exploration, Sonnet for edits
- Estimated tokens: ~15,000-20,000

**Haiku subtotal**: ~15,000-20,000 tokens (~$0.01)

---

## Model Usage Summary

**Recommended Distribution**

- Opus (4 commits, 25%): ~200,000-260,000 tokens
- Sonnet (10 commits, 63%): ~143,000-195,000 tokens
- Haiku (2 commits, 12%): ~15,000-20,000 tokens

**Total Estimated**: ~358,000-475,000 tokens

**Estimated Cost by Model**

- Opus @ $20/1M: ~$4.00-5.20
- Sonnet @ $6/1M: ~$0.86-1.17
- Haiku @ $0.50/1M: ~$0.01

**Total**: ~$4.87-6.38

---

## Agents Involved (Inferred)

Based on file changes and domains:

**build-lead**: All orchestration, multi-domain commits

**ui-impl** (should use Sonnet): Budget page changes, bottom navigation components, city dropdown

**api-impl** (should use Sonnet): Discovery service, service-types endpoint, Redis integration

**db-modeler** (should use Sonnet): Index additions, schema updates

**doc-keeper** (should use Sonnet): Agent spec updates, token-tracker changes

**No ua-tester sessions**: Correct adherence to testing hierarchy

---

## Compliance Assessment

**Following Guidelines Well**

- Multi-domain work (Redis caching, dual-persona, service type flow) correctly complex enough for Opus
- Single-domain fixes (timezone mappings, min-height, price card states) appropriate for Sonnet
- No unnecessary UA testing sessions
- Testing hierarchy followed (no Playwright for simple changes)

**Areas for Improvement**

- Several 1-file UI fixes (f671975, 73486ed) could potentially use Haiku for exploration + Sonnet for edit, reducing cost
- 10 sequential commits in one day suggests batching could reduce session overhead
- Some borderline cases (95b298d) where API+UI could be split into separate Sonnet tasks rather than one larger session

---

## Recommendations

**Priority 1: Use Haiku for Exploration**

Before any edit, use Haiku to:
- Search codebase for relevant files
- Read and understand existing code
- Only escalate to Sonnet/Opus for actual edits

Estimated savings: 10-20% on token costs

**Priority 2: Split Multi-Domain Work When Possible**

For changes like 95b298d (UI + API), consider:
- Sonnet task 1: API changes
- Sonnet task 2: UI changes
- Avoid Opus unless true integration complexity

**Priority 3: Batch Related Changes**

The 6 budget-related commits (f671975 through 95b298d) could have been 2-3 commits, reducing:
- Context loading overhead
- Session establishment costs

---

## Playwright/UA Testing

**Sessions in Period**: 0

No ua-tester invocations since model selection guidelines were added. This is correct behavior - all changes were verifiable through:
- Code inspection
- Unit/integration tests
- User manual verification requests

**Compliance**: PASS - Testing hierarchy followed correctly

---

*Report generated: 2025-11-30*

*Methodology: Git commit analysis, file change scope, model selection guidelines from build-lead.md Section 6.1*

*All token counts are estimates - Claude Code does not expose actual usage data*
