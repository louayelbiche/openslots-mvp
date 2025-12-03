# Implementation Plan: Planning Policy & Session History System

**Session:** session-02
**Date:** 2025-11-27
**Status:** ✅ Completed

---

## 1. Objective

Implement mandatory planning requirements and session-based history tracking for build-lead and all subagents, ensuring no code/doc changes occur without first producing a visible plan and recording it.

## 2. Affected Areas

- **Agent Definitions**: build-lead.md + 8 subagent files
- **Policies**: New planning policy document
- **Directory Structure**: claude-docs/history/, claude-docs/policies/
- **History System**: Session tracking in YYYY-MM-DD/session-XX.json format
- **Documentation**: Planning requirements and enforcement rules

## 3. Files to Touch

### Policy Documents
- `claude-docs/policies/planning.md` (create) - Centralized planning policy

### Agent Definitions
- `claude-docs/agents/build-lead.md` (update) - Add mandatory planning section
- `claude-docs/agents/ui-impl.md` (update) - Add planning requirements
- `claude-docs/agents/api-impl.md` (update) - Add planning requirements
- `claude-docs/agents/db-modeler.md` (update) - Add planning requirements
- `claude-docs/agents/bidding-logic.md` (update) - Add planning requirements
- `claude-docs/agents/slot-matcher.md` (update) - Add planning requirements
- `claude-docs/agents/menu-parser.md` (update) - Add planning requirements
- `claude-docs/agents/test-runner.md` (update) - Add planning requirements
- `claude-docs/agents/doc-keeper.md` (update) - Add planning + session history management

### History & Plans
- `claude-docs/history/2025-11-27/session-01.json` (create) - Retroactive session for discovery implementation
- `claude-docs/history/2025-11-27/session-02.json` (create) - This implementation session
- `claude-docs/plans/PLAN-2025-11-27-session-01.md` (create) - Detailed plan for session 01
- `claude-docs/plans/PLAN-2025-11-27-session-02.md` (create) - This plan document

## 4. Implementation Sequence

### Step 1: Create Planning Policy Document
1. Create `claude-docs/policies/planning.md` with:
   - Core principle: No code/doc changes without visible plan
   - Planning requirements for build-lead and subagents
   - Session history format and JSON schema
   - Session management rules (creation, update, numbering)
   - Change type definitions (new file, behavior change, refactor, etc.)
   - Coordination rules with doc-keeper
   - Enforcement checklist (pre/post execution)
   - Plan format templates for all agent types
   - Integration with existing workflows
   - Conflict resolution rules

### Step 2: Update build-lead.md
2. Add Section 0: "MANDATORY: Planning and Session Tracking"
   - Place before existing Section 1 to make it prominent
   - Define planning requirements (numbered plan with objective, areas, files, steps)
   - Require showing plan to user before execution
   - Session file creation/update requirements
   - Session history format (JSON schema example)
   - Enforcement rules
   - Coordination with doc-keeper for session management
3. Reference `claude-docs/policies/planning.md` for complete requirements

### Step 3: Update All 8 Subagent Files
4. For each subagent, add Section 0: "MANDATORY: Planning Before Execution"
   - **ui-impl**: Plan format for UI changes, component creation
   - **api-impl**: Plan format for endpoints, services, API contracts
   - **db-modeler**: Plan format for schema changes, migrations, impact analysis
   - **bidding-logic**: Plan format for algorithms, calculations, spec references
   - **slot-matcher**: Plan format for search/filter/sort logic
   - **menu-parser**: Plan format for parsing logic (future use)
   - **test-runner**: Plan format for test changes, coverage targets
   - **doc-keeper**: Plan format for doc changes + special session history responsibilities

5. Each subagent section includes:
   - "Before You Start" requirements
   - Plan format template specific to their domain
   - "After Implementation" summary requirements
   - Reference to `claude-docs/policies/planning.md`

6. For doc-keeper specifically, add Section 0.5: "SPECIAL RESPONSIBILITY: Session History Management"
   - Session file creation procedure
   - Session file update procedure
   - Report linking requirements
   - Change type definitions

### Step 4: Create Session History Examples
7. Create `claude-docs/history/2025-11-27/session-01.json`
   - Retroactively document the discovery implementation from earlier today
   - Include complete edit history with 23 file changes
   - Document timezone fix and discovery flow implementation
   - Link to commit: feat(mvp): implement discovery flow with timezone-aware slot filtering

8. Create `claude-docs/history/2025-11-27/session-02.json`
   - Document this planning policy implementation
   - Include edit history for all 11 files changed
   - Reference the implementation plan
   - Mark outcome as "success"

