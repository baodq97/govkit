---
id: DOMAIN-BC-0005
title: Customs bounded context — canvas
status: draft
owner: TBD
date: 2026-07-27
canvas: medium
---

# Customs bounded context

> Right-sizing: **medium canvas**. It is a compliance enforcer with a stated, attributed rule and an
> unresolved buy-vs-build question, so it gets the interface, the rule, and the three skipped
> sections — but not the full critique, because nothing about its interface is contested today.
>
> Created by `domain-define` on 2026-07-27 from `customs/model.yaml`, `context-map.md`,
> `business-model.md` and `discovery/timeline.md`.

## Purpose

Declare each shipment to the customs authority of the port it moves through, and hold the shipment
back until that declaration has been made, so that goods are never handed to a carrier illegally.

Key actors: the customs clerk who prepares and chases declarations; the port authorities that
receive them.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` per `context-map.md` (*"regulated, and mistakes are expensive"*) — **contested** by `business-model.md` (*"no differentiation — required, and two vendors already do it well"*) | both files |
| Business-model role | compliance enforcer | `business-model.md` |
| Evolution | product | `business-model.md` |

Carried, not re-derived. *Regulated and expensive to get wrong* is an argument for care, not for
core: `business-model.md` says two commercial platforms already cover all nine ports, and
`customs/model.yaml` notes *"we integrate with neither"*. A compliance enforcer at product evolution
stage that is custom-built in-house at 12 tables / 96 attributes is the classic build-what-you-could-
buy shape. That is a `domain-strategize` decision, recorded here, not taken here.

## Domain roles

- **Gateway** — it translates Nordic Freight's shipments into the format each port authority
  demands. Most of its mass (96 attributes, densest entity 34) is plausibly this translation.
- **Execution** — it enforces one workflow rule: no handover before submission.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Consolidation | bounded context | `ContainerSealed` (containerId, fillRate) | event | conformist (Customs takes the payload as published) | `consolidation/model.yaml`; timeline #7 |
| Port authority | external system | clearance response | event | **unknown pattern** — no integration is described anywhere | inferred from `DeclarationCleared` (timeline #9) |
| Customs clerk | direct user interaction | prepare / submit declaration | command | — | clerk is the confirming source for events #8 and #9 |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Port authority | external system | declaration submission | command | anti-corruption layer (**proposed** — nine ports, one internal model) | `DeclarationSubmitted`, timeline #8 |
| Invoicing | bounded context | `DeclarationCleared` (declarationId, clearedAt) | event | published language (**proposed**) | `model.yaml`; timeline #10 depends on it |
| — | — | `DeclarationSubmitted` (declarationId, portCode) | event | — | `model.yaml`; timeline #8 |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Declaration | The filing made to one port authority for one shipment | Not used elsewhere |
| `ShipmentRef` | The identity a declaration is filed against | Shared building block with Booking, Consolidation, Invoicing |
| Cleared | The authority has released the goods | Invoicing depends on this meaning: *"an invoice line must reference a cleared declaration"* |
| Port code | Which authority's rules apply | Invoicing also partitions by port, but for VAT |

## Business decisions

- **A shipment cannot be handed to a carrier before its declaration is submitted.** — *customs
  clerk, 2026-05-25 (`discovery/timeline.md`)*. Also the `model.yaml` invariant.

  The rule is stated and owned here, but the *action it forbids* belongs to Routing
  (`ShipmentHandedToCarrier`), and Routing has no relationship with Customs in the context map. As
  written, no context can enforce this rule. That is finding F6.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Correctness | A shipment must never reach a carrier undeclared | zero tolerance (regulatory) | customs clerk | **yes** — the rule needs an enforcement point that can actually block the handover |
| Auditability | Declarations and clearances must be reconstructible for audit | retention period **unknown** — the clerk can supply it | customs clerk (implied by regulation; the period was not asked) | **yes if a period exists** — declaration history becomes domain state |
| Availability | What happens when a port authority system is down? | unknown | not asked | possibly — a queued/outbox model rather than a synchronous submit |
| Change cadence | Port rules change by jurisdiction; nine ports, two more planned | unknown | inferred from the port expansion goal | no |

## Assumptions

1. **(inherited, unattributed)** Declaration is triggered by `ContainerSealed`. The timeline puts
   sealing (#7) before submission (#8), but no one stated that sealing is the trigger.
2. **(domain, inferred)** One declaration per shipment per port. The model has a single
   `shipmentRef` and a single `portCode` on `Declaration`; multi-leg movements across two ports
   would break that and nobody was asked about them.
3. **(domain, inferred)** A rejected or amended declaration is out of scope — the model has only
   *submitted* and *cleared*; there is no rejection event.
4. **(inferred)** The nine ports' filings differ enough to justify a custom model rather than one of
   the two commercial platforms. No one stated this; it is the implicit justification for 12 tables.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Handovers occurring before submission | The rule is unenforced in practice (currently nothing can enforce it) | production: compare `ShipmentHandedToCarrier` and `DeclarationSubmitted` timestamps |
| Declaration rework / amendment rate | The "no rejection" assumption is wrong and the model is missing a state | customs clerk's queue / production |
| Cost and change volume of this context vs a vendor licence | Whether building beat buying | issue tracker (change volume) + finance (vendor quote) |
| Change coupling with `invoicing/` | Whether the cleared-declaration dependency has grown into a single unit of change | CI / VCS history |
| Attributes added per new port | Whether the model scales to 11 ports or explodes per jurisdiction | VCS history against the port rollout |

## Open questions

1. Why do we integrate with neither commercial platform when both cover all nine ports?
2. What is the retention period for declarations, and who audits them?
3. What happens when a declaration is rejected or must be amended? No state exists for it.
4. Who blocks the handover when a declaration is not yet submitted — Routing does not know about
   Customs, and Customs does not know about Routing.
5. Can one shipment need declarations in more than one port?

## Findings for other skills

| # | Finding | Owner |
|---|---|---|
| F6 | The declaration-before-handover rule has no enforcement point: rule in Customs, action in Routing, no relationship between them | `domain-connect` |
| F11 | Customs is labelled core but is a compliance enforcer at product evolution with two vendors covering all nine ports — buy-vs-build unexamined | `domain-strategize` |
| F12 | No declaration rejection / amendment state in the model | `domain-decompose` |
