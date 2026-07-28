---
id: DOMAIN-0004
title: Calibration bounded context
risk: High
status: draft
owner: baodq97
date: 2026-07-28
mode: define
related_prds: [PRD-0001]
related_rfcs: [RFC-0007, RFC-0012]
related_adrs: []
---

# Calibration bounded context

## Purpose

Measures whether the quality floor still tells good documents from weak ones, by running the
shipped floor over a corpus somebody labelled by hand and reporting the confusion matrix against a
committed baseline. It exists so that a change to the rubric is a **checkable diff**, not a
judgement call — and so that a loop which improves the gates cannot quietly weaken them.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` in `model.yaml` — **and contested** | `core-domain-chart.md`, Disagreements row |
| Business-model role | the product's stated north star metric | `PRD-0001:37-42` |
| Evolution | custom-built; the first slice of roadmap theme R7 | `PRD-0001:64`, `:70-78` |

Carried, not re-derived. The label says "a regression harness for QualityEval, not a capability a
consumer runs". The chart says its OUTPUT — false positives at zero, and an adversarial corpus
described as "the compounding asset" (`PRD-0001:40-41`) — is what govkit competes on. Both are
true; the disagreement is the finding, and the chart proposes the promotion.

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | Owner / CI | `Calibrate --corpus <dir> [--baseline] [--update-baseline]` | command | — |
| in | GovernanceSchema | the config — with `docs.root` forced back to `"."` | query | **ACL** — the one context that translates the config instead of conforming |
| out | QualityEval | `runEval`, invoked unchanged on each labelled tree | query | conformist, deliberately |
| out | *(caller)* | `CalibrateResult` + a rewritten baseline file | synchronous return / file write | published contract |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Positive class | **"blocked by the floor"** — so TP is a *weak* doc blocked | **yes, and inverted** — everywhere else "pass" is good; here a pass is a block |
| False positive | a legitimate doc the floor blocked | **yes** — the term's whole cost model is local to this context |
| Corpus | the labelled `good/` + `weak/` trees | **yes** — StructuralGate: the governed doc set |
| Baseline | the committed floor + counts snapshot | **yes** — FeatureLedger: the last committed ledger at HEAD |
| Shrinkage | fewer graded fixtures than the counts pin | no |

That inversion is the strongest evidence for this boundary: a "passing" doc here is one the gate
rejected.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| False positives | zero, unconditionally — it is the only count with no baseline comparison | 0 | `calibrate.ts:198-202`; `PRD-0001:38-39` | **yes** — `ok` is an AND of four conditions, not a threshold |
| Non-regression | recall and f1 may not fall below the committed baseline | — | `calibrate.ts:178-179` | yes |
| Self-protection | a learning loop that can weaken its own gates would learn to pass itself | — | `PRD-0001:75-76` | **yes** — it is why `--update-baseline` can refuse |
| Layout independence | must calibrate the standard corpus even in a repo governed under a non-default root | — | `calibrate.ts:118-123` | yes — the ACL edge |

## Assumptions

*Stated.* Degenerate denominators default to the perfect value 1, because the FP count separately
guards the invariant that matters (`calibrate.ts:168-173`).

*Inferred, and therefore attackable.* That the labelled corpus is REPRESENTATIVE — every number
here is conditional on fixtures one author wrote, and `PRD-0001:106-109` names the exact risk
("author-DNA monoculture", n=2 consumers, one author, one week). That hand-labelling is correct: a
mislabelled fixture silently redefines the bar and nothing can detect it. That an FP is always the
rubric's fault and never the fixture's — the code offers no way to say "this good/ doc deserved to
be blocked".

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Corpus size over time (tp+fn, tn+fp) | whether the "compounding asset" is compounding. Shrinkage already fails the run; flat growth is the quieter failure | the committed baseline `counts` under git — **collectable today** |
| Fixtures added per real production escape | whether the corpus learns from incidents or from imagination | `LEARNING-LOOP.md` escape log + corpus git history — **collectable today** |
| Runs where `--update-baseline` was refused | how often the bar was almost lowered alongside a regression | `cli.ts:744-751` output |
| Gap between corpus FP rate and consumer-reported false blocks | whether the fixtures resemble real docs at all | consumer friction logs (`PRD-0001:66-68`) — **not in this repo** |

## Open questions

- **How is the corpus kept representative as the rubric evolves?** `RFC-0001:112-113` raised it and
  it is still open; nothing in the code samples real docs into the corpus.
- **`calibrate` does not journal.** Only five commands may write a journal line
  (`journal.ts:17`), and this is not one — so the north-star metric is the one gate outcome the
  sensor never records. Deliberate, or an oversight? *Owner.*
- **Who may label?** Nothing distinguishes a fixture a human labelled from one an agent added.
