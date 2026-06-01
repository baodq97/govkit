---
id: ADR-0002
title: Bun for the dev toolchain; the published govkit artifact stays Node-portable
status: accepted
owner: baodq97
date: 2026-06-01
parent: ADR-0001
governs:
  - bunfig.toml
---

> Seed decision recorded as `proposed` (an arch/runtime decision; root `AGENTS.md`
> § Lifecycle). The owner flips it to `accepted` on consensus — never an agent.
> The direction (move dev tooling to bun, keep the shipped CLI Node-portable) was
> set by the repo owner in the 2026-06-01 session. This **amends one sub-decision**
> of ADR-0001 (the toolchain/runtime line); ADR-0001's other two pillars —
> *one ecosystem monorepo* and *full TypeScript* — stand unchanged.

## Context

ADR-0001 fixed the toolchain as **pnpm workspaces · Node ≥ 20 · vitest · tsup · Biome**.
The owner wants to move the repo to [bun](https://bun.sh) "instead of nodejs". That request
collides with the single most load-bearing property of the product, so the decision is not
"bun yes/no" — it is *which layer bun touches*.

govkit's entire value proposition (README, *"The invariant that shapes everything"*) is that
a non-Claude-Code contributor runs the gates in CI **with no API key and nothing to install
but Node** — `npx govkit check`, Node-only, the universal CI baseline. The swe-flow plugin's
three agents, the `sdlc` workflow, the `audit-write` PreToolUse hook, and every downstream
`template/` consumer all invoke `npx govkit …` / `node …/cli.js`. If the *published* artifact
required bun at runtime, every consumer's CI would have to install bun first — the zero-install/
Node-only invariant, which is the product, would break.

But "bun instead of node" is **not monolithic**. It is four separable swaps with very
different blast radius:

| Swap | From → To | Blast radius |
|---|---|---|
| Package manager | `pnpm install` / workspaces → `bun install` | Internal; `--filter` → `--filter`/`--cwd` semantics differ, lockfile changes |
| Test runner | `vitest` → `bun test` | Internal; mostly Jest/vitest-compatible, must verify the `execFileSync` + temp-git fixtures pass |
| Bundler | `tsup` → `bun build` | Produces the **product-critical** `dist/cli.js`; proven today |
| **Runtime** | `node …/cli.js` → bun-only | **External** — the published contract; the invariant lives here |

Biome is a runtime-agnostic Rust binary and is **untouched** by any of these.

## Decision

1. **Adopt bun for the DEV toolchain.** `bun install` replaces pnpm for install + workspaces;
   `bun test` replaces vitest as the local/CI test runner; `bun` runs the repo's own scripts.
   These are internal to this monorepo and reversible.

2. **Keep `tsup` as the bundler for now.** It produces the shipped `dist/cli.js` and is proven;
   swapping it is a separable, lower-value follow-up (its own ADR amendment) and is explicitly
   **not** bundled into this decision. `bun build` may replace it later once parity is golden-tested.

3. **The PUBLISHED artifact stays Node-portable.** `packages/govkit` keeps `engines.node >= 20`,
   ships bundled portable ESM that **both `node` and `bun` execute**, and is distributed via npm
   as `npx govkit`. The `audit-write` hook keeps invoking `node …/cli.js`. The no-key/zero-install/
   Node-only CI invariant is therefore preserved **exactly** — bun is a dev accelerant, never a
   runtime requirement imposed on consumers.

4. **CI runs the gate under both runtimes.** The release job additionally executes
   `node packages/govkit/dist/cli.js check` to *prove* the shipped bundle still runs on stock Node —
   the portability claim becomes a tested assertion, not a hope.

## Alternatives

| Option | Why rejected |
|---|---|
| **Bun-only published runtime** (govkit requires bun to run) | Breaks the README's load-bearing invariant: every downstream CI would have to install bun, killing zero-install/Node-only. The product's whole differentiator is "runs in any CI with just Node." Highest blast radius, hardest to reverse. |
| **`bun build --compile` → standalone per-platform binaries** | Makes zero-install *stronger* (no node OR bun needed downstream) but trades away npm distribution, `npx govkit`, version-pinning via `package.json`, and the plugin's `npx govkit verify` calls — replacing them with a release-binary + platform-matrix model. A real future option, but a different product shape; not v1. |
| **Stay on pnpm + Node entirely** | Forgoes bun's install/test speed and the DX the owner asked for, for no invariant benefit — the dev layer is reversible and risk-bounded, so there is no reason to refuse it. |
| **Supersede ADR-0001 wholesale** | Over-states the change: TS + monorepo are unchanged. Amending one sub-decision keeps the chain-coherence story honest (ADR-0001 stays the record for the two pillars that stand). |

## Consequences

- **Positive:** faster installs + test runs locally and in CI; the published contract is
  *unchanged*, so consumers, the plugin, the hook, and `template/` are untouched; the
  portability claim is now CI-enforced (Decision §4).
- **Negative (accepted):** a second toolchain to keep working on **Windows specifically** —
  bun-on-Windows is younger than Node and is this repo's primary dev platform, so the migration
  must verify the temp-git/`execFileSync` test fixtures and the `--filter` build scripts pass on
  win32 before pnpm is retired. Two lockfile/runtime stories until (and if) tsup is also replaced.
- **Dogfood (the reason this is an ADR, not a silent toolchain edit):** the migration edits
  `pnpm-workspace.yaml`, which **ADR-0001 governs** — so `govkit stale` will flag ADR-0001 the
  moment the toolchain moves, and removing `pnpm-workspace.yaml` sends that `governs` entry
  **dangling** (the surfaced-not-silent case RFC-0009 §3 exists for). This decision is the first
  live exercise of RFC-0008/0009/0010 on the repo's own toolchain change: it is recorded as a
  decision, it amends rather than supersedes (keeping chain coherence truthful), and on
  implementation ADR-0001's `governs` must be reconciled to the new toolchain files (e.g.
  `bunfig.toml`) — not left dangling.
