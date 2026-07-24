# Work Breakdown — RFC-9101 Depot transfer approval and notification flow

Source RFC: `docs/rfc-transfer-approval.md` (status: accepted). Codebase: RentField fixture.
Applies skill `swe-flow:work-breakdown` (vertical slicing, XS–XL ladder, four break triggers,
hard/soft ordering edges, derived parallel-safety).

## 1. Whole-RFC sizing — this is an XL, must break down

All four break triggers fire, so this cannot ship or be reviewed as one unit:

1. **Title contains "and".** "Depot transfer approval **and** notification flow" — approval is one
   thing, notification another.
2. **ACs verify differently.** AC2 (accept) proves out as a *scheduled delivery run*; AC3 (reject)
   proves out as a *released hold*; AC1 as a *readable queue row*; AC4 as *two emails*. Four
   different proofs.
3. **Crosses >1 boundary.** Allocation (`src/Allocation`), Logistics (`src/Logistics`),
   notifications (`src/Vendors` SendGrid adapter), and a DB migration (`db/migrations/`). At least
   three code packages plus schema.
4. **Cannot demo in one sitting.** The RFC says so itself: "This whole decision engine … is more
   than one sitting of work; it cannot be reviewed as a single change."

XL ⇒ **must break down**. Five vertical slices below (US-A … US-E). Each is a thin top-to-bottom
cut (schema + logic + observable outcome + test), not a horizontal layer.

## 2. Slice map (at a glance)

| Slice | Behaviour (AC) | Size | Direct upstream | Touches (primary) |
|---|---|---|---|---|
| US-A | Persist pending transfer + approver queue read (AC1, AC5 groundwork) | L | — | `db/migrations/`, `src/Allocation` |
| US-B | Accept path: re-check → mark accepted → announce (AC2 approval half) | M–L | US-A (hard) | `src/Allocation` |
| US-C | Reject path: mark rejected → release hold (AC3) | S–M | US-B (hard) | `src/Allocation` |
| US-D | Logistics cutover: schedule on accepted, not on raw commit (AC2 logistics half) | M | US-C (hard) | `src/Logistics`, `src/Allocation` |
| US-E | Transfer-decision email to both depots on accept & reject (AC4) | S–M | US-C (hard) | `src/Notifications`*, `src/Vendors` |

Chain: **A → B → C → { D ∥ E }**. `*` = new package. Every slice stands on at most one direct
upstream (skill guidance: re-slice if a slice is blocked by three others).

Note on AC5 (traceability): threaded, not a slice. The reservation id is carried on the
`DepotTransferRequested` announcement and stored on the pending row in US-A, and retained through
the accept/reject decision records in US-B/US-C. It is already demonstrable at US-A (queue row →
reservation) and stays true through every decision.

---

## US-A — Persist a requested cross-depot transfer into an approver queue

**Behaviour (AC1; AC5 groundwork).** When Allocation commits a unit to a depot other than its home
depot, the requested transfer is persisted as `pending` and shows up in a queue an approver can
read (asset, from-depot, to-depot, requested date). Empty queue ⇒ nothing to show.

**Why this is the foundation, not a horizontal "just the table" slice.** The RFC: accept and reject
"neither can be demonstrated without also standing up the persisted pending state and the decision
path that reads it." So the persisted pending state + its read view is the smallest thing the two
decision slices can stand on. Splitting "the table" from "the queue read" would be a horizontal cut
(a table nothing reads is not demonstrable); they stay together as one vertical slice whose
demonstration surface *is* the queue.

**In scope**
- New migration: `transfer_approval` (id, reservation_id, asset_tag, from_depot, to_depot,
  requested_for, status, decided_by, decided_at). See QUESTIONS Q1 — `reservation_id` added beyond
  the RFC's column list so AC5 is satisfiable (asset_tag alone is not unique per reservation).
- `DepotTransferRequested` announcement gains the **reservation id**; the emit site in `Commit`
  changes with it (AC5). On a cross-depot commit, write a `pending` row.
- `Reservation` records that it sits under a **pending** transfer, so the same unit is not offered
  for a second move while one is in flight.
- Read view over pending rows (the approver queue).

**Explicitly NOT in scope (no regression).** US-A is *additive*: it does not change what Logistics
does. Existing commit → `EquipmentAllocated` → Logistics scheduling stays exactly as today (the
cutover is US-D). This keeps US-A shippable without stranding cross-depot scheduling. See Q5.

**Blocked by:** none.

