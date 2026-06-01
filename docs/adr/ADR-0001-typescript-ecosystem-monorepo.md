---
id: ADR-0001
title: Full-TypeScript ecosystem monorepo for govkit + swe-flow + template
status: proposed
owner: TBD
date: 2026-05-31
governs:
  - pnpm-workspace.yaml
  - biome.json
  - packages/govkit/tsconfig.json
---

> Seed decision recorded as `proposed` (an arch/runtime decision; root `AGENTS.md`
> § Lifecycle). The owner flips it to `accepted` on consensus — never an agent.
> The direction (one monorepo, TypeScript) was set by the repo owner in the
> 2026-05-31 session.

## Context

govkit (the deterministic governance engine), the `swe-flow` Claude Code plugin (LLM
authoring), a consumer `template/` surface, and the `sdlc` workflow form one system. An
earlier attempt kept the governance scripts in two repos and they went **byte-identical
copies that silently drifted** (verified by sha256). We also evaluated implementing the
engine in Python (uv). Two questions: one repo or many, and which language.

## Decision

1. **One ecosystem monorepo.** govkit, the plugin, the template surface, and the workflow
   co-evolve here so a schema change + the skill that reads it + the doc that declares it
   land in **one commit** — drift becomes structurally impossible. The repo dogfoods its
   own governance. Distribution stays per-channel: govkit → npm, plugin → marketplace
   (git-subdir), template → `govkit init` / "Use this template". Consumers **pin/install**,
   they do not fork the engine source.
2. **Full TypeScript.** The whole Claude Code surface (workflow scripts, plugin tooling) is
   JS/TS; a TS engine makes the monorepo one language and lets the CLI, hooks, and workflow
   share code. `npx govkit` preserves the load-bearing invariant exactly as `uvx` would —
   deterministic, cross-platform, **no API key** — and Node is ubiquitous in this audience.
   Toolchain: pnpm workspaces · TypeScript (strict) · Biome (lint+format) · vitest · tsup.

## Alternatives

| Option | Why rejected |
|---|---|
| Multi-repo (engine / plugin / template separate) | Re-introduces the cross-repo drift this effort exists to kill; needs a compatibility matrix for a solo maintainer. |
| Python (uv) engine | Splits the monorepo into two languages (py engine + js workflows); no benefit over TS for a Claude-Code-native tool, which is JS/TS end to end. |
| Conflate the monorepo with the per-project starter | Consumers would inherit engine source and re-create drift downstream. Hence the separate `template/` surface. |

## Consequences

- **Positive:** atomic cross-cutting changes; one CI (`pnpm check`); trivial dogfooding; one
  toolchain. The no-API-key gate invariant is unchanged (`npx govkit check` in CI).
- **Negative (accepted):** a mixed-asset repo (TS packages + non-Node `plugins/`,
  `template/`); per-package release trains (npm vs marketplace). Bash→TS port carries
  parity risk — mitigated by golden tests before retiring any legacy check.
- **Neutral:** the reference example (`examples/`) is deferred; when added it will be TS.
