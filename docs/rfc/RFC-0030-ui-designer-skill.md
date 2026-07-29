---
id: RFC-0030
title: design-flow — the experience-design loop (ui-designer + live co-design view)
status: draft
owner: baodq97
date: 2026-07-29
---

# RFC-0030 — design-flow: the experience-design loop

## Summary

The chain is backend-pure: PRD → domain model → `api-designer`/`data-model` → spec → code,
with no step where what the user *sees* becomes a recorded, reviewable artifact. This RFC adds
a **third sibling plugin, `design-flow`** (the same carve-out move that separated ddd-flow in
v0.11.0 — an iterative modelling loop does not belong inside the chain-authoring plugin), with
two surfaces. **`ui-designer`** turns a PRD + `docs/domain/` + `docs/api/` (or a prose brief)
into a `docs/ui/` tree: a design brief with a recorded design read and reasoned dials, a
`tokens.json` whose declared contrast pairs a bundled script verifies with exact WCAG math,
and a screen inventory where every screen names its one primary action and its
empty/loading/error states bound to the API error catalog. **`view`** renders those artifacts
live for co-design — candidate directions picked by eye, click-targeted feedback collected in
`events.jsonl` for the agent's next round — and publishes to `docs/ui/_views/` as gate
evidence. No engine change: `docs/ui/` is a design-artifact tree exactly like `docs/api/` and
`docs/data/` — skill-validated, not lifecycle-governed.

## Context

Five sources were studied before this design (full ledger:
`docs/research/ui-designer-borrow.md`): Anthropic's `frontend-design` skill, Leonxlnx's
`taste-skill` (tasteskill.dev), nextlevelbuilder's `ui-ux-pro-max-skill`, and the roadmap.sh
Design System and UX Design roadmaps. Three findings converge across them:

1. **The design decision is recorded before code.** Each source forces a stated plan (a
   "Design Read" + dials, a token plan with a signature element, a persisted `MASTER.md`)
   before any component is written. Defaults are allowed; *silent* defaults are a failure.
2. **The deterministic layer is split from the judgment layer,** and only the deterministic
   layer gates. ui-ux-pro-max's audit script exits non-zero only on `high` findings and its own
   comments call sampled contrast "a lead, not a verdict" — the same honesty govkit already
   encodes as gate vs eval vs judge (RFC-0001).
3. **Anti-slop works as a method, not a blacklist.** taste-skill's banned-hex/banned-font lists
   are era-bound to one model generation; what transfers is the procedure — derive the generic
   default for the brief, then justify every place the design matches it.

## Decision

Ship `plugins/design-flow/` with two skills. `skills/ui-designer/`:

- **Two modes, mirroring `data-model`:** FORWARD (design from upstream artifacts or a prose
  brief) and AUDIT (audit-before-touch review of an existing UI, with a
  never-changes-silently list: URLs, nav labels, form field names, wordmark, legal copy).
- **Consume-the-upstream mapping table**, mirroring the siblings: PRD persona → the design
  read's audience slot; ubiquitous language → screen names and copy, verbatim; aggregate →
  view family; API operation → form/read flow with declared states; RFC 9457 error catalog →
  the UI error-state catalog; domain event → notification surface.
- **A deterministic validator, `scripts/check_tokens.mjs`** (stock node, zero deps): WCAG
  contrast math over *declared* token pairs, design-read completeness, dials
  explicit-and-reasoned, no unfilled placeholders. Three-state exit contract (0 clean / 2 gate
  fail / 1 tool crash), all violations collected in one run. Declared-only scope keeps the
  zero-false-positive property: every failure is exact, never sampled.
- **Design-system choice is an ADR** — the same rule as `api-designer`'s integration-technology
  decision: one system per project, adopting or approximating it is recorded, not assumed.
- **Never silently regenerate:** if `docs/ui/` exists the skill reads it first and refuses to
  overwrite without explicit direction — existing decisions may be human-negotiated.
- **Output:** `docs/ui/` with `INDEX.md`, `design-brief.md`, `tokens.json`, `screens/`
  per bounded context; AUDIT writes `docs/ui/audit.md` instead.

