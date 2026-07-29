# Design rationale — why govkit is built this way

This page is for people deciding whether to trust govkit, extend it, or contribute to it.
If you want to *use* it, read [`the-flow.md`](./the-flow.md) instead.

## Generation is cheap; trust is the product

A document being well-formed — or having been produced by an LLM — does not make it good.
govkit separates the two questions rather than pretending one answers the other:

| Layer | Command | Question | Result |
|---|---|---|---|
| **Gate** (quality *control*) | `govkit verify` | Is it well-**formed**? | binary pass/fail — blocks merge |
| **Eval** (quality *signal*) | `govkit eval` | Is it a complete, non-stub doc? | required **floor** blocks + advisory **0–100** score |
| **Judge** (substance *verdict*) | `swe-flow:judge` + the `substance-judge` skill (RFC-0019) | Is the prose **sound**? | opt-in, needs a key — **never** in no-key CI; anchored 0–100, deepeval-compatible records |

### What the gate enforces

`govkit verify` checks front-matter, the status lifecycle, the id↔filename convention, INDEX
sync, unique ids, no placeholders, chain referential-integrity (RFC-0003), **chain-status
coherence** (RFC-0008 — a doc may not reach a terminal/shipped state while its `parent`'s
design is still undecided), and **status-conditional required sections** (RFC-0010 — a doc at a
post-implementation status such as `implemented` must carry its as-built / deviations note, so
design↔code divergence becomes a recorded ritual rather than a silent fact).

`govkit eval` adds a deterministic **structural floor** that blocks CI (not an empty stub, no
leftover template filler, canonical sections as *distinct* headings) plus an **advisory score**
for watching quality trend. Both are no-key.

### What never blocks

Two advisory, read-only commands, by construction outside any exit code: `govkit report` gives
a lifecycle view (done / in-flight / cleanup) — with `--aging` (RFC-0029) adding time-in-status
from git blame — and `govkit stale` (RFC-0009) flags a doc whose `governs:` code has newer
commits than the doc. `stale` is a **proxy** ("code moved", not "doc wrong"), git-gated and
deliberately outside the no-key floor.

Two R7 learning-flywheel surfaces (RFC-0012), both no-key: an opt-in `--journal` flag on
`verify`/`eval`/`check` appends one JSONL gate-outcome record per run — crashed runs included,
so the sensor stays honest during incidents — and `govkit calibrate` scores the gate itself
against a labeled `good/`/`weak/` corpus, failing CI on any false positive, on recall/F1
regression, or on corpus shrinkage against a committed baseline. This repo calibrates its own
floor in `bun run check` against `packages/govkit/eval/fixtures` (not shipped to npm —
consumers author their own corpus).

Where the governed docs live is configurable via `docs.root` (default `.`, RFC-0007) — set it
to e.g. `.govkit` to isolate kit-managed docs under one folder.

## An honest boundary

This is the result of an adversarial red-team against govkit's own claims, and it is stated
plainly because a governance tool that oversells itself is worse than no governance tool.

A presence/shape rubric **cannot** tell a real artifact from a keyword-salad with the right
headings — they have the same lexical fingerprint. So `eval` is deliberately scoped as a
**floor**: tuned for zero false-positives on legitimate documents, and accepting that a
determined gamer passes it. Judging whether prose is *sound* is the swe-flow `judge` agent's
job (RFC-0019 — opt-in, keyed, outside CI). The floor's own trustworthiness is pinned by an
adversarial corpus (`packages/govkit/eval/`) that the test suite asserts catches every known
gaming vector while still passing MADR, Nygard, and terse documentation styles.

## Structure, not provenance

The gate checks **structure**. A stateless, no-git check cannot tell a doc born straight at
`accepted` — no draft history, no human approval — from one a human actually accepted. Both
pass `verify` and `eval`.

So "a doc starts at `startStatus` and only a human flips it forward" is an **honor-system**
rule, held by commit discipline, the human accept, and the keyed reviewer — not by the gate
(RFC-0024). Naming this honestly matters more than closing it: a rule everyone believes is
enforced, but isn't, is worse than a rule everyone knows is social.

**govkit's three tiers, named honestly:**

- **firm** — the `verify` gate. Blocks.
- **advisory** — the `eval` score, `stale`, `report`, the per-write `remind` nudge. Never blocks.
- **honor-system** — status provenance, substance soundness. Outside the engine by design.

## The invariant that shapes everything

**A non-Claude-Code contributor must be able to run the governance gates in CI with no API key.**

Every architectural choice falls out of this. Both deterministic layers live *only* in the
`govkit` CLI:

- **In Claude Code:** a `PreToolUse` hook (`type: command`) runs `npx govkit audit-write`,
  blocking a write to a governed doc that lacks complete front-matter.
- **In CI:** the *same binary* runs `npx govkit check` (→ `verify` then `eval`) — Node only,
  no Claude, no key.
- Authoring **skills** and the **`sdlc`** workflow only *author* artifacts and *call* govkit to
  validate them. They never embed the gate.

This is also why the published `govkit` artifact stays Node-portable (`engines.node >= 20`)
and bun is only a development accelerant, never a runtime requirement on consumers (ADR-0002).

## Not a starter you fork

New projects run `govkit init` (or "Use this template" on the published `template/`) and
**pin** govkit + **install** the plugins. They never copy engine source. That is the single
mechanism that keeps every downstream repo from drifting away from the tool that governs it.

## The monorepo exists so five things cannot drift

| Path | What | Ships via |
|---|---|---|
| `packages/govkit/` | **govkit** — the deterministic governance CLI (TypeScript) | npm → `npx govkit` |
| `plugins/swe-flow/` | the **swe-flow** plugin (skills + agents) that *authors* artifacts | marketplace (git-subdir) |
| `plugins/ddd-flow/` | the **ddd-flow** plugin — the DDD modelling loop; writes `docs/domain/`, which swe-flow's designers consume | marketplace (git-subdir) |
| `plugins/design-flow/` | the **design-flow** plugin — the experience-design loop (RFC-0030); writes `docs/ui/` and runs the live co-design view | marketplace (git-subdir) |
| `template/` | the consumer **scaffold surface** (pins `govkit`, installs the plugins — carries **no** engine source) | `govkit init` / "Use this template" |
| `.claude/workflows/` | the **`sdlc`** workflow orchestrating PRD→RFC→ADR→US→Code | project-scoped (workflows cannot be bundled in a plugin) |

The plugins meet each other at **artifacts**, never at imports: `docs/domain/`, `docs/ui/`,
`docs/api/`. A plugin that imported another would couple two release cycles; a plugin that
reads a directory does not care who wrote it, or whether a human wrote it by hand.
