# Quoting bounded context

> Tier **light** per the model header — deep sections and the interface critique are out of scope.

## Purpose

Tell a prospective customer what a shipment on a given lane will cost and how long that price holds,
so they can decide to book. Actors: the customer asking for a price, and the commercial staff who
stand behind the number once it is issued.

No source states this — reconstructed from the aggregate, the two events and the context map's "first
thing the customer sees"; a proposal to confirm, not a fact.

## Strategic classification

Domain type **core** (`context-map.md`) · role **engagement creator**, differentiates **partial**,
evolution **product** (`business-model.md`). Carried, not re-derived; they disagree — question 2.

## Domain roles

**Draft context**: it holds a price that is not real until someone books against it; its one invariant
is how long that draft stays valid. No analysis role — nothing shows *how* a price is computed.

## Inbound communication

_Nothing traced._ `docs/domain/message-flows/` does not exist and no artifact names a message sent
**to** Quoting; the context map gives direction only. The finding, not a gap to fill: the
customer-facing context has no modelled way for a customer to ask it anything. Discovery attendance:
"No customer present."

## Outbound communication

| Collaborator | Type | Message | Msg type | Relationship | Source |
|---|---|---|---|---|---|
| _unrecorded_ | — | `QuoteRequested` (customerId, laneId, volumeM3) | event | — | timeline #1, planner |
| _unrecorded_ | — | `QuoteIssued` (quoteId, price, validUntil) | event | — | timeline #2, planner |
| Tariff Data | external system | _unnamed_ | — | — | `context-map.md` |

Both are recorded as *emitted by* Quoting. `QuoteRequested` emitted by the context that answers the
request reads like an inbound command renamed as an event. Consumers unrecorded → no relationships.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Quote | A priced offer for one lane, valid until `validUntil` | not stated elsewhere |
| Lane | The origin/destination pair being priced (`laneId`) | not stated elsewhere |
| Validity window | The period an issued price can still be accepted | not stated elsewhere |
| Volume (m3) | What the customer declares to get a price | Consolidation treats volume as the container constraint (planner rule) |

"Consignment" — the term finance and operations disagree about (hotspot 2) — is absent from this
context's model; Quoting prices `volumeM3`. Clean escape or unnoticed translation, untested.

## Business decisions

- *"The premium is charged whether or not the container ends up full"* — finance analyst, timeline.
  A pricing rule (Quoting) and a billing rule (Invoicing). Nobody assigned it; left unowned.
- Declared invariant (`model.yaml`): *a quote cannot be accepted after its validity window.* But
  acceptance is not an event Quoting emits and Booking is downstream — stated here, exercised next door.

## Assumptions

- *(inferred)* Price comes from tariff data plus lane and volume. Nothing states the inputs.
- *(inferred)* The Tariff Data relationship is conformist. No adapter is described.
- *(inferred)* One quote covers one lane — single `laneId`; multi-leg pricing never discussed.
- *(inferred, scale)* Volume is low enough to evaluate expiry on read. No volume figure exists.

## Verification metrics

| Metric | What it would tell us | Source |
|---|---|---|
| Quoting PRs also touching Booking (target < 25% at 3 months) | If high, the validity rule lives in Booking and the cut is wrong | VCS / CI |
| Quotes accepted after expiry | Whether the validity window is enforced anywhere | production |
| Attributes modelled vs the 78 declared (now 4) | Whether this context is modelled or only labelled | `model.yaml` vs schema |

## Open questions

1. Who asks Quoting for a price, and with what message? No inbound message exists anywhere.
2. `context-map.md` says core; `business-model.md` says partial differentiation at product stage.
   Which governs? (`5-strategize` owns it. The map "has not been revisited since March".)
3. Who owns "the premium is charged whether or not the container ends up full" — Quoting or Invoicing?
4. Does Quoting price a *consignment* in the finance sense, pulling hotspot 2 in here?
5. Is `QuoteRequested` an event, or the inbound command recorded from the wrong side?

## Proposals for other steps (not applied here)

- `3-decompose`: declared mass 11 tables / 78 attributes vs one entity with 4 attributes modelled —
  95% unaccounted; either the mass covers something else or the aggregate is a stub.
- `4-connect`: trace one flow into Quoting; every interface finding above is blocked on it.
- `5-strategize`: reconcile the two classifications (open question 2).
