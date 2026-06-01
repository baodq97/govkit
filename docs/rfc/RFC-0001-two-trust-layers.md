---
id: RFC-0001
title: Two trust layers — a structural gate and a graded quality eval
status: implemented
owner: baodq97
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
2. **`eval` — the quality SIGNAL.** Two parts: a small **required structural floor**
   (not an empty stub, no leftover template filler, canonical sections as *distinct*
   headings) that **blocks CI**, plus an **advisory 0–100 score** that grades
   structural richness as a trend to watch (it warns, it does not block). *Eval is the
   deterministic source of trust for what is mechanically checkable — structure and
   non-emptiness — not for whether the prose is sound.* Judging soundness is the
   **swe-flow `reviewer` agent**'s job (opt-in, needs a key, never in no-key CI).

Both deterministic layers run on plain Node in CI with no key, so a non-Claude
contributor is held to the identical bar.

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
  weighted rules of five deterministic kinds: `section` (a *distinct* heading matches a
  regex), `regex` (the prose matches), `frontmatter` (a key is present / matches),
  `minWords` (prose-length floor), `forbid` (a filler pattern is absent). Any rule may
  be `required: true`. Pluggable — consumers tune their bar by editing one file, never
  by forking the engine (mirrors the `docs.types` philosophy).
- **Required floor (blocks) vs. advisory score (informs).** `eval` exits non-zero only
  if a `required` rule fails — the floor. The `0–100` score (weighted pass fraction) is
  reported as an advisory trend. This is deliberate: for a CI-blocking gate the only
  fatal error is a **false positive** (it gets the gate disabled), so the floor is tuned
  for *zero* false-positive on legitimate docs, accepting that a determined gamer can
  pass it. The reviewer agent — not a stricter regex — is what catches the gamer.
- **Hardening against gaming (deterministic, cheap).** Section rules match **distinct**
  headings (one kitchen-sink heading cannot satisfy four sections); code fences and HTML
  comments are **stripped before matching** (no smuggling signals in ```code```);
  keyword rules use word boundaries (`when` ≠ `whenever`); `forbid` rejects unambiguous
  leftover template text (lorem-ipsum blocks, "to-be-filled" placeholders) — but
  **never** bare `TBD`, which is mandated for `owner:` and valid in open questions.
  (Illustrating those patterns verbatim in prose would trip the rule — as an earlier
  draft of this very RFC did; literal examples belong in a fenced code block, which the
  scorer strips.)
- **The eval's own trust = a labeled + adversarial corpus.** `packages/govkit/eval/`
  holds `good/` (clears floor + high advisory) and `weak/` (blocked on floor) fixtures;
  `eval-hardening.test.ts` pins every gaming vector closed and every false-positive
  guard open (MADR / Nygard / terse ADRs must pass). An eval you cannot evaluate is not
  a source of trust.
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

- **Resolved — floor vs. ceiling.** An adversarial red-team (8 agents) proved a
  presence/shape rubric *structurally* cannot tell a real artifact from a keyword-salad
  with the right headings — they share a lexical fingerprint. So this RFC stops claiming
  the deterministic layer judges substance: the floor blocks stubs/filler/smuggling
  (zero-FP, CI-blocking), the advisory score tracks structural richness, and **substance
  judgment is delegated to the swe-flow `reviewer` agent** (opt-in, keyed, never CI).
  That split is now the design, not an open question.
- **An optional LLM-judge command.** Should a future `eval --judge` invoke the
  `reviewer` agent for a graded second opinion in-band (still never in no-key CI)?
  Requires its own RFC.
- **Rubric calibration.** One `threshold` per repo, or per-type? How do we keep the
  adversarial corpus representative as the rubric evolves?

## Recommendation

Ship the **deterministic two-layer model now**, scoped honestly: `verify` (binary
structural gate) + `eval` (a required floor that blocks + an advisory score that
informs), both no-key, both proven by a labeled *and adversarial* corpus. The substance
judge is the existing swe-flow `reviewer` agent (opt-in, keyed); a built-in
`eval --judge` is deferred to a future RFC. This delivers a watchable, un-gameable-floor
quality signal immediately without compromising the no-API-key invariant.

## As-built

Both layers shipped on plain Node, no key. `verify` (`commands/verify.ts`) is the binary structural
gate — front-matter completeness, status ∈ enum, id↔filename, INDEX sync, globally-unique ids, no
placeholders. `eval` (`commands/eval.ts`) shipped as a required structural floor that blocks (not a
stub, no leftover filler, distinct canonical headings) plus an advisory 0–100 score that only warns —
exactly the floor/ceiling split the Open questions resolved. The rubric DSL lives in `govkit.yml`
under `eval:` (five rule kinds); the eval's own trust is pinned by the labeled + adversarial corpus
and `eval-hardening.test.ts`; both layers share `loadConfig`. Substance judgment stayed the opt-in,
keyed swe-flow `reviewer` agent — never in no-key CI. The two-layer model is dogfooded by every other
RFC in this repo.

## Deviations from design

- **`eval` was hardened into an honest floor AFTER an adversarial red-team**, not designed that way up
  front. The red-team proved a presence/shape rubric cannot tell a real artifact from keyword-salad
  (same lexical fingerprint), so the shipped eval narrowed to "floor blocks, score advisory, substance
  is the reviewer's." Recorded in Open questions as resolved; the shipped code matches that resolution.
- **The combined `check` entrypoint and the advisory `report`/`stale` siblings were added later**
  (RFC-0005/0008/0009), outside this RFC's scope — `check` runs verify-then-eval as the single no-key
  CI gate. Named so a reader does not expect them here.
- **The dev toolchain moved to bun (ADR-0002) after this RFC was written**, so the `pnpm check`
  reference in Impact/rollout is historical — the current one-shot command is `bun run check`. The
  no-key, Node-portable published-artifact invariant is unchanged.
