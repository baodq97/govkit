---
id: DOMAIN-REV-0001
title: Booking — public interface review before freeze
status: draft
owner: TBD
date: 2026-07-27
---

## Verdict

**Do not freeze.** Three blockers and four majors. Two of the blockers are not cosmetic —
they are the reason a container was double-committed in March, and they will not get cheaper to
fix once partner carriers depend on the contract.

What is safe to freeze today: nothing on the Booking↔Consolidation seam. The customer-facing
vocabulary (Booking, departure, consignment) is stable enough to publish once the naming clash
in F3 is settled.

Scope of this review: domain level only — message shape, ownership, language, failure paths.
No transport, encoding, or endpoint design here; that comes after the seam is settled.

## Questions applied

Each question was checked against `docs/domain/booking/model.yaml`, `context-map.md`, the other
contexts' models, and `discovery/timeline.md`.

| # | Question | Verdict |
|---|---|---|
| Q1 | Is every outbound message a decision the receiver can accept or reject on its own? | **FIRES** → F1 |
| Q2 | Does the interface expose internal entities or state? | **FIRES** → F2 |
| Q3 | Does every fact this context publishes belong to it? | **FIRES** → F5 |
| Q4 | Can a consumer act on each message without calling back for more? | **FIRES** → F5 |
| Q5 | Is the failure path part of the interface, or only the happy path? | **FIRES** → F6 |
| Q6 | Is the language unambiguous across every context that consumes it? | **FIRES** → F3 |
| Q7 | Is the relationship pattern with each neighbour named — who conforms, where translation sits? | **FIRES** → F7 |
| Q8 | Are the identifiers this interface publishes minted and owned here? | **FIRES** → F4 |
| Q9 | Are the states consumers branch on enumerated? | **FIRES** → F8 |
| Q10 | Is the boundary stable enough that freezing means anything? | **FIRES** → F10 |
| Q11 | Does the interface carry the invariants this context actually owns? | clear — Booking owns almost no rule, and the canvas says so honestly |
| Q12 | Is anything in the interface there only because of how it is stored? | clear |

## Findings

### F1 — Blocker. Query-then-command is the wrong message shape

`model.yaml` describes a "synchronous remaining-capacity check before reserving": Booking reads
Consolidation's remaining capacity, decides for itself that there is room, then commands
Consolidation to reserve. The no-overbooking invariant lives in Consolidation
(`consolidation/model.yaml`), so the decision is being made in the one context that cannot
enforce it.

The gap between the read and the write is a race. Two bookings read 20 m³ free, both reserve
15 m³, both succeed. That is discovery hotspot 1 verbatim: *"two shipments were committed to the
same container slot in March; nobody agrees where the check should have happened."* The check
belongs where the invariant is. It is not a locking problem to be solved later — the interface
shape is what makes it possible.

Replace the pair with a single command Consolidation accepts or rejects:

- Booking sends **one** message: *reserve capacity for this booking on this departure, this much
  volume, this weight, these stacking and hazard properties.*
- Consolidation answers `CapacityReserved` or `CapacityRefused` (with a reason: departure full,
  hazard incompatible, departure closed).
- Booking never reads Consolidation's state to make a decision. If a sales screen wants to show
  remaining capacity, that is a read-model for display, explicitly not a basis for commitment,
  and it should be named so nobody mistakes one for the other.

This has a knock-on effect the current model does not carry: Booking must have a state for
"asked, not yet answered", and a published outcome for refusal (F6, F8).

### F2 — Blocker. `ConsignmentLine` is an internal entity exposed as a Shared Kernel

`context-map.md` records `ConsignmentLine` as a Shared Kernel between Booking and Consolidation,
**both write it**. Two problems, and the second is worse than the first.

The cost of a genuine shared kernel: neither team can change the type alone, releases have to be
coordinated, and no one owns its rules. You are paying that price on your most important seam,
between a core context and the context that owns the capacity invariant.

But it is not actually shared. The two models already disagree:

| | Booking | Consolidation |
|---|---|---|
| `ConsignmentLine` | lineId, volumeM3, weightKg, **hazardClass** | lineId, volumeM3, **stackable** |

Same name, different shape, both writing. That is not a shared kernel, it is a shared kernel that
has already broken and nobody has noticed. Freezing an interface on top of it freezes the
divergence.

Fix: demote it. Booking publishes the cargo facts Consolidation needs to plan — as an immutable
message payload (a value, not an entity with a lifecycle) — and Consolidation keeps its own
planning entity with its own stacking attributes. An entity in a shared kernel drags two
lifecycles together; a value in a message does not. Note that Booking currently sends
`hazardClass` nowhere and Consolidation plans stacking without knowing weight, so the shared
kernel is not even delivering the data the sharing was meant to deliver.

### F3 — Major. "Consignment" means two different things and the interface uses it

Booking: *the goods a customer hands over as one unit.* Invoicing: *a billable line on an
invoice.* Discovery hotspot 2 confirms finance and operations already collide on this in
conversation. Booking's public interface is built on the word (`ConsignmentLine`), so freezing
propagates the ambiguity into every downstream contract and every conversation about it.

Pick one: rename Booking's concept to something unambiguously operational (handover unit, cargo
item), or keep the word and state in the published language that Invoicing's sense is a different
concept with a named translation point. Do not freeze while both are true.

### F4 — Major. Booking mints `ShipmentRef` and never publishes it

