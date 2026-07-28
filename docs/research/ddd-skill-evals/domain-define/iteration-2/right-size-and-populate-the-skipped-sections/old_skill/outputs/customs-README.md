---
id: DOMAIN-BCC-0003
title: Customs — bounded context canvas
status: draft
owner: TBD
date: 2026-07-28
---

# Customs bounded context

> Canvas v5, supporting depth + what records a live buy-vs-build disagreement. New file; no
> `message-flows/`, so the interface comes from timeline + `model.yaml`.

## Purpose

Get each shipment legally across a border: file the declaration for the goods in a sealed container,
hold the shipment until the authorities clear it. Actors: the customs clerk, port authorities.

## Strategic classification — carried, not re-derived

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested, not resolved here** — core per `context-map.md` ("regulated, mistakes are expensive") vs differentiation *no* per `business-model.md` ("two vendors already do it well"). Risk is not differentiation; nobody has argued the core case | both, cited |
| Business-model role | compliance enforcer | `business-model.md`, 2026-05-18 |
| Evolution | product | `business-model.md` |

## Domain roles

**Gateway** (it translates shipments into the authorities' language and back) with an **execution**
edge: it holds the shipment until cleared. 96 attributes behind one aggregate is a lot for that.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Consolidation | bounded context | `ContainerSealed` | event | pattern **unstated**; Customs downstream |
| Port authority | external system | clearance decision — no agreed name | event *(unconfirmed)* | **unstated**; no integration exists today (`model.yaml`) |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Invoicing | bounded context | `DeclarationCleared` (declarationId, clearedAt) | event | pattern **unstated** |
| Port authority | external system | `DeclarationSubmitted` (declarationId, portCode) | command | **unstated** |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Declaration | The filing for one shipment at one port | — |

## Business decisions

- A shipment cannot be handed to a carrier before its declaration is submitted — *clerk, 2026-05-25*.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Auditability | prove what was declared for a shipment | retention unknown — clerk can supply | inferred from the regulated role | **yes if a retention rule exists** |
| Availability | do shipments still move when a port system is down? | unknown | inferred | **yes if "no"** — needs a hold/queue model |

## Assumptions

- *(inferred)* One declaration per shipment per port; transhipment through two is unmodelled.
- *(inferred)* Declarations are never amended — submitted and cleared, nothing else.
- *(inferred)* Clearance always arrives; a refusal has no modelled path.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Handovers preceding a `DeclarationSubmitted`. Prediction: **0** | whether the stated rule is enforced anywhere — the timeline suggests not | production events |
| Declarations amended or resubmitted per month | whether "never amended" holds | production / clerk's records |
| Teams opening work here per quarter | whether 96 attributes of compliance is one team's job or everyone's | issue tracker |

## Open questions

- Build or buy? Two platforms cover all nine ports, we integrate with neither, and no stated
  differentiation defends building.
- Who enforces "no handover before submission"? Routing performs the handover, Customs owns the
  rule, and `discovery/timeline.md` lists handover (#6) *before* submission (#8).
- What is the retention obligation, and does it constrain where declaration data may live?
- What happens when a declaration is refused rather than cleared?

## Interface critique

`DeclarationSubmitted` is typed as an event but is the command we send the authority; the event
Nordic wants is their answer. Larger defect: a rule owned by a context that cannot enforce it.
