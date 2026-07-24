---
name: goal-define
description: >
  Structure a clear, verifiable /goal from rough user input through guided interview.
  Use this skill whenever the user says "define goal", "tạo goal", "/goal", "goal cho task này",
  "I want to do X" (where X is complex/multi-step), "structure this task", "make this into a goal",
  or when you detect the user has a vague multi-step objective that would benefit from structured
  goal definition. Also trigger when the user pastes a wall of requirements and needs them organized
  into a runnable goal. Covers all task types: implementation, exploration/research, audit/review,
  and refactoring.
---

# Goal Define

Turn rough user input into a structured, verifiable `/goal` text through guided interview.

A well-structured goal has a **control core** — four sections that prevent the agent from wandering or over-committing:

| Section | Purpose |
|---------|---------|
| **Constraints** | Hard fences — what you CANNOT do |
| **Operating rules** | How you work — iteration size, scope control |
| **Done when** | Finish line — measurable success criteria |
| **Pause if** | Abort conditions — stop instead of grinding |

Without all four, autonomous work either wanders or burns tokens on doomed approaches.

## Process

Work through these phases in order. Each phase fills one section of the goal template.
Use `AskUserQuestion` for structured choices. Ask one question per message.

### Phase 1: Detect Task Type

Classify the user's intent into one of four types. This determines which optional sections to include and how to phrase interview questions.

| Type | Signal phrases | Extra sections |
|------|---------------|----------------|
| **Implementation** | "build", "fix", "add", "implement", "deploy" | Components to build, Storage layout |
| **Exploration** | "explore", "understand", "trace", "diagram", "how does X work" | Method (tools), Output format constraints |
| **Audit** | "review", "check", "audit", "validate", "security" | Areas to examine, Severity classification |
| **Refactoring** | "refactor", "restructure", "clean up", "migrate" | Before/after criteria, Regression checks |

If ambiguous, ask the user. If the user's input already makes the type obvious, skip this question.

### Phase 2: Title & Scope

Extract or ask for:
- **One-line title**: `<Task Type>: <description in ≤ 10 words>`
- **Scope boundary**: What is explicitly IN scope? What is OUT?

If the user's initial input is detailed enough, propose a title and confirm.

### Phase 3: Context Discovery

Identify what the agent should read before starting work.

**Context-aware discovery:** Check what's available in the current environment and suggest accordingly:

