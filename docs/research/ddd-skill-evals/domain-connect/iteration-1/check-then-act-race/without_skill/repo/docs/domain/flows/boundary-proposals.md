---
id: DOMAIN-FLOW-0002
title: Nordic Freight — boundary change proposals from the booking-flow review
status: draft
owner: TBD
date: 2026-07-27
mode: connect
---

## Status of this document

**Proposals only.** Nothing here has been applied. Every item below is a change to the tactical
model or the context map and belongs to `domain-decompose` (re-run in update mode), not to this
review. No file under `docs/domain/` was modified — this review only added
`docs/domain/flows/`.

Findings and evidence: [`booking-flow.md`](./booking-flow.md). Message numbers (M1–M13) refer to
the flow table there.

## Priority order

| P | Proposal | Fixes | Cost | Reversible? |
|---|---|---|---|---|
| P1 | Move the capacity decision into Consolidation | F1, F2 | medium | yes, at design stage |
| P2 | Model the rejection outcome | F3 | low | yes |
| P3 | Put `ShipmentRef` in the event payloads | F4 | low | yes |
| P4 | Decide who enforces `declaration before handover` | F5 | low (decision) | yes |
| P5 | Give `ConsignmentLine` a single owner | F2 | medium | yes |
| P6 | Fold Routing into Booking, or demote it to an adapter | F6 | medium | yes |
| P7 | Add `commands:` and `queries:` to every model | F7 | low | yes |
| P8 | Confirm `CustomerNotified`, decide on a booking-confirmation touchpoint | F8 | low | yes |

P1–P4 are prerequisites for building the booking path. P5–P8 can follow.

---

## P1 — Move the capacity decision into Consolidation

**Change.** Delete the M4 query. Replace M4 + M5 with one command that Consolidation evaluates
against `ContainerLoad` in a single transaction:

```
ReserveCapacity(bookingId, departureId, volumeM3, requestId)   command  Booking → Consolidation
  → CapacityReserved(containerId, bookingId, volumeM3)          event    (exists today)
  → CapacityRejected(bookingId, departureId, reason)            event    (new — see P2)
```

Booking stops reading `committedM3`. It states what it wants and reacts to the answer.
Consolidation checks and commits atomically, so no other booking can slip between the check and
the write. The race in F1 stops being a bug to defend against and becomes structurally
impossible — no locking, no retries, no distributed transaction. `requestId` makes the command
idempotent so a redelivered M5 cannot double-commit a slot.

The invariant then lives entirely inside the aggregate that owns it, which is what
`consolidation/model.yaml` already claims. Booking's invariant — *"A booking may only be confirmed
once its capacity has been reserved"* — stays exactly as written and becomes true by construction
rather than by convention.

