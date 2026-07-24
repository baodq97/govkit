# GRADE — after-sonnet run (RFC-9101 work-breakdown)

Graded against `rubric.md` (32 pts, 14 checks). Primary artifact:
`rfc-9101-work-breakdown.md`; corroborated by `QUESTIONS.md`, `RUN-NOTES.md`.
Every dependency claim cross-checked against fixture source.

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 (T5) Slices vertical, not layers | 3 | PASS | 3 | Slices cut by feature, not layer. US-1: "commit a cross-depot unit, see a pending row in the queue that carries the reservation id." Runner rejects a horizontal cut: "used to reject 'just the migration' as a slice … never a bare table." No schema/service/UI layer slices. |
| A2 (T3) XL decision engine split | 3 | PASS | 3 | Cites the trap quote ("it cannot be reviewed as a single change … That is an **XL**") then splits: pending intake (US-1), reject (US-3), accept (US-4); auth folded into US-3, re-check into US-4. Not carried as one L/XL unit. |
| A3 (T1) Same-file coupling surfaced | 3 | PASS | 3 | Reservation.TransferStatus + DepotTransferRequested.ReservationId + emit-site all merged into US-1; reasoning "While that emit site is already being touched…" and "avoids re-touching this same emit site twice." US-1/US-4 AllocationService.cs overlap called out. Confirmed: `AllocationService.cs` holds Reservation + DepotTransferRequested + Commit in one file. |
| A4 (T4) Migration precedes two slices | 2 | PASS | 2 | Migration `0002_transfer_approval.sql` in US-1 (placed first, "the foundation everything else needs"); US-3 ("marks it rejected") and US-4 ("marks the row accepted") both write the table and both carry `Blocked by: US-1`. Two consumers ordered after. Confirmed 0001 exists, new is 0002. |
| A5 (T2) Unverifiable emit merged/re-cut | 3 | PASS | 3 | No standalone emit slice. US-1 emits `DepotTransferRequested` AND lands its consumer (the `TransferApprovalService` handler that "inserts the pending row") — the pair is demonstrable via the queue. Confirmed fixture: "Nothing listens for this yet." |
| A6 (T6) SendGrid refactor folded | 2 | PASS | 2 | SendGrid change ("Extends `SendGridNotificationClient` with a decision-agnostic `SendTransferDecision`") is carried inside US-3 (a notify-bearing reject slice), reused in US-4 — not a standalone item. Confirmed fixture hardcodes `"Your RentField receipt"`. |
| B1 Slices independently testable/rejectable | 3 | PASS | 3 | Each slice ends in an observable outcome: US-1 pending row in queue; US-2 "skips scheduling when e.IsCrossDepotTransfer is true"; US-3 "marks it rejected, calls … Release()" + emails; US-4 mark accepted + re-check + event + email. No plumbing-only slice. |
| B2 Blocking edges sound + complete vs code | 3 | PARTIAL | 1.5 | Real edges present: migration→US-3/US-4 (Blocked by US-1); AllocationService coupling merged into US-1; US-4←US-3 justified by shared new `TransferApprovalService.cs`. BUT the rubric's `Logistics-schedules-on-accepted ← Allocation-emits-accepted` edge is unrecorded: `TransferAccepted` is emitted in US-4, consumed in US-2, yet US-2 is "Blocked by: US-1" only and runner states "this slice does **not** need … US-4." Runner's own AC table admits "AC2 … US-4 (decision) **and** US-2 (scheduling) — neither alone satisfies AC2" — a real co-requisite left without an edge. No invented logical edges. |
| B3 Sizes on the XS–XL ladder | 2 | PASS | 2 | US-1 "Size: M"; US-2 "Size: S — one file, two small conditionals"; US-3 "Size: M"; US-4 "Size: M". All on-ladder, plausibly scoped. |
| B4 Parallel-safety derived + concurrency statement | 2 | PASS | 2 | Per-slice `Touches:` table + derivation ("US-2's touched set … is **disjoint**"; "US-3 and US-4 both touch TransferApprovalService.cs → **overlap** → not parallel-safe") + closing "**Concurrency statement**. After US-1 ships: US-2 and US-3 can be fanned out … concurrently." No false disjointness: "US-1 and US-4 both touch AllocationService.cs" is acknowledged, not called disjoint. |
| B5 Deps in body text, not front-matter key | 1 | PASS | 1 | Dependencies as prose `Blocked by:` lines (e.g. "**Blocking:** `Blocked by: US-1 …`"). No invented `blockedBy:` front-matter key. |
| B6 Break triggers applied | 2 | PASS | 2 | All four triggers invoked by number: "1. Title contains 'and'"; "2. Two ACs need different verification — used to keep accept and reject apart"; "3. Crosses more than one boundary — checked against config/teams.yaml"; "4. Can't demo it in one sitting — used to reject 'just the migration'." |
| B7 Edges kept few (≤~1 upstream) | 1 | PARTIAL | 0.5 | US-1/US-2/US-3 rest on ≤1 upstream, but US-4 carries two explicit upstreams: "`Blocked by: US-1 …` Hard edge. `Blocked by: US-3 …` Hard edge, by file overlap." Runner did not re-slice US-4 to a single upstream (rubric's remedy). Not FAIL (no 3+ stack). |
| B8 Output contract complete (AC1–AC5) | 2 | PASS | 2 | Backlog carries id/title, size, deliverable, ordering per slice; AC table maps AC1→US-1, AC2→US-4+US-2, AC3→US-3+US-2, AC4→US-3+US-4, AC5→US-1. All five covered. |
| **TOTAL** | **32** | | **30** | |

## Category subtotals

- **Group A (traps T1–T6):** 16 / 16
- **Group B (general breakdown quality):** 14 / 16
- **TOTAL: 30 / 32**

## Non-PASS notes (what full credit needed)

- **B2 (1.5/3):** Record the producer→consumer edge for the accepted event —
  US-2 (schedules on `TransferAccepted`) depends on US-4 (emits it); AC2 is
  split across both with no edge linking them. Full credit needed either an
  edge US-2↔US-4 or merging the emit+schedule so AC2 is demonstrable in one place.
- **B7 (0.5/1):** US-4 stands on two upstreams (US-1 + US-3). Full credit needed
  re-slicing/merging so US-4 rests on a single upstream (US-3 already carries US-1
  transitively).
