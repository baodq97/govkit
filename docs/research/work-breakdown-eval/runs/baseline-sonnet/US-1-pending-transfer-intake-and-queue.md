## US-1 — Pending transfer intake and queue

Parent: RFC-9101 (Depot transfer approval and notification flow)
Size: M
Blocked by: none

### Story

As a depot approver, when a cross-depot commit happens I want it to land as a pending transfer in
a queue I can read, so I have one place that shows everything waiting on a decision.

### Touches

- `db/migrations/0002_transfer_approval.sql` (new — see Q7 in `QUESTIONS.md` for the filename
  assumption): `transfer_approval(id, asset_tag, from_depot, to_depot, requested_for, status,
  decided_by, decided_at)`.
- `src/Allocation/AllocationService.cs`: `DepotTransferRequested` gains a `ReservationId` field;
  `Commit` gains the in-flight guard (Q1).
- A new listener/service (e.g. `TransferApprovalService`) that persists the pending row on
  `DepotTransferRequested` and exposes a `Pending()` query — same shape as
  `LogisticsService.Pending()` today.
- `Reservation`: a new transfer-status field (`none` / `pending` / `accepted` / `rejected`).

### Acceptance criteria

- **AC1** — a cross-depot commit is persisted as `pending` and appears in a queue an approver can
  read (asset, from-depot, to-depot, requested date).
- **In-flight guard** — while a unit already has a transfer `pending` or `accepted`, a further
  cross-depot commit for the same asset is refused (extends the existing overlap-window refusal;
  see Q1).
- **AC5 (schema half)** — the persisted row and the emitted event both carry the reservation id,
  so every later decision is traceable back to it. The full end-to-end proof of AC5 needs a real
  decision (US-2/US-4) — this slice only lays the plumbing down.

### Verification

1. Commit a unit to its home depot → no pending row.
2. Commit a unit to a non-home depot → exactly one pending row, with the correct asset, from/to
   depot, requested date, and reservation id.
3. A second cross-depot commit for the same asset while the first is still pending/accepted →
   refused; queue unchanged.

### Notes

Same-depot commits are explicitly out of scope for the pending flow — only cross-depot commits
generate a `DepotTransferRequested` today, and nothing here changes that.
