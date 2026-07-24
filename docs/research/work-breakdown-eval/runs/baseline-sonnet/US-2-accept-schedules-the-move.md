## US-2 — Accept schedules the move

Parent: RFC-9101 (Depot transfer approval and notification flow)
Size: L
Blocked by: US-1 (needs the `transfer_approval` table and pending queue to have something to
accept)

### Story

As a depot approver, I want to accept a pending transfer for a unit that is still free, so that
Logistics schedules the move instead of it sitting unhandled.

### Touches

- `src/Allocation/AllocationService.cs` (or the `TransferApprovalService` introduced in US-1): a
  shared `Decide(transferId, approverId, verdict)` entry point gains:
  - the authorization guard — only an approver for the sending or receiving depot may decide (Q2
    for where approver→depot membership resolves from);
  - the idempotency guard — deciding an empty or already-decided transfer is a no-op;
  - the accept branch — re-check availability with the same overlap rule `Commit` already
    enforces, mark `accepted` with `decided_by`/`decided_at`, and announce an accepted-transfer
    event.
- `src/Logistics/LogisticsService.cs`: stop scheduling a run the instant a cross-depot commit
  lands; schedule only off the new accepted-transfer announcement (Q4 for how Logistics tells a
  same-depot commit from a cross-depot one).

### Acceptance criteria

- **AC2** — accept re-confirms the unit is still free for the window, and an accepted transfer is
  what Logistics schedules (today Logistics schedules every commit indiscriminately).
- **Authorization / idempotency** — the constraints from "Approval service logic" / "Approver
  surface": non-approvers are refused, and acting on an empty or already-decided transfer produces
  no visible change.
- **AC5 (accept path)** — an accepted decision is now traceable end to end back to its reservation.

### Verification

1. Accept a pending transfer for a unit still free for the window → transfer flips to `accepted`,
   `Logistics.Pending()` gains a new run for it, traceable back to the reservation.
2. Accept a transfer for a unit no longer free (something else committed it in the meantime) →
   refused, nothing scheduled.
3. Someone who is not an approver for either the sending or receiving depot → refused.
4. Accept called twice, or on a non-existent transfer id → second call is a no-op.

### Note — why Allocation and Logistics change together in one slice, not two

This slice deliberately overrides the usual "crosses more than one boundary → split" rule:
`config/teams.yaml` has one squad owning both (`fulfilment: owns: [allocation, logistics]`,
`release_cadence: shared`), the platform `README.md` says they "share model types and always ship
in the same release," and the RFC itself says the emit/consume shape "is one decision made on both
sides at once." Splitting the emitted contract from its only consumer, when the same team ships
both together, would leave a slice with nothing demonstrable on its own.
