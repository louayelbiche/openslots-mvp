# Planning Policy

This document defines the mandatory planning and session tracking requirements for all agents in the OpenSlots project.

---

## Core Principle

**No agent may modify code or documentation without first producing a visible plan and recording it into session history.**

This applies to:
- build-lead (orchestrator)
- All specialist agents (ui-impl, api-impl, db-modeler, bidding-logic, slot-matcher, menu-parser, test-runner, doc-keeper)

---

## 1. Planning Requirements

### For build-lead

Before making any code or doc changes, build-lead must:

1. **Produce a numbered implementation plan** containing:
   - **Objective**: Clear statement of what will be accomplished
   - **Affected areas**: UI, API, DB, bidding, matching, parsing, tests, docs
   - **Files to touch**: List of expected file paths
   - **Implementation sequence**: Numbered steps from start to validation

2. **Show the plan to the user** before starting edits

3. **Create or update a session file** at `claude-docs/history/YYYY-MM-DD/session-XX.json`

### For all subagents

Before making any edits, each subagent must:

1. **Write a task-specific plan** in their deliverable that includes:
   - What will be changed
   - Why it's being changed
   - Which files will be touched
   - Expected outcome

2. **Limit work to that plan** - no scope creep

3. **Return a summary** of what changed and why when done

---

## 2. Session History Format

### Directory Structure
```
claude-docs/history/
  2025-11-27/
    session-01.json
    session-02.json
  2025-11-28/
    session-01.json
```

### Session File Schema

```json
{
  "sessionId": "session-01",
  "date": "2025-11-27",
  "timestamp": "2025-11-27T14:30:00Z",
  "userRequest": "Original user request text",
  "objective": "High-level goal of this session",
  "affectedAreas": ["UI", "API", "DB"],
  "implementationPlan": {
    "objective": "...",
    "affectedAreas": ["..."],
    "filesToTouch": ["..."],
    "steps": [
      "1. Step one",
      "2. Step two"
    ]
  },
  "editHistory": [
    {
      "file": "apps/api/src/discovery/discovery.service.ts",
      "changeType": "behavior change",
      "reason": "Added timezone conversion for slot filtering"
    },
    {
      "file": "apps/web/src/app/offers/page.tsx",
      "changeType": "new file",
      "reason": "Created live offers screen per discovery flow"
    }
  ],
  "summary": "Brief description of what was accomplished",
  "outcome": "success | partial | blocked",
  "notes": "Any additional context or follow-up items"
}
```

### Change Types
- `new file` - File created from scratch
- `behavior change` - Logic or functionality modified
- `refactor` - Structure changed without behavior change
- `spec update` - Documentation or specification updated
- `config change` - Configuration or settings modified
- `deletion` - File or section removed

---

## 3. Session Management Rules

### When to create a new session

Create a new session when:
- User makes a new request that leads to actual changes
- Previous session is complete (all changes committed)
- Request is substantially different from current session

### When to update existing session

Update the current session when:
- Continuing work on the same user request
- Fixing issues found during implementation
- Adding related changes to same logical unit of work

### Session numbering

- Sessions are numbered sequentially per day: `session-01`, `session-02`, etc.
- Numbers reset each day (date-based directories)
- Use zero-padded two digits: `01`, `02`, ..., `10`, `11`

---

## 4. Coordination with doc-keeper

The `doc-keeper` agent is responsible for:

1. **Maintaining the session history system**
   - Creating new session files when requested by build-lead
   - Updating session files with edit history
   - Ensuring JSON is valid and well-formed

2. **Syncing with reports**
   - When a session affects core flows or logic, update relevant reports in `claude-docs/reports/`
   - Add human-readable entries that reference the session file
   - Maintain bidirectional links (report → session, session → report)

3. **Updating specs and design docs**
   - When build-lead requests spec/design updates, doc-keeper makes the changes
   - Session file records which docs were updated and why

---

## 5. Enforcement Rules

### Pre-execution checklist

Before any code/doc modification, the responsible agent must:
- [ ] Plan is written and visible
- [ ] Plan covers objective, affected areas, files, and steps
- [ ] Session file exists or will be created
- [ ] User has approved plan (for build-lead) or Task Brief is clear (for subagents)

### Post-execution checklist

After changes are complete, the responsible agent must:
- [ ] All planned changes are implemented
- [ ] No unplanned changes were made
- [ ] Session file is updated with edit history
- [ ] Summary is provided to coordinator or user

### Violations

If an agent makes changes without a plan:
- build-lead must stop and escalate
- Subagent must be corrected and work may be rejected
- Session history must be backfilled with the plan if possible

---

## 6. Plan Format Templates

### build-lead Plan Template

```
## Implementation Plan: [Brief Title]

### 1. Objective
[Clear statement of what will be accomplished]

### 2. Affected Areas
- [Area 1, e.g., UI, API, DB]
- [Area 2]

### 3. Files to Touch
- path/to/file1.ts (update)
- path/to/file2.tsx (create)
- path/to/file3.md (update)

### 4. Implementation Sequence
1. [First step]
2. [Second step]
3. [Third step]
4. [Validation step]
```

### Subagent Plan Template

Included in deliverable format:

```
Task ID: [AGENT-###]
Plan:
- Change: [What will be changed]
- Reason: [Why this change is needed]
- Files: [List of files to touch]
- Outcome: [Expected result]

[... implementation happens ...]

Summary:
- Changed: [What was actually changed]
- Reason: [Why it was changed]
- Files Touched: [Actual files modified]
- Result: [Actual outcome]
```

---

## 7. History Retention

Session files are permanent project records:
- Never delete session files
- Keep all historical sessions for audit trail
- Use session files to understand project evolution
- Reference sessions in git commit messages when relevant

---

## 8. Integration with Existing Workflows

### build-lead workflow updates

The existing build-lead workflow now includes:

1. Understand request
2. **Create implementation plan** ← NEW
3. **Show plan to user** ← NEW
4. **Create/update session file** ← NEW
5. Delegate to subagents (with plan context)
6. Validate results
7. **Update session with final edit history** ← NEW
8. Mark task complete

### Subagent workflow updates

The existing subagent workflow now includes:

1. Receive Task Brief from build-lead
2. **Write task-specific plan** ← NEW
3. Execute within plan boundaries ← ENFORCED
4. **Return summary with changes and reasons** ← UPDATED
5. Escalate if blocked

---

## 9. Conflict Resolution

If this policy conflicts with existing agent behavior:

1. **This policy takes precedence** for planning and history requirements
2. Existing domain responsibilities remain unchanged
3. File ownership boundaries remain unchanged
4. build-lead coordinates resolution of any ambiguities

---

## 10. Future Agent Creation

When creating new specialist agents in the future:

- Include planning requirements in agent definition
- Reference this policy document
- Ensure agent knows how to write plans before executing
- Ensure agent returns structured summaries with change reasons

---

## Summary

This policy ensures:
- All work is planned before execution
- Changes are traceable through session history
- Agents stay within defined boundaries
- Project evolution is documented and auditable
- Coordination between agents is clear and structured
