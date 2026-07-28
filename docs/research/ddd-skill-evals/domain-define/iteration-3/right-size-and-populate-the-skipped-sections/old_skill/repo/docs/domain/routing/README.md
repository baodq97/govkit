---
id: DOMAIN-BCC-0006
title: Routing — bounded context canvas (stub)
status: draft
owner: TBD
date: 2026-07-28
---

# Routing bounded context

> **Stub by design.** Routing owns no rule of its own (`model.yaml`), so it gets purpose, interface
> and open questions. That is complete, not lazy.

## Purpose

Hand each confirmed shipment to the partner carrier that the standing contract names for that lane.
Actors: depot planners, and the partner carriers in the nine ports.

## Strategic classification — carried, not re-derived

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting | `context-map.md` (consistent with `business-model.md`: "the partner network is the asset, not the routing step") |
| Business-model role | cost reduction | `business-model.md`, depot planners |
| Evolution | product | `business-model.md` |

## Interface

| Direction | Collaborator | Message | Type | Relationship |
|---|---|---|---|---|
| Inbound | Booking (bounded context) | `BookingConfirmed` | event | pattern **unstated** |
| Outbound | Partner Network (external system) | handover — `ShipmentHandedToCarrier` (bookingId, carrierId) | command → event | **unstated**; conformist is likely but nobody agreed it |

## Assumptions

- *(inferred)* Exactly one carrier per lane, from a standing contract, with no fallback when it refuses.
- *(inferred)* Handover is irreversible once the event is emitted.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Handovers that precede the shipment's `DeclarationSubmitted`. Prediction: **0** | whether the customs rule is enforced at the only place that can enforce it | production event ordering |
| Handovers refused by a carrier, per month | whether the unowned hotspot 3 path is rare or routine | production / planner reports |

## Open questions

- Routing performs the act the customs rule constrains ("no handover before the declaration is
  submitted") but owns no rule. Should the check live here? `discovery/timeline.md` orders the
  handover (#6) *before* the submission (#8), which suggests nothing enforces it today.
- Who is responsible when a partner carrier refuses a sealed container (hotspot 3)?
- A context with no rules and one event is a candidate to fold into Booking. Nobody has argued
  either way — a decision for `3-decompose`.
