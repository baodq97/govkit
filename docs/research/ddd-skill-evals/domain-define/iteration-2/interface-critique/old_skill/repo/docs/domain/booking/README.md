# Booking bounded context

<!-- 7-define canvas, 2026-07-28. No README.md existed, so this is a first canvas, not a
     delta-merge. model.yaml untouched; deltas proposed at the bottom for 3-decompose. Only
     Booking is canvassed — the other six contexts get nothing from this pass. -->

## Purpose

Turn a customer's accepted quote into a committed obligation to move their consignment on a named
departure, and hold that commitment until the shipment is handed over. Actors: the exporter who
books, and the depot planner who inherits the commitment as work.

> The purpose needs an "and also" today — Booking *also* decides whether capacity exists (Finding 2).
> That is evidence for `3-decompose`, not something to write around here.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core | `context-map.md` — "where the money is committed" |
| Business-model role | **unknown** | `business-model.md` has no Booking row in the capability table |
| Evolution | **unknown** | same |

`core-domain-chart.md` does not exist — `5-strategize` has not run. Two upstream conflicts, carried
and not resolved here:

- `context-map.md` calls Consolidation *supporting*, while `business-model.md` names load
  consolidation the single differentiating, revenue-generating capability (the Guaranteed
  Consolidation premium, +18%). Both cannot hold. Booking, a core context, currently depends
  synchronously on that supposedly-supporting context.
- `context-map.md` self-reports that it has not been revisited since March.

## Domain roles

- **Execution** — enforces the workflow "reserve before confirm" (`model.yaml` invariant).
- **Commitment ledger** — the record of what was promised a customer on a departure.

A third has arrived by accident: **capacity arbiter**, through the synchronous remaining-capacity
check into Consolidation. Consolidation owns that invariant (`consolidation/model.yaml`). This is not
a Brain Context — outbound is events, not commands — but one decision has migrated a hop upstream.

## Inbound communication

Evidence quality first: **there are no `message-flows/`.** Only rows marked *timeline* are observed;
the rest are inferred from event ordering and must be confirmed before anything is frozen.

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Exporter | user / frontend | *unnamed* — the act producing `BookingRequested` | command | — | **not evidenced anywhere** |
| Quoting | bounded context | `QuoteIssued` | event | customer/supplier (Booking downstream) | inferred from `model.yaml` relationship |
| Consolidation | bounded context | `CapacityReserved` | event | customer/supplier | inferred: timeline #4 sits between #3 and #5 |

No **rejection** message appears in any artifact — nothing says what Booking receives or emits when
capacity cannot be reserved.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Consolidation | bounded context | remaining-capacity check | **query** | shared kernel (`ConsignmentLine`) | `booking/model.yaml` relationship note |
| (subscribers) | — | `BookingRequested {bookingId, departureId, volumeM3}` | event | published language | timeline #3, planner |
| Routing | bounded context | `BookingConfirmed {bookingId, containerId}` | event | customer/supplier | timeline #5, planner; `routing/model.yaml` |

The capacity check is **outbound** although the data flows in — Booking picks up the phone.

## Swimlane — what Booking actually decides

`BookingRequested` in → *ask Consolidation how much room is left* → *decide: confirm* →
`BookingConfirmed` out. The decision in the middle is taken on data Booking neither owns nor can
lock. That is Finding 1.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Booking | a customer's committed request to move a consignment on a given departure | — |
| Consignment | the goods a customer hands over as one unit | **yes** — Invoicing: "a billable line on an invoice"; hotspot #2 records finance and operations using it two ways |
| ConsignmentLine | `volumeM3, weightKg, hazardClass` | **yes** — Consolidation's is `volumeM3, stackable`; same name, different attributes, declared a **shared kernel that both contexts write** |
| ShipmentRef | `{prefix, sequence}` | shared as a building block with Consolidation, Customs, Invoicing |

## Business decisions (stated, attributed)

- A booking may only be confirmed once its capacity has been reserved — `booking/model.yaml` invariant.
- The Guaranteed Consolidation premium is charged whether or not the container ends up full —
  finance analyst, 2026-05-25. Booking sells the promise; no artifact says Booking records it.
- A container's committed volume must never exceed its capacity — planner, 2026-05-25. Stated as
  Consolidation's invariant, and it bounds what Booking may confirm.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two bookings must never commit the same container slot | — | planner 2026-05-25 + hotspot #1 (March double-commit) | **yes** — invariant, therefore aggregate boundary |
| Availability | may Booking accept a booking while Consolidation is unreachable? | unknown | nobody has been asked | **yes, if the answer is "yes"** — it forbids the synchronous check |
| Auditability | prove what was promised at confirmation, for premium disputes | unknown | finance analyst could supply | **likely** — makes history domain state |
| Latency | how long may a customer wait for confirmation? | unknown | commercial director could supply | probably not |
| Volume | bookings/day today, and after two more ports | unknown | commercial director | no |

No quality-storming session has been held; four rows read `unknown` rather than carry invented SLAs.

## Interface critique

1. **Names coherent?** `BookingRequested` / `BookingConfirmed` are coherent with the purpose. The
   gaps: the inbound command that starts a booking has no name in any artifact, and neither does the
   negative outcome.
