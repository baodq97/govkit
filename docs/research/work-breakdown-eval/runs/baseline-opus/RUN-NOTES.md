# Run notes — baseline-opus, work-breakdown skill vs. RFC-9101

Executed `swe-flow:work-breakdown` (SKILL.md, single file) blind against the RentField fixture
and its accepted RFC `docs/rfc-transfer-approval.md`.

## Files read, in order

1. `plugins/swe-flow/skills/work-breakdown/SKILL.md` — the skill under evaluation.
2. `fixture/docs/rfc-transfer-approval.md` — the accepted RFC being broken down (the input).
3. `fixture/README.md` — RentField domain overview + team boundaries.
4. `fixture/src/Allocation/AllocationService.cs` — `Commit`, `Reservation`,
   `DepotTransferRequested`/`EquipmentAllocated` emit sites (governed by the RFC).
5. `fixture/src/Logistics/LogisticsService.cs` — `On(EquipmentAllocated)`, `DeliveryRun`
   (governed; the "schedule off accepted, not raw commit" change).
6. `fixture/src/Vendors/ExternalServiceClients.cs` — `SendGridNotificationClient.SendReceipt`
   fixed-subject adapter (governed; the transfer-decision email extension).
7. `fixture/db/migrations/0001_audit_log.sql` — existing migration; shows migration layout for
   the new `transfer_approval` table (governed dir `db/migrations/`).
8. `fixture/config/teams.yaml` — squad ownership; establishes that fulfilment owns Allocation +
   Logistics with a shared release (the "do not cut this seam" evidence).
9. `fixture/src/Rentals/Rentals.csproj` — project-reference conventions / packaging (boundary
   context).
10. `fixture/src/Rentals/RentalOrderService.cs` — reservation/order/invoicing wiring (boundary
    context; confirmed out of scope per RFC non-goals).
11. `fixture/src/BuildingBlocks/Money.cs` — confirmed it carries no business policy; not
    load-bearing for the breakdown.

Two `find` directory listings were run first to enumerate the skill dir and the fixture tree
(no file contents read). No files outside the skill dir, the fixture, and my own outputs were
read; the rubric, README, other runs, and other `docs/research/` dirs were not opened.

## Outputs written (this dir)

- `WORK-BREAKDOWN.md` — the deliverable: XL-check, break-trigger analysis, five vertical slices
  with sizes, AC mapping, the Allocation/Logistics no-cut rationale, ordering waves, and an AC
  coverage table.
- `QUESTIONS.md` — seven judgment-call questions + the assumption taken for each.
- `RUN-NOTES.md` — this file.

## Method summary

- Confirmed the RFC is XL (self-declared) ⇒ must break down; all four break triggers fire.
- Cut **vertically**: each slice is schema → domain logic → event → read/side-effect → test.
- Held the Allocation↔Logistics seam together (one squad, shared types, shared release) to avoid
  the horizontal-layer trap.
- Kept every slice to **at most one** upstream `Blocked by:` edge; recorded edges in the story
  body, not front-matter (govkit resolves `parent` only).
