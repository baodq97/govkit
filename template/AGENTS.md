# AGENTS.md

> A README for coding agents. Closest `AGENTS.md` wins. User prompts override.
> Governance is enforced by **govkit** (`npx govkit verify`) — in-editor (hook) and in CI.

## Doc chain

`PRD → RFC → ADR → Issue (US) → Code`. Artifacts live under the dirs declared in `govkit.yml`
(`docs/product`, `docs/rfc`, `docs/adr`, `docs/issues`, plus `docs/domain` for the ddd-flow
design tree and `docs/releases` for release records). Each carries front-matter
(`id, title, status, owner, date`) and a row in its `INDEX.md`.

## Lifecycle — gates by change class

Pick the highest-matching row; that gate plus every lighter one applies.

| Change class | Gate (besides Issue/PR) |
|---|---|
| Bugfix / copy / refactor <200 LoC | — |
| New feature or public-API change | RFC accepted **before** code |
| Arch / vendor / runtime decision | ADR `proposed` before code, `accepted` on consensus |
| Revenue / legal / compliance | PRD approved **before** RFC |

A <200 LoC diff at a **system boundary** (auth, crypto, retry/timeout, IO contract, public
schema) classifies one class higher. When in doubt, classify up.

## Authoring

Use the **swe-flow** plugin's `spec-author` skill to write a PRD/RFC/ADR/US — it fills correct
front-matter, sets `owner: TBD` + the start status, updates `INDEX.md`, and self-validates with
`npx govkit verify`. The `sdlc` workflow orchestrates the whole chain. For domain modelling
(bounded contexts, aggregates, the `docs/domain` tree), use the **ddd-flow** plugin's `design`
skill — swe-flow consumes its output. Both plugins are enabled repo-wide in
`.claude/settings.json`.

## Agent constraints (non-negotiable)

- Never self-assign an owner (`owner: TBD`; propose in the PR body).
- Never self-flip a `status:`; propose the target, the human doc owner flips it.
- Never self-approve, self-merge, or act as code owner.
- Halt at a Lifecycle threshold when the required artifact is missing — do not invent it.

## Verify

`npx govkit verify` is the source of truth (front-matter completeness + INDEX sync). The
`PreToolUse` hook runs the per-write twin (`govkit audit-write`). Both run with no API key.
For PR review context, `npx govkit report --pr-body` emits a marker-fenced markdown block —
splice it into the PR body (replace the span, e.g. `gh pr edit --body-file`); advisory,
idempotent, never a gate (RFC-0021).
