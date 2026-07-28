# Routing bounded context

> Right-sized **supporting** (`ddd_slice.py --header`): purpose, language, communication, business decisions — plus the sections the two contested items force open.

## Purpose

Get a confirmed booking onto a partner carrier: pick the carrier the standing contract names for
that lane and hand the shipment over. Actors — depot planners, who need to know a shipment has left
Nordic's control, and the receiving partner carriers.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting | `routing/model.yaml`, header context table |
| Business-model role | cost reduction | `business-model.md` — capability "Carrier routing" |
| Evolution | product | `business-model.md`; differentiates: **no** |

Carried, not re-derived. Supporting + product + non-differentiating is the profile of a bought capability — a finding for `5-strategize`, not a re-classification here.

## Domain roles

**Gateway** — translates between Nordic's model and the external PartnerNetwork. Pattern
`transaction-script`, **zero aggregates**, rationale says it "owns no rule of its own"; one role
only, so no Brain Context risk. A gateway with no rules is legitimate; a gateway that is the only
place a stated rule *could* live is not (Open questions 1–2).

## Communication

Swimlane: `BookingConfirmed` in → pick the lane's contracted carrier → handoff, `ShipmentHandedToCarrier` out.

| Direction | Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|---|
| Inbound | Booking | bounded context | `BookingConfirmed` | event | downstream of Booking |
| Outbound | PartnerNetwork | external system | *never named upstream* | — | downstream, external |
| Outbound | *no subscriber declared* | — | `ShipmentHandedToCarrier` (`bookingId`,`carrierId`) | event | — |

`downstream` is the only relationship word upstream supplies. **No `docs/domain/message-flows/` exists** — every row is from `model.yaml`, not from an observed flow.

## Ubiquitous language

| Term | Meaning here | Differs elsewhere? |
|---|---|---|
| Shipment | goods handed over at the carrier boundary | rationale says "shipment", the event is keyed by `bookingId` — no shipment identity of its own |
| Lane | origin–destination pair that selects the standing contract | defined in no other context's artifact |
| Standing contract | the pre-agreed carrier for a lane | — |

## Business decisions

- **Carrier selection is by standing contract per lane, not per shipment** (`model.yaml` `aggregates_rationale`) — but no one in `discovery/` states it, so it has no name attached.
- Discovery states one rule landing on this exact moment: *"A shipment cannot be handed to a carrier
  before its declaration is submitted"* (customs clerk). **Routing does not enforce it** — 0
  invariants, no relationship to Customs.

## Assumptions

- *(inferred)* Every lane has exactly one standing contract, so selection cannot fail; nothing upstream says what happens when a lane has none.
- *(inferred)* Handoff is fire-and-forget — the event fires on Nordic's intent, not the carrier's acceptance, so a refusal arrives after it.
- *(inferred)* Selection never changes after `BookingConfirmed`; no re-route path exists.

## Verification metrics

| Metric | What it would tell us | Source |
|---|---|---|
| ≥70% of Routing commits also touch Booking over 3 months | Routing is a module of Booking, not a boundary | VCS/CI history |
| Handoffs later reversed or disputed per month | fire-and-forget is wrong; Routing needs state | production / planner's ops log |

## Open questions

1. Who blocks the handoff when the declaration is not yet submitted? Routing has 0 invariants and no Customs link — **the clerk's rule is enforced in no context in this model.** Highest value here.
2. Who owns a carrier's refusal of a sealed container? An unresolved hotspot (planner); Routing is the only context touching PartnerNetwork, so it lands here by elimination, not by decision.
3. Conformist or ACL with PartnerNetwork — undecided, and it is the whole design of a gateway.
4. Who consumes `ShipmentHandedToCarrier`? No subscriber declared anywhere.
5. Generic rather than supporting, if it is bought? For `5-strategize`.

## Interface critique

- **Q3/Q5** — one event in, one event out, a lookup between; folding it into Booking costs the one seam where questions 1–2 could be enforced, so keep the boundary and give it those rules.
- **Q2** — if the customs rule is real, the handoff must be a command Routing can *reject*.
- Quality storming has not run here; no quality attribute elicited or numbered.

## Proposed deltas (owned by other steps — not applied here)

| Target | Proposal |
|---|---|
| `3-decompose` / `model.yaml` | add the declaration-submitted precondition as a Routing invariant, or record which context owns it |
| `3-decompose` / `context-map.md` | Routing↔Customs relationship missing; name the PartnerNetwork pattern |
| `5-strategize` | re-test supporting vs generic given product-stage + non-differentiating |
| `4-connect` | no `message-flows/`; this interface is model-derived, not observed |
