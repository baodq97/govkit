---
id: RFC-0001
title: Two trust layers — a structural gate and a graded quality eval
status: draft
owner: TBD
date: 2026-05-31
---

> Records a shipped decision for the docs-as-code trust model (root `AGENTS.md`
> § Lifecycle: a new public-API surface — the `eval` command + the `eval:` /
> `statuses:` / `idPrefix:` schema keys). Status stays `draft`; the owner flips it
> to `accepted` on consensus — never an agent.

## Summary

govkit governs docs-as-code. Until now it had **one** trust mechanism: `verify`, a
structural gate (front-matter present, INDEX in sync). That proves a document is
**well-formed**. It does not prove the document is **any good** — a PRD with every
required key but no numeric KPI passes; an ADR with a `## Decision` heading and one
empty line under it passes. As more artifacts are **generated** (by the swe-flow
plugin, by any LLM), "it was produced" and "it is structurally valid" are both weak
proxies for "it is trustworthy."

This RFC splits trust into two deterministic, no-API-key layers:

1. **`verify` — the gate (quality CONTROL).** Binary pass/fail. Front-matter, status
   ∈ allowed set, id↔filename convention, INDEX sync, globally-unique ids, no
   placeholders. A PR cannot merge if the gate is red.
2. **`eval` — the trust SIGNAL (quality MEASUREMENT).** A graded 0–100 score per
   artifact against a pluggable rubric in `govkit.yml`. **Eval is the source of
   trust**: a passing gate says "well-formed," a passing eval says "carries real
   substance" (KPIs, alternatives, testable acceptance criteria).

Both run on plain Node in CI with no key, so a non-Claude contributor is held to the
identical bar.

## Motivation

"Not generated only." The value of an automated SDLC is not that artifacts get
produced quickly — it is that the produced artifacts are trustworthy without a human
re-reading every line. A generator (LLM or template) optimizes for *plausible*; only
an independent evaluator optimizes for *good*. If the only check is structural, the
fastest path through the gate is a hollow but well-formed doc — exactly the failure
mode an automated pipeline amplifies. The eval layer makes quality a **number CI can
watch over time**, not a vibe.

## Design

- **Rubric DSL** (in `govkit.yml` under `eval:`). Each doc-type maps to a list of
  weighted rules of four deterministic kinds: `section` (a heading matches a regex),
  `regex` (the body matches), `frontmatter` (a key is present / matches), `minWords`
  (body length floor). Score = `100 * passed-weight / total-weight`; an artifact
  passes if `score ≥ threshold`. Pluggable — consumers tune their own quality bar by
  editing one file, never by forking the engine (mirrors the `docs.types` philosophy).
- **The eval's own trust = a labeled corpus.** `packages/govkit/eval/fixtures/`
  holds hand-authored `good/` artifacts (must score high) and deliberately-`weak/`
  ones (must score low). `eval.test.ts` asserts the *shipped* rubric scores
  good → passRate 1 and weak → passRate 0. An eval you cannot evaluate is not a
  source of trust; this corpus is how we prove the scorers discriminate.
- **Same loading path as the gate.** `eval` reuses `loadConfig` + the doc-type dirs,
  so the two layers can never disagree about what a "PRD" is or where it lives.

## Impact and rollout

- **Backward-compatible.** All new gate checks are config-gated (`statuses:`,
  `idPrefix:`) or whitelist mandated values (`owner: TBD` is *not* a placeholder); a
  repo with no `eval:` block gets `eval → "no rubric configured"` and a green exit.
- **Adoption.** `npx govkit init` scaffolds the `eval:` block; existing consumers add
  it incrementally. `pnpm check` and the CI workflow run `verify` then `eval`.
- **Migration risk:** low. The only behavior change for existing repos is the
  stricter gate, and only when they opt into `statuses:` / `idPrefix:`.

## Alternatives

| Option | Why rejected |
|---|---|
| Structural gate only (status quo) | Cannot distinguish a substantive artifact from a hollow well-formed one — the precise gap that automated generation widens. |
| LLM-judge eval only | Best at nuanced quality, but needs an API key, is non-deterministic, and cannot run in a no-key CI — it breaks govkit's load-bearing invariant. Belongs in a *later, optional* layer, not the floor. |
| Reuse a generic markdown linter (markdownlint, Vale) | Lints prose/style, not domain substance (KPIs, alternatives, doc-chain) and is blind to `govkit.yml`'s doc model. |
| Fold quality checks into `verify` | Conflates binary "may-merge" control with graded "how-good" measurement; a graded signal must not hard-block on a single soft miss. |

## Open questions

- **The deterministic floor vs. the judgment ceiling.** Presence-based rules
  (`section`/`regex`) catch *missing* substance but not *hollow* substance: an ADR
  with all three headings and empty bodies can still game a section-only rubric.
  How far do we raise the floor with cheap heuristics (per-section `minWords`,
  anti-placeholder regexes) before the remaining gap genuinely needs an LLM judge?
- **An optional LLM-judge layer.** Should a future `eval --judge` delegate to the
  swe-flow `reviewer` agent for a graded second opinion — explicitly opt-in, never in
  the no-key CI path? (Requires its own RFC.)
- **Rubric calibration.** Is a single `threshold` per repo right, or per-type
  thresholds? How do we keep the labeled corpus representative as the rubric evolves?

## Recommendation

Ship the **deterministic two-layer model now** (gate + graded eval, both no-key,
proven by a labeled corpus). Treat the LLM-judge as a separate, opt-in layer behind a
future RFC. This delivers a watchable quality signal immediately without compromising
the no-API-key invariant that lets non-Claude users trust the same gate.
