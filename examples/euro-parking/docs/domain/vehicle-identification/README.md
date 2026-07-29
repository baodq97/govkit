---
id: DOMAIN-0005
title: VehicleIdentification bounded context
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# VehicleIdentification bounded context

**Right-sizing.** Supporting: purpose, language, communication, business decisions, plus a short
quality/assumption pass, because one of its two rules is a legally negotiated deletion that another
context's message contradicts (H7). No swimlanes, no interface critique.

## Purpose

In a garage only: works out what a vehicle actually is from its plate, says so when that disagrees
with what the driver typed, and forgets the plate after seven days. Serves the **operator**, who loses
money on a mis-declared class, and the **site manager** who works the resulting exceptions. A lot has
none of this — no camera, no plate, no consequence.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting; the chart plots it generic | `core-domain-chart.md` (x 0.20, y 0.15) |
| Business-model role | revenue generator — leakage protection, not differentiation | `business-model.md`, capability table |
| Evolution | product — the class lookup is a supplier's; the two rules on top are ours | `business-model.md`, capability table |

## Communication

Split by initiator, not by data flow.

| Dir | Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|---|
| in | GuidanceIntegration | bounded context | the plate feed from the garage camera | event | ACL, downstream |
| in | ParkingVisit | bounded context | `VehicleClassDeclared` — the class the driver typed | event | downstream |
| out | Registration lookup | external system | the class for a plate | query | **conformist** — we take the supplier's answer as given |
| out | ParkingVisit | bounded context | `VehicleClassMismatchDetected` — charge the higher rate | event | published language |
| out | RevenueReconciliation | bounded context | the same mismatch, for the daily exceptions list | event | published language |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Plate | read by the garage camera, deleted after seven days | **yes** — it has no equivalent in a lot, and RevenueReconciliation's `ClaimSentToPlateHolder` carries one out of here |
| Registered class | what the supplier's system says the vehicle is, from the registration | **yes** — ParkingVisit's *declared* class is what the driver typed; the two are compared here |
| Mismatch | registered class ≠ declared class | — |

## Business decisions

| Rule | Source |
|---|---|
| When the registered and declared classes disagree, the higher of the two rates is charged and the visit goes on the daily exceptions list | EXPERT 2026-07-27 |
| A plate record is deleted after seven days — agreed with the works council, "not negotiable" | EXPERT 2026-07-27 |
| The plate is not part of the fiscal record | EXPERT 2026-07-27 |
| In a lot nothing checks: no camera, no plate, no consequence for a wrong declaration | EXPERT 2026-07-27 |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Privacy / retention | plate records are destroyed on a fixed clock, non-negotiably | **7 days** | EXPERT, works council | **yes** — deletion is a domain rule with a party behind it, not a housekeeping job. It also caps every downstream use of a plate, including claims (H7) |
| Availability | a camera or supplier outage means no mismatch is detected; the declared class simply stands | unstated | absence recorded | no — it degrades to the lot behaviour, which is already an accepted state |
| Accuracy | a false mismatch charges a driver the higher rate | **unknown** — no supplier accuracy figure was given | absence recorded | **yes if poor** — a disputed charge has no correction path anywhere in the language (H9) |

## Assumptions

The supplier's lookup is authoritative, so a mismatch means the driver was wrong rather than the lookup (**inferred**; nobody stated an appeal, and the rule charges the higher rate either way — safe for the operator, not for the driver). The seven-day clock runs from the plate read (**inferred**; nobody said from what), and a plate is read once per visit (**inferred**).

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Mismatches per 1 000 garage entries; predicted low enough to stay an exception | if mismatches are common, the higher-rate rule is a pricing policy applied to ordinary drivers, not leakage protection — a different conversation with the operator | the operator's current exceptions list — **countable today** |
| Claims attempted more than 7 days after the exit; predicted 0 | whether H7 is a live contradiction or a theoretical one | the operator's records — **countable today** |

## Open questions

- **H7** — an unmatched exit is "occasionally sent to the plate we captured", but the plate is gone at day 7. Either claims are impossible after a week, or the deletion rule has an exception nobody stated.
- **H6** — the entitlement-bay report needs to say *who* parked in a disabled bay, and this is the only context that ever knows a plate: for seven days, in garages only.
- **New here** — can a driver dispute a mismatch charge, and against what evidence once the plate is deleted? *Expert + works council.*

## Changed in 7-define

Right-sizing note; classification carried from the chart; communication re-split by initiator, with the registration lookup typed **conformist** (we take the supplier's class as given); quality attributes, assumptions, verification metrics and one new open question added. No `model.yaml` delta.
