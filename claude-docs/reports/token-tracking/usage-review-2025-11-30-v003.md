# Usage Review: 2025-11-30

Period: 2025-11-27 to 2025-11-30

---

## Executive Summary

Token usage analysis for OpenSlots MVP from project start through today. All figures are estimates based on git commit analysis and session history - Claude Code does not expose actual token counts.

**Key Stats**

- 28 commits in analysis period (38 total in repo)
- 6 documented sessions in `claude-docs/history/`
- Estimated 10-12 actual working sessions
- Estimated total tokens: ~677,000
- Estimated total cost: ~$9-10

**Recent Changes**

- Model selection guidelines added to build-lead.md Section 6.1
- Session tracking now mandatory before code changes
- Batch changes guidance added
- token-tracker spec simplified (292 → 83 lines)

---

## Activity by Date

### 2025-11-27 (Day 1 - Foundation)

**Commits:**

- 1ffe7fa: Pricing terminology and booking summary design (Low)
- ee1d871: Discovery flow with timezone-aware slot filtering (Very High)
- a5eb941: Git operations responsibility to build-lead (Medium)

**Sessions**: 5 documented (session-n, 01, 02, 03, 04)

**Major Work**: Discovery flow (23 files, 1,979 insertions), planning policy, testing system

---

### 2025-11-28 (Day 2 - Features and Polish)

**Commits:**

- 4247d52: Testing system - Jest, Vitest, 154 tests (Very High)
- 0d4a021: Remove duplicate prisma.config.ts (Trivial)
- ee8eed0: Audit naming convention (Low)
- d4d59a3: API URL env documentation (Low)
- 5eb0273: Git rules to separate policy (Medium)
- 512a4bd: Comprehensive v2 audit (Medium)
- 13e1dde: Remove attribution footer (Trivial)
- 8064888: UA-Tester agent (Medium)
- d3b74a8: UA-Tester conversational format (Low)
- d543e31: Reports directory restructure (Low)
- 65cf724: Reports flatten and UAT rename (Low)
- d139fdb: Prohibit markdown tables (Low)
- f9fcbc8: UA-Tester tool permissions (Low)
- 176e557: Usage-tracker agent (Medium)
- 712d0b4: Slot dropdown component (Medium)
- 821285c: Lovable prototype features (High)
- 3f7ebd8: UA-Tester screenshot cleanup (Low)
- 54e2dff: Project README (Medium)
- 8246401: Session-01 history (Low)
- f25f2ec: UA-Tester report requirements (Low)
- 34c0a4b: UAT reports and project audit (Medium)

**Sessions**: 1 documented, estimated 4-5 actual

**Major Work**: Testing infrastructure, UA-Tester agent, Lovable features, documentation

**Note**: 21 commits violates new guidance (<10 per day). Many could have been batched.

---

### 2025-11-30 (Day 3 - Current)

**Commits:**

- 1600a85: Searchable city dropdown component (Medium)
- e1417d8: File locking for parallel execution (Medium)
- 79c0f75: Token-tracker rename and model guidelines (Medium)
- 95b298d: Recommended price feature (Medium)

**Sessions**: Estimated 2-3 (including current, none documented yet)

**Major Work**: City dropdown, file locking, token tracking improvements, recommended price

**Pending**: Current session not yet documented in history

---

## Estimated Token Usage

### By Complexity

**Very High (2 commits)**: ~120,000 tokens each, ~240,000 total

Discovery flow and testing system.

**High (1 commit)**: ~60,000 tokens, ~60,000 total

Lovable prototype features.

**Medium (11 commits)**: ~25,000 tokens each, ~275,000 total

Agent definitions, policies, moderate features.

**Low (12 commits)**: ~8,000 tokens each, ~96,000 total

Documentation, config changes.

**Trivial (2 commits)**: ~3,000 tokens each, ~6,000 total

Minor fixes.

**Total**: ~677,000 tokens

### By Day

**2025-11-27**: 3 commits, ~220,000 tokens, ~$4.40

**2025-11-28**: 21 commits, ~380,000 tokens, ~$7.60

**2025-11-30**: 4 commits, ~77,000 tokens, ~$1.54

### By Model (Estimated)

**Opus (65%)**: ~440,000 tokens, ~$8.80

**Sonnet (30%)**: ~203,000 tokens, ~$1.22

**Haiku (5%)**: ~34,000 tokens, ~$0.02

**Total Estimated Cost**: ~$10.04

---

## Efficiency Metrics

**Commits per Day**

- Day 1: 3 (good - large foundational work)
- Day 2: 21 (exceeds guidance - should batch)
- Day 3: 4 (good - focused work)

**Cost Efficiency**

- Cost per commit: ~$0.36
- Cost per feature: ~$2-5
- Cost per test (154 tests): ~$0.03

**Session Coverage**

- Documented: 6 sessions
- Estimated actual: 10-12 sessions
- Coverage: ~50%

---

## Findings

**Day 2 commit volume**: 21 commits in one day, with 7 consecutive report/agent format changes that could have been one commit. New batching guidance should prevent this.

**Session tracking gap**: Still at 50% coverage. Day 3 has no documented sessions yet despite 4 commits and current work.

**Model distribution seems reasonable**: 65% Opus for complex work, 30% Sonnet for moderate work. Could potentially shift more to Sonnet.

**Testing ROI strong**: 154 tests for ~$5 estimated cost is good value.

---

## Progress on Recommendations

**Model Selection Guidelines**: DONE

**Session Tracking Mandatory**: DONE (enforcement added)

**Batch Changes Guidance**: DONE (added to Section 0)

**Simplify Token-Tracker**: DONE (292 → 83 lines)

---

## New Recommendations

**Priority 1: Document Current Session**

Today (2025-11-30) has 4 commits but no session file. Create `claude-docs/history/2025-11-30/session-01.json` before any further work.

**Priority 2: Enforce Batching Going Forward**

Day 2 pattern should not repeat. Hold related changes and commit together.

**Priority 3: Consider More Sonnet Usage**

Current 65% Opus may be higher than necessary. For next sessions, try defaulting to Sonnet and only escalating to Opus when complexity requires it.

---

*Report generated: 2025-11-30*

*Methodology: Git commit analysis, session history review, complexity-based estimation*

*All token counts are estimates - Claude Code does not expose actual usage data*
