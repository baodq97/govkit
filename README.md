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

## The invariant that shapes everything

A non-Claude-Code contributor must be able to run the governance gates in CI **with no API key**.
So the deterministic gate lives **only** in the `govkit` CLI:

- **In Claude Code:** a `PreToolUse` hook (`type: command`) runs `npx govkit audit-write` to block a
  write that violates front-matter / status / path-permission rules.
- **In CI:** the *same binary* runs `npx govkit check` — Node only, no Claude, no key.
- Authoring **skills** and the **`sdlc`** workflow only *author* artifacts and *call* govkit to
  validate; they never embed the gate.

## Quickstart

```bash
pnpm install
pnpm -r build          # build every package (tsup)
pnpm check             # biome + typecheck + tests — the one-shot gate

# run the engine against this repo (dogfood)
node packages/govkit/dist/cli.js verify
```

## Toolchain

pnpm workspaces · TypeScript (strict) · [Biome](https://biomejs.dev) (lint + format) ·
[vitest](https://vitest.dev) (test) · [tsup](https://tsup.egoist.dev) (bundle). Node ≥ 20.

## Status

Foundation in progress. `govkit verify` (front-matter gate) is the first ported check; the
remaining `verify.sh`/`check.sh` checks, the plugin skills, and the `sdlc` workflow land
incrementally — each behind a passing test. See `AGENTS.md` for the governance this repo runs on itself.
