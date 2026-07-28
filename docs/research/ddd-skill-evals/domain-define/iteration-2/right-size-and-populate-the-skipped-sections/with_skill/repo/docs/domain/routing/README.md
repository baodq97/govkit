# Routing bounded context (stub)

> *Canvas v5, `7-define`, 2026-07-28 — new file; `model.yaml` unchanged.*
> **Depth: stub.** Supporting in `context-map.md`; cost-reduction / product / no differentiation in `business-model.md` ("the partner network is the asset, not the routing step" — depot planners). `model.yaml` states it owns no rule of its own and has no aggregate, so anything deeper would describe a pass-through. **Provenance:** `4-connect` has not run; *inferred* means guessed.

## Purpose

Hand a confirmed shipment to the partner carrier the standing contract names for that lane. Actors: depot planners; the partner carriers.

## Interface

| Direction | Collaborator | Message | Type | Source |
|---|---|---|---|---|
| in | Booking | `BookingConfirmed` | event | `booking/model.yaml`; timeline #5 |
| out | Partner Network (external) | handover of the shipment | command (*inferred*) | `model.yaml` external relationship; no message named on disk |
| out | — | `ShipmentHandedToCarrier` | event | `model.yaml`; timeline #6. **No consumer recorded** |

**Swimlane check:** in → *carrier lookup from the standing contract* → out — the only decision is a table lookup, which is what a pass-through looks like on a canvas.

## Business decisions
None stated. The one rule that touches it — no handover before the declaration is submitted (customs clerk) — is owned by Customs, and nothing shows Routing observing it.

## Assumptions
- *(inferred)* One carrier per lane by standing contract; no selection, no fallback.
- *(inferred)* A carrier never refuses. Hotspot #3 says one did, and nobody owns the outcome.

## Verification metric
- How often `routing/` changes in the same PR as `booking/` over a quarter (CI / VCS, reviewed 2027-01-28). Above 50% it is not a separate context and should be absorbed.

## Open questions

1. If a carrier refuses a sealed container, who owns recovery? Hotspot #3, planner, unanswered.
2. Does Routing verify the declaration is submitted, or trust Booking? No message links Customs here.
3. Does `Lane` mean the same here as in Quoting?
4. Should this context exist, or is it a service inside Booking? No aggregate, no rule, one lookup — a candidate to absorb, for `3-decompose`.
