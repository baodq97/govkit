---
id: RFC-0019
title: Substance judge — the keyed Layer-3 verdict govkit's floor deliberately defers (swe-flow:judge)
status: implemented
owner: baodq97
date: 2026-07-08
reconciled: sha256:9dc7b009883f659c
governs:
  - plugins/swe-flow/agents/judge.md
  - plugins/swe-flow/skills/substance-judge/SKILL.md
  - plugins/swe-flow/skills/substance-judge/references/scoring-anchors.md
---

> Productizes R2 (PRD-0001): the opt-in, API-keyed substance layer that answers the one
> question the deterministic floor was scoped never to answer — is the prose SOUND? Ships as
> a pinned judge agent + an orchestration skill in swe-flow, with versioned scoring anchors,
> a cross-model agreement mode, and deepeval-compatible verdict records. It never enters the
> no-key CI path — that invariant outranks the feature. The owner delegated approval
> in-session and implementation ships in the same PR (the RFC-0013/0015/0018 precedent), so
> this RFC lands directly at `status: implemented`.

## Summary

RFC-0001's red-team drew the honest boundary: a presence/shape rubric cannot tell a real
artifact from keyword-salad with the right headings, so `govkit eval` is a zero-FP floor and
substance judgment was deferred to a keyed layer. That layer has existed only as prose ("the
reviewer agent judges") — no pinned rubric, no comparable scores, no record format. This RFC
ships it as a product surface: a **judge agent** (`swe-flow:judge`) that scores ONE governed
doc against **versioned scoring anchors** (five 20-point bands per dimension, so two runs of
the same doc argue about the same scale), and a **substance-judge skill** that discovers the
corpus from `govkit.yml`, fans the judge out per doc, optionally re-runs the panel on a
second model and reports per-doc agreement spread, and appends one **deepeval-compatible**
JSON verdict per doc to a local, gitignored record (`.govkit/evals/`). Alert-triage's
hand-built quality loop (judge mean 73.8 → 84.1) is the reference implementation this
generalizes.

## Design

**The judge agent (pinned).** `agents/judge.md` scores exactly one doc, read-only, against
`references/scoring-anchors.md` — four dimensions (claims-evidence, internal consistency,
alternatives honestly weighed, actionability), each anchored in five bands with concrete
descriptions, overall = weighted mean. Every verdict carries `rubricVersion` and the judging
model, so scores are comparable only within a pinned (rubric, model) pair — the field makes
cross-run comparison honest instead of accidental. The agent returns strict JSON and nothing
else; it never edits, never verifies structure (the floor already did, deterministically),
and refuses docs the floor has not passed (garbage-in scoring is noise dressed as signal).

**The skill (orchestration + record).** `skills/substance-judge` resolves governed dirs from
the consumer's `govkit.yml` (never assumes the default taxonomy), runs `npx govkit check`
first (the floor gates, the judge does not re-check it), dispatches one judge per doc,
and writes one JSON line per verdict in deepeval's metric-result shape (`name`, `input`,
`score` 0–1, `threshold`, `success`, `reason`, plus `rubricVersion`/`model`/`dimensions`) to
`.govkit/evals/substance-<runstamp>.jsonl` — consumable by deepeval tooling and diffable
across runs. **Cross-model mode** re-runs the same pinned rubric on a second model and
reports the per-doc spread; a spread above 20 points flags the DOC (ambiguous substance —
exactly the docs a human should read first), not the judge.

**The invariant, restated as a hard boundary.** Everything here needs a key and is opt-in:
nothing in `govkit check`, no exit-code contract, no hook wiring. The record path follows
the journal's `.govkit/` convention — ignored in THIS repo, but a consumer choice in
general (an RFC-0007 `docs.root: .govkit` consumer commits that tree), so the skill checks
and reports whether the record file is tracked instead of assuming. The deterministic CLI
does not learn this layer exists — skills call govkit, never the reverse (AGENTS.md's
one-directional rule).

## Alternatives

