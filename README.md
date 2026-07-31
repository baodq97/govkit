# govkit

> **Governance you can run, not just read.** A docs-as-code SDLC governance engine
> for the AI-agent era — deterministic, cross-platform, zero-install.

Your PRD, RFC, ADR, and user stories become artifacts a program can check: correct
front-matter, a real status lifecycle, references that resolve, an index that stays in sync.
The checks run in your editor as you write and in CI on every PR — **with no API key**, so a
contributor who has never opened Claude Code still passes the same gate you do.

Three Claude Code plugins author those artifacts; the engine grades them. The two halves are
deliberately separate — the thing that writes the document is never the thing that approves it.

## Start here

**→ [The flow: one feature, start to finish](./docs/the-flow.md)** — what you type, in what
order, and what appears on disk. Read that page before this one if you plan to actually use
govkit.

## Install

govkit is on npm — [`govkit`](https://www.npmjs.com/package/govkit) resolves from the registry,
so `npx --yes govkit …` works with nothing installed.

**Any repo, new or existing:**

```bash
npx govkit init                  # govkit.yml + AGENTS.md + the write-time hook + docs/*/INDEX.md — idempotent
npx govkit verify                # green on a fresh scaffold; this is what CI will run
```

**A repo that already has design docs** — don't rewrite them by hand:

```bash
npx govkit init --adopt          # dry run: shows what metadata it would extract per file
npx govkit init --adopt --apply  # extracts prose metadata (e.g. `**Status**: X`) into front-matter
```

Anything it cannot find is sentineled so it still fails the gate — govkit never asserts
metadata it did not actually read. Status values outside your enum come back as a suggested
`govkit.yml` patch. In Claude Code, `/swe-flow:govkit-adopt` drives this whole migration for you.

**A greenfield repo, full surface in one shot** — copy `template/` (or "Use this template"
once published). You get `govkit.yml`, the hooks, the `sdlc` and gate-loop workflows, a CI
workflow, the governed doc dirs, and an `AGENTS.md` contract.

**Then wire CI and the authoring plugins:**

```bash
# CI — .github/workflows/ci.yml (the template ships this):
#   npx --yes govkit check        → verify + eval, exits non-zero, no Claude, no key

# Claude Code — the authoring layer:
claude plugin marketplace add baodq97/govkit
claude plugin install swe-flow@govkit      # the chain: PRD → RFC → ADR → US → code
claude plugin install ddd-flow@govkit      # the domain model  → docs/domain/
claude plugin install design-flow@govkit   # the UI + prototype → docs/ui/
```

## The flow, in one screen

| Step | You run | You get |
|---|---|---|
| Requirements | `/swe-flow:spec-author` | `docs/product/` — a governed PRD |
| Domain model | `/ddd-flow:design` · `/ddd-flow:view` | `docs/domain/` — contexts, aggregates, events |
| UI design | `/design-flow:ui-designer` · `/design-flow:view` | `docs/ui/` — brief, tokens, an openable prototype |
| Technical design | `/swe-flow:api-designer` · `/swe-flow:data-model` · the architect agent | `docs/api/`, `docs/data/`, `docs/rfc/`, `docs/adr/` |
| Slicing | `/swe-flow:work-breakdown` | `docs/issues/` — independently shippable stories |
| Build | test-author → implementer agents | code, with a failing test written first |
| Gate | `npx govkit check` + reviewer / red-teamer / verifier agents | pass, or a specific reason |
| Close | `/swe-flow:gate-close` | `docs/releases/` — one owner-decision packet |
| Learn | `/swe-flow:distill-learnings` | proposed rule changes, from what the gate caught |

Domain model and UI design are siblings, not a sequence — both read the PRD. Most changes run
only part of this chain; [the flow](./docs/the-flow.md) has the short paths.

## Commands

**Daily:**

```bash
npx govkit verify        # the structural gate — this is what blocks
npx govkit eval          # quality floor (blocks) + advisory 0–100 score (never blocks)
npx govkit check         # both, in order — what CI runs
npx govkit report        # lifecycle view: done / in-flight / cleanup (advisory)
npx govkit report --aging   # + time-in-status from git blame, with per-type thresholds
npx govkit stale         # docs whose `governs:` code has moved on (advisory, needs git)
```

**Opt-in, when you want them:**

```bash
npx govkit check --hook  # gate failure → exit 2 + a report on stderr, for wiring as a blocking
                         # agent-loop hook (the template ships a Stop hook doing this)
npx govkit drift         # fails when governed CONTENT moved past its recorded claim
npx govkit drift --ack   # re-vouch for it — an explicit, recorded ritual
npx govkit ledger        # gate a committed docs/ledger.json: schema, unique ids, append-only
npx govkit verify --journal          # append one JSONL gate-outcome record per run
npx govkit calibrate --corpus <dir> --baseline <file>
                         # score the gate itself against YOUR labeled good/ and weak/ corpus;
                         # exits 1 on any false positive, on recall/F1 regression, or on
                         # corpus shrinkage vs the committed baseline
```

## What blocks, what only warns

Knowing which is which is what makes a gate worth keeping:

- **`verify` blocks.** Malformed front-matter, an illegal status, a broken reference, an index
  out of sync. If it fails, something really is wrong.
- **`eval` has a small blocking floor** — not an empty stub, no leftover template filler — and
  an **advisory score** that never blocks. The score is a trend, not a target.
- **`report`, `stale`, `aging` never block.** They are situational awareness.
- **Whether the prose is any good** is judgment. That lives with the reviewer, the opt-in keyed
  judge, and you — govkit does not pretend a rubric can decide it.

The reasoning behind all of this — including the red-team result that shaped the eval layer's
scope — is in **[docs/design-rationale.md](./docs/design-rationale.md)**.

## Working on govkit itself

This is the ecosystem monorepo: the engine (`packages/govkit/`), the three plugins
(`plugins/`), the consumer scaffold (`template/`), and the workflows co-evolve here so they
cannot drift apart. See [design-rationale](./docs/design-rationale.md#the-monorepo-exists-so-five-things-cannot-drift)
for what lives where and why.

```bash
bun install
bun run build          # build every package (tsup)
bun run check          # the FULL gate: check-sync + skill-lint + biome + typecheck + build +
                       # tests + verify + eval + calibrate + drift + ledger, re-run under stock
                       # node as a portability proof

# dogfood — the shipped bundle is Node-portable, so the SAME dist runs under bun OR node:
bun  packages/govkit/dist/cli.js verify   # dev runtime
node packages/govkit/dist/cli.js verify   # the npx-govkit contract (stock node, no key)
```

**Toolchain:** bun (install + test runner) · TypeScript (strict) ·
[Biome](https://biomejs.dev) (lint + format) · [tsup](https://tsup.egoist.dev) (bundle).
The published artifact stays Node-portable (`engines.node >= 20`); bun is never a runtime
requirement on consumers (ADR-0002). Node ≥ 20 is the distribution baseline.

`AGENTS.md` is the governance this repo runs on itself — the same contract the template ships.

## Status

**MVP adoptable.** Both deterministic trust layers ship and run no-key in CI, alongside
`govkit init` and the write-time hook. The three plugins and the `sdlc` workflow author the
artifacts the engine grades. Shipped since this section was first written: npm publish, the
marketplace, the opt-in keyed judge layer, and the design-flow plugin.

The honest frontier, per `docs/ledger.json`: an external consumer outside the author's own
projects (`F-R1-N3`), and npm provenance once the repo goes public (`F-R0-PROVENANCE`).