**Touches (estimates — code not written yet):**
- `db/migrations/0002_transfer_approval.sql` (new)
- `src/Allocation/AllocationService.cs` (`DepotTransferRequested` gains `ReservationId`; `Commit`
  emit site persists a pending row; `Reservation` gains a transfer-status marker)
- `src/Allocation/TransferApprovalQueue.cs` (new — the pending-transfers read view)
- `src/Allocation/ITransferApprovalStore.cs` (new — store interface over the table; Q7)

**Verify:** a cross-depot `Commit` produces a `pending` row visible in the queue and traceable to
its reservation id; a same-depot commit produces no row; the queue is empty when nothing is pending.

**Size:** L. One vertical behaviour with several sub-steps; ACs named above. Kept whole because the
only way to split it is horizontal.

---

## US-B — Accept a pending transfer

**Behaviour (AC2, approval-service half).** An approver accepts a pending transfer. On accept:
re-confirm the unit is still free for the window (reuse the same overlap rule `Commit` already
enforces), mark the transfer `accepted`, keep the reservation pointed at the accepting depot as its
owner, flip the reservation's transfer marker to `accepted`, and **announce an accepted transfer**
(`DepotTransferAccepted`) that Logistics can later act on. **Authorization:** only an approver for
the sending *or* receiving depot may decide; anyone else is refused. Acting on an empty or
already-decided transfer does nothing.

**Blocked by:** US-A — HARD. Needs the persisted `pending` state and the queue that reads it; there
is no transfer to accept until US-A lands.

**Touches (estimates):**
- `src/Allocation/AllocationService.cs` (new `Accept(transferId, approver)`; availability re-check
  reusing the `Overlaps` rule; authorization check; status → `accepted`; reservation marker →
  `accepted`; publish new `DepotTransferAccepted` record type)
- `src/Allocation/TransferApprovalQueue.cs` (wire the **Accept** row action; accepted row leaves the
  queue)

**Verify:** accepting a pending transfer sets status `accepted`, leaves the reservation owned by the
accepting depot, emits `DepotTransferAccepted`, and removes the row from the queue; an approver from
neither depot is refused; accepting an already-decided transfer is a no-op.

**Size:** M–L. One behaviour (accept), several sub-steps that all serve proving "accept works".

---

## US-C — Reject a pending transfer

**Behaviour (AC3).** An approver rejects a pending transfer: mark it `rejected`, flip the
reservation marker to `rejected` and **release the underlying hold** (`Reservation.Release()`) so the
unit returns to the book, and it is never scheduled. Same authorization rule as US-B (approver for
either depot). Publish a `DepotTransferRejected` event so a decision notifier can email on it (Q2,
Q3); nothing schedules on it.