- **Neutral:** if `bun build` later replaces tsup, that is a follow-on amendment with its own
  golden-parity gate; this ADR deliberately does not pre-decide it.

## As-built (2026-06-01)

The migration shipped in one commit. What matched the design: dev toolchain moved to bun
(`bun install` with workspaces relocated to `package.json`; `bun test` replacing vitest across
12 files; every script via `bun run --filter '*'`); tsup kept; Biome untouched; the published
artifact unchanged (`engines.node>=20`, bundled ESM, `npx`, `node`-invoked hook). `bun run check`
now runs the shipped `dist` under **both** bun and stock node — both emit identical
`verify OK / eval 100/100`, so Node-portability is a tested assertion. `govkit stale` after the
governs reconciliation ran clean — **0 dangling, all declaring docs fresh** (ADR-0001 dropped the
removed `pnpm-workspace.yaml`; ADR-0002 governs `bunfig.toml`); adoption has since broadened, so run
`govkit stale` for the live count. Suite at the time of writing: `bun test` green, 0 fail (it grows as tests are added).

## Deviations from design

- **Unanticipated TS type wiring (the real surprise).** The design said nothing about types. In
  practice `tsc --noEmit` could not resolve `import … from "bun:test"`, so the build needed a
  `@types/bun` devDep **and** a per-package `types: ["node","bun"]` override (the base's `["node"]`
  *replaces*, not merges). This is a **test-time** type convenience only — the shipped `src/` still
  uses solely `node:` APIs, so the portability invariant is intact — but it is a real divergence the
  one-line "vitest → bun test" framing hid.
- **Biome import re-sort.** Swapping `from "vitest"` → `from "bun:test"` reordered imports (`bun:`
  sorts before `node:`); 12 files were auto-fixed. Mechanical, but it means the test files carry a
  bun-specific lexical footprint now.
- **CI is written but UNPROVEN.** `oven-sh/setup-bun` + the dual-runtime steps exist; they have not
  run on GitHub Actions. "Green" is observed only on local win32 — the ubuntu CI claim is still a
  hope until a push. (Open follow-up, not closed by this ADR.)
- **The npm-published contract — proof run, and it caught an overstated claim (resolved).** The
  first as-built said "`node dist/cli.js` proves the bundle runs Node-only." A local `npm pack` →
  extract → run-under-stock-node proof showed that was **only true because the repo's `node_modules`
  happened to contain `yaml`**: the shipped tarball alone failed with `ERR_MODULE_NOT_FOUND: yaml`
  (tsup left the one runtime dep external). Fix: `noExternal: ["yaml"]` bundles it into the single
  file, `yaml` moved to `devDependencies` (consumers install nothing), and a `createRequire` banner
  resolves yaml's CJS `require("process")` under ESM. The packed artifact now runs **standalone under
  stock node with zero `node_modules`** (`check` → verify OK / eval 100/100) — the zero-install
  invariant is now literally true, not ambiently true. The full `npx`-on-a-remote-clean-machine run
  is still deferred (local-only by request), but the offline-tarball proof closes the substantive gap.
- **Scope held:** tsup was NOT replaced (as designed); "fully bun" is deliberately false — the
  bundler remains a node tool. No deviation, recorded so the as-built is not mistaken for "all bun".
