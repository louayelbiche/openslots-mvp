# Nesting Policy
Rules governing how Claude agents may delegate, nest, chain, or parallelize tasks.  
This prevents uncontrolled depth, recursive ambiguity, and inconsistent state across the system.

---

## 1. Nesting Philosophy
Nesting is allowed ONLY to:
- reduce complexity
- isolate logic domains
- keep responsibilities clean
- avoid mixed-context reasoning

Nesting must NEVER:
- expand scope
- create new flows or screens
- generate duplicate or inconsistent documents
- perform unnecessary recursion

---

## 2. Nesting Depth Constraints

### 2.1 Maximum Depth
Agents may only nest **two levels** deep:
- Level 0: build-lead (or caller)
- Level 1: a subagent
- Level 2: a delegated helper/utility agent

No Level 3 or deeper is permitted.

### 2.2 Prohibition on Recursive Delegation
A subagent may not spawn another subagent of the same type.  
No “call yourself again,” no recursion.

### 2.3 No Infinite or Unbounded Trees
Nesting must always end after the second level.  
If more complexity is needed, escalate back to the build-lead.

---

## 3. Allowed Nesting Patterns

### 3.1 Build-Lead → Subagent → Helper
Allowed example:
```
build-lead → api-impl → db-modeler
```

### 3.2 Build-Lead → Subagent Only
Allowed example:
```
build-lead → ui-impl
```

### 3.3 Subagent → Helper Only When Necessary
Helpers must be used for:
- generating schema changes
- validating logic
- syncing docs
- running test generation

No helper may alter flows or logic semantics.

---

## 4. Prohibited Nesting Patterns

### 4.1 Subagent → Subagent → Subagent
Never allowed.

### 4.2 Subagent → Build-Lead
No upward delegation.  
Build-lead is the orchestrator, not the worker.

### 4.3 Lateral Delegation
Example (not allowed):
```
ui-impl → api-impl
```
Lateral delegation must go through build-lead.

### 4.4 Fan-Out Spawning
One agent may NOT spawn multiple agents at once.  
Only one nested call at a time.

### 4.5 Document-Changing Chains
A chain must not perform multi-level doc editing.  
Only one level is permitted to write documents.

---

## 5. Document Nesting Rules

### 5.1 Only One Writer per File
At any moment, only one agent writes to a file.  
Others must wait or request a lock.

### 5.2 No Multi-Agent Merge Conflicts
If an agent detects conflicting edits:
- stop  
- surface conflict  
- propose resolution  
- wait for approval  

### 5.3 Doc-Keeper Authority
Only the doc-keeper agent may:
- finalize changes to all docs
- propagate cross-file updates
- ensure consistency  
Subagents may propose changes but not finalize them.

---

## 6. Task Delegation Rules

### 6.1 Explicit Delegation Format
Agents must declare delegation like this:

```
[nesting: delegate to slot-matcher]
Reason: requires recalculation logic for match likelihood.
```

### 6.2 Delegation Must Be Justified
Delegations require clear reason:
- domain-specific logic  
- schema changes  
- UI component wiring  

No vague or unnecessary delegation.

### 6.3 No Delegation for Small Tasks
If the task is trivial, the agent must do it themselves.

### 6.4 Full Responsibility Return
After nested agent completes:
- control returns to parent agent  
- parent agent finishes task or requests clarification

---

## 7. State Consistency Rules

### 7.1 No Cross-Nesting State Sharing
State may not be shared across sibling nested agents.

### 7.2 Parent Owns Global State
Only the build-lead may modify global system context.

### 7.3 Helpers Must Not Mutate Specs or Design
Helpers may:
- compute  
- validate  
- generate proposals  
Helpers may NOT:
- commit changes  
- update specs  
- alter design docs

---

## 8. Failure and Recovery Rules

### 8.1 Fail Fast
If nested logic reveals:
- ambiguity  
- missing details  
- contradictory specs  
the agent must stop and surface the issue.

### 8.2 Clear, Minimal Escalation
Escalation always returns to build-lead.  
No cross hopping to other agents.

### 8.3 No Partial Writes
If an error occurs mid-process:
- no documents may be updated  
- no partial implementations may be generated  
- no side-effects allowed  

---

## 9. Final Rule
**Nesting exists to simplify, never to expand.  
At any sign of increased complexity, the nesting must stop and escalate to the build-lead.**