`ShipmentRef` is a Booking value object, shared as a building block with Consolidation, Customs
and Invoicing. Customs keys `Declaration` on `shipmentRef`. Yet neither `BookingRequested` nor
`BookingConfirmed` carries it — both carry `bookingId`.

So the identifier that stitches the downstream chain together travels by some route nobody has
written down. Either Booking mints it and must publish it on the confirmation event, or it is
minted elsewhere (at sealing?) and does not belong in Booking's model at all. This is an
ownership question, not a payload question, and it has to be answered before the interface is
frozen (OQ-1).

Separately: sharing the type as a code building block across four contexts is a smaller version
of F2. A published format that each context implements for itself costs less than a shared
library, and none of these four contexts needs to change the format independently.

### F5 — Major. Payloads publish other contexts' facts and omit their own

`BookingConfirmed {bookingId, containerId}`. `containerId` is Consolidation's identifier for
Consolidation's aggregate, and Consolidation already publishes the same fact as
`CapacityReserved {containerId, bookingId, volumeM3}`. Booking is republishing a neighbour's news
and, in doing so, binding its own contract to Consolidation's identity scheme. Booking should
confirm what it owns — this booking is committed, for this customer, on this departure. Which
container it rides in is Consolidation's to announce.

The reverse problem on the way in: `BookingRequested {bookingId, departureId, volumeM3}` drops
`customerId`, `weightKg`, `hazardClass` and the line breakdown, all of which Booking holds.
Consolidation needs weight to stack, Customs needs hazard class, Notifications needs the
customer. Every consumer has to call back into Booking to enrich — which is another read of
internals, and re-creates F1's shape in a new place.

While you are there: none of the four events carries an occurrence time, a version, or a
correlation identifier. That may be a platform convention rather than a per-context decision,
but "frozen" should say which convention applies.

### F6 — Blocker. The interface has no failure surface

Published events: `BookingRequested`, `BookingConfirmed`. That is the happy path and nothing else.
Missing, all of them business-real:

- **Refused** — capacity declined. Required by the fix in F1. Without it, Routing, Notifications
  and the customer have no way to learn a booking died.
- **Cancelled** — by the customer, before or after confirmation. Capacity has to go back.
- **Amended** — volume changes after confirmation. Common in freight, and it silently invalidates
  a reservation the invariant depends on (assumption A3).
- **Bumped / rebooked** — the business model sells Guaranteed Consolidation, so a bumped shipment
  is the exact event the premium exists to prevent, and the one the customer most needs to hear
  about. Today nothing in the model can say it.

Freeze without these and they arrive later as side-channels: a spreadsheet, an email to the
planner, a status field mutated by hand. That is the expensive failure mode.

### F7 — Major. Neighbour relationships are directions, not patterns

`model.yaml` says `{to: Quoting, type: downstream}`, `{to: Routing, type: upstream}`, and
`context-map.md` draws `Booking -->|downstream| Quoting` — "downstream" is used to mean *depends
on* in one file and *flows to* in the diagram. Worse, no relationship names a pattern: nobody has
said who conforms to whom, who publishes a language the other must follow, or where translation
sits.

Freezing an interface without that is meaningless, because "frozen" is a statement about who is
allowed to break whom. For each neighbour, state it: Consolidation as customer/supplier with
Consolidation supplying (it owns the invariant); Routing as a conformist to Booking's published
language; Quoting to be settled with F9.

### F8 — Blocker. `Booking.status` is undefined

`status` is the single attribute every consumer will branch on, and the model does not enumerate
its values. Add to that F1's fix, which introduces an "awaiting capacity" state, and F6's
refusal, cancellation and amendment outcomes, and the state set is not merely undocumented — it
is not yet decided. Enumerate the states and the legal transitions, or do not freeze (OQ-2).

### F9 — Minor. The Quoting relationship does not exist in the model

Booking is declared downstream of Quoting, but Booking holds no quote identity and receives no
acceptance. Quoting's invariant — *a quote cannot be accepted after its validity window* — has no
enforcement point anywhere, because the context that would enforce it at acceptance time cannot
see the quote. Either the relationship is aspirational and should be dropped from the map, or the
interface is missing a quote reference and an acceptance message.

### F10 — Major. The boundary under review is the boundary you are freezing

`context-map.md` closes with: *"The classification above has not been revisited since the first
modelling session in March."* Four of seven contexts are labelled core. Consolidation — named in
`business-model.md` as the one differentiating capability, the thing the premium is charged for —
is labelled supporting with a 5-table model, while Invoicing, described in the same document as
*"nobody has ever chosen us because of our invoices"*, is labelled core with 34 tables.

If that classification is wrong, the Booking/Consolidation split is the seam most likely to move,
and it is the seam this interface is built across. Settle the classification first (OQ-5).
Freezing a contract across a boundary you may redraw buys nothing and costs a migration.

## Recommended order of work

1. Collapse the capacity query and reserve command into one command with an accept/reject answer (F1).
2. Enumerate booking states and publish the refusal, cancellation, amendment and bump outcomes (F6, F8).
3. Break the `ConsignmentLine` shared kernel into a published message payload plus two private entities (F2).
4. Settle who mints `ShipmentRef` and publish it (F4).
5. Move `containerId` out of `BookingConfirmed`; add the fields consumers currently call back for (F5).
6. Name a relationship pattern per neighbour (F7); resolve the Quoting link (F9).
7. Rename or explicitly translate "consignment" (F3).
8. Re-run the strategic classification before declaring the seam stable (F10).

Steps 1–5 change the message set. Freezing before them means freezing twice.
