# Run notes — domain-decompose over the RentField fixture

Skill: `swe-flow:domain-decompose`. Mode: **create** (no prior `docs/domain/` artifacts in the
target repo). Target repo: `docs/research/domain-decompose-eval/fixture/`.

## Output location decision (output-template.md §1)
The fixture has a `docs/` folder but no `docs/domain/` → the skill would create
`docs/domain/`. Per the run harness, all outputs are written under
`runs/baseline-opus/` instead, mirroring the `docs/domain/` layout the skill specifies
(`context-map.md`, `INDEX.md`, one folder per bounded context with `README.md` + `model.yaml`).

## Files read (in order)

### Skill
1. `plugins/swe-flow/skills/domain-decompose/SKILL.md`

### Target repo — prose / config / rules (step 1: find & reconcile existing domain knowledge)
2. `fixture/README.md`
3. `fixture/docs/domain-notes-draft.md`
4. `fixture/docs/erp-integration-notes.txt`
5. `fixture/config/teams.yaml`
6. `fixture/db/migrations/0001_audit_log.sql`
7. `fixture/src/SharedDomainRules/README.md`

### Target repo — source carrying stated domain rules (in-scope: comments/config/contracts)
8. `fixture/src/Allocation/AllocationService.cs`
9. `fixture/src/Pricing/PricingEngine.cs`
10. `fixture/src/Pricing/PriceQuoted.cs`
11. `fixture/src/Rentals/RentalOrderService.cs`
12. `fixture/src/Catalog/CatalogService.cs`
13. `fixture/src/Logistics/LogisticsService.cs`
14. `fixture/src/Maintenance/MaintenanceScheduleService.cs`
15. `fixture/src/Accounts/CustomerAccountService.cs`
16. `fixture/src/Documents/DocumentService.cs`
17. `fixture/src/ErpSync/NightlyErpSyncJob.cs`
18. `fixture/src/Invoicing/InvoicingClient.cs`
19. `fixture/src/Vendors/ExternalServiceClients.cs`
20. `fixture/src/SharedDomainRules/GlobalRules.cs`
21. `fixture/src/BuildingBlocks/Money.cs`
22. `fixture/src/BuildingBlocks/UnitOfMeasure.cs`
23. `fixture/src/Rentals/Rentals.csproj`

### Skill references (loaded when the process pointed to them)
24. `plugins/swe-flow/skills/domain-decompose/references/ddd-methodology.md`
25. `plugins/swe-flow/skills/domain-decompose/references/bounded-context-canvas.md`
26. `plugins/swe-flow/skills/domain-decompose/references/aggregate-design-canvas.md`
27. `plugins/swe-flow/skills/domain-decompose/references/output-template.md`

(Two `find` directory listings were also run to enumerate the fixture and skill trees; no other
files were opened. No files outside the skill dir and the fixture dir were read.)

## Process trace
- **Step 1 (reconcile):** Found no prior `docs/domain/`. Found three disagreeing sources — shipped
  code, README, and a stale draft note — plus a `SharedDomainRules` god-module and an `audit_log`
  migration. Resolved all conflicts in favour of shipped code; recorded each in `context-map.md`.
- **Step 2 (frame):** Extracted events (`EquipmentAllocated`, `DepotTransferRequested`,
  `PriceQuoted`, `RentalOrderPlaced`), commands (`Commit`, `Quote`, `Place`, `RaiseInvoice`, …),
  and recurring nouns.
- **Step 3 (strategic):** 11 bounded contexts; classified core/supporting/generic; named the
  Pricing/`PriceQuoted` published-language seam as the load-bearing extraction seam.
- **Step 4 (tactical, right-sized):** Real aggregates only for the three core contexts
  (Allocation, Pricing, Rentals). Supporting/generic/master-data contexts get `aggregates: []`
  with a stated rationale. Ran the event-flow continuity check → found the `DepotTransferRequested`
  orphan emit.
- **Step 5 (questions):** 8 genuine ambiguities recorded in `QUESTIONS.md` with the assumption
  proceeded on; did not stop.
- **Step 6 (emit):** Wrote `context-map.md`, `INDEX.md`, and 11 context folders
  (`README.md` + `model.yaml`) under the output dir. All docs `status: draft`, `owner: TBD`.

## Key modelling decisions (and what I deliberately did NOT do)
- Did **not** invent business rules or events (e.g. no `RentalCancelled`, no fabricated discount
  minimum). Captured only stated rules; flagged gaps.
- Did **not** mirror code structure as the model: `SharedDomainRules` and `BuildingBlocks` are
  code-layout artifacts, not contexts; the ERP ACL and CRM conformist are relationships, not folders
  copied from `src/`.
- Did **not** add audit metadata (`created_at/by`, `occurred_at`, `actor_user`) to any entity;
  treated the `audit_log` activity-history as infrastructural, deferred to the data layer.
- **Did** model genuine ownership as domain relationships: depot-owns-committed-unit,
  account-owned-by-sales-rep, document-owned-by-uploader.