2. **Right message types?** No. The remaining-capacity **query**, followed by Booking's own confirm
   decision, should be one **command** into Consolidation which accepts or rejects it. Check-then-act
   across a boundary is exactly how two shipments took the same slot in March (hotspot #1); only the
   context that owns the counter can enforce the invariant atomically. Cost of fixing: Booking has to
   model a pending state and a rejection path, which it does not today (`status` is a bare attribute
   with no stated values).
3. **Too big?** No — the opposite, and that is the risk. Two evidenced messages is a thin surface for
   a core context, because half the interface has never been written down. Freezing now freezes what
   is known and leaves the rest to whoever writes the first endpoint.
4. **Exposing internals?** Yes, both ways. `BookingConfirmed {bookingId, containerId}` publishes
   **Consolidation's** identifier inside Booking's public contract — every subscriber, Routing today,
   inherits a dependency on the container model to read a booking fact it does not use.
   `ShipmentRef {prefix, sequence}` publishes an identifier's internal structure to three contexts, so
   a numbering-scheme change becomes a four-context change. Lower severity, still a leak.
5. **Belongs elsewhere?** `ConsignmentLine`, shared-kernel-written by both Booking and Consolidation.
   The two definitions already diverge (`hazardClass` vs `stackable`), and hotspot #2 records the
   business itself using "consignment" in two senses. Shared kernel is the highest-coupling
   relationship on the map, and this one rests on a word the room does not agree about.

## Perturbation experiments

| What was moved | What improved | What it cost | Verdict |
|---|---|---|---|
| Capacity decision → Consolidation, as one `ReserveCapacity` command accepted or rejected | the March double-commit becomes structurally impossible; invariant sits with the data enforcing it; Booking stops depending on a synchronous neighbour | Booking must model pending + rejection; confirmation may become asynchronous | **take** |
| `ConsignmentLine` → owned by Consolidation; Booking keeps its own customer-declared line | shared kernel gone; the naming clash surfaces instead of hiding | duplicated volume, synced by event; two names the room must agree | **take** — but the names come from the room, not from this canvas |
| `containerId` out of `BookingConfirmed` | subscribers stop depending on Consolidation's model | any consumer that genuinely needs it must query Consolidation; none has said so | **take unless a consumer objects** |
| Whole confirmation → Consolidation (Booking becomes a draft context) | a single place decides | Booking holds the commercial commitment and the premium; moving it puts money inside a back-office planning context and grows a Brain Context | **rejected** |

## Assumptions

- *(inferred)* Booking consumes `CapacityReserved`, and that is what triggers confirmation — read off
  timeline ordering, never stated by anyone.
- *(inferred)* Booking is downstream of Quoting via `QuoteIssued`; no flow was traced.
- *(inferred)* The Guaranteed Consolidation premium is sold at booking time; `model.yaml` carries no
  attribute for it.
- *(inferred)* A booking is never re-planned onto another departure after confirmation — nothing
  covers hotspot #3, a partner carrier refusing a sealed container.
- *(stated)* March's classification in `context-map.md` still holds; the document itself flags that
  nobody has rechecked it.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Share of PRs touching Booking that also touch Consolidation over the next 3 months — prediction **< 25%** | above that, the shared kernel plus the capacity coupling put the boundary in the wrong place | CI / VCS history |
| Double-commit incidents per quarter — prediction **0** once reservation is one command | whether hotspot #1 was fixed or is structural | production incident log |
| Consumers reading `containerId` off `BookingConfirmed` — prediction **0** | whether the leak is real coupling or dead payload | grep across consumer repos in CI |
| Planner manual overrides per week against a confirmed booking | whether the model matches how commitments really get made | live system |
| Lead time for a change contained inside Booking | rises when the interface is shared in practice | issue tracker |

## Open questions

1. What is the command that creates a booking, and what is emitted when capacity cannot be reserved?
   Neither exists in any artifact. **This alone blocks the freeze.**
2. May Booking accept a booking while Consolidation is unreachable? Decides whether the synchronous
   call may survive.
3. Is Consolidation core (`business-model.md`) or supporting (`context-map.md`)? It changes who
   should own the capacity decision.
4. Which context records the Guaranteed Consolidation premium — Booking, Quoting or Invoicing?
5. Who owns the reversal when a carrier refuses a sealed container (hotspot #3)? Booking has no
   message for it.
6. Do finance and operations mean the same thing by "consignment" (hotspot #2)? The shared kernel
   depends on the answer.

Six open questions on a core context whose interface is about to be frozen. Neither recorded session
included a customer or anyone accountable for the product — the group this step specifically requires
is missing from this canvas.

## Proposed deltas to `model.yaml` (owned by `3-decompose`)

- Drop `containerId` from the `BookingConfirmed` payload.
- Replace the `Consolidation / synchronous remaining-capacity check` relationship note with a single
  `ReserveCapacity` command, accepted or rejected.
- Unshare `ConsignmentLine`; the shared-kernel row in `context-map.md` goes with it.
- Add the rejection event and the enumerated `status` values once the room names them.
