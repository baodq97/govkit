Domain model updated for cold chain. One new bounded context, six existing ones touched, nothing overwritten — all planner notes are intact (verified by grep, listed at the bottom).

## The main modelling call

Temperature integrity got its **own bounded context (`ColdChain`)**, not a field on `ContainerLoad`.

The reason is lifecycle, not size. Consolidation's aggregate is finished the moment the container is sealed; the cold chain obligation *starts* there and runs to the destination depot. "Depot to depot" is a custody chain that outlives every aggregate you already have, and it survives handovers into Routing and out to a partner carrier. Bolting it onto `ContainerLoad` would have given you an aggregate that has to stay alive for the whole voyage in a context whose job ends at the depot gate.

Two aggregates inside it, deliberately split:

- **`ColdChainJourney`** — legs, custody, excursions, monitoring coverage.
- **`TemperatureBreach`** — its own root, because the journey ends at unseal but the breach case keeps running through customer notification, apportionment with the carrier, and any credit note. Two lifecycles with different end dates should not share a transaction boundary.

The word that does the most work is the split between **excursion** and **breach**. An excursion is physical and always logged; a breach is contractual and adjudicated. Door-open at transshipment produces excursions on every reefer job — if the two words are one word, every job breaches and the log becomes noise nobody reads. Your brief says "a breach has to be logged"; what you actually need logged is *both*, with the judgement recorded separately from the observation.

Raw readings are explicitly **not** in the aggregate. Ten days at one reading a minute is ~14k readings; that is a stream behind a gateway, and only derived excursions and gaps get written into the aggregate.

## Three consequences you should see before you build anything

**1. `ConsignmentLine` is Shared Kernel, and it just changed.**
The temperature regime belongs on the consignment line — it is a property of the goods, exactly parallel to the `hazardClass` field already sitting there. But your own context map marks `ConsignmentLine` as Shared Kernel between Booking and Consolidation, both writing it. This field cannot ship from one side. Same release, both teams.

**2. Capacity stopped being one-dimensional, and it works against your fill-rate goal.**
A reefer runs one temperature band per departure. A chilled pallet and a frozen pallet cannot ride the same box however much volume is free. So a container can be half empty and still unusable for the consignment in front of you — the invariant *"committed volume must never exceed capacity"* is still true and no longer sufficient.

That collides head-on with the short-term goal in `business-model.md`: raise average fill from 71% to 80%. A band-restricted container can only be filled from the consignments in that band. **Expect measured fill to fall on reefer departures before it rises.** Either fill rate is the wrong measure for reefer (measure breach rate and margin per shipment instead), or reefer volume has to reach the point where each band fills its own containers — and until it does, the premium is paying for empty space. That is a P&L question, and `business-model.md` has recorded since May that nobody in the room owns the P&L. Same missing person.

**3. Notifications is now being asked for something it does not do.**
This is the sharpest one. Every message that context sends today is courtesy traffic — a lost invoice email is an annoyance, and a bought fire-and-forget adapter classified `generic` is the right call for that. A breach notification is contractual, deadlined, and `ColdChain` cannot close a breach case without an acknowledgement. That needs delivery receipts, retry with escalation, and an auditable send record.

Three options, written into `notifications/model.yaml`:

| | Option | Cost | Trade-off |
|---|---|---|---|
| **1 (recommended)** | Keep Notifications generic; `ColdChain` owns the obligation and treats sends as attempts | Smallest | Obligation sits with the context carrying the liability; costs ColdChain a delivery-tracking concern |
| 2 | Split an `ObligatedNotice` capability out for deadlined sends | Medium | Honest boundary, but a whole context for one message type |
| 3 | Promote Notifications to supporting, build guaranteed delivery in | Highest | Upgrades commodity traffic nobody asked to upgrade |

Take (1) now. The signal to move to (2) is a *second* deadlined notification type. What you must not do is leave the context marked `generic` while ColdChain quietly depends on delivery guarantees it does not provide.

## What I deliberately did not do

- **No new aggregate in Invoicing.** The reefer premium is a row in the existing `SurchargeSchedule`; breach remediation is the existing `CreditNote` with a `breachId` as reason. At 34 tables and 311 attributes that context is already the heaviest thing you run — a sixth aggregate needs a better reason than "cold chain is new".
- **No rule moved into Routing.** The planner's note says Routing "owns no rule of its own", and that is still true. The handover now reports *who took custody and at what temperature*; it does not decide whether that reading is a breach. Putting the tolerance check in the handover step is the obvious shortcut and the one to refuse — it would duplicate the same judgement in two contexts.
- **`customs/model.yaml` untouched.** Perishable and veterinary declarations may need the regime or the breach record. No customs clerk has been asked, and guessing would put unsourced structure into a regulated context. It is an open question in the context map, not a silent edit.
- **`timeline.md`'s session record not rewritten.** No session was held for cold chain, so I could not add confirmed events to a table whose whole value is its provenance. New events went into a dated addendum, every one marked `unconfirmed`, each with the named role that has to confirm it. Same for the four business rules I had to assume.
- **No fabricated mass.** Every other context carries a measured mass; `cold-chain/model.yaml` carries an estimate explicitly labelled as one, and says not to rank it against the measured figures.

## Invariants worth arguing about

The one that will get pushback: **an unmonitored interval is treated as non-compliant, not compliant.** Silence is not evidence of holding temperature, and the customer's claim will make exactly that argument. Expect operations to resist it because it converts telemetry outages into liability — which is the point, since it prices the telemetry contract honestly.

Also: **the regime is frozen at booking and cannot be edited in place.** Widening the agreed range mid-transit is a contract amendment. Without this, a breach can be made to disappear afterwards by editing the number it was judged against.

One small win: the custody-leg model forces exactly one accountable party at every instant, which partly closes hotspot #3 from your May session (*"nobody knows who is responsible when a partner carrier refuses a sealed container"*). Temperature liability is now attributable. Refusal of a sealed container is still open.

## Files

**Added:** `docs/domain/cold-chain/model.yaml`

**Extended (append-only, no rewrites):** `context-map.md` (map, subdomain row, `TemperatureRegime` as Published Language, cold-chain impact section), `business-model.md` (canvas deltas + capability row + the fill-rate tension), `discovery/timeline.md` (dated addendum), `booking`, `consolidation`, `quoting`, `routing`, `notifications`, `invoicing`.

**Planner notes verified intact:** Consolidation's Gothenburg whiteboard note, Invoicing's eleven-years/VAT note, Customs' two-platforms note, Routing's `aggregates_rationale`, Notifications' `aggregates_rationale`, Booking's synchronous-capacity-check relationship note, and the context map's "not revisited since March" note. All eight `model.yaml` files parse.

## What to settle next

1. **Contractual notification window** for a breach — assumed to exist, value unknown, and an invariant depends on it.
2. **Excursion tolerance numbers** — contract terms, will differ per customer, and no one who owns contract terms has been in a modelling session yet.
3. **Who pays for a breach** — us, the carrier, or insurance. Different money, different counterparty.
4. **Core or supporting for ColdChain** — I marked it core on the Customs precedent (regulated, expensive mistakes), not on differentiation. If cold chain stays a single account it is a compliance obligation, not a core capability. Decide after the second cold chain customer.
