# AGENTS.md — govkit ecosystem monorepo

> A README for coding agents. Closest `AGENTS.md` wins. User prompts override.
> This repo **dogfoods its own governance**: govkit gates the writes that build govkit.

## Layout

```
packages/govkit/   the deterministic governance CLI (TypeScript) — the engine/spine
plugins/swe-flow/  Claude Code plugin: authoring skills + agents (not a workspace package)
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
| one-shot gate | `bun run check` (biome + typecheck + build + tests + `verify` + `eval`, then re-runs under stock node) — CI runs this |
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
- **Never pipe a gate through `head`/`tail`/`grep` inside a `&&` chain** — the pipe swallows the
  failing exit code and turns a blocking gate into a no-op. Capture to a file or check
  `${PIPESTATUS[0]}`/`$?` explicitly before chaining (LEARNING-LOOP Round 12; it bit us live).
- **Never pipe `git push` output either** — a swallowed non-zero exit turned a failed push into
  an empty-diff PR that merged clean (Distill Round 1: PR #6/#7). When the push outcome matters,
  confirm the remote ref actually moved (`git ls-remote origin <ref>`).
- **`git fetch` before any `checkout -B <branch> origin/<ref>`** — a stale remote-tracking ref
  silently rebases new work onto history main has already left behind (Distill Round 1).
- **Cross-cutting rename/vocab change:** before the first edit, produce an exhaustive
  symbol/call-site inventory (grep/codegraph) and state the count. The rename lands as ONE
  coherent change set — intermediate states are expected not to compile — and verifies with the
  FULL test suite, never scoped.
- **Act-on-green is conditional:** `bun run check && <push/flip/publish>` in one chain — a
  captured-but-unchecked exit code is as good as no gate (Round 17 F9).
- **Reconcile-as-you-go:** editing a file under any governed doc's `governs:` updates that
  doc's as-built/reconciled in the same change, or hands the ack to the owner explicitly —
  drift found at close-time is an accumulation failure (Round 17).

## Agent constraints (cross-cutting)

These are **honor-system** rules (RFC-0012), not gate-enforced. A stateless, no-git gate cannot see
a status transition — a doc born at `accepted` passes `verify`+`eval` clean. The control is commit
discipline (draft commit first, then a separate owner-authorized accept commit) + the human accept +
the keyed reviewer. The per-write hook only *nudges* on a born-at-non-`startStatus` Write; it never
blocks one. So these bind because you follow them, not because the engine stops you:

- Never self-assign an owner (`owner: TBD`; propose in the PR body).
- Never self-flip a `status:` field; propose the target, the human doc owner flips it.
- Never self-approve, self-merge, or act as code owner.
- Halt at a Lifecycle threshold when the required artifact is missing — do not invent it.

## The minimalism ladder (before writing ANY code)

Walk it top-down for every piece of code you are about to write; stop at the first rung
that answers. The best code is the code never written — but never minimize away trust
boundaries, data-loss handling, security, or accessibility.

1. Does this need to exist?   → no: skip it (YAGNI)
2. Already in this codebase?  → reuse it, don't rewrite
3. Stdlib does it?            → use it
4. Native platform feature?   → use it
5. Installed dependency?      → use it
6. One line?                  → one line
7. Only then: the minimum that works

Same spirit everywhere (KISS): the boring, obvious solution wins by default — cleverness,
abstraction, and configurability must each earn their place with a concrete, present need
(YAGNI), and anything that already exists once is reused, never re-implemented (DRY).

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
