---
id: DOMAIN-BCC-0004
title: Bounded context canvas — Customs
status: draft
owner: TBD
date: 2026-07-27
---

# Customs

**Treatment:** full canvas — owns a regulated invariant with real consequences, and carries the
largest unresolved buy-vs-build question in the repo.

## Purpose

Submits declarations to the authority for each port and tracks them to clearance, so shipments may
lawfully move.

## Strategic classification

| Dimension | Value | Source |
|---|---|---|
| Sub-domain type | `core` — "regulated, and mistakes are expensive" | `context-map.md`, March session |
| business_role | compliance-enforcer | `business-model.md`, commercial director |
| evolution_stage | product | same |
| differentiation | **no** — "required, and two vendors already do it well" | same (`proxy`) |

**Conflict carried forward.** The March justification is about risk; the business model's is about
advantage. Both can be true: expensive to get wrong, and worth nothing when right. Nothing in
DDD says a high-risk capability must be built in-house — a compliance-enforcer at product stage
with no differentiation and two proven vendors is the standard buy profile. `customs/model.yaml`
adds the fact that makes this live: *"Two commercial customs platforms cover all nine ports; we
integrate with neither"*, and the repo nonetheless plans 12 tables and 96 attributes here.

This is a decision, and it is not mine (OQ-9). What follows describes the context as the repo
defines it, which stays valid either way — a bought platform still needs this boundary, just with
an anti-corruption layer instead of an aggregate.

## Inbound communication

| Message | Type | From | Relationship | Source |
|---|---|---|---|---|
| `ContainerSealed` | event | Consolidation | Customs downstream — Customer/Supplier | `customs/model.yaml` → `{to: Consolidation, downstream}`; timeline #7 |
| *clearance decision* | event (external) | Customs authority / platform per port | **Conformist** — the authority's model is not negotiable; an ACL is the usual answer | Implied by `DeclarationCleared` (timeline #9); the repo records no external edge for Customs |

`ContainerSealed` carries `containerId, fillRate`. Customs works in `shipmentRef` and `portCode`,
neither of which is in the payload. See CU-1.

## Outbound communication

| Message | Type | To | Relationship | Source |
|---|---|---|---|---|
| *submit declaration* | **command** (external) | Customs authority / platform | Conformist | Implied by `DeclarationSubmitted`; not stated in the repo |
| `DeclarationSubmitted` | event | published — **no recorded consumer** | — | `customs/model.yaml`; timeline #8 |
| `DeclarationCleared` | event | Invoicing | Customs upstream, Invoicing downstream — Customer/Supplier | `customs/model.yaml` → `{to: Invoicing, upstream}`; timeline #9 |

`DeclarationSubmitted` having no consumer is the whole of OQ-7: the invariant below says nothing
may be handed to a carrier before it is submitted, and Routing — the context that hands over — does
not receive this event and has no edge to Customs anywhere on the map.

## Ubiquitous language

| Term | Definition | Source |
|---|---|---|
| Declaration | `declarationId, shipmentRef, portCode, status` | `customs/model.yaml` |

No `ubiquitous_language` block exists for Customs; the above is read off the entity. The status
values a declaration moves through — the thing a customs clerk would talk about all day — are not
recorded anywhere.

## Business decisions

| Rule | Source |
|---|---|
| A shipment cannot be handed to a carrier before its declaration is submitted | `customs/model.yaml` `invariants`; also `discovery/timeline.md`, stated by the customs clerk |

The only rule, and the only one confirmed by two independent artifacts. Nothing states what a
declaration requires to be submittable, what happens when one is rejected, whether clearance can be
withdrawn, or which of the nine ports differ — even though `portCode` exists precisely because they
do.

## Assumptions

| # | Assumption | Why it is an assumption | Cost if wrong |
|---|---|---|---|
| CU-1 | Customs can resolve `containerId` → the shipments inside it | `ContainerSealed` carries no shipment reference; `context-map.md` lists `ShipmentRef` as shared with Customs, so the type exists — the payload just does not carry it | The trigger event is unusable |
| CU-2 | One declaration per shipment, not per container | `Declaration.shipmentRef` is singular | Wrong aggregate granularity, on a 12-table model |
| CU-3 | Declaration is submitted after sealing | It is the only inbound trigger recorded, and the timeline orders sealing (#7) before submission (#8) | If declarations can be prepared earlier, the sequence and the handover rule both change |
| CU-4 | All nine ports are served by one declaration model with a `portCode` discriminator | `portCode` is a plain attribute with no per-port variation modelled — although Invoicing needed three of five aggregates for per-port VAT variation, which is evidence the ports do differ | The same eleven-year sprawl that hit Invoicing, repeated here |
| CU-5 | Clearance is asynchronous and can fail | Universal in customs, but nowhere in the repo: no rejection event, no failure path | No unhappy path in a 12-table regulated model |
| CU-6 | The 12-table model is a build intention rather than a description of an existing system | The README frames the repo as pre-code, but the mass figures are given as facts | The buy-vs-build question may already be settled by a sunk system |

## Verification metrics

| Metric | What it would falsify | Collectable from |
|---|---|---|
| Handovers occurring before `DeclarationSubmitted`, count | Direct test of the one invariant, and of OQ-7 — an unenforceable rule shows up here as a non-zero number | Compare `ShipmentHandedToCarrier` and `DeclarationSubmitted` timestamps per shipment in the event stream; a monitor, not a gate, until someone owns enforcement |
| Declaration rejection / amendment rate per port | Assumption CU-5, and whether ports really are interchangeable (CU-4) | Responses from the customs platform, recorded against `portCode` |
| Time from `DeclarationSubmitted` to `DeclarationCleared`, p95 per port | Whether clearance is on the critical path for departures | Event stream timestamps |
| Engineering effort spent on customs integration per quarter | The buy case — if this exceeds a vendor's licence cost, OQ-9 answers itself | Issue tracker, cycle time on issues labelled `customs`, reviewed quarterly |

## Open questions

| # | Question | Blocks |
|---|---|---|
| OQ-9 | Buy or build? Two platforms cover all nine ports; the repo plans 12 tables for a capability the business model says is not differentiating | Everything below it. Decide first |
| OQ-7 | What enforces the pre-handover rule? Customs owns it, Routing performs the act, no edge connects them | Routing build |
| OQ-2 | A carrier refuses a sealed container after the declaration is submitted — is the declaration amended, withdrawn, or left standing? Nobody agrees who owns this | Recovery path |
| CU-1 | How does Customs resolve `containerId` to shipments? | The inbound trigger |
| CU-7 | What is the declaration lifecycle? `status` exists with no stated values | The aggregate |
| CU-8 | What happens on rejection? No event, no rule, no path | The unhappy path |
| CU-9 | Which of the nine ports differ, and how? Invoicing needed three aggregates for per-port variation; Customs models none | CU-4 |
