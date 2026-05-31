---
name: workflow-author
description: >
  Author a reusable, deterministic DYNAMIC WORKFLOW — a `.claude/workflows/<name>.js`
  orchestration script — from a plain description of a repeatable, multi-step process.
  Use whenever the user wants to create/scaffold a workflow, automate a repeatable flow
  ("we always do X then Y then Z"), fan work out across agents, set up a review→verify
  pipeline, run a migration over many files, or extend the `sdlc` workflow. The skill
  composes the EXISTING swe-flow agents (swe-flow:implementer / reviewer / doc-keeper) and
  `npx govkit verify` gates into one of three proven shapes — pipeline (review→verify),
  fan-out in dependency waves, or loop-until-done — and NEVER invents new agents, skills,
  or teams. It writes the script into `.claude/workflows/` (workflows cannot ship inside a
  plugin), embeds a MANDATORY manual-fallback header, and validates the result with
  `node --check`. Trigger on "tạo workflow", "scaffold/author a workflow", "automate this
  flow", "make a reusable orchestration", "fan this out", "set up a review pipeline".
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
---

# Workflow Author

Turn a repeatable, multi-step process into a **reusable dynamic workflow** — a deterministic
`.claude/workflows/<name>.js` script the team can re-run, version, and trust. You **compose
what already exists** (the swe-flow agents + the `govkit` gate) into a small set of proven
shapes; you never invent new agents or teams. The workflow is an **accelerant** — the govkit
PreToolUse hook + CI `govkit verify` stay the source of truth whether the workflow runs or not.

> Why this skill exists: govkit ships ONE hand-authored workflow (`.claude/workflows/sdlc.js`).
> This skill lets any team scaffold their OWN governed orchestration — *config-not-code applied
> to the flow itself* — instead of copy-pasting and hand-editing `sdlc.js`.

## The one rule that keeps this lean

**Compose, never invent.** A generated workflow may only dispatch agents that already exist —
the plugin agents `swe-flow:implementer`, `swe-flow:reviewer`, `swe-flow:doc-keeper`, built-in
agents, or a default agent — and may only gate with `npx govkit verify`. If a process seems to
need a brand-new specialist agent or a new skill, **STOP and say so**: that is a different (and
far heavier) job, not this skill. This is the line that separates a lean orchestration generator
from a "generate a whole agent team" meta-framework.

## Non-negotiable rules (bake into every generated workflow)

- **Workflows are project-scoped — write to `.claude/workflows/<name>.js`.** They CANNOT be
  bundled in a plugin (`plugin.json` has no `workflows` field — verified). The file lands in the
  consumer repo, not the plugin.
- **`meta` is a PURE LITERAL.** `export const meta = { name, description, phases: [...] }` with
  no variables, calls, spreads, or template interpolation. Each `phases[].title` must be realized
  in the body — either by a `phase("...")` call (the top-level sequence) OR by a `phase:` field in
  an agent's `opts` (the correct way inside `pipeline`/`parallel` stages, where a global `phase()`
  would race). A pipeline's first phase is usually a `phase()` call; its later phases are usually
  `opts.phase` — both count.
- **The script has NO filesystem or shell access.** Every read and write is done by a dispatched
  `agent(...)`; the script only *sequences* them. Never write `fs` / `child_process` in it.
- **End with `log(...)`, not a top-level `return`.** A top-level `return` is valid at runtime but
  FAILS `node --check` (return outside a function). Mirror `sdlc.js`: summarize with `log()`. Only
  use `return` when the workflow is called as a sub-step — then validate by wrapping (see
  `references/authoring-rules.md`).
- **Reviewer verdicts control FLOW ONLY.** A `swe-flow:reviewer` gate decides whether the workflow
  advances; it NEVER flips a doc `status:` or assigns an owner (human acts — root `AGENTS.md`
  § Agent constraints). `proposedNextStatus` is a proposal only.
- **Determinism lives in govkit, not the script.** Wire `npx govkit verify` (or a reviewer gate)
  at each checkpoint; never reimplement the gate in JS.
