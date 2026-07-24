Work breakdown — RFC-9101 (Depot transfer approval and notification flow)
==========================================================================

Produced by the `work-breakdown` skill against the RentField fixture. Source RFC:
`fixture/docs/rfc-transfer-approval.md` (status: accepted). Governed files per the RFC
front-matter: `src/Allocation/AllocationService.cs`, `src/Logistics/LogisticsService.cs`,
`src/Vendors/ExternalServiceClients.cs`, `db/migrations/`.

Six ambiguities the RFC leaves open were resolved by explicit assumption rather than by
stopping to ask — see `QUESTIONS.md` in this directory for each question and the assumption
taken. The slice boundaries below already reflect those assumptions.

Why four slices, not one
-------------------------

The RFC itself sizes this as bigger than one sitting: "This whole decision engine — pending
intake, the accept path, the reject path, the availability re-check, the authorization rule,
and the two announcements — is more than one sitting of work; it cannot be reviewed as a
single change." That is an **XL** on the sizing ladder (can't hold it all in your head) — it
must break down; it must not start as one unit.

Four break triggers were checked against every candidate cut below:
1. Title contains "and" — used to reject a slice whenever its name was really two features.
2. Two ACs need different verification — used to keep *accept* and *reject* apart (they
   prove out differently: one ends in a scheduled delivery run, the other in a released hold).
3. Crosses more than one boundary — checked against `config/teams.yaml`: Allocation +
   Logistics are the **same** squad (fulfilment) and the README says they "always ship in the
   same release," so a cut that forces them into lockstep is not a boundary violation, it's the
   existing boundary. Vendors (the SendGrid adapter) has **no owning squad** in `teams.yaml` at
   all (see Q4) — extending it is a real boundary crossing, but the RFC itself says the email
   "is only worth sending once there is a real accept/reject outcome to describe," i.e. an
   adapter change with no caller is a horizontal, non-demonstrable layer (the exact anti-pattern
   the skill warns against) — so it rides along inside the slice that first produces a real
   decision, rather than becoming its own slice.
4. Can't demo it in one sitting — used to reject "just the migration" as a slice (the skill's
   own bad example is literally "Slice 1: all the database tables"); every slice below either
   ships a visible, queryable behaviour or a unit-testable event contract, never a bare table.

The slices
----------

### US-1 — Persist a requested transfer as pending and expose it in the queue

**Covers:** AC1 (pending transfer persisted, appears in a queue), AC5 (traceable to its
reservation).

**Size:** M — a handful of small, co-located changes around one demonstrable behaviour: commit
a cross-depot unit, see a pending row in the queue that carries the reservation id.

**What it does:**
- New migration `db/migrations/0002_transfer_approval.sql` creates `transfer_approval` with
  columns `id, reservation_id, asset_tag, from_depot, to_depot, requested_for, status,
  decided_by, decided_at` — `reservation_id` is added beyond the RFC's literal column list
  (Q1) because AC5 requires it and nothing else in the row is a safe join key.
- `DepotTransferRequested` gains a `ReservationId` field; the emit site in
  `AllocationService.Commit()` is updated to pass it.
- While that emit site is already being touched, also extend the *shared* `EquipmentAllocated`
  event with an `IsCrossDepotTransfer` bool (Q5) and define the shape (not yet the emission) of
  a new `TransferAccepted` event — both are consumed later (US-2, US-4) but defining them here
  avoids re-touching this same emit site twice.
- `Reservation` gains a `TransferStatus` field (`none | pending | accepted | rejected`), flipped
  to `pending` at the same point `DepotTransferRequested` is published.
