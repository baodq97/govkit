# AGENTS.md

> A README for coding agents. Closest `AGENTS.md` wins. User prompts override.
> Governance is enforced by **govkit** (`npx govkit verify`) — in-editor (hook) and in CI.
> Per-surface rules load lazily from `.claude/rules/*.md` (e.g. governed-doc authoring on `docs/**`).

## Doc chain

`PRD → RFC → ADR → Issue (US) → Code`. Artifacts live under the dirs declared in `govkit.yml`
(`docs/product`, `docs/rfc`, `docs/adr`, `docs/issues`, plus `docs/domain` for the ddd-flow
design tree and `docs/releases` for release records). Each carries front-matter
(`id, title, status, owner, date`) and a row in its `INDEX.md`.

Design trees sit beside the chain as inputs it consumes. `docs/domain` (ddd-flow) is governed
like the rest. `docs/ui` (design-flow), `docs/api`, and `docs/data` are **not** lifecycle-
governed — no front-matter, no INDEX, no status — because design iterates through non-linear
feedback rounds that a draft→approved lifecycle would only distort. They are validated by their
own plugins' scripts instead of by `govkit verify`.

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

## Agent constraints (non-negotiable)

- Authority split: the MAIN agent (session lead) may flip statuses, assign owners, and
  merge only under the tier conditions in `govkit.yml` `ratification:` (R0/R1/R2 — read
  them there). SUB-AGENTS (workflow agents, skill subagents, dispatched runs) never flip
  a `status:`, never assign an owner, never merge — they PROPOSE; the main agent applies.
- Owner names a HUMAN, never the agent (new docs start `owner: TBD`; propose in the PR body).
- Every act (flip / merge / publish) rides a green FULL gate. Stage before gating:
  `git add -A && <gate> && git commit`.
- Halt at a Lifecycle threshold when the required artifact is missing — do not invent it.
