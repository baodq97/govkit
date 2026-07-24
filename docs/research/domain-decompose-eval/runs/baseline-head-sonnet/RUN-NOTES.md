# Run notes — domain-decompose on RentField fixture

Every file read during this run, in order. (Directory listings via `find`/`ls` are not file reads
and are omitted; the underlying `SKILL.md`/reference paths and fixture path are the two allowed
read roots per the run's constraints.)

1. `skill-head/domain-decompose/SKILL.md`
2. `fixture/README.md`
3. `fixture/docs/domain-notes-draft.md`
4. `fixture/docs/erp-integration-notes.txt`
5. `fixture/config/teams.yaml`
6. `fixture/db/migrations/0001_audit_log.sql`
7. `fixture/src/Accounts/CustomerAccountService.cs`
8. `fixture/src/Allocation/AllocationService.cs`
9. `fixture/src/BuildingBlocks/Money.cs`
10. `fixture/src/BuildingBlocks/UnitOfMeasure.cs`
11. `fixture/src/Catalog/CatalogService.cs`
12. `fixture/src/Documents/DocumentService.cs`
13. `fixture/src/ErpSync/NightlyErpSyncJob.cs`
14. `fixture/src/Invoicing/InvoicingClient.cs`
15. `fixture/src/Logistics/LogisticsService.cs`
16. `fixture/src/Maintenance/MaintenanceScheduleService.cs`
17. `fixture/src/Pricing/PriceQuoted.cs`
18. `fixture/src/Pricing/PricingEngine.cs`
19. `fixture/src/Rentals/RentalOrderService.cs`
20. `fixture/src/Rentals/Rentals.csproj`
21. `fixture/src/SharedDomainRules/GlobalRules.cs`
22. `fixture/src/SharedDomainRules/README.md`
23. `fixture/src/Vendors/ExternalServiceClients.cs`
24. `skill-head/domain-decompose/references/ddd-methodology.md`
25. `skill-head/domain-decompose/references/bounded-context-canvas.md`
26. `skill-head/domain-decompose/references/aggregate-design-canvas.md`
27. `skill-head/domain-decompose/references/output-template.md`
28. `fixture/src/Rentals/Rentals.csproj` (re-read; no-op, file unchanged — tool reported "wasted call")

Full absolute paths (roots, for reference):
- Skill root: `/tmp/claude-1000/-home-bd-personal-projects-govkit/d726ae46-3da4-46fc-9e39-b4569a9cef01/scratchpad/skill-head/domain-decompose/`
- Fixture root: `/home/bd/personal-projects/govkit/docs/research/domain-decompose-eval/fixture/`

## Process followed
Steps 1–6 of `SKILL.md` in order: (1) reconcile existing domain artifacts — found a stale
whiteboard draft (`docs/domain-notes-draft.md`) that disagrees with the shipped code/README on four
points (recorded in `docs/domain/context-map.md`'s Conflicts table, code/README chosen as
authoritative in each case); (2) framed events/actors/nouns from the README, ERP notes, and code
comments; (3) first-pass strategic decomposition — 10 bounded contexts, Core Domain Chart, and the
load-bearing extraction seam (Pricing's versioned `PriceQuoted` contract); (4) first-pass tactical
model per context, plus the event-flow continuity check (found one orphan emit —
`DepotTransferRequested` — and one narrative-vs-code gap — Rentals never actually consumes
Allocation's output); (5) 7 targeted questions written to `QUESTIONS.md` with the assumption
proceeded on for each; (6) emitted `docs/domain/` in **create mode** (no prior generated artifacts
existed in the fixture) — `context-map.md`, `INDEX.md`, and one folder per context with `README.md`
+ `model.yaml`.

## Deviation note
The skill's own output-template step 1 says to write into the invoking project's `docs/domain/`
(i.e. under `fixture/docs/domain/`). Per this run's explicit output-location constraint, the entire
`docs/domain/` tree was instead written under this run directory
(`runs/baseline-head-sonnet/docs/domain/`), mirroring the exact layout the skill would have produced
in the fixture. No files were written into the fixture itself.