- New file `src/Allocation/TransferApprovalService.cs` (Q6: new class in the Allocation module,
  not a new top-level module and not bolted onto `AllocationService`) with a handler for
  `DepotTransferRequested` that inserts the pending row, and a `Pending()` read method mirroring
  the existing `LogisticsService.Pending()` pattern (Q2: this fixture has no controller/UI
  layer anywhere, so the "approver queue" is modelled at the same altitude as every other
  module's read side).

**Touches:**
- `db/migrations/0002_transfer_approval.sql` (new)
- `src/Allocation/AllocationService.cs` (modify: event field additions, emit-site changes,
  `Reservation.TransferStatus`)
- `src/Allocation/TransferApprovalService.cs` (new)

**Blocking:** nothing — this is the foundation everything else needs.

---

### US-2 — Logistics schedules only on an accepted transfer

**Covers:** AC2 (scheduling half), AC3 (scheduling-safety half — "never scheduled" for a
rejected transfer).

**Size:** S — one file, two small conditionals.

**What it does:** today `LogisticsService.On(EquipmentAllocated)` schedules a delivery run for
*every* commit, unconditionally — including the instant a cross-depot commit lands, long before
any approval decision exists. Under the new flow that must stop:
- `On(EquipmentAllocated)` skips scheduling when `e.IsCrossDepotTransfer` is true.
- A new `On(TransferAccepted)` handler schedules the run once a transfer is actually accepted.

Same-depot commits are untouched (non-goal: "no change to how the initial commit ... works").

**Touches:**
- `src/Logistics/LogisticsService.cs` (modify only)

**Blocking:** `Blocked by: US-1 (needs the IsCrossDepotTransfer flag on EquipmentAllocated and
the TransferAccepted event shape to exist before this compiles).` Hard edge — code cannot
reference a type or field that doesn't exist yet.

Note this slice does **not** need US-3 or US-4's logic, only the event *shapes* US-1 defines —
see the concurrency statement below.

---

### US-3 — Approver rejects a pending transfer

**Covers:** AC3 (decision half — mark rejected, release the hold), AC4 (reject half — email
both depots).

**Size:** M — one behaviour (reject) plus its two prerequisites (authorization, notification),
all landing in the same class/adapter pair.

**What it does:**
- `TransferApprovalService.Reject(transferId, approverId)`: looks up the pending row, marks it
  `rejected`, calls the reservation's existing `Release()` (already public — no change needed
  to `AllocationService.cs` for this half).
- Introduces the shared authorization seam: `IDepotApproverDirectory.CanDecide(approverId,
  depotId)` (Q3 — the RFC excludes approver-role management from scope but still requires the
  check; this is a minimal port with a stub/test double, not a real directory) and an
  `EnsureAuthorized` guard used by Reject now and reused by Accept in US-4.
- Extends `SendGridNotificationClient` with a decision-agnostic
  `SendTransferDecision(to, decision, assetTag, fromDepot, toDepot)` wrapper over the already-generic
  `ISendGridSdk.Send(to, subject, body)`, and calls it for both depots on reject.

**Touches:**
- `src/Allocation/TransferApprovalService.cs` (modify: adds `Reject`, `IDepotApproverDirectory`,
  `EnsureAuthorized`)
- `src/Vendors/ExternalServiceClients.cs` (modify: adds `SendTransferDecision`)

**Blocking:** `Blocked by: US-1 (needs the pending row and TransferStatus field to exist).` Hard
edge.

---

### US-4 — Approver accepts a pending transfer

**Covers:** AC2 (decision half — mark accepted, hand the reservation to Logistics), AC4 (accept
half — email both depots).

**Size:** M — mostly composition of pieces already built in US-1/US-3 (re-check, guard, email
helper), plus the accept-specific state changes.

**What it does:**
- `TransferApprovalService.Accept(transferId, approverId)`: re-runs the guard from US-3, marks
  the row `accepted`, re-confirms the unit is still free for the window (extracts the existing
  overlap loop in `AllocationService.Commit()` into a small public method, e.g.
  `IsUnitFree(assetTag, start, end)`, rather than duplicating the rule), reassigns
  `Reservation.DepotId` to the accepting depot (needs a new mutator — today `DepotId` is
  `init`-only), publishes `TransferAccepted` (shape defined in US-1), and calls
  `SendTransferDecision(...)` (defined in US-3) for both depots.

**Touches:**
- `src/Allocation/AllocationService.cs` (modify: `IsUnitFree` extraction, `Reservation` depot
  reassignment)
- `src/Allocation/TransferApprovalService.cs` (modify: adds `Accept`, reuses guard + email
  helper)

