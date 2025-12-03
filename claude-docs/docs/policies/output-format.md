# Output Format Policy
Strict formatting rules that all Claude agents must follow when generating code, documentation, diffs, or reasoning.  
These rules ensure consistency, parseability, and agent-of-agents coordination.

---

## 1. General Output Rules

### 1.1 No Hidden Reasoning
Agents must never output hidden thoughts, chain-of-thought, or internal reasoning.  
All output must be concise, direct, and fully reproducible.

### 1.2 Deterministic Responses
Responses must not rely on randomness or probability.  
Outputs must be stable and repeatable.

### 1.3 Explicit Assumptions
When making assumptions:
- state them explicitly  
- list them clearly  
- do not bury them inside other sections  

If assumptions materially change logic, the agent must pause and request confirmation.

---

## 2. Code Output Rules

### 2.1 Use Full Files, Not Fragments
When modifying code or generating implementation:
- output the full file, not only the diff  
unless explicitly asked for “diff only.”

### 2.2 No Pseudo-Code
All code must be real, executable, and aligned with:
- actual stack  
- actual frameworks  
- actual folder structure  

No placeholders like `TODO: implement`.

### 2.3 Match Folder Structure
Generated code must match the real repo paths exactly.

### 2.4 No Silent API Additions
Agents must not invent new:
- routes
- handlers
- DTOs  
unless the agent received explicit instruction.

---

## 3. Documentation Output Rules

### 3.1 Always Use Markdown
All documentation must be output as markdown unless otherwise specified.

### 3.2 Clean Section Hierarchy
Documents must always follow a clear hierarchy:
- H1 for file title  
- H2 for major sections  
- H3 for subsections  
Never skip hierarchy levels.

### 3.3 Stable Terminology
Agents must use consistent terms:
- “slot,” “offer,” “Best Offer,” “match likelihood,” “time window,” etc.  
No synonyms unless approved.  
Design and specs terms must stay locked.

### 3.4 No Drifting Definitions
If a term is defined in `foundation.md` or specs, agents must not reinterpret it.  
If ambiguous, surface the ambiguity.

---

## 4. Diff / Patch Output Rules

### 4.1 Use Standard Patch Format
When asked for diffs, use:

```diff
--- a/file
+++ b/file
@@ -X,Y +X,Y @@
  code changes
```

No alternative formats.

### 4.2 Minimal Changes Only
Diffs must include only the lines required for the change.  
No whitespace noise.  
No unrelated rewrites.

---

## 5. Multi-Agent Coordination Rules

### 5.1 Tag Your Role
Agents must declare their active role at the top:

```
[role: build-lead]
[role: ui-impl]
[role: api-impl]
...
```

### 5.2 Follow Build-Lead Instructions
Build-lead instructions override all subagent autonomy.  
Subagents cannot override build-lead decisions.

### 5.3 Declare Hand-Offs Explicitly
When finishing a task that another agent must continue:

```
[handoff to: db-modeler]
Reason: new field added in specs requiring DB schema update.
```

### 5.4 Consistent State Updates
After any change, agents must update:
- specs  
- design docs  
- agent files  
- and notify the doc-keeper agent explicitly.

---

## 6. Planning & Response Structure

### 6.1 When Asked to Plan
Use this structure only:

```
Plan:
1. Step
2. Step
3. Step
```

### 6.2 When Asked to Execute
Respond directly with the requested output, no plan included.

---

## 7. Error Handling Format

When detecting a conflict, inconsistency, or undefined element, the agent must output:

```
Error Detected:
- Description
- Location
- Blocking Impact
- Proposed Options to Resolve
```

And stop execution.

---

## 8. Final Output Rule
**No agent may produce output that is vague, ambiguous, or not directly usable.  
All output must be clean, reproducible, and immediately actionable.**
