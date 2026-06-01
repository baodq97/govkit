# govkit

> **Governance you can run, not just read.** A docs-as-code SDLC governance engine
> for the AI-agent era — deterministic, cross-platform, zero-install.

This is the **ecosystem monorepo**. Four things co-evolve here so they *cannot drift*:

| Path | What | Ships via |
|---|---|---|
| `packages/govkit/` | **govkit** — the deterministic governance CLI (TypeScript) | npm → `npx govkit` |
| `plugins/swe-flow/` | the **swe-flow** Claude Code plugin (skills + agents) that *authors* artifacts | marketplace (git-subdir) |
| `template/` | the consumer **scaffold surface** (pins `govkit`, installs the plugin — carries **no** engine source) | `govkit init` / "Use this template" |
| `.claude/workflows/` | the **`sdlc`** workflow orchestrating PRD→RFC→ADR→US→Code | project-scoped (workflows can't be bundled in a plugin) |

> **Not a starter you fork.** New projects run `govkit init` (or "Use this template" on the
> published `template/`) and **pin** govkit + **install** the plugin — they never copy the
> engine source. That is what keeps every downstream repo from drifting.

## Two trust layers

Generation is cheap; **trust is the product.** A document being well-formed — or having
been produced by an LLM — does not make it good. govkit separates the two questions:

| Layer | Command | Question | Result |
|---|---|---|---|
| **Gate** (quality *control*) | `govkit verify` | Is it well-**formed**? | binary pass/fail — blocks merge |
| **Eval** (quality *signal*) | `govkit eval` | Is it a complete, non-stub doc? | required **floor** blocks + advisory **0–100** score |
| **Reviewer** (substance *judge*) | `swe-flow:reviewer` agent | Is the reasoning **sound**? | opt-in, needs a key — **never** in no-key CI |

The gate enforces front-matter, the status lifecycle, id↔filename convention, INDEX
sync, unique ids, no placeholders, chain referential-integrity (RFC-0003),
**chain-status coherence** (RFC-0008 — a doc may not reach a terminal/shipped state while
its `parent`'s design is still undecided), and **status-conditional required sections**
(RFC-0010 — a doc at a post-implementation status, e.g. `implemented`, must carry its
as-built / deviations note, so design↔code divergence is a recorded ritual). `eval` adds a
deterministic **structural floor** that blocks CI (not an empty stub, no leftover template
filler, canonical sections as *distinct* headings) plus an **advisory score** to watch
quality trend — both no-key. Two advisory, read-only commands never affect an exit code:
`govkit report` gives a lifecycle view (done / in-flight / cleanup), and `govkit stale`
(RFC-0009) flags a doc whose `governs:` code has newer commits than the doc — a **proxy**
("code moved", not "doc wrong"), git-gated and outside the no-key floor by construction.
Where the governed docs live is configurable via `docs.root` (default `.`, RFC-0007) — set
e.g. `.govkit` to isolate kit-managed docs under one folder.

**An honest boundary** (the result of an adversarial red-team): a presence/shape rubric
*cannot* tell a real artifact from a keyword-salad with the right headings. So `eval` is
deliberately scoped as a **floor**, tuned for zero false-positive on legitimate docs and
accepting that a determined gamer passes it. Judging whether the prose is *sound* is the
swe-flow `reviewer` agent's job (opt-in, keyed, outside CI). The floor's own trust is
pinned by an **adversarial corpus** (`packages/govkit/eval/`) the test suite asserts
catches every known gaming vector while passing MADR/Nygard/terse styles.

## The invariant that shapes everything

A non-Claude-Code contributor must be able to run the governance gates in CI **with no API key**.
So both deterministic layers live **only** in the `govkit` CLI:

- **In Claude Code:** a `PreToolUse` hook (`type: command`) runs `npx govkit audit-write` to block a
  write to a governed doc that lacks complete front-matter.
- **In CI:** the *same binary* runs `npx govkit check` (→ `verify` then `eval`) — Node only, no
  Claude, no key.
- Authoring **skills** and the **`sdlc`** workflow only *author* artifacts and *call* govkit to
  validate; they never embed the gate.

## Quickstart

```bash
pnpm install
pnpm -r build          # build every package (tsup)
pnpm check             # biome + typecheck + tests + verify + eval — the one-shot gate

# run the engine against this repo (dogfood)
node packages/govkit/dist/cli.js verify   # structural gate
node packages/govkit/dist/cli.js eval     # graded quality score
```

## Toolchain

pnpm workspaces · TypeScript (strict) · [Biome](https://biomejs.dev) (lint + format) ·
[vitest](https://vitest.dev) (test) · [tsup](https://tsup.egoist.dev) (bundle). Node ≥ 20.

## Status

MVP adoptable. Both trust layers ship and run no-key in CI: `govkit verify` (front-matter,
status enum, id convention, INDEX sync, unique ids, no placeholders) and `govkit eval`
(graded rubric proven by a labeled corpus), plus `govkit init` (scaffold) and the
`audit-write` hook. The `swe-flow` plugin (goal→domain→API→data→spec-author + 3 agents)
and the `sdlc` workflow author the artifacts the engine grades. See `AGENTS.md` for the
governance this repo runs on itself. Next: publish (`npx govkit` / marketplace) and an
optional opt-in LLM-judge eval layer (RFC-0001 § Open questions).
