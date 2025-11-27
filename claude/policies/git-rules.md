# Git Operations and Commit Message Standards

**Owner:** build-lead agent
**Status:** Active
**Last Updated:** 2025-11-28

---

## Purpose

This document defines git workflow rules and commit message standards for the OpenSlots project. The build-lead agent is solely responsible for all git operations.

---

## Git Staging Rules

After every major or multi-file change, build-lead must:

1. **Stage all modified files**: `git add -A`
2. **Never push** unless explicitly instructed by the user
3. **Always commit** with a comprehensive message (see format below)

---

## Commit Message Format

Every commit message must be a comprehensive summary. Format:

```
<commit-title>

<summary-paragraph>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Title

- One-line imperative summary (50-72 characters)
- Format: `type(scope): brief description`
- Examples:
  - `feat(api): add negotiation endpoints for bidding flow`
  - `fix(web): correct timezone handling in slot display`
  - `chore(deps): update Prisma to v7`
  - `docs(specs): add booking confirmation flow`
  - `test(api): add discovery service unit tests`
  - `refactor(web): simplify slot filtering logic`

### Summary Paragraph (MANDATORY)

Write a concise 2-4 sentence summary that covers:
- What files/areas changed
- Why the change was made
- Key implementation details if non-obvious
- Spec/requirement reference if applicable

**Keep it brief but complete.** All detailed information (step-by-step changes, testing notes, debugging details, etc.) goes in the session history file, not the commit message.

---

## Commit Message Examples

### Example 1: Large Multi-Area Change

```
feat(mvp): implement negotiation and bidding flow

Implemented full bidding flow with API endpoints (apps/api/src/negotiation/) and bidding UI page (apps/web/src/app/negotiate/). Uses 60-second bidding window with 30-minute slot cutoff per bidding.md spec. Includes BiddingTimer component with client-side countdown and negotiation state machine (PENDING → ACCEPTED/REJECTED/EXPIRED).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Example 2: Small Focused Change

```
fix(api): correct timezone conversion in slot filtering

Fixed Evening time window showing empty results by adding city-specific timezone handling to isSlotInTimeWindow() in discovery.service.ts. Added CITY_TIMEZONE_OFFSETS map to convert slot times to city-local time before filtering.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Example 3: Configuration Change

```
chore(web): add environment variable documentation for API URL

Created apps/web/.env.example documenting NEXT_PUBLIC_API_BASE_URL and updated .gitignore to allow .env.example to be committed. Resolves audit warning about hardcoded API URL.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## After Committing

build-lead must show the user:

1. **Commit message** (title + summary)
2. **List of files changed**
3. **Confirmation**: "Committed. Ready to push when instructed."

---

## Common Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance (deps, config, cleanup)
- `docs`: Documentation only
- `test`: Adding or updating tests
- `refactor`: Code restructuring without behavior change
- `perf`: Performance improvement
- `style`: Formatting, whitespace (no code logic change)
- `ci`: CI/CD configuration
- `revert`: Reverting a previous commit

---

## Common Scopes

- `api`: Backend/NestJS code
- `web`: Frontend/Next.js code
- `db`: Database schema/migrations
- `mvp`: Cross-cutting MVP feature
- `deps`: Dependencies
- `agents`: Agent definitions
- `specs`: Specification documents
- `policies`: Policy documents
- `tests`: Testing infrastructure

---

## Git Workflow Rules

### Sub-Agents Never Touch Git

Sub-agents (api-impl, ui-dev, test-runner, etc.) **NEVER**:
- Run git commands
- Stage files
- Create commits
- Push to remote

Only build-lead handles git operations.

### Build-Lead Responsibilities

build-lead must:
- Stage all changes after multi-file edits: `git add -A`
- Create comprehensive commit messages
- Show full commit details to user
- Never push unless explicitly instructed
- Never use `--force` flags unless explicitly requested
- Never skip hooks (--no-verify) unless explicitly requested

### Commit Timing

Commit after:
- Completing a feature or bug fix
- Completing a major refactor
- Completing test implementation
- Completing documentation updates
- User explicitly requests a commit

Do not commit:
- Partial/incomplete work
- Failing tests (unless explicitly instructed)
- Work that doesn't compile/type-check

---

## Session History Integration

All detailed information about changes belongs in session history files, not commit messages:

**In Commit Message (brief):**
- What changed (files/areas)
- Why it changed
- Key implementation note

**In Session History (detailed):**
- Step-by-step implementation details
- Testing procedures and results
- Debugging notes
- Edge cases handled
- Future considerations
- Links to specs/designs

---

## Git Safety

- **NEVER** run destructive/irreversible git commands (force push, hard reset) unless user explicitly requests
- **NEVER** update git config
- **NEVER** skip hooks
- **NEVER** force push to main/master (warn user if requested)
- **ALWAYS** check authorship before amending commits
- **ONLY** amend when:
  - User explicitly requested amend, OR
  - Adding edits from pre-commit hook to most recent commit

### Before Amending

Check:
- Authorship: `git log -1 --format='%an %ae'` (only amend own commits)
- Push status: ensure commit not yet pushed
- If both true: safe to amend
- Otherwise: create new commit

---

## Version Control Best Practices

- Keep commits atomic (one logical change per commit)
- Write commit messages for future maintainers
- Reference specs/issues when relevant
- Use meaningful commit types and scopes
- Group related changes in single commit
- Separate unrelated changes into multiple commits
- Test before committing
- Review diffs before staging

---

**Last Updated:** 2025-11-28
**Maintained By:** build-lead agent
