# Run notes — files read, in order

Blinding respected: read only the work-breakdown skill dir, the fixture dir, and files I wrote.
Did not read the rubric, README of the eval harness, other runs, other `docs/research/` dirs, or
`self-learning`.

## Directory listings (orientation, not file reads)
1. `ls` of `plugins/swe-flow/skills/work-breakdown/` — found only `SKILL.md`.
2. `find` over `docs/research/work-breakdown-eval/fixture/` — enumerated fixture tree.

## Files read (in order)
1. `plugins/swe-flow/skills/work-breakdown/SKILL.md` — the skill being executed.
2. `docs/research/work-breakdown-eval/fixture/README.md` — RentField product/team/system context.
3. `docs/research/work-breakdown-eval/fixture/docs/rfc-transfer-approval.md` — the accepted RFC-9101 being broken down.
4. `docs/research/work-breakdown-eval/fixture/src/Allocation/AllocationService.cs` — commit/overlap rule, `DepotTransferRequested` emit site, `Reservation`, event bus.
5. `docs/research/work-breakdown-eval/fixture/src/Logistics/LogisticsService.cs` — `On(EquipmentAllocated)` schedule-on-every-commit handler.
6. `docs/research/work-breakdown-eval/fixture/src/Vendors/ExternalServiceClients.cs` — SendGrid adapter (`SendReceipt`, fixed subject).
7. `docs/research/work-breakdown-eval/fixture/db/migrations/0001_audit_log.sql` — existing migration shape/convention.
8. `docs/research/work-breakdown-eval/fixture/config/teams.yaml` — squad ownership (fulfilment owns allocation+logistics, shared release).
9. `docs/research/work-breakdown-eval/fixture/src/Rentals/RentalOrderService.cs` — event-bus/port pattern reference (pub/sub style).
10. `docs/research/work-breakdown-eval/fixture/src/Rentals/Rentals.csproj` — project-reference conventions (contracts-only cross-module deps).
11. `docs/research/work-breakdown-eval/fixture/src/BuildingBlocks/Money.cs` — shared value-type convention.

## Files NOT read (out of scope for this RFC's slices)
`src/Pricing/*`, `src/Catalog/CatalogService.cs`, `src/Maintenance/MaintenanceScheduleService.cs`,
`src/ErpSync/NightlyErpSyncJob.cs`, `src/Invoicing/InvoicingClient.cs`,
`src/Accounts/CustomerAccountService.cs`, `src/Documents/DocumentService.cs`,
`src/BuildingBlocks/UnitOfMeasure.cs`, `src/SharedDomainRules/*`. The RFC's non-goals exclude
pricing/invoicing/maintenance/ERP/CRM, so these did not inform the breakdown.

## Files written (this run)
- `docs/research/work-breakdown-eval/runs/after-opus/WORK-BREAKDOWN.md` — the deliverable.
- `docs/research/work-breakdown-eval/runs/after-opus/QUESTIONS.md` — 8 questions + assumptions.
- `docs/research/work-breakdown-eval/runs/after-opus/RUN-NOTES.md` — this file.
