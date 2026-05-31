# swe-flow

The LLM **authoring** companion to the [`govkit`](../../packages/govkit) governance engine.
Skills author governed SDLC artifacts; agents fan out, review, and keep docs in sync.
Everything **calls** `npx govkit verify` to validate — nothing embeds the deterministic gate
(that stays in govkit, runnable in CI with no API key).

## Components

- **`skills/spec-author`** — author a PRD / RFC / ADR / US from design output (`docs/domain`,
  `docs/api`, `docs/data`) with correct front-matter + INDEX row, then self-validate via
  `npx govkit verify`. Discovers doc dirs + required keys from the consumer's `govkit.yml`.
- **`agents/implementer`** — write-only fan-out member; builds one file-disjoint work package
  from a task contract. Never runs build/git/govkit (the lead integrates).
- **`agents/reviewer`** — read-only governance review → `APPROVE` / `SHIP-WITH-CAVEATS` / `BLOCK`.
- **`agents/doc-keeper`** — keeps front-matter + INDEX in sync; proposes status flips and owner
  assignments, never applies them.

> Agents ship as **plugin** agents (dispatchable as `swe-flow:implementer`, `swe-flow:reviewer`,
> `swe-flow:doc-keeper`). Project `.claude/agents/` are **not** dispatchable from a workflow —
> verified empirically — so the plugin form is required for the `sdlc` workflow to use them.

## Install

This repo is its own marketplace (`.claude-plugin/marketplace.json`).

- **Local dev:** `claude plugin marketplace add <path-to-this-repo>` → `claude plugin install swe-flow`.
- **From git:** add the marketplace by repo URL; `swe-flow` is sourced via `git-subdir` at
  `plugins/swe-flow`.
