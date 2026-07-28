<!-- id: DOMAIN-BC-0006 · status: draft · owner: TBD · 2026-07-28 -->

# Routing bounded context

Canvas tier: **stub**. Supporting (`context-map.md`, `model.yaml`), cost-reduction at product stage
(`business-model.md` — "Carrier routing"), no aggregates, and per `model.yaml` it "owns no rule of
its own". A stub is the whole canvas it earns.

## Purpose

Hand a confirmed shipment to the partner carrier that the standing contract names for that lane.
Actors: the partner carriers, and the planners who find out when a handoff fails.

## Domain role and interface

**Gateway** to the external Partner Network; a transaction script with no domain model. Interface not
traced — from `model.yaml` + the discovery timeline.

| Direction | Collaborator | Message | Type |
|---|---|---|---|
| in | Booking | `BookingConfirmed` (bookingId, containerId) | event |
| out | Partner Network (external) | `ShipmentHandedToCarrier` (bookingId, carrierId) | event |

## Open questions

1. Hotspot #3 — who is responsible when a partner carrier refuses a sealed container? A planner
   raised it; no context claims it, and this one owns no rule.
2. Nothing enforces the customs clerk's rule (no handoff before a declaration is submitted) at the
   point of handoff, which happens here.
3. `model.yaml` puts Routing *downstream of* the Partner Network while `context-map.md` has it
   forwarding *to* the network. One direction is wrong.
4. If this context owns no rule, who models the standing contract that selects the carrier?
