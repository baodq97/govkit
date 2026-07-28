---
id: DOMAIN-BC-0004
title: Routing bounded context — stub canvas
status: draft
owner: TBD
date: 2026-07-27
canvas: stub
---

# Routing bounded context (stub)

> Right-sizing: **stub**. `business-model.md` rates carrier routing cost-reduction, product, no
> differentiation — *"the partner network is the asset, not the routing step"* — and
> `routing/model.yaml` says it *"owns no rule of its own"*. A full canvas here would be ceremony.
> This stub is complete, not lazy: purpose, the adapter interface, and the one structural question
> that has to be answered before anyone builds it.
>
> Created by `domain-define` on 2026-07-27.

## Purpose

Hand a confirmed shipment to the partner carrier that holds the standing contract for its lane.

Key actors: the partner carriers; the depot planner who hears about it when a carrier refuses.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting | `context-map.md` |
| Business-model role | cost reduction | `business-model.md` (depot planners) |
| Evolution | product | `business-model.md` |

Consistent across both upstream files — the only context in the repo where they agree.

## Domain roles

**Gateway** to the partner network. No analysis, no workflow of its own.

## Interface

| Direction | Collaborator | Message | Type | Relationship |
|---|---|---|---|---|
| in | Booking | `BookingConfirmed` (bookingId, containerId) | event | conformist — Routing takes Booking's payload as-is |
| out | Partner Network (external) | shipment handover | command | anti-corruption layer (**proposed**; today it forwards unchanged) |
| out | — | `ShipmentHandedToCarrier` (bookingId, carrierId) | event | — |

### Swimlane view

| In | Decision made here | Out |
|---|---|---|
| `BookingConfirmed` | **none** — carrier selection is determined by the standing contract for the lane | `ShipmentHandedToCarrier` |

A lane with no decision between in and out is a pass-through. That is the finding, and it is why
this context does not get a canvas: there is nothing yet to design.

## Business decisions

**None.** `model.yaml` states it outright: *"It owns no rule of its own."* The one rule that should
constrain this context — *a shipment cannot be handed to a carrier before its declaration is
submitted* (customs clerk, 2026-05-25) — is owned by Customs, and Routing has no relationship with
Customs in the context map.

## Assumptions

1. **(domain, inferred)** Exactly one standing contract exists per lane, so carrier selection is a
   lookup rather than a choice. If a lane ever has two carriers, this context acquires a real
   decision and stops being a pass-through.
2. **(domain, inferred)** A carrier never refuses. Hotspot #3 says otherwise — *"nobody knows who is
   responsible when a partner carrier refuses a sealed container"* — and there is no refusal message
   anywhere in the model.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Carrier refusals per month | Whether the happy-path-only model is tenable | operations / incident tracker |
| Lanes with more than one contracted carrier | Whether a selection decision has appeared, promoting this from pass-through to a real context | contract register |
| Handovers preceding a `DeclarationSubmitted` | Whether the compliance rule is being broken at the point where nothing enforces it | production, comparing event timestamps |

## Open questions

1. Should Routing exist as a context, or is it Booking's outbound adapter? It makes no decision
   today. (Finding for `domain-decompose`; not decided here.)
2. Who is responsible when a carrier refuses a sealed container — Routing, Consolidation or Booking?
   Hotspot #3, raised by a planner, still unanswered.
3. Should Routing be the enforcement point for the declaration-before-handover rule, since it owns
   the handover?

## Findings for other skills

| # | Finding | Owner |
|---|---|---|
| F17 | Pass-through with no decision between inbound and outbound — candidate for absorption into Booking | `domain-connect` / `domain-decompose` |
| F6 | The declaration-before-handover rule has no enforcement point; Routing owns the action but does not know about Customs | `domain-connect` |
