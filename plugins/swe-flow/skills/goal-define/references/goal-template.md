# Goal Template Reference

## Full Template

```
/goal <Task Type>: <One-line description — max 10 words>

  Context to read first:
  - <path/to/file1> (<why this file matters>)
  - <path/to/file2> (<why>)

  Source/reference material:                          # OPTIONAL — for implementation/migration
  - <upstream code or docs to study>

  Method:
  - <tool/skill 1 — when to use it>
  - <tool/skill 2 — when to use it>

  Constraints:
  - <HARD rule — use NO / ONLY / MUST>

  Operating rules:
  - <Iteration size — e.g. "one change → verify → next">
  - <Scope control — e.g. "stop and ask if scope expands">

  Done when:
  - <Criterion 1 — measurable + how to verify>
  - <Criterion 2 — measurable + how to verify>

  Pause if:
  - <Testable condition 1>
  - <Testable condition 2>

  Components to build:                                # OPTIONAL — implementation only
  - 1. <file path> (<one-line purpose>)
  - 2. <file path> (<one-line purpose>)

  Areas to examine:                                   # OPTIONAL — audit only
  - <area 1 — scope + what to check>

  Before/after:                                       # OPTIONAL — refactoring only
  - Before: <current state>
  - After: <target state>
  - Unchanged: <what must NOT break>

  Safety:                                             # RECOMMENDED
  - <Why this goal is safe to run autonomously>
  - <Risk mitigations>
```

## Section Reference

### Required Sections (Control Core)

| Section | Purpose | Rules |
|---------|---------|-------|
| **Title** | Names the goal | `<Type>: <≤10 words>` |
| **Context** | Orientation before work | Every path must exist; verify with Glob |
| **Constraints** | Hard prohibitions | Use NO/ONLY/MUST — never "try to avoid" |
| **Operating rules** | Process fences | Cover: iteration size, scope, progress |
| **Done when** | Success criteria + verification | Each criterion includes how to verify it |
| **Pause if** | Abort conditions | Testable + specific + ≥2 conditions |

### Optional Sections

| Section | When to include | Purpose |
|---------|----------------|---------|
| **Method** | When tools/skills matter | Which tool for which step |
| **Source/reference** | Implementation, migration | Upstream code to study |
| **Components** | Implementation | Numbered deliverable list |
| **Storage layout** | Implementation with file output | ASCII tree of artifacts |
| **Areas to examine** | Audit/review | Scoped checklist |
| **Before/after** | Refactoring | Change vs. preserve boundary |
| **Safety** | Autonomous execution | Risk assessment + mitigations |

## Compression Guide

**Target: under 3000 characters.** Apply these by default, not as a post-hoc step:

1. Drop per-file annotations → single-line summaries
2. Collapse multi-sentence explanations → comma-separated phrases
3. Use shorthand: `→`, `+`, `NO`, `ONLY`, `MUST` instead of prose
4. Merge validation into Done-when (each criterion includes its own verification)
5. One-line output patterns instead of ASCII trees
6. Drop section headers for empty optional sections
7. Drop Safety if covered by Constraints

### Example: Full → Compressed

**Full (verbose):**
```
  Constraints:
  - Output must be exactly 1 Mermaid sequence diagram, no additional diagrams
  - Do not include internal function details — only show phase transitions
  - Maximum 30 arrows in the diagram to keep it readable
```

**Compressed:**
```
  Constraints: ONLY 1 Mermaid sequence diagram. NO function details—phase transitions only. Max 30 arrows.
```

## Task Type Defaults

### Implementation
```
  Method: codegraph_impact before editing. /quick-test after each change.
  Operating rules: One change → verify → next. Stop if scope expands. Save immediately.
  Validation During: tests pass, ruff check clean. Final: /verify passes, docker build ok.
  Default pause-if: dependency unavailable, tests fail in unrelated area, >3 files changed outside scope.
```

### Exploration/Research
```
  Method: codegraph_context first, codegraph_trace for flows, codegraph_explore for source.
  Operating rules: Verify each element against codebase. Mark [unverified] if codegraph can't confirm.
  Validation During: every diagram element maps to real symbol. Final: artifact saved to specified path.
  Default pause-if: index not initialized, >3 dynamic dispatch breaks, source structure unexpected.
```

### Audit/Review
```
  Method: codegraph_impact for blast radius. Grep for pattern matching. Read for verification.
  Operating rules: One finding at a time. Include file:line for every finding. Classify severity.
  Validation During: each finding reproducible with file evidence. Final: report saved, zero false positives.
  Default pause-if: codebase structure doesn't match expected, >50% findings are false positives.
```

### Refactoring
```
  Method: codegraph_callers before renaming. /quick-test after each step.
  Operating rules: One refactor → run tests → next. Preserve all existing behavior.
  Validation During: existing tests pass after each change. Final: /verify clean, no behavior change.
  Default pause-if: existing tests fail BEFORE changes, circular dependency discovered, >5 files affected per step.
```