**Blocked by:** US-B — HARD. Two reasons: (a) file collision — US-C edits the same
`AllocationService.cs` decide region and the same queue component US-B introduces, so they cannot be
merged concurrently; (b) US-C reuses the authorization / decision scaffold US-B establishes. (The
"needs pending state" prerequisite is US-A's, already in by the time B lands.)

**Touches (estimates):**
- `src/Allocation/AllocationService.cs` (new `Reject(transferId, approver)`; reuse authorization;
  status → `rejected`; reservation marker → `rejected`; `Reservation.Release()`; publish new
  `DepotTransferRejected` record type)
- `src/Allocation/TransferApprovalQueue.cs` (wire the **Reject** row action; rejected row leaves the
  queue)

**Verify:** rejecting a pending transfer sets status `rejected`, releases the hold (the unit is
committable again), emits `DepotTransferRejected`, never produces a delivery run, and removes the row
from the queue; unauthorized approver refused.

**Size:** S–M. One behaviour (reject).

---

## US-D — Logistics schedules only on an accepted transfer (cross-depot cutover)

**Behaviour (AC2, logistics half).** Today `LogisticsService.On(EquipmentAllocated)` adds a delivery
run for **every** commit. Under this flow a **cross-depot** move must be scheduled only when the
transfer is **accepted** — Logistics reacts to `DepotTransferAccepted`, not to the raw commit. This
is the "one decision made on both sides at once" the RFC calls out: the shape Allocation emits and
the shape Logistics consumes are agreed together (same Fulfilment squad, shared model types, shipped
together), and Allocation's commit emit-site stops triggering immediate scheduling for cross-depot
moves. Same-depot commits keep scheduling on commit unchanged (Q4).

**Blocked by:** US-C — HARD. File collision — US-D edits the `Commit` emit-site gate in the same
`AllocationService.cs` the A/B/C chain owns, so it cannot run concurrently with them; it also needs
US-B's `DepotTransferAccepted` event (already in). Ordered last of the Allocation-touching slices so
the scheduling cutover happens only once the full decision engine (accept + reject) exists — the
cutover never strands a transfer mid-flight.

**Touches (estimates):**
- `src/Logistics/LogisticsService.cs` (new handler `On(DepotTransferAccepted)` → add delivery run;
  stop scheduling cross-depot moves off `EquipmentAllocated`)
- `src/Allocation/AllocationService.cs` (`Commit` emit-site: gate cross-depot so it no longer fires
  immediate Logistics scheduling — the Allocation half of the both-sides flip)

**Verify:** after cutover, a cross-depot commit alone produces no delivery run; only an accepted
transfer produces one; a same-depot commit still schedules immediately; a rejected transfer never
schedules.

**Size:** M. One behaviour (schedule-on-accept), coordinated across two files by one squad.

---

## US-E — Email both depots on a transfer decision

**Behaviour (AC4).** On accept **and** on reject, the sending depot and the receiving depot each
receive an email describing the decision. The existing SendGrid adapter today sends only one kind of
message (fixed subject "Your RentField receipt"); a transfer-decision email needs its own subject and
body. The email is only worth sending once a real accept/reject outcome exists.

**Design (Q2/Q3):** event-driven notifier subscribing to `DepotTransferAccepted` and
`DepotTransferRejected`, matching the codebase's existing `IEventBus` publish/subscribe style
(Allocation publishes, Logistics subscribes). This keeps US-E's files disjoint from Allocation.

**Blocked by:** US-C — HARD. Needs the `DepotTransferRejected` event to demonstrate the reject half
of AC4; the `DepotTransferAccepted` event from US-B is already in by then. Single direct upstream.

**Touches (estimates):**
- `src/Notifications/TransferDecisionNotifier.cs` (new — subscribes to both decision events,
  resolves the two depots' addresses, sends both emails on each decision)
- `src/Vendors/ExternalServiceClients.cs` (`SendGridNotificationClient` gains a transfer-decision
  send with its own subject/body — folded here rather than made its own XS slice)

**Verify:** an accept emits two emails (sending + receiving depot) with the transfer-decision
subject/body; a reject emits two emails; no email fires before a decision exists.

**Size:** S–M. One behaviour (email on decision), covering both outcomes and both depots.

---

## 3. Ordering edges (all hard; no soft edges)

| Edge | Kind | Why |
|---|---|---|
| US-B **Blocked by** US-A | hard | Cannot observe an accept without the persisted pending state + queue. |
| US-C **Blocked by** US-B | hard | Same-file collision in `AllocationService.cs`/queue; reuses B's authorization scaffold. |
| US-D **Blocked by** US-C | hard | Same-file collision on the `Commit` emit-site gate; needs B's `DepotTransferAccepted` event (already in). |
| US-E **Blocked by** US-C | hard | Needs the `DepotTransferRejected` event to prove the reject half of AC4. |

There are **no soft edges** in this breakdown — every ordering constraint is an artifact/code/file
dependency, not a product-sequencing preference. Nothing here should be presented as a gate that
could instead ship in parallel.

## 4. Parallel-safety (derived from `Touches:` sets)

`src/Allocation/AllocationService.cs` is the hotspot: US-A, US-B, US-C, and US-D all modify it (and
A/B/C also share `TransferApprovalQueue.cs`). Any overlap ⇒ not parallel-safe ⇒ these four **must
serialize**: A → B → C → D. No two of them may be fanned out to separate implementers.

US-E touches only `src/Notifications/*` (new) and `src/Vendors/ExternalServiceClients.cs`. Its
touched-file set is **disjoint** from the Allocation/Logistics chain, so its ordering is driven only
by the hard artifact edge on US-C (needs the reject event), not by any file collision.

## 5. Concurrency statement

- **Wave 1:** US-A (solo — foundation; blocks everything).
- **Wave 2:** US-B (solo — lands the accept path, the `DepotTransferAccepted` event, and the
  authorization scaffold that C reuses; touches the Allocation hotspot).
- **Wave 3:** US-C (solo — touches the same Allocation hotspot + queue as B).
- **Wave 4:** **US-D ∥ US-E** — parallel-safe. Once US-C lands, both unblock and their touched-file
  sets are disjoint (`src/Logistics` + Allocation `Commit` emit-site for US-D vs `src/Notifications`
  + `src/Vendors` for US-E). Fan these two out to separate implementers.

The Allocation hotspot forces a mostly-serial chain; the single genuine fan-out opportunity is
US-D ∥ US-E after US-C. Two implementers on US-D and US-E will not collide on any file.