**Also update:** `booking/model.yaml` relationship note (delete the *"synchronous remaining-capacity
check"* phrasing) and the relationship direction, which today reads Booking-downstream-of-
Consolidation while the traffic runs the other way (F2). The seam is Customer/Supplier with
Booking as the customer issuing commands and Consolidation as the supplier that decides.

**Trade-off.** Booking loses the ability to show remaining capacity in the UI before the customer
commits. That is a real product regression on a screen planners use.

**Mitigation.** Consolidation publishes a fill-rate read model that Booking may display but must
never branch on. Mark it `advisory` in the model so the next engineer cannot mistake it for a
decision input — a stale advisory number is harmless; a stale decision input is F1 again.

**Alternatives considered.**

- *Keep M4/M5 and add optimistic concurrency on `ContainerLoad`.* Cheaper, and it does close the
  window. Rejected: it leaves the model reading as if the capacity decision were Booking's, so
  every future caller of Consolidation re-learns the race by hitting it. It fixes the incident,
  not the design. Reasonable as a stopgap if there is production traffic before P1 lands.
- *Merge Booking into Consolidation.* Removes the seam entirely. **Rejected.** The two contexts
  have different languages (a booking is a commercial commitment; a container load is a physical
  stack), different lifecycles, and different rates of change. Collapsing a sound boundary to fix
  one badly-drawn message pair trades a small problem for a large one, and would put a
  customer-facing commitment inside the depot planners' whiteboard workflow. The seam is fine —
  the protocol across it is not.
- *Two-phase reserve (hold, then confirm).* Correct, and appropriate if the customer needs a
  quoted price held while they decide. Rejected for now as unjustified complexity — nothing in
  `discovery/timeline.md` says a hold is needed. Revisit if P2's answer turns out to be
  "wait-list".

---

## P2 — Model the rejection outcome

**Change.** Add `CapacityRejected(bookingId, departureId, reason)` to
`consolidation/model.yaml`, and whatever terminal Booking event follows it, to
`booking/model.yaml`.

The model has no failure path anywhere in the booking scenario (F3). A booking whose reservation
fails currently has a `status` field, an invariant that blocks confirmation, and no message that
moves it. Rejection becomes the common case as fill rate climbs toward the 80% goal in
`business-model.md` — this is the happy path of the near future, not an edge case.

**Human decision required first.** What should happen: auto-roll to the next departure,
wait-list, or reject outright? Ask the depot planners. The answer changes P1: outright rejection
works with a single atomic command; a wait-list needs a queue inside `ContainerLoad`; auto-roll
needs a policy that spans departures and probably its own aggregate.

---

## P3 — Put `ShipmentRef` in the event payloads

**Change.** Add `shipmentRef` to `ContainerSealed` (M9), `DeclarationSubmitted` (M10),
`DeclarationCleared` (M11) and `InvoiceIssued` (M12). Add `containerId` to
`ShipmentHandedToCarrier` (M8).

`ShipmentRef` is already declared in `context-map.md` as shared across Booking, Consolidation,
Customs and Invoicing at Building-Blocks level. It exists, it is agreed, and it appears in no
event payload — so each receiver has to reach into an upstream database to do its job (F4). This
is the cheapest fix in the set and it removes three undocumented back-channels.

Note for Consolidation: one sealed container carries many shipments, so `ContainerSealed` needs a
list of refs, not one. That may mean Customs should subscribe to a per-shipment event instead —
worth a modelling session rather than a payload patch.

---

## P4 — Decide who enforces `declaration before handover`

**Change.** Pick one and write it into the model:

- **(a)** Routing subscribes to `DeclarationSubmitted` (M10) and refuses to emit M8 without it.
  Gives Routing a rule, which weakens P6.
- **(b)** Customs owns the gate and emits a clearance-to-move signal that Routing simply obeys.
  Keeps Routing decision-free, consistent with P6. **Preferred.**

**Human decision required first.** `customs/model.yaml` states handover cannot precede
declaration; `discovery/timeline.md` confirms the opposite order (#6 before #8). Both were
confirmed, by different people, in the same session (F5). Put the depot planner and the customs
clerk in one room and ask which actually happens. If the timeline is right, the invariant is
aspirational and the business is running an unmanaged compliance exposure across nine ports —
which is a bigger finding than anything else in this document.

---

## P5 — Give `ConsignmentLine` a single owner

**Change.** Downgrade the `ConsignmentLine` Shared Kernel in `context-map.md` to
Customer/Supplier. Booking owns the customer-declared line (`volumeM3, weightKg, hazardClass`).
Consolidation holds its own loading-side concept (`volumeM3, stackable`) built from the
`ReserveCapacity` payload, under its own name.

Today both contexts write the same entity under the same name with different attributes, and
`committedM3` is derived from it (F2) — so Booking can move the number Consolidation's invariant
is measured against, even after P1 lands.

**Naming.** `discovery/timeline.md` hotspot #2 records that finance and operations use
"consignment" differently. There is a third meaning: `invoicing/model.yaml` defines Consignment as
*"A billable line on an invoice"* while `booking/model.yaml` defines it as *"The goods a customer
hands over as one unit"*. Three meanings, one word, three contexts. Propose three distinct terms
and record them per-context in `ubiquitous_language` rather than picking a winner.

---

## P6 — Fold Routing into Booking, or demote it to an adapter

**Change.** Either move M7→M8 into Booking as a carrier-handover step, or keep the code separate
but reclassify it in `context-map.md` as an anti-corruption layer on the Partner Network edge
rather than a bounded context.

Routing has no aggregates, no invariants and no language of its own by its own admission (F6). It
converts one event into another via a standing-contract lookup. As a context it costs a hop, a
deployment and a consistency window and isolates nothing.

**Trade-off.** If the partner-network integration is genuinely messy — nine ports, different
carrier protocols — an adapter with a published language is worth keeping as a separate
deployable. That is a deployment decision, and it should be recorded as one. Keeping it labelled a
bounded context implies it owns a piece of the domain, and it does not.

**Depends on P4.** If P4 lands as option (a), Routing gains a real rule and P6 should be
reconsidered.

---

## P7 — Add `commands:` and `queries:` to every model

**Change.** Extend the per-context `model.yaml` shape with `commands:` and `queries:` blocks
alongside `domain_events:`. Each cross-context message needs a name, a payload, a direction, a
sync/async marker and its failure outcomes.

Every model in the repo lists events only. The two messages that carry the whole risk in this
scenario — M4 and M5 — survived a full modelling pass as eleven words in a relationship note
(F7). A seam that is not written down cannot be reviewed, and two teams building either side of it
will choose different semantics.

This is a template change for `domain-decompose` rather than a change to Nordic Freight's model,
and it is what makes this review repeatable.

---

## P8 — Confirm `CustomerNotified`, and decide on a booking-confirmation touchpoint

**Change.** Confirm M13 with someone who owns the notification templates — it is the only event in
the timeline that no attendee confirmed. Then decide whether the customer is told at
`BookingConfirmed` (M7); if yes, add a Notifications subscription to Booking in `context-map.md`.

Today Notifications' only inbound relationship is from Invoicing, so the customer's first message
after committing money is the invoice (F8).

---

## Handoff

| To | What |
|---|---|
| `domain-decompose` | P1, P2, P3, P5, P6, P8 — model and context-map edits |
| `domain-decompose` (template) | P7 — add commands/queries to the `model.yaml` shape |
| Depot planners | P2 rejection policy; P4 ordering, jointly with the customs clerk |
| Customs clerk | P4 ordering — the timeline and the stated invariant disagree |
| `domain-strategize` | F9 — `Consolidation` classified `supporting` against the business model's evidence |
