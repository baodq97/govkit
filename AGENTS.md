# AGENTS.md — govkit ecosystem monorepo

> A README for coding agents. Closest `AGENTS.md` wins. User prompts override.
> This repo **dogfoods its own governance**: govkit gates the writes that build govkit.

## Layout

```
packages/govkit/   the deterministic governance CLI (TypeScript) — the engine/spine
plugins/swe-flow/  Claude Code plugin: authoring skills + agents (not a pnpm package)
template/          consumer scaffold surface — pins govkit + installs plugin, NO engine source
.claude/
  workflows/       the `sdlc` workflow (PRD→RFC→ADR→US→Code); project-scoped
  agents/          dev-time agents (NOTE: NOT dispatchable from workflows — see § Agents)
docs/              PRD / RFC / ADR / issues (US) / runbooks — governed by govkit
govkit.yml         the pluggable schema: doc dirs + required front-matter + status
                   lifecycle (`statuses:`) + id convention (`idPrefix:`) + quality
                   rubric (`eval:`)
```

Doc chain: `PRD → RFC → ADR → Issue (US) → Code`.

**Two trust layers (both deterministic, no API key).** `verify` is the structural
**gate** (front-matter, status enum, id convention, INDEX sync, unique ids, no
placeholders) — binary, blocks merge. `eval` is the graded quality **trust signal**
(0–100 vs the `eval:` rubric) — *eval is the source of trust; a passing gate only
means well-formed.* The eval's own correctness is proven by the labeled
`packages/govkit/eval/fixtures/{good,weak}/` corpus (see RFC-0001).

## Commands

Toolchain: **pnpm + TypeScript + Biome + vitest + tsup**, Node ≥ 20. Never hand-edit `dist/`.

| Task | Cmd |
|---|---|
| install | `pnpm install` |
| build | `pnpm -r build` (per-pkg: `pnpm --filter govkit build`) |
| lint | `pnpm lint` (`biome check .`) · format: `pnpm format` |
| typecheck | `pnpm -r typecheck` |
| test | `pnpm -r test` (per-pkg: `pnpm --filter govkit test`) |
| one-shot gate | `pnpm check` (biome + typecheck + tests + `verify` + `eval`) — CI runs this |
| run engine | `node packages/govkit/dist/cli.js verify` (gate) · `… eval` (graded quality) |

## Lifecycle — gates by change class

Pick the highest-matching row; that gate plus every lighter one applies.

| Change class | Gate (besides Issue/PR) |
|---|---|
| Bugfix / copy / refactor <200 LoC | — |
| New feature or public-API change (a CLI flag, a skill, a plugin export) | RFC accepted **before** code |
| Arch / vendor / runtime decision | ADR `proposed` before code, `accepted` on consensus |
| Revenue / legal / compliance | PRD approved **before** RFC |

A <200 LoC diff at a **system boundary** (the gate logic, the hook protocol, the front-matter
schema) classifies one class higher. When in doubt, classify up.

## The load-bearing invariant

Both deterministic layers (`verify` gate + `eval` quality score) live **only** in the
`govkit` CLI and run with **no API key**:
- Hooks that enforce are `type: command` only — never `type: prompt`/`type: agent` (those need the model).
- CI runs the same binary (`govkit check` → `verify` then `eval`). A non-Claude contributor is gated identically.
- Skills/workflows **author** and **call** govkit; they never reimplement the gate or the eval.
- Any future LLM-judge eval is a separate **opt-in** layer — it must never enter the no-key CI path (RFC-0001).

## Agents (important constraint, verified empirically)

The Claude Code **workflow runtime cannot dispatch project `.claude/agents/`** — only built-in
agents and **plugin-namespaced** agents. So the implementer / reviewer / doc-keeper agents must
ship as **plugin agents** (`swe-flow:implementer`, …) to be usable from the `sdlc` workflow.
`.claude/agents/` here are for interactive (Agent-tool) use only.

## Coding rules

- Match neighbouring style. Mimic before invent.
- **No new dependency** without an RFC or a PR note (state why; prefer Node built-ins).
- Comments explain **why**, not what.
- **No silent catch.** Log with context, rethrow wrapped, or suppress explicitly with a one-line
  reason. Cross-platform care: handle CRLF — Windows checkouts are first-class.
- Generated/bundled files (`dist/**`) — edit source, then `build`.

## Agent constraints (cross-cutting)

- Never self-assign an owner (`owner: TBD`; propose in the PR body).
- Never self-flip a `status:` field; propose the target, the human doc owner flips it.
- Never self-approve, self-merge, or act as code owner.
- Halt at a Lifecycle threshold when the required artifact is missing — do not invent it.

## Workflow per task

1. **Understand** — read this file + nearest sub-tree `AGENTS.md` + existing tests.
2. **Plan** — if above a Lifecycle threshold, halt and surface it.
3. **Implement** — match neighbour conventions.
4. **Verify** — `pnpm lint` + `pnpm -r typecheck` + scoped `pnpm -r test`; at least one test
   exercises the shipped CLI surface as a consumer would.
5. **Document** — README note for any public behavior change; INDEX row for any new doc artifact.
6. **Open PR** — link Issue + required artifacts; hand off to the code owner.