| Option | Why rejected |
|---|---|
| **A `govkit judge` CLI command** | Couples the keyed layer into the no-key binary — one `import` away from breaking the CI invariant that outranks any feature (PRD-0001 constraint persona). |
| **Extend the reviewer agent** | The reviewer judges a CHANGE against governance (verdict: approve/block); the judge scores a DOC's substance on a stable scale. Different question, different cadence, different output contract — merging them re-creates the vague "the reviewer handles it" state this RFC replaces. |
| **Unanchored 0–100 scoring** | LLM scores without banded anchors drift run-to-run and model-to-model; the number looks comparable and is not. Anchors + `rubricVersion` are what make the score a measurement instead of a vibe. |
| **A bespoke record format** | deepeval's metric-result shape already exists, is tool-consumable, and costs nothing to emit — rung 5 of the minimalism ladder (installed-ecosystem format over invented one). |

## Impact / rollout

- Plugin-only surface: swe-flow 0.5.0 → 0.6.0; the govkit engine is byte-for-byte untouched.
- Opt-in by invocation ("judge substance", "run the substance judge"); nothing runs it
  implicitly, no CI workflow references it.
- Verdict records land under `.govkit/evals/` — whether that tree is ignored or committed
  is the consumer's call (RFC-0007 consumers commit `.govkit/`), so the skill reports the
  record file's tracked/ignored state; history is committed deliberately, never silently.
- Rollback is deleting the agent + skill; no engine state, no config keys, no migration.

## Open questions

- **Calibration corpus for the judge itself.** The floor has `calibrate`; the judge should
  eventually have a labeled substance corpus (sound vs salad) scoring the judge's own
  agreement with human labels. Deferred until verdict records accumulate — the record format
  ships first precisely to make that corpus buildable.
- **Panel size.** Cross-model mode ships with two models (cost-honest default); whether a
  third tiebreaker earns its cost needs spread data from real runs.

## Roadmap fit

Closes R2 (ledger F-R2-JUDGE): the third trust layer becomes a product surface with pinned
semantics, while the two deterministic layers stay the only thing CI needs. The verdict
records feed R7: a substance-score trend is a learning-flywheel input the journal alone
cannot provide.

## As-built

Shipped as `plugins/swe-flow/agents/judge.md` (pinned model + strict-JSON contract),
`plugins/swe-flow/skills/substance-judge/SKILL.md` (discovery → floor gate → fan-out →
record → optional cross-model pass), and
`plugins/swe-flow/skills/substance-judge/references/scoring-anchors.md` (rubric v1, four
dimensions × five bands); swe-flow plugin manifest bumped to 0.6.0 with the README section
added. Validation: full `bun run check` green (the engine surface is untouched by
construction — no engine test changes exist to make).

## Deviations from design

Post-review hardening (adversarial review-changes pass, same PR): the original text assumed
`.govkit/` is gitignored everywhere — false for RFC-0007 `docs.root: .govkit` consumers, who
commit that tree. The skill now checks and reports the record file's tracked state instead
of assuming, and the judge agent no longer restates the dimension weights inline (the
anchors file is the one pinned source). Folded into § Design above.

**Amendment (RFC-0020, selftest-gated judge).** The judge contract is now selftest-gated:
before any verdict the skill requires `govkit calibrate` green AND a keyed ranking probe
that scores the pinned known-good fixture strictly above the known-weak one, else it refuses
with `judge not trustworthy: <why>` and appends one refusal record per planned doc-run to
`.govkit/evals/`. Every verdict additionally pins its provenance — exact model id,
`temperature: 0`, and an `anchorsHash` (sha256 of the CRLF→LF-normalized
scoring-anchors.md) — closing this RFC's "calibration corpus for the judge itself" open
question. The governed judge.md/SKILL.md changed accordingly; re-acked.

## Recommendation

Ship the substance judge as a pinned swe-flow agent + skill with anchored scoring,
cross-model agreement, and deepeval-compatible records; prefer this over a CLI command
(breaks the no-key invariant), over overloading the reviewer (different question), over
unanchored scores (not a measurement), and over a bespoke record format (ecosystem shape
exists) — each rejected above.