**Blocking:** `Blocked by: US-1 (needs TransferStatus, TransferAccepted shape, reservation
book).` Hard edge. `Blocked by: US-3 (reuses IDepotApproverDirectory/EnsureAuthorized and
SendTransferDecision from the same TransferApprovalService.cs — building both at once would
have two people editing the same new class, and the authorization rule must not be
implemented twice).` Hard edge, by file overlap.

Ordering and blocking edges — summary
--------------------------------------

```
US-1 (foundation)
 ├─ Blocked by: none
 ├── US-2 (Logistics)   — Blocked by: US-1                       [hard]
 └── US-3 (Reject)      — Blocked by: US-1                       [hard]
       └── US-4 (Accept) — Blocked by: US-1, US-3                [hard]
```

One more edge does not fit the hard/soft file-dependency model cleanly, so it is called out
separately rather than forced into it:

**Release-order note (soft edge, but expensive to ignore).** US-2 is *file*-independent of
US-3/US-4 (soft in the skill's sense — nothing stops building or reviewing them in any order).
But shipping US-3 and/or US-4 to production **before** US-2 reopens a real behaviour gap: until
US-2 lands, `LogisticsService` still schedules a delivery run the instant *any* cross-depot
commit happens, regardless of pending/accepted/rejected — exactly the bug AC2/AC3 exist to
close. Recommend releasing US-1 + US-2 together as the safety-critical pair, even though US-2
was built independently of US-3/US-4.

Parallel-safety — derived from touched files
-----------------------------------------------

| Slice | Touches (estimated) |
|---|---|
| US-1 | `db/migrations/0002_transfer_approval.sql` (new), `src/Allocation/AllocationService.cs`, `src/Allocation/TransferApprovalService.cs` (new) |
| US-2 | `src/Logistics/LogisticsService.cs` |
| US-3 | `src/Allocation/TransferApprovalService.cs`, `src/Vendors/ExternalServiceClients.cs` |
| US-4 | `src/Allocation/AllocationService.cs`, `src/Allocation/TransferApprovalService.cs` |

- US-2's touched set (`LogisticsService.cs`) is **disjoint** from every other slice's set →
  parallel-safe with US-3 and, once US-1 lands, with US-4 as well.
- US-3 and US-4 both touch `TransferApprovalService.cs` → **overlap** → not parallel-safe;
  resolved as a hard blocking edge (US-4 waits on US-3) rather than a merge, because the RFC
  itself treats accept and reject as needing different verification (break trigger 2) and
  merging them back into one slice would recreate the "more than one sitting" problem the RFC
  explicitly called out.
- US-1 and US-4 both touch `AllocationService.cs`, but US-4 already waits on US-1 for other
  reasons, so this overlap adds no new constraint.

**Concurrency statement.** After US-1 ships: US-2 and US-3 can be fanned out to two separate
implementers concurrently (disjoint touched files). US-4 must wait for US-3 to land (shared
`TransferApprovalService.cs`, reused authorization guard and email helper) but does **not**
need to wait for US-2 (disjoint files) — so US-4 and US-2 may also run concurrently once US-3 is
in. Net shape: `US-1 → {US-2} ‖ {US-3 → US-4}`, two independent tracks after the foundation
lands. See the release-order note above for why US-2 should not be *held back* until the
US-3→US-4 track finishes, even though it could be.

Acceptance-criteria coverage
------------------------------

| AC | Covered by |
|---|---|
| AC1 — pending, visible in queue | US-1 |
| AC2 — accept → Logistics schedules | US-4 (decision) **and** US-2 (scheduling) — neither alone satisfies AC2 |
| AC3 — reject → released, never scheduled | US-3 (decision) **and** US-2 (scheduling-safety) — neither alone satisfies AC3 |
| AC4 — email on accept and reject | US-3 (reject half) **and** US-4 (accept half) |
| AC5 — traceable to reservation | US-1 |

Non-goals carried through unchanged (no slice touches these): the commit-time overlap
invariant itself, approver-role management UI, any non-email notification channel, pricing,
invoicing, maintenance, or the nightly ERP/CRM syncs.
