# Booking bounded context

> Bounded Context Canvas v5 + Quality Storming. **No prior README existed** — `3-decompose` emitted
> `model.yaml` only, so this is a first canvas, not a delta-merge. Everything below is sourced; where
> a source is missing that absence is written down rather than filled.
> Scope: Booking only (declared `core`). Neighbours are cited, not canvassed.

## Purpose

Take a customer's decision to ship a part load and turn it into a commitment: a consignment on a
named departure, at an agreed price, that Nordic Freight has undertaken to move. Actors served:
the exporter placing the booking, and the depot planners who inherit the commitment.

*Boundary check: the purpose states cleanly without an "and also".*

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` | context-map.md sub-domain table — "where the money is committed"; also `model.yaml`. **Both are the same March session, self-cited; the map says it "has not been revisited since"** |
| Business-model role | **not carried** | business-model.md has no capability row for Booking. Nothing to cite |
| Evolution | **not carried** | same absence |

Not re-derived here (hard rule). Two facets are simply unavailable — see Open questions 6.
Note for `5-strategize`: the one capability business-model.md marks as differentiating is *"Load
consolidation / container fill optimisation"*, which lives in **Consolidation** — classified
`supporting`. Booking is labelled core on a different basis (money) than the business model uses
(differentiation). Finding, not an edit.

## Domain roles

**Execution** (enforces the request → reserve → confirm workflow) and **draft** (a booking is
work-in-progress until capacity comes back). The draft half is unmodelled: `Booking.status` exists
as an attribute, but no message announces entry or exit from the pending state.
Not a Brain Context — outbound is events, not commands.

## Inbound communication

> **Derived from `model.yaml` relationships + the discovery timeline ordering — no message flows are
> traced in this repo** (`4-connect` has not run; the context pack reports "nothing on disk"). Which
> side initiates cannot be established from the artifacts, so every row below is a proposal to
> confirm, not observed use.

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| Customer / frontend | user interface | *unnamed* — the act that creates a booking | command | — |
| Quoting | bounded context | `QuoteIssued` (timeline #2, precedes #3) | event | unstated |
| Consolidation | bounded context | `CapacityReserved` (timeline #4) | event | customer/supplier + **shared kernel** on `ConsignmentLine` |

The command that starts a booking is **absent from every artifact**. `model.yaml` declares
`domain_events` only: the context has no modelled command or query surface at all.

## Outbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| (any subscriber) | — | `BookingRequested` (bookingId, departureId, volumeM3) | event | published language |
| (any subscriber) | — | `BookingConfirmed` (bookingId, **containerId**) | event | published language |
| Consolidation | bounded context | remaining-capacity check | **query** | — |
| Consolidation | bounded context | reserve | **command** | — |

The last two rows are one line in `model.yaml`: *"synchronous remaining-capacity check before
reserving"*. Split out here because the split is the problem — see critique Q2.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Booking | a customer's committed request to move a consignment on a given departure | — |
| Consignment | the goods a customer hands over as one unit | **contested** — hotspot 2: finance reads it as a billable line, operations as a physical stack of pallets |
| ConsignmentLine | line with volume, weight, **hazardClass** | **yes** — Consolidation's `ConsignmentLine` carries `stackable`, not `hazardClass`. Same name, different attributes, **both contexts write it** (context-map, Shared Kernel) |

## Business decisions

Stated in discovery, with attribution:

- The premium is charged whether or not the container ends up full — finance analyst.
- A container's committed volume must never exceed its capacity; overbooking bumps a shipment and
  breaks the Guaranteed Consolidation promise — planner, 2026-05-25. *Stated about Consolidation's
  invariant, but Booking is the context that can violate it.*

`model.yaml`'s invariant — *"a booking may only be confirmed once its capacity has been reserved"* —
was not stated by anyone in discovery. It is treated as an assumption below.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two bookings must never commit the same container slot | — | planner, hotspot 1 (March incident) | **yes** — the invariant, and therefore the aggregate boundary |
| Availability | Booking cannot confirm while Consolidation is unreachable | unknown | *inferred* from the synchronous check; nobody stated a requirement. Commercial director could supply | **yes if a requirement exists** — it would forbid the sync call |
| Auditability | prove which consignments were committed to a sealed container | unknown | customs clerk stated the declaration rule; retention period never discussed | **likely yes** — history as domain state |
| Latency / volume / growth | — | unknown | never asked | — |

## Assumptions

- *inferred*: capacity is reserved exactly once and never re-reserved or re-planned after
  confirmation — no re-plan or release message exists anywhere in the model.
- *inferred*: `containerId` is known at confirmation time (implied by the `BookingConfirmed` payload).
- *inferred (scale)*: booking volume is low enough that a synchronous cross-context check is
  acceptable. No throughput number exists in any artifact.
- *inferred*: a booking's only published outcome is confirmation — there is no message for a bump,
  cancellation, or rejection, although the planner's rule says bumping happens.
- *contested, so moved to Open questions*: that Booking's `ConsignmentLine` and Consolidation's are
  the same thing (hotspot 2).

## Verification metrics

| Metric | Prediction / what it would tell us | Source |
|---|---|---|
| Change coupling Booking↔Consolidation | < 25% of PRs touching `booking/` also touch `consolidation/` or `ConsignmentLine`, over 3 months. Above that, the shared kernel is a boundary error | VCS / CI |
| Duplicate slot commitments | 0 per month once the check is one command. Any recurrence falsifies the fix | incident tracker / production |
| Queries on the Booking→Consolidation edge | → 0. Any remaining read-then-act is the March race still live | gateway / API logs |
| Confirmations blocked by Consolidation downtime | per month; tells us whether the sync dependency is a real constraint or a theoretical one | production telemetry |

## Open questions

1. Where does the overbooking check live? Unresolved since March (hotspot 1) — and it is the
   question this interface freeze would answer by default.
2. Does "consignment" mean finance's billable line or operations' pallet stack (hotspot 2)?
3. Who owns writes to `ConsignmentLine`? Today both contexts do, by declaration.
4. What does Booking publish when a shipment is bumped, or when a carrier refuses a sealed
   container (hotspot 3)? Invoicing charges the premium regardless — it has nothing to react to.
5. Is Booking↔Routing inbound or outbound? `model.yaml` says `{ to: Routing, type: upstream }`;
   context-map.md says `Booking --publishes to--> Routing`. These disagree.
6. Is Booking core, and on what basis? No capability row exists in business-model.md.
7. Retention/auditability period for consignment history — customs clerk could supply.
8. Availability requirement on booking confirmation — commercial director could supply.

Eight open questions on a `core` context whose interface is about to be frozen. Neither session that
produced this evidence had a customer present, and **nobody responsible for the product** attended
the discovery session (two planners, one customs clerk, one finance analyst, three engineers).

## Interface critique

1. **Names coherent?** As a pair, yes — both past-tense facts, both consistent with the purpose. As
   a lifecycle, no: only the happy path has a name.
2. **Right types?** No, and this is the main finding. The Consolidation collaboration is a *query*
   (remaining capacity) followed by a *command* (reserve) across a boundary — read-then-act, which
   is precisely hotspot 1's March double-commit. Collapse into one command
   `ReserveCapacity(bookingId, departureId, volumeM3)` that Consolidation accepts or rejects, with
   `CapacityReserved` / a rejection event as the outcome. Separately, the inbound command that
   *creates* a booking is unnamed and unmodelled.
3. **Too big?** The opposite. Two events and zero commands against 9 tables / 54 attributes / a
   22-attribute entity: the widest published payload is 3 fields. The freeze risk is
   under-specification, not bloat.
4. **Exposing internals?** Two ways. `BookingConfirmed` carries `containerId` — the root identity of
   Consolidation's `ContainerLoad`, so every subscriber becomes coupled to Consolidation's model
   through Booking, and confirmation cannot happen until load planning has. Consolidation's own
   `CapacityReserved` already carries it. Worse, the real exposure is not a message at all:
   `ConsignmentLine` is a **shared kernel both contexts write**. Freezing a public interface while a
   mutable entity is shared behind it freezes the wrong surface.
5. **Belongs elsewhere?** `hazardClass` originates on Booking's `ConsignmentLine`, but the only path
   to Customs runs Consolidation→Customs, and Consolidation's `ConsignmentLine` has no
   `hazardClass` — a compliance attribute is dropped in transit. The bump decision belongs to
   Consolidation, yet no context publishes it.

**Perturbation experiments**

| Move | Effect | Verdict |
|---|---|---|
| Capacity check → one command owned by Consolidation | race in hotspot 1 disappears; Booking's invariant becomes reactive. Cost: confirmation goes asynchronous, needs a pending state and a timeout policy nobody has stated | **do it** |
| `ConsignmentLine` ownership → Booking, Consolidation gets a read-only projection (+ its own `stackable`) | shared kernel becomes customer/supplier; `hazardClass` survives toward Customs | **do it** |
| Confirmation → Consolidation | also removes the race, but moves the commercial commitment into a back-office `supporting` context | **rejected** |

## Proposed deltas to `model.yaml` (owned by `3-decompose`)

- Reconcile the Routing relationship direction with context-map.md (open question 5).
- Drop `containerId` from `BookingConfirmed`; add `shipmentRef`.
- Add the missing outcome events once question 4 is answered.
- Record `ConsignmentLine` ownership once question 3 is answered.
