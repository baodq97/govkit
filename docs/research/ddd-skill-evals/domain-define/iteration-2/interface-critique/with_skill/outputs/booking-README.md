---
id: DOMAIN-BC-BOOKING
title: Booking bounded context — canvas v5
status: draft
owner: TBD
date: 2026-07-28
mode: define
---

# Booking bounded context

**Readiness: not ready to freeze.** Two blockers (see *Interface critique*): the inbound half has
never been traced (no `flows/` — `4-connect` has not run), and the interface as it stands encodes the
March double-commit defect rather than fixing it. Scope of this pass: **Booking only**, core depth;
Consolidation needs its own canvas before Booking's contract can settle, since it owns the invariant
Booking depends on. Facts joined by `ddd_context.py --step 7-define --context Booking`.

## Purpose

Turn a customer's accepted quote into a committed movement of their consignment on a named
departure, so the exporter knows their goods have a slot and the depot knows what is coming.
Actors: small and mid-size exporters shipping part loads (`business-model.md`); depot planners.

> Boundary finding — the purpose stops short of *deciding whether capacity exists*. Booking does that
> today (`model.yaml`: "synchronous remaining-capacity check before reserving"): the "and also" this
> section exists to expose. Evidence for `3-decompose`; not redrawn here.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core | `context-map.md` — "where the money is committed". **Not corroborated:** `business-model.md` has no capability row for Booking, and `core-domain-chart.md` does not exist (`5-strategize` has not run) |
| Business-model role | **unknown** | no capability row to carry it from |
| Evolution | **unknown** | same |

Carried, not re-derived. The disagreement is the finding: the only capability marked
*differentiating* in `business-model.md` is **load consolidation**, which `context-map.md` classifies
**supporting** — the differentiator sits behind a supporting boundary while Booking is called core on
a line "not revisited since the first modelling session in March". Route to `5-strategize`.

## Domain roles