- **Every workflow carries the MANDATORY fallback header** (`references/authoring-rules.md`):
  workflows are research-preview and globally disableable, so the script documents the by-hand
  order that reaches the same result.
- **Plain JS only** (no TypeScript syntax) and **no `Date.now()` / `Math.random()` / argless
  `new Date()`** (they break workflow resume — pass timestamps via `args`).

## Reference (read before emitting)

- `references/authoring-workflows.md` — ONE doc, read top-to-bottom: the Workflow runtime API
  (`agent` / `parallel` / `pipeline` / `phase` / `log` / `meta` / `args`), the hard constraints,
  the mandatory fallback header to paste, the THREE shapes (pipeline · fan-out-in-waves ·
  loop-until-done) each with a `node --check`-valid skeleton, and the deterministic validation
  checklist. Pick ONE shape; don't freelance a fourth.

## Process

### 1. Classify the flow → pick ONE shape
First ask: **do you know the work items up front?** If not → **loop-until-done** (discovery). If
yes, do they flow through stages or in dependency order?
- independent items, each through the same stages → **pipeline**
- many disjoint work-packages, some blocking others → **fan-out in dependency waves**
- unknown-size discovery, repeat until a target / until dry → **loop-until-done**

If it looks like two shapes glued together, prefer the simpler one and note the rest as a
follow-up — don't build a hybrid in v1.

### 2. Discover the ground truth
Read the consumer's `govkit.yml` (doc dirs, types, gates) so the workflow gates the right
artifacts. Confirm the swe-flow plugin is installed (so `swe-flow:*` agents resolve); if it
isn't, the generated dispatch will fail — say so instead of emitting a broken workflow.

### 3. Name it + define phases
Pick a short kebab-case `<name>` and 2–5 phase titles. Each `meta.phases` title must appear in the
body as a `phase("...")` call or an agent `phase:` opt (pipeline stages use the opt).

### 4. Write `.claude/workflows/<name>.js`
Start from the chosen shape's skeleton. Wire in REAL agents (`swe-flow:reviewer` / `implementer`
/ `doc-keeper`) and `npx govkit verify` at the checkpoints. Paste the mandatory fallback header.
Keep it the minimum that expresses the flow — no speculative phases.

### 5. Validate (deterministic) — fix until clean
```bash
node --check .claude/workflows/<name>.js     # must exit 0
```
Then the structural checklist (`references/authoring-rules.md`): `meta` literal present · every
`meta.phases` title realized (a `phase()` call OR an agent `phase:` opt) · ≥1 reviewer gate or
`govkit verify` · fallback header present · only `swe-flow:*` / built-in agentTypes · no
`Date.now` / `Math.random` · no top-level `return`.
Fix the SCRIPT until every check passes — never weaken a check to make it pass.

### 6. Hand off
Give the user the file path, how to run it (it appears in `/workflows`, or via the Workflow tool
with `{scriptPath}`), and restate the manual fallback. Stop at "ready to run" — do not execute it
unless asked.

## Hard rules

- **Compose existing agents + `govkit verify` only. Never generate new agents / skills / teams.**
- **Write to `.claude/workflows/`; never try to add a `workflows` field to a plugin.**
- **`meta` pure literal; every phase title realized (`phase()` call or `phase:` opt); plain JS; no `Date.now` / `Math.random`; no top-level `return`.**
- **Reviewer gates control flow only — never flip a `status:` or assign an owner.**
- **`node --check` MUST pass before handoff.** A workflow that doesn't parse is worse than none.
- **Always embed the manual-fallback header** — the workflow is an accelerant; govkit is the gate.

## Picking the shape (quick guide)

| Shape | Use when | Barrier? |
|---|---|---|
| **pipeline** | N independent items, each through the same stages (review→verify) | no — fastest wall-clock |
| **fan-out in waves** | disjoint work-packages with `blocks:` ordering (implementers) | gate per wave |
| **loop-until-done** | unknown-size discovery; repeat until a target / K dry rounds | n/a |

If none fits, say so — don't invent a shape just to have one.
