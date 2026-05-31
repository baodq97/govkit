# swe-flow

The LLM **authoring** companion to the [`govkit`](../../packages/govkit) governance engine.
Skills author governed SDLC artifacts; agents fan out, review, and keep docs in sync.
Everything **calls** `npx govkit verify` to validate — nothing embeds the deterministic gate
(that stays in govkit, runnable in CI with no API key).

## Components

**Skills — the SDLC chain** (`goal → domain → API → data → governed artifact`):

- **`skills/goal-define`** — structure a clear, verifiable goal from rough input.
- **`skills/domain-decompose`** — DDD: prose → bounded contexts, aggregates, entities, value
  objects, events → `docs/domain` (delta-merge on re-run).
- **`skills/api-designer`** — domain → OpenAPI 3.1 contract → `docs/api`.
- **`skills/data-model`** — domain → relational schema (+ PostgreSQL projection) → `docs/data`;
  forward or audit mode.
- **`skills/spec-author`** — turn design output into a governed **PRD / RFC / ADR / US** with
  correct front-matter + INDEX row, then self-validate via `npx govkit verify`. Discovers doc
  dirs + required keys from the consumer's `govkit.yml`.

**Skill — the orchestration layer:**

- **`skills/workflow-author`** — scaffold a reusable, deterministic **dynamic workflow**
  (`.claude/workflows/<name>.js`) from a description of a repeatable process. Composes the
  **existing** swe-flow agents + `npx govkit verify` into one of three proven shapes (pipeline
  review→verify · fan-out in dependency waves · loop-until-done), embeds a mandatory manual
  fallback, and validates the result with `node --check`. *Authors orchestration that composes
  what exists — it never generates new agents or teams.* Lets any team build their own governed
  flow instead of copy-editing `sdlc.js`.

**Agents** (plugin-namespaced — usable from the `sdlc` workflow):

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
