# Run notes — domain-decompose over the RentField fixture

Skill: `domain-decompose` (snapshot at
`/tmp/claude-1000/-home-bd-personal-projects-govkit/.../skill-head/domain-decompose/`).
Target repo (project root): `docs/research/domain-decompose-eval/fixture/`.
Mode: **create** (no prior `docs/domain/` generated artifacts found).

## Docs-root detection (output-template §1)
The fixture has `docs/` but no `docs/domain/` and no `_TEMPLATE.md`/`INDEX.md` convention →
detection rule #2 would create `fixture/docs/domain/`. Per the harness instruction, output was
instead written to this runs directory
(`docs/research/domain-decompose-eval/runs/baseline-head-opus/`), mirroring the
`docs/domain/` layout (context-map.md + INDEX.md + one folder per context with README.md +
model.yaml). No project frontmatter convention was detected, so the template default was used.
No source files or other repo files were modified.

## Files read, in order
1. `skill-head/domain-decompose/SKILL.md`
2. `fixture/README.md`
3. `fixture/docs/domain-notes-draft.md`
4. `fixture/docs/erp-integration-notes.txt`
5. `skill-head/domain-decompose/references/output-template.md`
6. `skill-head/domain-decompose/references/ddd-methodology.md`
7. `skill-head/domain-decompose/references/bounded-context-canvas.md`
8. `skill-head/domain-decompose/references/aggregate-design-canvas.md`
9. `fixture/src/Allocation/AllocationService.cs`
10. `fixture/src/Pricing/PricingEngine.cs`
11. `fixture/src/Pricing/PriceQuoted.cs`
12. `fixture/src/Rentals/RentalOrderService.cs`
13. `fixture/src/Maintenance/MaintenanceScheduleService.cs`
14. `fixture/src/Catalog/CatalogService.cs`
15. `fixture/src/Logistics/LogisticsService.cs`
16. `fixture/src/Accounts/CustomerAccountService.cs`
17. `fixture/src/ErpSync/NightlyErpSyncJob.cs`
18. `fixture/src/Invoicing/InvoicingClient.cs`
19. `fixture/src/Vendors/ExternalServiceClients.cs`
20. `fixture/src/Documents/DocumentService.cs`
21. `fixture/src/BuildingBlocks/Money.cs`
22. `fixture/src/BuildingBlocks/UnitOfMeasure.cs`
23. `fixture/src/SharedDomainRules/GlobalRules.cs`
24. `fixture/src/SharedDomainRules/README.md`
25. `fixture/config/teams.yaml`
26. `fixture/db/migrations/0001_audit_log.sql`
27. `fixture/src/Rentals/Rentals.csproj`

(The README was the authoritative prose description; the draft notes are stale; the shipped
`src/**` was read only to reconcile draft-vs-shipped conflicts and confirm current shapes, per
SKILL step 1 — not reverse-engineered into the model.)

## Process trace (SKILL steps)
- **Step 1 (reconcile).** Found stale draft (`domain-notes-draft.md`) vs README + shipped code.
  Recorded 6 divergences in the Conflicts table; chose running code/README as authoritative each
  time; blended none.
- **Step 2 (frame).** Extracted events (`EquipmentAllocated`, `DepotTransferRequested`,
  `PriceQuoted`, `RentalOrderPlaced`), commands (`Commit`, `Quote`, `Place`, `RaiseInvoice`), and
  recurring nouns (Reservation, Asset, Depot, Quote, Order, Invoice, Account, Document).
- **Step 3 (strategic).** 13 bounded contexts, classified core/supporting/generic; named the
  `PriceQuoted` published-language contract as the load-bearing extraction seam; distinguished the
  Allocation↔Logistics shared kernel and the Fleet↔ERP ACL.
- **Step 4 (tactical + continuity check).** Per-context aggregates/entities/VOs/events; ran the
  event-flow continuity check and flagged `DepotTransferRequested` as an orphan emit.
- **Step 5 (questions).** 6 genuine ambiguities → `QUESTIONS.md`, each with the assumption used.
- **Step 6 (emit).** Create mode: `context-map.md`, `INDEX.md`, 13 context folders.

## Output contract produced
- `context-map.md` — Mermaid context map, Core Domain Chart, Conflicts & reconciliation table,
  load-bearing seam, event-flow continuity check, deliberately-not-modeled notes, team alignment.
- `INDEX.md` — 13 rows (DOMAIN-0001…0013), all `status: draft`, `owner: TBD`.
- 13 × `<context>/README.md` (Bounded Context Canvas) + `<context>/model.yaml`.
- `QUESTIONS.md`, `RUN-NOTES.md`.
