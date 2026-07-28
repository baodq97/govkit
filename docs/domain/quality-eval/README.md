---
id: DOMAIN-0003
title: QualityEval bounded context
risk: High
status: draft
owner: baodq97
date: 2026-07-28
mode: define
related_prds: [PRD-0001]
related_rfcs: [RFC-0001, RFC-0005, RFC-0019]
related_adrs: []
---

# QualityEval bounded context

## Purpose

Answers a narrower question than "is this document good": is it a **complete document at all** —
does it carry the sections its kind is supposed to carry, is it more than a stub, and is it saying
those things in its own prose rather than smuggling them past a scorer. It serves the **owner** who
wants a quality trend to watch and the **contributor** who wants to know a draft is finished.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` — deliberately scoped BELOW the differentiating question | `RFC-0001:102-108`; `README.md:52-58` |
| Business-model role | trend signal + a small blocking floor | `README.md:24-27` |
| Evolution | custom-built, then narrowed by an adversarial red-team | `RFC-0001:138-141` |

Carried, not re-derived. The honest boundary is the classification: a presence/shape rubric
*structurally cannot* tell a real artifact from keyword-salad with the right headings — they share
a lexical fingerprint — so the differentiating verdict was delegated OUT of the engine to a keyed,
opt-in judge (`RFC-0019`).

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | Contributor / CI | `Eval`, `Check` | command | — |
| in | GovernanceSchema | the rubric — five deterministic rule kinds | query | conformist; the bar is config, never code |
| in | WaiverPolicy | active waivers for this instant | query | shared kernel |
| out | Calibration | `runEval` itself, unchanged | query | supplier — it is graded with the shipped engine, not an approximation |
| out | GateJournal | `{artifacts, floorPassRate, advisoryPassRate, averageScore}` | — | supplier |
| out | *(caller)* | `EvalResult` | synchronous return | published contract |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Required | a rubric rule that blocks CI when it fails | **yes** — StructuralGate: a front-matter key |
| Floor | the small blocking subset, tuned for zero false-positive | no |
| Score | advisory only; it warns and never blocks | **yes** — Calibration reads it as discrimination between labelled trees |
| `ok` | every artifact cleared its floor | **yes** — verify: zero blocking unwaived violations |
| Prose | body text after fenced code and HTML comments are stripped | no |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| False positives | 0 on legitimate docs; a blocked good doc is what gets gates disabled | 0 | `PRD-0001:38-39`; `calibrate.ts:198-202` | **yes** — it is why the required set is tiny and Calibration exists as its harness |
| Gaming resistance | distinct headings, fences stripped, word boundaries | — | `RFC-0001:64-72` | yes |
| Advisory threshold | default 70 | 70 | `govkit.yml:90` | no |
| Trend integrity | pass-rates must keep showing debt a waiver postponed | — | `eval.ts:34-40` | **yes** — two verdict fields instead of one |

## Assumptions

*Stated.* A heading satisfies at most one section rule (`eval.ts:126-135`). A doc the gate cannot
parse is not this context's problem (`eval.ts:227`).

*Inferred, and therefore attackable.* That the five rule kinds are enough — no consumer has asked
for a sixth in the repo's record. That one `threshold` per repo, rather than per type, is right:
`RFC-0001:112-113` lists this as an unresolved question and it is still one field
(`govkit.yml:90`). That weights are meaningful at all — nothing states how the numbers in
`govkit.yml:93-126` were chosen, so the 0–100 score is ordinal dressed as cardinal.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| `averageScore` trend per doc type over time | whether the advisory number moves with anything real, or is decorative | `.govkit/journal.jsonl` `eval.averageScore` (`journal.ts:27-32`) — **collectable today** |
| Gap between `floorPassRate` and `ok` | how much of CI's green is waiver-funded rather than earned | `EvalResult` both fields (`eval.ts:242-247`) — **collectable today** |
| Docs at exactly threshold ± 3 | whether authors are writing to the number instead of to the reader | eval `--json` |
| Judge score vs eval score, same doc | the size of the gap this context admits it cannot see | `swe-flow:judge` runs — keyed, out of CI |

## Open questions

- **Per-type thresholds.** `RFC-0001:112-113` raised it; the config still has one field.
- **Where did the weights come from?** No source in the repo justifies any individual weight, so
  the 0–100 is not comparable across types.
- **`rel` has a two-rule rubric** (`govkit.yml:124-126`) — substance and no-filler only, so a
  release note scores 100 with no sections at all. Deliberate right-sizing, or an unfinished rubric?
