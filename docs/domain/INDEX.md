---
id: DOMAIN-IDX-0001
title: govkit domain model — index
status: draft
owner: TBD
date: 2026-07-28
---

# Domain docs index

The govkit engine, decomposed from artifacts that exist in this repository. **No workshop, no
domain expert** — `1-understand` and `2-discover` were deliberately skipped, so there is no
`business-model.md` and no `discovery/` timeline, and inventing either would have fabricated
provenance. Every invariant traces to `packages/govkit/src/**`, `govkit.yml`, `AGENTS.md`,
`README.md`, `package.json`, `docs/product/PRD-0001` or `docs/rfc/**` with a `file:line` citation
and the enclosing symbol.

**These files are not governed.** `govkit.yml:14-75` declares five doc types (`prd`, `rfc`, `adr`,
`us`, `rel`) and none of them covers `docs/domain/`, so `npx govkit verify` neither reads nor gates
this tree. The front-matter below follows the template convention anyway, and the two config flags
a named design tree would need already exist (`config.ts:52`, `:61`). Adding a `domain:` type is an
owner decision.

## Bounded contexts (`3-decompose`, deepened by `7-define`, 2026-07-28)

| Id | Title | Risk | Status | Owner | Date |
|---|---|---|---|---|---|
| [DOMAIN-0001](structural-gate/README.md) | StructuralGate bounded context | Critical | draft | TBD | 2026-07-28 |
| [DOMAIN-0002](reconciliation/README.md) | Reconciliation bounded context | Critical | draft | TBD | 2026-07-28 |
| [DOMAIN-0003](quality-eval/README.md) | QualityEval bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0004](calibration/README.md) | Calibration bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0005](waiver-policy/README.md) | WaiverPolicy bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0006](feature-ledger/README.md) | FeatureLedger bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0007](ratification/README.md) | Ratification bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0008](write-time-audit/README.md) | WriteTimeAudit bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0009](gate-journal/README.md) | GateJournal bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0010](adoption/README.md) | Adoption bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0011](lifecycle-report/README.md) | LifecycleReport bounded context | High | draft | TBD | 2026-07-28 |
| [DOMAIN-0012](governance-schema/README.md) | GovernanceSchema bounded context | — | draft | TBD | 2026-07-28 |

**Twelve contexts, 153 invariants, every one carrying a `file:line` citation.** Distribution:

| Context | Sub-domain | Aggregates | Invariants | Code it owns |
|---|---|---|---|---|
| StructuralGate | core | 1 | 14 | `commands/verify.ts` (658) |
| Reconciliation | core | 1 | 18 | `commands/drift.ts` + `stale.ts` (465) |
| WaiverPolicy | supporting | 1 | 18 | `config.ts` waiver block + hooks in verify/eval (~230) |
| Adoption | supporting | 0 | 15 | `commands/adopt.ts` + `init.ts` (300) |
| Ratification | supporting | 0 | 13 | **none — 0 LoC, by design** |
| WriteTimeAudit | supporting | 0 | 13 | `commands/audit-write.ts` (140) |
| FeatureLedger | supporting | 1 | 12 | `commands/ledger.ts` (262) |
| QualityEval | supporting | 0 | 11 | `commands/eval.ts` (256) |
| Calibration | supporting | 0 | 11 | `commands/calibrate.ts` (204) |
| GateJournal | supporting | 0 | 10 | `journal.ts` (67) |
| GovernanceSchema | master-data | 0 | 10 | `config.ts` load-time validation |
| LifecycleReport | supporting | 0 | 8 | `commands/report.ts` (117) |

**Four of twelve carry an aggregate** (StructuralGate, Reconciliation, WaiverPolicy,
FeatureLedger); the other eight are `aggregates: []` with a stated reason — a stateless
measurement, a policy an actor honours, a decision function, a read-only projection. An empty
aggregate list there is a right-sizing decision, not a gap. Risk is set where invariants are
present. Canvas depth follows the classification, not one template applied twelve times — deepest
185 lines (StructuralGate, core), shallowest 39 (GovernanceSchema, a stub because it is reference
data). Ratio **4.7 : 1**.

## Strategy (`5-strategize`)

| Id | Title | Status | Owner | Date |
|---|---|---|---|---|
| [DOMAIN-CDC-0001](core-domain-chart.md) | govkit — core domain chart | draft | TBD | 2026-07-28 |

Places eleven of twelve contexts; `Ratification` is unplotted because it has zero model mass by
construction. **The investment mismatch is the deliverable**: the richest model in the system
(StructuralGate) has no sourced differentiation, while the context `PRD-0001` calls the north star
(Calibration) has no aggregate at all. One `subdomain_type` delta is proposed, not applied.

## Domain message flows (`4-connect`)

| Id | Title | Status | Owner | Date |
|---|---|---|---|---|
| [DOMAIN-FLOW-0000](message-flows/README.md) | govkit — domain message flows | draft | TBD | 2026-07-28 |
| [DOMAIN-FLOW-0001](message-flows/DOMAIN-FLOW-0001-gate-run.md) | A gate run — one `bun run check` | draft | TBD | 2026-07-28 |
| [DOMAIN-FLOW-0002](message-flows/DOMAIN-FLOW-0002-status-ratification.md) | An R1 status flip, evidence to accept commit | draft | TBD | 2026-07-28 |
| [DOMAIN-FLOW-0003](message-flows/DOMAIN-FLOW-0003-drift-ack-refused.md) | A drift acknowledgement, one doc refused | draft | TBD | 2026-07-28 |

Neither refutation trigger fired (7, 7 and 8 messages; no context in every step), so the cut is
**not refuted**. Twelve findings, two of them clean results. The three that matter all have the
same shape: **a rule exists and no message carries it** — which is what you get when a domain's
central concept is authorisation and its engine is deliberately stateless.

## Upstream

| Id | Title | Status | Owner | Date |
|---|---|---|---|---|
| [DOMAIN-CM-0001](context-map.md) | govkit — context map | draft | TBD | 2026-07-28 |

## What this model found that reading the files would not

Four cross-context inconsistencies, each cited in `context-map.md` § Conflicts and raised as an
open question rather than asserted as a defect:

1. `audit-write.ts:58` computes `required` **without** `excludeBase`; `verify.ts:541-547` subtracts
   it and `config.ts:100-106` documents the subtraction as the rule.
2. `report.ts:85` and `adopt.ts:140` do **not** pass the per-type `recursive` flag that
   `verify.ts:554` and `eval.ts:225` both pass.
3. `calibrate` runs on every `bun run check` (`package.json:25`) but may not journal
   (`journal.ts:17`) — so the north-star metric is the one gate outcome the sensor never records.
4. `AGENTS.md:45` describes `bun run check` as verify + eval; `package.json:28` also chains
   `calibrate`, `drift` and `ledger`.

## Not produced, and why

`business-model.md` (`1-understand`), `discovery/` (`2-discover`), `team-topology.md`
(`6-organise`), `event-model/` and per-aggregate canvases (`8-code`). The first two were out of
scope — no workshop, no expert, and a fabricated discovery timeline would have poisoned every
citation downstream. The last three were not run. **No evidence in repo** for team topology: the
repo has one contributor.