And `skills/view/` — the co-design surface, mirroring ddd-flow's proven view architecture
(frozen shell + one extracted payload + SSE preview server; `preview-server.cjs` is adapted
from ddd-flow's with only session-dir/env deltas):

- **Extractor, not emitter:** `ui_view.mjs` reads `docs/ui/` back into one `model.json`; what
  it cannot parse — including files it does not classify at all — is a reported gap, never a
  silent skip.
- **Feedback is the first-class channel:** every click, note, candidate pick, and lens
  approval POSTs to the server and lands in `events.jsonl`; the agent processes events past
  the `events-processed.json` marker each round, applies unambiguous ones directly to the
  artifacts, and brings only conflicts back to chat — design conversation happens on the
  surface, not chat-about-chat.
- **Choreography:** candidate-pick opening (2–3 directions side by side, picked by eye;
  rejected ones recorded as Rejected defaults), working rounds over SSE live-reload, and a
  fresh-context reader test before close.
- **Two phases:** Phase-1 previews are ephemeral under `.design-flow/preview/` (gitignored);
  Phase 2 publishes `docs/ui/_views/` — the prototype gate-close cites as live evidence, at
  declared wireframe fidelity (tokens, states, flow — never final pixels).

Tier mapping (RFC-0024 vocabulary): the validator is **firm at the skill layer** (like
`api-designer`'s redocly ruleset — it gates the skill's own deliverable, not a consumer's CI);
the brief's prose quality is **advisory/judgment** (reviewer/judge agents); design taste is
**honor-system**, structured by the recorded read + self-critique.

## Alternatives considered

- **Keep ui-designer inside swe-flow** — rejected: an iterative co-design loop with its own
  surface is the exact growth shape that forced the ddd-flow carve-out; separating at one
  skill is cheaper than at four, and consumers without a UI keep a smaller install.
- **Extend `ddd-flow:view` with UI lenses** — rejected: the plugins meet at artifacts, never
  imports; a domain view rendering design tokens muddies both.
- **A governed `uxd`/`ui` doc type in `govkit.yml`** — rejected for now. Design iterates
  through non-linear feedback rounds; forcing it into a draft→approved lifecycle would either
  distort the work or generate waiver noise. If the enterprise-lifecycle FSM thread lands
  (configurable per-type state graphs), `docs/ui/` is the natural first pilot; the artifact
  layout chosen here does not block that upgrade.
- **Borrowing taste-skill's cliché blacklists (hex families, banned fonts)** — rejected:
  era-bound to one model generation's defaults; inheriting them means inheriting stale taste.
  The self-critique procedure is borrowed instead.
- **A browser-based audit (Playwright, viewport sweeps) in the gate** — rejected: minutes-scale
  cost, and its contrast heuristic is approximate by its own admission. A rendered-page audit
  belongs to the verifier/review layer, not a deterministic gate.
- **A searchable style/palette/font database (ui-ux-pro-max's 14-CSV BM25 engine)** — rejected:
  that is a content product to own and curate, not a governance mechanism; the skill's
  references carry method, and the model brings current design knowledge.

## Open questions

- Should `docs/ui/tokens.json` join the `governs:`/`stale` surface so token drift against
  shipped CSS is flagged? Deferred until one consumer repo actually pairs the two.
- Screen-inventory format is markdown per context in v1; a structured `screens.yaml` (machine-
  checkable state coverage) is a natural v2 once the shape stabilizes in use.
- Whether the design-language layer (tone of voice, principles — roadmap.sh's "brand" band)
  deserves its own thin standing doc type, or stays a section of `design-brief.md`.
- A `ux-designer` step upstream (personas → flows → wireframes, per the roadmap.sh UX Design
  roadmap) is deliberately NOT this skill; this RFC takes only the convergent pieces — the
  target-action slot in the design read, one primary action per screen, and the flow diagram
  in the screen inventory. A dedicated UX step is future work with its own RFC.

## Impact / rollout

Plugin-surface only: no engine code, no `govkit.yml` schema change, no consumer migration.
Surfaces touched: the new `plugins/design-flow/` directory, a third marketplace entry
(byte-equal to its plugin.json by check-sync, whose plugin list and skill-lint invocation grow
by one), `enabledPlugins` in root and template settings, the template/root/swe-flow READMEs,
and `.gitignore` (`.design-flow/`). The token validator is exercised at authoring time (same
tier as `derive_cel.py`); `bun run check` gates both skills' front-matter via skill-lint.
Rollback is deleting the plugin directory and reverting the wiring files.
