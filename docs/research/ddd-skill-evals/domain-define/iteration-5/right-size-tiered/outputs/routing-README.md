# Routing bounded context

## Purpose

Once a booking is confirmed, get the shipment into the hands of the partner carrier that Nordic's
standing contract names for that lane. Actors: depot planners, and the partner carriers receiving it.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting | `routing/model.yaml` (`subdomain_type`) |
| Business-model role | cost-reduction ("Carrier routing") | `business-model.md` |
| Evolution | product; does not differentiate | `business-model.md` |

Carried, not re-derived. `core-domain-chart.md` does not exist — a finding for `5-strategize`.

## Domain roles

**Gateway**, single role — it turns a confirmed booking into a handoff to an external partner network.
`aggregates_rationale` says "It owns no rule of its own", which is what a gateway should look like;
open question 1 is why that claim does not survive the stated rules.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Booking | bounded context | `BookingConfirmed` | event | unstated on disk — `model.yaml` records direction (`downstream`), not a context-mapping pattern |

Provenance: `docs/domain/message-flows/` does not exist, so nothing is traced. `BookingConfirmed` is
read off `aggregates_rationale`; it is event #5 in `discovery/timeline.md` (planner).

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| PartnerNetwork | external system | `ShipmentHandedToCarrier` (`bookingId`, `carrierId`) | event | unstated on disk (`downstream`, marked external) |

Swimlane: `BookingConfirmed` in → pick the carrier the lane's standing contract names → `ShipmentHandedToCarrier` out. One decision, and it is a lookup — a pass-through worth questioning.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Lane | the origin–destination pair a standing contract is priced against | not stated on disk |
| Standing contract | the pre-agreed carrier assignment for a lane; Routing reads it, never sets it | not stated on disk |
| Handoff | the moment custody passes to the partner carrier | "consignment" is contested (finance vs ops) but not used here |

All three are read off `routing/model.yaml`'s rationale. `discovery/` records no Routing term at all,
so this section is weaker than it looks — a gap for `1-understand`.

## Business decisions

- **A shipment cannot be handed to a carrier before its declaration is submitted** — customs clerk
  (`discovery/timeline.md`). The only stated rule binding Routing's outbound event, and who enforces
  it is recorded nowhere.
- Nothing else. `model.yaml` declares zero invariants; no rule was invented to fill the section.

## Assumptions

- *(inferred)* Every lane has exactly one standing contract, so selection is a lookup and never a
  choice — implied by `aggregates_rationale`, stated by nobody.
- *(inferred)* A handoff is final: once `ShipmentHandedToCarrier` fires, Routing never re-routes. No
  re-routing, cancellation or carrier-refusal message exists on disk.
- *(inferred)* Routing holds no state worth an aggregate. Its mass (3 tables, 17 attributes, densest
  entity 9) is consistent with that, but mass is not proof.

## Open questions

1. **The confirmed timeline contradicts the confirmed rule.** `discovery/timeline.md` orders
   `ShipmentHandedToCarrier` (#6) *before* `DeclarationSubmitted` (#8), while the customs clerk's
   stated rule forbids exactly that ordering. Both are marked confirmed. Either the timeline is
   wrong, or the rule is enforced upstream of Routing by someone who has not said so.
2. Does Routing enforce that precondition? If so, "owns no rule of its own" is false and Routing needs
   an invariant and something to hold it — a finding for `3-decompose`, not an edit here.
3. **Who owns a refused container?** Hotspot #3 (planner): "Nobody knows who is responsible when a
   partner carrier refuses a sealed container." Refusal is the inverse of Routing's only outbound
   event, has no message on disk, and sits exactly on this boundary.
4. What context-mapping pattern governs Booking → Routing and Routing → PartnerNetwork? `model.yaml`
   records direction only; conformist to the partner network is likely and was never written down.
5. Tier — the `7-define` worked example calls Routing a **stub**, the header assigned **light** (≤ 90 lines), which is what got written. Recorded, not acted on. No prior README existed; this is a first canvas, not a delta-merge.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Routing and Booking change in the same PR < 20% of Routing's changes over the next quarter | Above that, the gateway is coupled to Booking's model and the boundary is wrong | CI / VCS commit history |
| Carrier refusals and manual re-routes per week | Any non-zero rate falsifies the "handoff is final" assumption and buys Routing an aggregate | live system / planner logs |
| Handoffs recorded before their `DeclarationSubmitted` | Distinguishes a wrong timeline from an unenforced rule — resolves open questions 1 and 2 | production event log |
