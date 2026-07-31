# AGENTS.md — govkit ecosystem monorepo

> A README for coding agents. Closest `AGENTS.md` wins. User prompts override.
> This repo **dogfoods its own governance**: govkit gates the writes that build govkit.

## Layout

```
packages/govkit/     the deterministic governance CLI (TypeScript) — the engine/spine
plugins/swe-flow/    Claude Code plugin: the chain — authoring skills + role agents
plugins/ddd-flow/    Claude Code plugin: the DDD modelling loop  → docs/domain/
plugins/design-flow/ Claude Code plugin: the experience-design loop → docs/ui/
                     (none are workspace packages; they meet at ARTIFACTS, never imports)
template/            consumer scaffold surface — pins govkit + installs the three plugins,
                     NO engine source
examples/            worked end-to-end example (euro-parking) all three plugins produced
.claude/
  workflows/         the `sdlc` workflow (PRD→RFC→ADR→US→Code); project-scoped
  agents/            dev-time agents (NOTE: NOT dispatchable from workflows — see § Agents)
  rules/             path-scoped rule files — a `paths:` glob lazy-loads each only when the
                     session touches a matching file; the mechanical code-change rules live here
docs/                PRD / RFC / ADR / issues (US) / runbooks — governed by govkit
                     the-flow.md (consumer walkthrough) + design-rationale.md (why) are not
govkit.yml         the pluggable schema: doc dirs + required front-matter + status
                   lifecycle (`statuses:`) + id convention (`idPrefix:`) + quality
                   rubric (`eval:`)
```

Doc chain: `PRD → RFC → ADR → Issue (US) → Code`.

**Trust layers (see RFC-0001).** `verify` = structural **gate** (front-matter, status
enum, id convention, INDEX sync, unique ids, no placeholders) — binary, blocks merge.
`eval` = a deterministic **required floor** (not a stub, no filler, distinct canonical
sections) that blocks CI **plus an advisory 0–100 score** to watch trend. Both no-key.
An adversarial red-team proved a presence rubric cannot judge *substance* — so `eval`
is scoped as a zero-FP floor (a gamer can pass it), and **substance judgment is the
swe-flow `judge` agent + `substance-judge` skill** (RFC-0019: pinned anchors, opt-in,
keyed, never in no-key CI). The floor's own trust is pinned by the adversarial corpus +
`eval-hardening.test.ts`.

## Commands

Toolchain: **bun (install + test) + TypeScript + Biome + tsup**, Node ≥ 20 — the published
artifact stays Node-portable (ADR-0002). Never hand-edit `dist/`.

| Task | Cmd |
|---|---|
| install | `bun install` |
| build | `bun run build` (per-pkg: `bun run --filter govkit build`) |
| lint | `bun run lint` (`biome check .`) · format: `bun run format` |
| typecheck | `bun run typecheck` |
| test | `bun run test` (`bun test`) |
| one-shot gate | `bun run check` (check-sync + skill-lint + biome + typecheck + build + tests + `verify` + `eval` + calibrate + drift + ledger, re-run under stock node) — CI runs this |
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

## Agent constraints (cross-cutting)

These are **honor-system** rules (RFC-0024), not gate-enforced. A stateless, no-git gate cannot see
a status transition — a doc born at `accepted` passes `verify`+`eval` clean. The control is commit
discipline (draft commit first, then a separate owner-authorized accept commit) + the human accept +
the keyed reviewer. The per-write hook only *nudges* on a born-at-non-`startStatus` Write; it never
blocks one. So these bind because you follow them, not because the engine stops you:

- **The authority split is main-agent vs sub-agent, not human vs AI** (owner-ratified
  2026-07-28, superseding the older never-self-flip rule). The MAIN agent — the session lead
  the owner talks to directly — holds the owner's delegated authority: it may flip statuses,
  assign owners, and merge, under the tier conditions below. SUB-AGENTS — anything dispatched
  (Agent-tool agents, workflow agents, skill subagents) — **never** flip a `status:`, never
  assign an owner, never merge: they PROPOSE in their report and the main agent (or the human)
  applies. This keeps one auditable actor per session; a flip buried in a subagent transcript
  is invisible provenance.
- Main-agent tier conditions: **R2** needs no ceremony. **R1** requires ALL of: the full gate
  green (`bun run check`), a gate-loop packet for this slice, the packet's red-team verdict in
  `flip-as-is` / `flip-after-reconcile` (reconcile applied first), and the flip commit citing
  **both** the packet run id and the policy (`govkit.yml @ <sha>`). **R0** (one-way doors,
  including any edit to the `ratification:` block) requires the owner's explicit in-session
  direction, cited in the commit — the main agent acts on that direction without a fresh
  per-act ask, but never invents it. The canonical R0/R1/R2 transition lists live in
  `govkit.yml` `ratification:` — read them there; this file deliberately does not restate them.
- Owner assignment names a HUMAN (the accountable person), never the agent itself.
- Halt at a Lifecycle threshold when the required artifact is missing — do not invent it.
- **Act-on-green is conditional:** `bun run check && <push/merge/flip/publish>` in one chain — a
  captured-but-unchecked exit code is as good as no gate (Round 17 F9). A MERGE is an act like
  any other: two merges landed on main with the full gate red (drift journaled `ok: false` at
  09:18 before either landed), and six un-acked drifted docs plus a red lint corpus accumulated
  behind them — the R0 `merge` act rides the same green (Round 22).

## Workflow per task

1. **Understand** — read this file + nearest sub-tree `AGENTS.md` + existing tests.
2. **Plan** — if above a Lifecycle threshold, halt and surface it.
3. **Implement** — walk the minimalism ladder first; match neighbour conventions.
4. **Verify** — `bun run lint` + `bun run typecheck` + scoped `bun run test`; at least one test
   exercises the shipped CLI surface as a consumer would. **Exception:** for a rename/vocab
   cross-cutting change, do not trust a scoped run mid-task — run the FULL `bun run test`; a
   renamed sibling dir can be green in isolation while the branch is red. (The lead's
   `bun run check` at integration is always full-suite regardless.)
5. **Document** — README note for any public behavior change; INDEX row for any new doc artifact.
6. **Open PR** — link Issue + required artifacts; hand off to the code owner.
