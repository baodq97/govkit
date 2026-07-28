---
name: workflow-author
disable-model-invocation: true
description: >-
  Author a reusable, deterministic DYNAMIC WORKFLOW — a `.claude/workflows/<name>.js`
  orchestration script — from a plain description of a repeatable, multi-step process.
  Use whenever the user wants to create or scaffold a workflow, automate a repeatable flow
  ("we always do X then Y then Z"), fan work out across agents, set up a review-then-verify
  pipeline, run a migration over many files, or extend the `sdlc` workflow. Trigger on
  "tạo workflow", "scaffold a workflow", "automate this flow", "make a reusable
  orchestration", "fan this out", "set up a review pipeline".
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
---

# Workflow Author

## Hard rules

- **Workflows are project-scoped — write to `.claude/workflows/<name>.js`; never try to add a
  `workflows` field to a plugin.** They CANNOT be bundled in a plugin (`plugin.json` has no
  `workflows` field — verified). The file lands in the consumer repo, not the plugin.
- **`meta` is a PURE LITERAL.** `export const meta = { name, description, phases: [...] }` with
  no variables, calls, spreads, or template interpolation — and every declared phase title must
  be realized in the body (a `phase("...")` call, or a `phase:` opt on an agent inside
  `pipeline`/`parallel` stages, where a global `phase()` would race).
- **`node --check` MUST pass before handoff.** A workflow that doesn't parse is worse than none.
- **The rest of the constraints are canonical in `references/authoring-workflows.md` §2** — no
  filesystem/shell in the script (agents do ALL I/O), plugin-namespaced or built-in agents only,
  plain JS, no `Date.now()` / `Math.random()`, no top-level `return` (end with `log(...)`),
  reviewer verdicts control FLOW only (never flip a `status:` or assign an owner), determinism
  lives in govkit (never reimplement the gate in JS), and the mandatory fallback header (§3).
  Read it before emitting.

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

## Orchestration economics (measured: 3 rounds, 27 agents, 1738 tool calls)

Numbers from three real multi-agent rounds on this repo. The full write-up, including three
pre-registered experiments that all failed, is in `references/orchestration-lessons.md`.

- **Print the price of every gate.** Gate wait grew 71s → 177s → 363s across the three rounds
  while the agent count *fell* 13 → 9 → 8, because each round added "re-run and paste the full
  output" without saying what that cost. One command — the 16s test suite — was 79% of round 3's
  total wait. An agent cannot ration what it cannot price, so put the table in the prompt:
  ```
  cheap  (<2s, run freely):  verify · eval · build · lint · a scoped check
  costly (16s, cap at two):  the full test suite — scope it to changed files while iterating
  ```
- **One builder per shared artifact.** Agents share one working tree. Round 3 ran 11 builds
  concurrently with 18 test runs over the same `dist/`, and round 1 caught the consequence:
  *"4 drift e2e failures — a concurrent rebuild by the sibling agent wiping dist mid-run — does
  not reproduce."* Not reproducing is what a race looks like. Nominate one builder, or give the
  ones that build `isolation: 'worktree'`.
- **Ship the command that measures a bar's denominator, not the number.** Eight bars in one round
  rested on a stale count — 605 citations were 652, five readers were seven, nine violation kinds
  were eleven. The instruction to re-measure was already in that round's prompt and still missed
  eight times. `scripts/measure-bars.sh` emits the block instead of asking an agent to remember.
- **Reviewers re-run the gate; builders don't run it for them.** A reviewer that trusts a pasted
  transcript is a second writer. Round 3's reviewers overturned their builders in three places.
  Budget it per role: builders run the scoped check while working plus the full chain once at the
  end; reviewers run the full chain once, because that is the job.
- **Every agent writes its report to disk and returns a path.** Round 2 lost its most valuable
  measurement — an external cold-start trial — because the result was truncated in transit and
  existed nowhere else. `<run-dir>/<label>.md` first, summary second.
- **Name the cheap tool and show it.** Bash was 66–71% of all tool calls, and 30–50 per round were
  `cat`/`head`/`sed -n` doing what Read and Grep do for less. The agents were not sloppy —
  duplicate commands ran at 1–3% and errors at 0–1%. They followed the shape they were handed.

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
Then the structural checklist (`references/authoring-workflows.md`): `meta` literal present · every
`meta.phases` title realized (a `phase()` call OR an agent `phase:` opt) · ≥1 reviewer gate or
`govkit verify` · fallback header present · only `swe-flow:*` / built-in agentTypes · no
`Date.now` / `Math.random` · no top-level `return`.
Fix the SCRIPT until every check passes — never weaken a check to make it pass.

### 6. Hand off
Give the user the file path, how to run it (it appears in `/workflows`, or via the Workflow tool
with `{scriptPath}`), and restate the manual fallback. Stop at "ready to run" — do not execute it
unless asked.

## Picking the shape (quick guide)

| Shape | Use when | Barrier? |
|---|---|---|
| **pipeline** | N independent items, each through the same stages (review→verify) | no — fastest wall-clock |
| **fan-out in waves** | disjoint work-packages with `blocks:` ordering (implementers) | gate per wave |
| **loop-until-done** | unknown-size discovery; repeat until a target / K dry rounds | n/a |

If none fits, say so — don't invent a shape just to have one.
