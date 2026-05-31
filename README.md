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
| **Eval** (quality *trust signal*) | `govkit eval` | Does it carry real **substance**? | graded 0–100 vs a rubric |

The gate enforces front-matter, the status lifecycle, id↔filename convention, INDEX
sync, unique ids, and no placeholders. The eval grades each artifact against a
**pluggable rubric** in `govkit.yml` (`eval:`) — e.g. *PRD has a numeric KPI*, *RFC has
alternatives + open questions*, *US has testable acceptance criteria*. Both are
deterministic and need **no API key**. *Eval is the source of trust:* its own
correctness is proven by a labeled `good/`+`weak/` corpus the test suite asserts the
rubric discriminates.

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
