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
Two R7 learning-flywheel surfaces (RFC-0012), both no-key: an opt-in `--journal` flag on
`verify`/`eval`/`check` appends one JSONL gate-outcome record per run (crashed runs
included — the sensor stays honest during incidents), and `govkit calibrate` scores the
gate itself against a labeled `good/`/`weak/` corpus, failing CI on any false positive, on
recall/F1 regression, or on corpus shrinkage vs a committed baseline. This repo calibrates
its own floor in `bun run check` against `packages/govkit/eval/fixtures` (not shipped to
npm — consumers author their own corpus).
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

## Init a new repo with govkit

Three paths, depending on where you start. All of them end at the same contract:
**`govkit.yml` + the `audit-write` hook + `npx govkit check` in CI** — no engine source copied.

> **govkit is on npm** — [`govkit`](https://www.npmjs.com/package/govkit) resolves from the
> registry, so `npx --yes govkit …` works out of the box. To pin it in a consumer repo:
> ```bash
> npm i -D govkit            # or pin a line: npm i -D govkit@^0.3.0
> ```

### Path A — greenfield repo from the template (recommended)

Copy `template/` (or "Use this template" once it is published as a repo). You get the full
surface in one shot:

| You get | What it does |
|---|---|
| `govkit.yml` | the governance schema — doc dirs, required front-matter, status lifecycle, eval rubric (edit to taste) |
| `.claude/settings.json` | `PreToolUse` → `npx govkit audit-write` (blocks a bad doc write in-editor) + `SessionStart` → freshness advisory (warns when the branch is behind upstream) |
| `.claude/hooks/session-freshness.mjs` | the freshness hook itself — advisory-only, offline-safe |
| `.claude/workflows/sdlc.js` | the `sdlc` workflow PRD→RFC→ADR→US→Foundation→Code (needs the swe-flow plugin) |
| `.github/workflows/ci.yml` | `npx govkit verify` + `eval` on every push/PR — no Claude, no API key |
| `docs/{product,rfc,adr,issues}/INDEX.md` | the governed doc dirs, each with its index |
| `AGENTS.md` | the agent contract: lifecycle gates, agent constraints, authoring rules |

```bash
cp -r <govkit-monorepo>/template/. my-new-repo/ && cd my-new-repo
git init && npx govkit verify        # green on the empty scaffold
```

### Path B — bare repo, CLI scaffold

In any repo (new or existing, no governed docs yet):

```bash
npx govkit init                      # scaffolds govkit.yml + the audit-write hook
                                     # + docs/{product,rfc,adr,issues}/INDEX.md — idempotent
npx govkit init --docs-root .govkit  # optional: isolate kit-managed docs under one folder (RFC-0007)
```

`init` scaffolds only the engine surface (schema + hook + INDEXes). CI, the `sdlc`
workflow, and `AGENTS.md` are template concerns — copy them from `template/` if you want them.

### Path C — existing repo that already has design docs

Don't rewrite your docs by hand — migrate their declared metadata (RFC-0006):

```bash
npx govkit init --adopt              # DRY-RUN: shows what it would extract per file
npx govkit init --adopt --apply      # extracts prose metadata (e.g. `**Status**: X`) into
                                     # front-matter; anything NOT found is sentineled so it
                                     # still fails the gate — never asserts unverified metadata
```

Status values outside your enum come back as a suggested `govkit.yml` patch — reconcile,
then `npx govkit verify` until green.

### Then, for every path

```bash
# 1. Wire CI (template ships this; paths B/C add it):
#    .github/workflows/ci.yml → `npx --yes govkit check`   (verify + eval, exits non-zero)

# 2. Install the authoring companion (Claude Code):
claude plugin marketplace add baodq97/govkit   # the marketplace lives in this repo
claude plugin install swe-flow@govkit          # spec-author, workflow-author, working-discipline, 3 agents

# 3. Daily loop:
npx govkit verify    # structural gate (what blocks)
npx govkit eval      # quality floor + advisory 0–100 score
npx govkit report    # lifecycle view: done / in-flight / cleanup (advisory)
npx govkit stale     # docs whose `governs:` code moved on (advisory, needs git)

# 4. Learning-flywheel sensor + immune system (RFC-0012, opt-in):
npx govkit verify --journal        # append one JSONL gate-outcome record (.govkit/journal.jsonl)
npx govkit calibrate --corpus <dir> --baseline <file>
                     # score the gate itself: confusion matrix (FP/FN, precision/recall/F1)
                     # against YOUR labeled corpus — <dir> holds good/ (must pass the floor)
                     # and weak/ (must fail it); exits 1 on any FP, on recall/F1 regression,
                     # or on corpus shrinkage vs the committed baseline
```

## Quickstart (hacking on this monorepo)

```bash
bun install
bun run build          # build every package (tsup)
bun run check          # biome + typecheck + build + tests + verify + eval, then re-runs the gate under stock node (portability proof)

# run the engine against this repo (dogfood) — the shipped bundle is Node-portable,
# so the SAME dist runs identically under bun OR stock node:
bun  packages/govkit/dist/cli.js verify   # dev runtime (bun)
node packages/govkit/dist/cli.js verify   # the npx-govkit contract (stock node, no key)
```

## Toolchain

bun (install + test runner) · TypeScript (strict) · [Biome](https://biomejs.dev) (lint + format) ·
[tsup](https://tsup.egoist.dev) (bundle). **The published `govkit` artifact stays Node-portable**
(`engines.node >= 20`, `npx govkit`) — bun is the dev accelerant, **never** a runtime requirement
on consumers (ADR-0002). Node ≥ 20 is the distribution baseline.

## Status

MVP adoptable. Both trust layers ship and run no-key in CI: `govkit verify` (front-matter,
status enum, id convention, INDEX sync, unique ids, no placeholders) and `govkit eval`
(graded rubric proven by a labeled corpus), plus `govkit init` (scaffold) and the
`audit-write` hook. The `swe-flow` plugin (goal→domain→API→data→spec-author + 3 agents)
and the `sdlc` workflow author the artifacts the engine grades. See `AGENTS.md` for the
governance this repo runs on itself. Next: publish (`npx govkit` / marketplace) and an
optional opt-in LLM-judge eval layer (RFC-0001 § Open questions).