9. Create `claude-docs/plans/PLAN-2025-11-27-session-01.md`
   - Detailed plan for discovery implementation
   - 8 phases from DB schema to commit
   - Success criteria and risk mitigation

10. Create `claude-docs/plans/PLAN-2025-11-27-session-02.md`
    - This detailed plan document
    - 5 steps from policy creation to validation

### Step 5: Validate Structure
11. Check all files exist and are properly formatted:
    - Policy file created at `claude-docs/policies/planning.md`
    - All 9 agent files updated (build-lead + 8 subagents)
    - Session files created with valid JSON
    - Plan files created with complete details

12. Validate JSON schema:
    - Run `python3 -m json.tool` on session files
    - Ensure all required fields present
    - Check edit history arrays are properly formatted

13. Create implementation summary:
    - List all files created (2) and updated (9)
    - Document key changes and their purpose
    - Confirm enforcement is active going forward

## 5. Success Criteria

- [x] `claude-docs/policies/planning.md` created with complete policy
- [x] `build-lead.md` updated with Section 0 (planning requirements)
- [x] All 8 subagent files updated with Section 0 (planning requirements)
- [x] `doc-keeper.md` includes Section 0.5 (session history management)
- [x] Session files created for both implementations
- [x] Plan files created for both sessions
- [x] JSON validates correctly
- [x] No conflicts with existing agent responsibilities
- [x] Policy is clear and enforceable
- [x] Future agents will include planning requirements

## 6. Enforcement Mechanism

### For build-lead:
- MUST create implementation plan before any work
- MUST show plan to user for approval
- MUST create/update session file
- MUST coordinate with doc-keeper for session maintenance

### For all subagents:
- MUST write task-specific plan in deliverable
- MUST stay within plan boundaries
- MUST return summary with change reasons
- MUST reference `claude-docs/policies/planning.md`

### Violations:
- Work done without plan must be escalated
- Session history must be backfilled if possible
- Subagent work may be rejected if no plan provided

## 7. Session History Format

Each session file contains:
```json
{
  "sessionId": "session-XX",
  "date": "YYYY-MM-DD",
  "timestamp": "ISO 8601",
  "userRequest": "Original request",
  "objective": "High-level goal",
  "affectedAreas": ["UI", "API", "DB"],
  "implementationPlan": {
    "objective": "...",
    "affectedAreas": ["..."],
    "filesToTouch": ["..."],
    "steps": ["1. ...", "2. ..."]
  },
  "editHistory": [
    {
      "file": "path/to/file",
      "changeType": "new file | behavior change | refactor | spec update | config change | deletion",
      "reason": "Why this change was made"
    }
  ],
  "summary": "What was accomplished",
  "outcome": "success | partial | blocked",
  "notes": ["Additional context"]
}
```

## 8. Change Types

- **new file**: File created from scratch
- **behavior change**: Logic or functionality modified
- **refactor**: Structure changed without behavior change
- **spec update**: Documentation or specification updated
- **config change**: Configuration or settings modified
- **deletion**: File or section removed

## 9. Benefits

1. **Audit Trail**: Complete history of all changes with reasoning
2. **Planning Discipline**: Forces thoughtful design before implementation
3. **Coordination**: Clear handoffs between agents
4. **Traceability**: Link sessions to git commits and reports
5. **Knowledge Base**: Future reference for "why" decisions were made
6. **Quality Control**: Reduces scope creep and unplanned changes

## 10. Integration with Existing Workflow

**Old build-lead workflow:**
1. Understand request
2. Delegate to subagents
3. Validate results
4. Mark complete

**New build-lead workflow:**
1. Understand request
2. **Create implementation plan** ← NEW
3. **Show plan to user** ← NEW
4. **Create/update session file** ← NEW
5. Delegate to subagents (with plan context)
6. Validate results
7. **Update session with final edit history** ← NEW
8. Mark complete

**Subagent workflow enhancement:**
- Receive Task Brief → **Write plan** → Execute → **Return summary**

## 11. No Conflicts

This policy:
- Does NOT override domain responsibilities
- Does NOT change file ownership boundaries
- Does NOT alter MCP tool authorization
- Does NOT modify escalation rules
- ONLY ADDS planning and tracking requirements

## 12. Future Agents

When creating new specialist agents:
- Include Section 0 with planning requirements
- Reference `claude-docs/policies/planning.md`
- Ensure plan format matches agent's domain
- Update doc-keeper if session history format changes

## 13. Notes

- This is a meta-implementation: using the planning policy to implement itself
- First session (session-01) documented retroactively
- This session (session-02) follows new planning requirements
- All future work must follow this policy
- Policy can evolve but changes must be documented in session history
