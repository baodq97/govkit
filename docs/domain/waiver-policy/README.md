---
id: DOMAIN-0005
title: WaiverPolicy bounded context
risk: High
status: draft
owner: baodq97
date: 2026-07-28
mode: define
related_prds: []
related_rfcs: [RFC-0014, RFC-0024]
related_adrs: []
---

# WaiverPolicy bounded context

## Purpose

Lets a named human record, in the open and with an end date, that one specific finding on one
specific path is acceptable here — so that a rule which is wrong for a single case does not force
the two worse moves: distorting the artifact to satisfy it, or starting to ignore the gate's output
altogether. It serves the **owner** who has to keep a gate credible while it is still being tuned.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `supporting` — it makes the gates liveable, it is not what govkit competes on | `model.yaml` |
| Business-model role | credibility preserver; the escape hatch that keeps the gate switched on | `config.ts:197-207` |
| Evolution | genesis — landed DURING this modelling run; the prior pass of this tree predates it | `context-map.md` Conflicts |

Not re-derived: no source in the repo claims differentiation for it.

## Domain roles

**Policy context.** It decides nothing about documents; it decides which of *other* contexts'
findings still count. That is why it is modelled as a boundary rather than a field: the decision
has its own vocabulary, its own lifecycle, and two consumers who must agree on it exactly.

## Inbound / outbound communication

| Direction | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | GovernanceSchema | the raw `waivers:` list, shape-checked only | query | conformist — the one key deliberately NOT field-validated at load |
| in | a named human | a hand-written waiver entry with `authorized_by` | — (config edit) | the authorization itself; nothing checks who wrote it |
| out | StructuralGate | which findings are `waivedBy`, and which waivers are themselves broken | query | shared kernel — it owns the kinds a `rule` may name |
| out | QualityEval | which failed required rules were individually signed for | query | shared kernel |
| out | *(both)* | `WaiverSummary` for the run's summary line | — | published contract |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Rule | a verify violation kind OR an eval rubric rule id — one open vocabulary over both layers | **yes** — each layer's own `rule`/`kind` enum is narrower |
| Scope | a path glob, anchored at both ends | **yes** — StructuralGate: `--changed` scoping of a report |
| Expired | still reported, suppressing nothing, and named as expired | — |
| Applied | excused a finding that was actually reported this run | — |
| Authorized by | a human act, the same class as assigning an owner or flipping a status | shared with Ratification |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Fail loud, never quiet | malformed and expired entries must suppress nothing and be named | — | `config.ts:239-251` | **yes** — three states instead of a boolean |
| Clock consistency | one instant per run, injected for testability | — | `config.ts:353-360`; `verify.ts:76-77` | yes |
| Scope cannot widen itself | anchored both ends, segment-aware | — | `config.ts:362-389` | yes |
| Calibration isolation | `requiredOk` / `floorPassRate` stay waiver-blind, so accepted debt can never re-tune the rubric that judges it | — | `eval.ts:34-40` | **yes** — the deliberate absence of an edge to Calibration |
| Expiry warning horizon | 14 days | 14 | `config.ts:219-221` | no |

## Assumptions

*Stated.* Every waiver dies (`config.ts:197-207`).

*Inferred, and therefore attackable.* That fourteen days is enough notice to renew or fix — the
number is stated with a rationale but no evidence. That a rule×scope pair is the right granularity:
a waiver cannot say "this INDEX row, not the whole file". That `authorized_by` is a person a
reader can look up — it is a free string with no format. That waivers stay few: nothing bounds the
list, and the `active` set is scanned linearly for every finding on every path.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Waivers renewed vs waivers fixed at expiry | whether the hatch drains debt or stores it. Renewal-dominant means the rule is wrong, not the doc | `govkit.yml` history under git — **collectable today; the list is currently empty, so the baseline is 0** |
| `applied` per run over time | whether green CI is increasingly waiver-funded | `WaiverSummary.applied` (`config.ts:267`) — not yet journalled |
| Distinct `authorized_by` values | whether authorization is spread or concentrated in one person | `govkit.yml` |
| Malformed entries reaching the gate | whether the shape-only load validation is the right trade | verify's `waiver`-kind violations |

## Open questions

- **`WaiverSummary` is not in the journal.** `JournalRecord.verify` carries docs and violations
  (`journal.ts:26`) but no waiver counts, so the sensor cannot see how much of a green run was
  excused. *Owner — additive if wanted.*
- **Nothing verifies `authorized_by` names a real human**, which is the same honesty gap
  Ratification records for status flips (`RFC-0027:169-176`). Consistent, and worth stating twice.
- **Two implementations of "is this excused".** `verify.ts:422-440` marks violations;
  `eval.ts:180-183` computes `floorOk` locally. One rule, two code paths, kept in step by hand.
  *Owner — a single shared applier is the obvious fix and is not proposed here, because moving it
  would make a supporting policy context decide a gate verdict.*
- **No waiver exists in this repo yet.** Every claim about behaviour here is read from code, never
  observed in use.
