# MCP Tool Authorization Policy

Central policy governing MCP (Model Context Protocol) tool access across all agents.

---

## 1. Governance Principles

### 1.1 Single Authority
**build-lead** is the sole authority for MCP tool management:
- Attaches and detaches MCP servers
- Configures tool availability
- Authorizes tools per Task Brief
- Sub-agents never manage MCPs directly

### 1.2 Least Privilege
Agents receive only the tools necessary for their task:
- Default tools cover most operations
- Special tools require explicit authorization
- Unused tools should not be available

### 1.3 Exclusive Ownership
Some tools are exclusively owned by specific agents:
- **Playwright/browser tools** → ua-tester only
- **Git operations** → build-lead only
- No exceptions without explicit policy change

---

## 2. Tool Categories

### 2.1 Universal Tools (Available to All Agents)

These tools are available to all agents within their file ownership scope:

| Tool | Purpose | Scope Restriction |
|------|---------|-------------------|
| **Read** | Read files | Within agent's ownership + specs/docs |
| **Write** | Create new files | Within agent's ownership only |
| **Edit** | Modify existing files | Within agent's ownership only |
| **Glob** | Find files by pattern | Full codebase (read-only discovery) |
| **Grep** | Search code for patterns | Full codebase (read-only discovery) |

### 2.2 Restricted Tools (Require Authorization)

These tools require explicit authorization in Task Brief:

| Tool | Authorized Agent | Use Case |
|------|------------------|----------|
| **Bash** | db-modeler, ui-impl, scraper | Build/migrate/run scripts |
| **HTTP/WebFetch** | scraper | Web scraping |
| **Playwright MCP** | ua-tester (exclusive) | UI testing |
| **Claude API** | menu-parser (post-MVP) | Menu parsing |
| **Vision API** | menu-parser (post-MVP) | Image menu parsing |
| **Google Places API** | scraper | Location data |

### 2.3 Prohibited Tools (Never Authorized)

These tools are never available to sub-agents:

| Tool | Reason |
|------|--------|
| **Git operations** | Exclusively owned by build-lead |
| **MCP management** | Exclusively owned by build-lead |
| **System-level Bash** | Security risk |

---

## 3. Agent Tool Assignments

### 3.1 build-lead
- All tools available
- Responsible for git operations
- Configures MCP for sub-agents

### 3.2 ui-impl
**Default:** Read, Write, Edit, Glob, Grep
**Optional:** Bash (pnpm dev, build, lint)

### 3.3 api-impl
**Default:** Read, Write, Edit, Glob, Grep
**Never:** Playwright, Git

### 3.4 db-modeler
**Default:** Read, Write, Edit, Glob, Grep
**Optional:** Bash (prisma generate, migrate dev)

### 3.5 bidding-logic
**Default:** Read, Write, Edit, Glob, Grep
**Never:** Playwright, Git, Bash

### 3.6 slot-matcher
**Default:** Read, Write, Edit, Glob, Grep
**Never:** Playwright, Git, Bash

### 3.7 menu-parser (Post-MVP)
**Default:** Read, Write, Edit, Glob, Grep
**Requires Authorization:** Claude API, Vision API

### 3.8 scraper
**Default:** Read, Write, Edit, Glob, Grep, Bash (Python only)
**Requires Authorization:** HTTP, Playwright, Google Places API

### 3.9 test-runner
**Default:** Read, Write, Edit, Glob, Grep
**Optional:** Bash (pnpm test, jest)

### 3.10 doc-keeper
**Default:** Read, Write, Edit, Glob, Grep
**Never:** Code modification tools

### 3.11 token-tracker
**Default:** Read, Glob, Grep (analysis only)
**Write:** Only to `claude-docs/reports/token-tracking/**`
**Never:** Code modification tools

### 3.12 ua-tester
**Default:** Read, Glob, Grep
**Exclusive:** Playwright MCP (all browser tools)
**Limited Bash:** rm for screenshot cleanup only
**Never:** Write, Edit (read-only for code)

---

## 4. Authorization Process

### 4.1 Task Brief Format

When authorizing tools, build-lead includes in Task Brief:

```
Authorized MCP Tools:
  - Read (all files in scope)
  - Write (apps/api/src/discovery/**)
  - Edit (apps/api/src/discovery/**)
  - Glob
  - Grep
  - Bash: pnpm test:unit (test execution only)

Prohibited:
  - Playwright (owned by ua-tester)
  - Git operations (owned by build-lead)
```

### 4.2 Escalation for Additional Tools

If an agent needs a tool not authorized:

1. **Stop work immediately**
2. **Document the need** in deliverable
3. **Escalate to build-lead** with:
   - Why the tool is needed
   - What operation requires it
   - Proposed scope limitation
4. **Wait for authorization** before proceeding

### 4.3 Tool Denial

build-lead may deny tool requests if:
- Tool is outside agent's domain
- Security concern exists
- Alternative approach is available
- Tool is exclusively owned by another agent

---

## 5. Token Cost Considerations

### 5.1 High-Cost Tools

Some tools have significant token overhead:

| Tool | Estimated Cost | Notes |
|------|----------------|-------|
| Playwright SNAPSHOT | ~5,000 tokens | Accessibility tree |
| Playwright SCREENSHOT | ~8,000 tokens | Vision processing |
| Playwright NAVIGATE | ~500 tokens | Page load |
| Playwright interactions | ~200-300 tokens | Click, type, etc. |

### 5.2 Cost-Aware Authorization

build-lead should consider:
- Authorize Playwright sparingly (ua-tester only)
- Prefer unit tests over browser tests
- Use Read/Grep before heavy exploration
- Batch related operations when possible

---

## 6. Security Considerations

### 6.1 Bash Restrictions

When Bash is authorized, scope limitations apply:
- **db-modeler:** Only prisma commands
- **ui-impl:** Only pnpm commands for frontend
- **scraper:** Only Python and pip commands
- **test-runner:** Only test execution commands
- **ua-tester:** Only rm for screenshots

### 6.2 Network Access

Network tools (HTTP, WebFetch, APIs) are restricted:
- Must respect robots.txt
- Must honor rate limits
- No authenticated content without approval
- No scraping personal data

### 6.3 File System Boundaries

All Write/Edit operations must respect:
- Agent's file ownership scope
- No writing outside owned directories
- No modifying other agents' files

---

## 7. Audit and Compliance

### 7.1 Logging

All MCP tool usage should be traceable:
- Session history records file changes
- token-tracker monitors usage
- Unauthorized access attempts logged

### 7.2 Review

Periodic review of MCP authorizations:
- Are default tools sufficient?
- Are restrictions appropriate?
- Are there security concerns?

---

**Last Updated:** 2025-12-03
**Policy Owner:** build-lead