**Execution** — enforces quote accepted → capacity reserved → confirmed (invariant; timeline #3–#5).
**Draft** — a booking sits in a requested state before it is real (`Booking.status`). No
Brain-Context signature: outbound is events, not commands — except the capacity check (critique Q2).

## Communication — inbound and outbound

> **No message flow has been traced.** `ddd_context.py` reports zero messages across this boundary and
> there is no `flows/` directory. Every row below is *model-derived, not observed*, provenance marked;
> run `4-connect` before treating it as the contract. Split by who initiates, not by data direction.

| Dir | Collaborator | Message | Msg type | Relationship | Provenance |
|---|---|---|---|---|---|
| in | Quoting (BC) | accepted quote → booking request | command, **name unknown** | customer/supplier | `booking` + `quoting` model.yaml |
| in | Consolidation (BC) | `CapacityReserved` (containerId, bookingId, volumeM3) | event | customer/supplier | `consolidation/model.yaml`; timeline #4 |
| in | customer / front end | the booking request itself | command, **name unknown** | — | inferred from `BookingRequested`; no artifact names the caller |
| out | Consolidation (BC) | remaining-capacity check, then reserve | **query then act** | customer/supplier | `booking/model.yaml` relationship note |
| out | Routing (BC) | `BookingConfirmed` (bookingId, containerId) | event | published language | `booking` + `routing` model.yaml |
| out | (broadcast) | `BookingRequested` (bookingId, departureId, volumeM3) | event | published language | `booking/model.yaml`; timeline #3 — **no consumer identified on disk** |

Two of three inbound messages have no name on disk. Swimlane, as far as the artifacts support it —
the middle lane is the problem, Booking decides there using a fact it does not own:

```
booking request  → [decide: is the quote still valid?]        → BookingRequested
                 → [ask Consolidation: is there room? decide] → reserve
CapacityReserved → [decide: invariant satisfied → confirm]    → BookingConfirmed
```

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Booking | a customer's committed request to move a consignment on a given departure | — |
| Consignment | the goods a customer hands over as one unit | **Yes** — Invoicing: "a billable line on an invoice" (`invoicing/model.yaml`); hotspot #2 says finance and ops already collide on this word |
| ConsignmentLine | a line of goods in a booking: volumeM3, weightKg, hazardClass | **Yes** — Consolidation's is volumeM3 + **stackable**, a planner's stacking unit. Same name, two shapes, both written (`context-map.md`: Shared Kernel) |
| ShipmentRef | prefix + sequence identifying the movement | Building Block shared with Consolidation, Customs, Invoicing |

## Business decisions

Only what was stated, with attribution:

- A booking may only be confirmed once its capacity has been reserved — `model.yaml` invariant.
- A container's committed volume must never exceed capacity; overbooking breaks the Guaranteed
  Consolidation promise — planner, 2026-05-25. **Enforced in Consolidation, depended on by Booking.**
- The premium is charged whether or not the container ends up full — finance analyst, 2026-05-25.

Nothing else was stated. Rules on cancellation, amendment, rejection and expiry are absent from every
artifact, so they are not written here.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two bookings must never commit the same container slot | — | planner (rule 2026-05-25; hotspot #1 is this failing in March) | **yes** — invariant, therefore aggregate boundary |
| Availability | can Booking confirm while Consolidation is down? Today's synchronous check says no | unknown | nobody stated it; commercial director could | **yes if the answer is "must"** — forbids the sync dependency |
| Auditability | prove what was promised at booking time, since the premium is charged regardless of fill | unknown (no retention stated) | finance analyst | **likely yes** — makes the commitment history domain state |
| Latency | booking confirmation while the customer waits | unknown | nobody stated it | no |

## Assumptions

- *Inferred* — `BookingRequested` + `BookingConfirmed` are the whole published interface; only those
  two exist in `model.yaml` and no flows have been traced.
- *Inferred* — the model describes Booking's real behaviour. Declared mass is **9 tables /
  54 attributes**; this canvas names 3 types and 10 attributes, so ~**80% of the implementation's
  attributes are unmodelled** and any may carry public surface.
- *Inferred* — Routing needs only `bookingId`; its payload is `[bookingId, carrierId]`, no rule of
  its own.
- *Inferred* — a booking is confirmed at most once, never amended or cancelled. Nothing states
  otherwise; nothing states this either.
- *Stated* — the premium is charged whether or not the container fills (finance analyst).

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| % of PRs touching `booking/` that also touch `consolidation/` — prediction: **under 25% by 2026-10-31** | the shared `ConsignmentLine` predicts this is high today; if it stays high, the boundary is in the wrong place | CI / VCS history |
| Double-commit incidents per quarter — prediction: **0** once the reserve interaction is one command | whether the capacity invariant is enforced in exactly one aggregate | incident log / production |
| Planner manual overrides per week | whether the model matches the work (Gothenburg still plans partly on a whiteboard) | live system |
| Origin of `ConsignmentLine` writes, Booking vs Consolidation | whether the Shared Kernel is genuinely bidirectional, or one side could give it up | DB audit / app telemetry |
| Consumers reading `containerId` out of `BookingConfirmed` — prediction: **0** | if nothing reads it, the internals leak is free to remove | consumer registry / grep of consumer repos |

## Interface critique

Ordered by cost to unfreeze later.
1. **Q4 — the Shared Kernel is the real interface, and the expensive one.** `ConsignmentLine` is an
   entity *inside* the Booking aggregate and *inside* Consolidation's `ContainerLoad`, with different
   attributes, and `context-map.md` records that **both write it**. Two aggregates writing one entity
   means neither can enforce its invariant; freezing two events freezes this much larger surface with it.
2. **Q2 — the capacity interaction is the wrong message type.** A synchronous remaining-capacity
   *query* then a separate act is check-then-act across a boundary; it is not atomic, and hotspot #1
   ("two shipments committed to the same container slot in March; nobody agrees where the check
   should have happened") is its exact failure signature. The invariant lives in Consolidation, where
   `CapacityReserved` already exists as its outcome event. Proposal for `3-decompose`: one outbound
   **command** Consolidation accepts or rejects.
3. **Q4 — `BookingConfirmed` leaks a neighbour's internals.** It carries `containerId`, the root key
   of Consolidation's `ContainerLoad`, coupling every consumer of Booking's published language to
   Consolidation's container model. Nothing on disk shows a consumer needing it — Routing's payload
   is `[bookingId, carrierId]`.
4. **Q3 — the interface is too *small*, not too big.** Two events, zero named inbound messages, no
   negative path: nothing covers rejection, cancellation, amendment or departure change, though the
   invariant implies confirmation can fail. Whether those messages exist is an open question.
5. **Q1 — names cohere, with one exception.** `BookingRequested` / `BookingConfirmed` are a
   consistent past-tense pair; `Consignment` does not cohere across the map (language table, hotspot #2).
6. **Q5 — one attribute may belong elsewhere.** `hazardClass` sits on Booking's `ConsignmentLine`;
   the regulated context is Customs. Nothing shows Booking using it. Question, not a claim.

**Perturbation.** Moved `ConsignmentLine` wholly into Consolidation, leaving Booking a
requested-volume value object. *Improves:* the capacity invariant becomes enforceable in one
aggregate, hotspot #1 gets an owner, the Shared Kernel drops to Building Blocks (`ShipmentRef` only).
*Costs:* Booking cannot answer "what is in this booking" without querying Consolidation, and the
customer's consignment stops being the planner's stacking unit — which hotspot #2 says is already so.

**Rejected.** Moving the capacity decision *into* Booking: it makes the reservation atomic, but puts
fill-rate optimisation — the one differentiating capability in `business-model.md` — behind the
Booking boundary, deepening the classification conflict instead of resolving it.

## Open questions

1. What happens when Consolidation rejects, or is unavailable? No artifact says.
2. Is a booking ever cancelled, amended or moved to another departure — does that release capacity?
3. Whose "consignment" — goods handed over (here) or a billable line (Invoicing)? Hotspot #2, open.
4. Is Booking core? No capability row exists for it, and the differentiating capability sits in a
   context classified supporting.
5. What are the other ~6 tables / ~44 attributes of the declared mass, and do any carry public surface?
6. Hotspot #3 — when a partner carrier refuses a sealed container, does anything come back into Booking?
7. Who owns this interface as a product commitment? No product owner attended either discovery
   session (`business-model.md`, `discovery/timeline.md`).

Seven open questions on a context called core, five touching the interface directly — that count is
the answer to "does the design hold up".

## Deltas proposed to `model.yaml` (owned by `3-decompose`, not applied here)

- Replace the synchronous remaining-capacity check with a single reserve **command** to Consolidation.
- Remove `containerId` from `BookingConfirmed`, or record which consumer requires it.
- Resolve `ConsignmentLine`'s Shared Kernel — one writer, or two differently-named concepts.

No C4 diagram: Booking touches no external system directly (Partner Network sits behind Routing).
