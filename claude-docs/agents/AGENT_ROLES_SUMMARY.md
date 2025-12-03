# Agent Roles Summary

Quick reference guide for the OpenSlots agent architecture.

---

## Agent Roster

### Orchestrator

**build-lead** - Master orchestrator and coordinator. Breaks work into units, routes to specialists, maintains consistency, enforces constraints and specs. Owns git operations, MCP orchestration, and file locking. Never implements large changes directly.

### Implementation Specialists

**ui-impl** - Frontend specialist. Implements screens, components, and UI flows using Next.js, React, and TailwindCSS. Owns `apps/web/src/**`.

**api-impl** - Backend specialist. Implements REST endpoints, controllers, and services using NestJS. Owns `apps/api/src/**` except Prisma schema and core logic modules.

**db-modeler** - Database specialist. Owns Prisma schema, migrations, and seed data. Lowest-level agent with no dependencies. Owns `apps/api/prisma/**`.

**bidding-logic** - Pricing/negotiation specialist. Owns match likelihood calculations, pricing algorithms, and bid validation. Owns `apps/api/src/bidding/**`.

**slot-matcher** - Search/discovery specialist. Owns slot search, filtering, sorting, and provider discovery. Owns `apps/api/src/slots/**` and `apps/api/src/providers/**`.

**menu-parser** - Menu parsing specialist (DORMANT for MVP). Will parse provider menus and map to categories post-MVP.

**scraper** - Data ingestion specialist. Builds scraping tools for provider data. Owns `tools/scraper/**`.

### Support Specialists

**test-runner** - Testing specialist. Owns all test files (`**/*.spec.ts`, `**/*.test.*`). Validates work from all agents.

**doc-keeper** - Documentation specialist. Owns specs, design docs, policies, reports, and session history in `claude-docs/`.

**token-tracker** - Analytics specialist. Tracks token usage and generates optimization recommendations. Owns `claude-docs/reports/token-tracking/**`.

**ua-tester** - User accessibility tester. Tests UIs, identifies issues, produces UAT reports. Exclusively owns Playwright/browser tools.

---

## Ownership Boundaries

| Area | Owner | Path |
|------|-------|------|
| Frontend UI | ui-impl | `apps/web/src/**` |
| Backend API | api-impl | `apps/api/src/**` (except bidding, slots) |
| Bidding Logic | bidding-logic | `apps/api/src/bidding/**` |
| Slot Matching | slot-matcher | `apps/api/src/slots/**`, `apps/api/src/providers/**` |
| Database | db-modeler | `apps/api/prisma/**` |
| Scraper Tools | scraper | `tools/scraper/**` |
| Tests | test-runner | `**/*.spec.ts`, `**/*.test.*` |
| Documentation | doc-keeper | `claude-docs/docs/**`, `claude-docs/reports/**`, `claude-docs/history/**` |
| Token Reports | token-tracker | `claude-docs/reports/token-tracking/**` |
| UAT Reports | ua-tester | `claude-docs/reports/UAT/**` (via build-lead) |
| Git Operations | build-lead | Exclusive |
| File Locks | build-lead | `.claude/.locks/**` |

---

## Dependency Graph

```
db-modeler (no dependencies - root)
    |
    +-- bidding-logic
    |       |
    +-- slot-matcher (depends on bidding-logic)
    |       |
    +-- api-impl (depends on bidding-logic, slot-matcher)
            |
            +-- ui-impl

scraper --> db-modeler (schema alignment)

test-runner --> all agents (validates their work)
doc-keeper --> all agents (documents their work)
token-tracker --> doc-keeper, scraper, ua-tester (analyzes usage)

build-lead --> orchestrates all
```

---

## Common Task Routing

| Task Type | Primary Agent | May Involve |
|-----------|---------------|-------------|
| New UI screen | ui-impl | api-impl (if new endpoint needed) |
| New API endpoint | api-impl | db-modeler (if schema change), bidding-logic, slot-matcher |
| Schema change | db-modeler | api-impl (update queries) |
| Pricing/bidding logic | bidding-logic | api-impl (expose via endpoint) |
| Search/filtering | slot-matcher | api-impl (expose via endpoint) |
| Scrape provider data | scraper | (standalone) |
| Write tests | test-runner | (standalone) |
| Update docs | doc-keeper | (standalone) |
| UI testing | ua-tester | (standalone, report to build-lead) |
| Token analysis | token-tracker | (standalone, report to build-lead) |

---

## MCP Tool Governance

- **build-lead** owns all MCP orchestration (attach/detach/configure)
- **ua-tester** exclusively owns Playwright/browser tools
- **All agents** may use: Read, Write, Edit, Glob, Grep (within their scope)
- **Sub-agents** must request additional tools from build-lead

---

## Key Policies

- **Planning**: All agents must plan before execution (see `claude-docs/policies/planning.md`)
- **Git**: Only build-lead touches git (see `claude-docs/policies/git-rules.md`)
- **Testing**: All business logic needs tests (see `claude-docs/policies/testing.md`)
- **File Locks**: build-lead acquires locks before any edits (see build-lead.md Section 0.1)

---

**Last Updated:** 2025-12-03