1. **CodeGraph available?** → Use `codegraph_context` or `codegraph_files` to find relevant files for the user's topic. Suggest specific paths.
2. **Project has docs/?** → Check for specs, architecture docs, plans that relate to the topic.
3. **Project has CLAUDE.md?** → Note relevant rules/constraints already defined there (don't duplicate — reference them).
4. **Existing skills available?** → Check if any loaded skills relate to the task (e.g., `verify`, `quick-test`, `ag-ui`).

Present discovered context to the user for confirmation. Ask: "These files look relevant — should I include them? Any others?"

### Phase 4: Method Selection

Based on task type and available tools, suggest the approach:

- **Which tools to use** — codegraph (if indexed), MCP servers, Grep/Read, specific skills
- **Which skills to invoke** — check the available skills list for matches
- **Execution strategy** — sequential, parallel agents, incremental

Frame each suggestion with WHEN to use it: `"codegraph_trace: when tracing call paths between symbols"`

### Phase 5: Constraints

Ask the user for hard rules. Prompt with task-type-specific examples:

- **Implementation**: "Output format? Framework restrictions? No X pattern?"
- **Exploration**: "Diagram type? Max complexity? Actors to include?"
- **Audit**: "Severity levels? Which categories to check? Scope limits?"
- **Refactoring**: "What must NOT change? API compatibility? Performance bounds?"

**Rule:** Every constraint must use "NO", "ONLY", or "MUST" — never "try to avoid" or "prefer". Soft constraints are useless in autonomous execution.

### Phase 6: Operating Rules

Ask about process preferences:
- **Iteration size**: "One change at a time?" or "Batch related changes?"
- **Verification cadence**: "Verify after each step?" or "Verify at checkpoints?"
- **Scope control**: "Stop and ask if scope expands?" or "Note and continue?"
- **Progress tracking**: "Save artifacts immediately?" or "Batch at end?"

Suggest sensible defaults based on task type. User confirms or overrides.

### Phase 7: Success Criteria (Done When)

Ask: "How do we know this is finished?"

Each criterion must be **measurable + verifiable + specific**, and include how to verify it inline. Combine what was done with how to prove it in one bullet:

- Good: "sessions/ JSON count == DB row count per env (verify: compare ls | wc -l against SQL count)"
- Good: ".gitignore includes raws/ (verify: grep raws .gitignore)"
- Bad: "diagrams are complete" — no verification method

Reject vague criteria. If user says "it works correctly", ask: "What specific check proves it works?"

**Rule — measurable success is required even when the intake omits it.** If no measurable success criterion is supplied, the goal MUST still carry one, as exactly one of: (a) a targeted owner question, (b) an explicit `TBD` placeholder, or (c) a derived criterion labeled `PROPOSAL — awaiting owner ratification`. "We'll measure later" is never the answer — even from a stakeholder. Record the deferral; do not accept it as resolved. Never invent a number to fill the hole.

**Rule — every number is sourced or labeled where it stands.** Each quantitative threshold in Done-when (target, limit, count, done-when value) either cites a named intake source or is marked `[assumption]` / `PROPOSAL` on the same line it appears. A hedge that lives only in a separate questions file does not license an unlabeled number in the goal text.

### Phase 8: Escape Hatches (Pause If)

Ask: "What should make us stop instead of pushing through?"

Each pause condition must be:
- **Testable** — agent can detect it programmatically
- **Specific** — "codegraph returns 'not initialized' error" not "tools don't work"
- **Actionable** — implies what to do next (ask user, try different approach, etc.)

Suggest 2-3 based on task type:
- Implementation: "tests fail in unrelated area", "dependency not available"
- Exploration: "index not initialized", "too many unresolvable dynamic dispatches"
- Audit: "codebase structure doesn't match expected layout"
- Refactoring: "existing tests fail before any changes made"

## Output

**Budget: the final goal text MUST be under 3000 characters.** Goals are pasted into `/goal` prompts where context space is precious. A bloated goal wastes tokens on every turn the agent reads it.

After all phases, assemble the goal using compressed format — no ASCII trees, no verbose bullets, no section headers for empty sections. Apply these compression rules automatically:

- Single-line summaries instead of per-item annotations
- Shorthand: `→`, `+`, `NO`, `ONLY`, `MUST` instead of prose
- Merge "Validation: During" checks into the relevant "Done when" criterion (they must mirror each other anyway — don't duplicate)
- Collapse multi-sentence explanations into comma-separated phrases
- Drop optional sections that add no information beyond what's already in Constraints or Done-when

```
/goal <Type>: <Title>

  Context:
  - <path> (<why — 3-5 words>)

  Method:
  - <tool — when to use>

  Constraints:
  - <HARD rule — NO/ONLY/MUST>

  Operating rules:
  - <Process rule — one line>

  Done when:
  - <Measurable criterion + how to verify>

  Pause if:
  - <Testable condition>
```

### Optional Sections (only when they add info not covered above)

- **Resources** (Exploration) — external endpoints, credentials, resource names in compact table
- **Output layout** (Implementation) — one-line pattern like `{env}/sessions/ + workspaces/ + summary.json`
- **Before/after** (Refactoring) — what changes vs. what stays

## Quality Checks

Before printing the final goal, verify:

1. **Under 3000 chars?** — Count the goal text. If over budget, compress further using the rules above.
2. **Control core complete?** — Constraints + Operating rules + Done when + Pause if all present
3. **No soft constraints?** — Every constraint uses NO/ONLY/MUST
4. **Done-when verifiable?** — Each criterion includes how to verify it (command, file check, count match)
5. **Context paths exist?** — Every path is real (verify with Glob/codegraph)
6. **No vague criteria?** — No "works correctly", "looks good", "is complete" without specifics
7. **Pause-if testable?** — Each condition can be detected programmatically
8. **No redundancy?** — No section repeats information already in another section
9. **Measurable success present?** — Done-when carries a real criterion, or an owner question / `TBD` / labeled `PROPOSAL`; "measure later" is never accepted as the answer
10. **Numbers sourced in place?** — Every threshold traces to an intake source or is labeled `[assumption]`/`PROPOSAL` on its own line

If any check fails, fix inline before printing.

## Anti-Patterns to Flag

If you notice these in user input, flag and fix:

| Anti-pattern | Fix |
|---|---|
| "Try to avoid X" | → "NO X" |
| "It should work" | → Ask: "What specific check proves it works?" |
| Missing pause-if | → Suggest 2-3 based on task type |
| Components without validation | → Add matching validation entry |
| Context paths that don't exist | → Verify with Glob, remove or correct |
| Scope too broad for single goal | → Suggest decomposition into sub-goals |
| "We'll measure later" (no success metric) | → Owner question / `TBD` / labeled `PROPOSAL`; never accept the deferral as the answer |
| Unsourced number in goal text | → Cite intake source, or label `[assumption]`/`PROPOSAL` on that line |

## Reference

For the full goal template with all fields and compression guide, see `references/goal-template.md`.
