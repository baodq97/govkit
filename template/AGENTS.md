# AGENTS.md

> A README for coding agents. Closest `AGENTS.md` wins. User prompts override.
> Governance is enforced by **govkit** (`npx govkit verify`) — in-editor (hook) and in CI.

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

## Grounding & altitude — before the chain starts

The chain below assumes a **grounded vision** already exists. Producing one is the *ground-first*
half, and it runs at three altitudes. Do not skip down a rung.

- **L1 — vision map (governed, long-lived).** A thin, coarse capability map: stable capability ids,
  how they connect, each tagged core / supporting / generic, and the honest open questions. It is
  hand-drawn and rots in years, so it is **governed and stable** — a PRD at `docs/product` ratified
  to `approved` and rarely moved. It must **not** deepen into aggregates; that collapses the ladder.
- **L2 — walking skeleton (before you deepen).** The first RFC on any new capability is one **thin
  end-to-end slice** — a vertical cut, not a horizontal layer and not a breadth-first fan across
  every context. mandat stayed healthy by cutting a skeleton first, then deepening; btm stalled two
  days and took a full rollback at the domain→RFC edge by going breadth-first on unconfirmed
  evidence — while `verify`/`eval` stayed green throughout, because the gate is structurally blind
  to grounding.
- **L3 — deepen one slice (generated, weekly).** Only after the skeleton lands do you deepen, one
  grounded slice at a time. Aggregates are the generate-don't-hand-draw layer: never hand-author
  them, and never generate them from the L1 map.

**Grounding-before-depth (invariant).** Never let decompose or deepen run breadth-first on
unconfirmed evidence. A slice is ready to deepen only with **≥1 confirmed event and ≥1 stated
rule**; below that, go back to discovery. Agents write candidates; only a human flips
candidate → confirmed.

**PRD granularity — vision vs roadmap.** The **vision** (the capability charter) is governed and
stable. The **roadmap** (what ships next, in what order, at what priority) is *living and
ungoverned* — it churns monthly, and a draft→approved lifecycle on a monthly-churning list produces
the stale doc govkit exists to prevent (the same reason `docs/ui` / `docs/api` / `docs/data` are
ungoverned). Keep the roadmap out of the chain: **`docs/ROADMAP.md`** — outside every governed type
dir, no front-matter, no INDEX row, no status. Scaffold a new vision from `docs/product/_TEMPLATE.md`.

**Human gates in this half.** An agent proposes; it never flips a status or self-assigns an owner.
The human ratifies: (a) the core/supporting/generic call and the vision PRD `draft→approved`
(R0_owner); (b) the candidate→confirmed subset and the slice choice; (c) the walking-skeleton RFC
`→accepted` (R0_owner). The tiers are in `govkit.yml` `ratification:`.

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

| To do this | Use |
|---|---|
| Write a governed PRD / RFC / ADR / US | **swe-flow** `spec-author` — fills front-matter, sets `owner: TBD` + the start status, updates `INDEX.md`, self-validates with `npx govkit verify` |
| Model the domain (contexts, aggregates, events → `docs/domain`) | **ddd-flow** `design` — the orchestrator; `view` to review it in a browser |
| Design the user-facing surface (brief, tokens, prototype → `docs/ui`) | **design-flow** `ui-designer` — `view` for the live co-design loop |
| Design the API / data contracts | **swe-flow** `api-designer`, `data-model` |
| Split work into shippable slices | **swe-flow** `work-breakdown` |
| Close landed code into one owner decision | **swe-flow** `gate-close` |

swe-flow's designers consume the ddd-flow and design-flow trees, so run those first when the
change needs them. The `sdlc` workflow orchestrates the chain end to end. All three plugins are
enabled repo-wide in `.claude/settings.json`.

## Agent constraints (non-negotiable)

- Authority split: the MAIN agent (session lead) may flip statuses, assign owners, and
  merge only under the tier conditions in `govkit.yml` `ratification:` (R0/R1/R2 — read
  them there). SUB-AGENTS (workflow agents, skill subagents, dispatched runs) never flip
  a `status:`, never assign an owner, never merge — they PROPOSE; the main agent applies.
- Owner names a HUMAN, never the agent (new docs start `owner: TBD`; propose in the PR body).
- Every act (flip / merge / publish) rides a green FULL gate. Stage before gating:
  `git add -A && <gate> && git commit`.
- Halt at a Lifecycle threshold when the required artifact is missing — do not invent it.

## Verify

`npx govkit verify` is the source of truth (front-matter completeness + INDEX sync). The
`PreToolUse` hook runs the per-write twin (`govkit audit-write`). Both run with no API key.
For PR review context, `npx govkit report --pr-body` emits a marker-fenced markdown block —
splice it into the PR body (replace the span, e.g. `gh pr edit --body-file`); advisory,
idempotent, never a gate (RFC-0021).
