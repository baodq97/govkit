# Run notes — domain-decompose over RentField fixture

Executed the `domain-decompose` SKILL.md process steps 1→6 in order. Create mode (no prior
`docs/domain/` generated artifacts existed). Brownfield fixture: a stale whiteboard draft plus
shipped code — the reconciliation-heavy path (SKILL step 1).

## Files read, in order

Skill (process + references, loaded as the process directed):
1. `plugins/swe-flow/skills/domain-decompose/SKILL.md`
2. `plugins/swe-flow/skills/domain-decompose/references/ddd-methodology.md`
3. `plugins/swe-flow/skills/domain-decompose/references/output-template.md`
4. `plugins/swe-flow/skills/domain-decompose/references/aggregate-design-canvas.md`
5. `plugins/swe-flow/skills/domain-decompose/references/bounded-context-canvas.md`

Fixture — existing domain artifacts (step 1 discovery/reconcile):
6. `docs/research/domain-decompose-eval/fixture/README.md`
7. `docs/research/domain-decompose-eval/fixture/docs/domain-notes-draft.md`
8. `docs/research/domain-decompose-eval/fixture/docs/erp-integration-notes.txt`

Fixture — shipped code domain layer (step 1 reconcile: code beats draft doc):
9.  `.../fixture/src/Allocation/AllocationService.cs`
10. `.../fixture/src/Pricing/PricingEngine.cs`
11. `.../fixture/src/Pricing/PriceQuoted.cs`
12. `.../fixture/src/Rentals/RentalOrderService.cs`
13. `.../fixture/src/Maintenance/MaintenanceScheduleService.cs`
14. `.../fixture/src/Catalog/CatalogService.cs`
15. `.../fixture/src/Logistics/LogisticsService.cs`
16. `.../fixture/src/Accounts/CustomerAccountService.cs`
17. `.../fixture/src/Documents/DocumentService.cs`
18. `.../fixture/src/ErpSync/NightlyErpSyncJob.cs`
19. `.../fixture/src/Invoicing/InvoicingClient.cs`
20. `.../fixture/src/Vendors/ExternalServiceClients.cs`
21. `.../fixture/src/BuildingBlocks/Money.cs`
22. `.../fixture/src/BuildingBlocks/UnitOfMeasure.cs`
23. `.../fixture/src/SharedDomainRules/GlobalRules.cs`
24. `.../fixture/src/SharedDomainRules/README.md`
25. `.../fixture/src/Rentals/Rentals.csproj`
26. `.../fixture/config/teams.yaml`
27. `.../fixture/db/migrations/0001_audit_log.sql`

(Two `Bash` directory listings — `find` over the fixture and an `ls` of the skill dir — were used
for discovery only; no file contents beyond the 27 above were read. Per the blinding constraints,
nothing under `runs/`, `rubric.md`, `README.md` of the eval root, or other repo docs was read.)

## What each step produced

- **Step 1 (reconcile):** found the draft doc contradicts the shipped code in 5 places + a flat
  `GlobalRules` discount ceiling that contradicts Pricing's real floor. Recorded all six in the
  Conflicts table of `context-map.md`; chose the shipped code as authoritative each time; never
  blended into a hybrid. Detected the `SharedDomainRules` single-universal-model anti-pattern and
  the correct Building-Blocks vs Published-Language vs Shared-Kernel sharing levels.
- **Step 2 (frame):** extracted events (`EquipmentAllocated`, `DepotTransferRequested`,
  `PriceQuoted`, `RentalOrderPlaced`), commands, and recurring nouns.
- **Step 3 (strategic):** 13 bounded contexts; 2 core (Allocation, Pricing). Named the load-bearing
  extraction seam (the `PriceQuoted` Published-Language contract → extract Pricing first). Ran the
  capability-vs-context test and declined Ownership, Audit/Activity-history, Availability, and
  SharedDomainRules-as-a-context, each with a reason + escalation condition.
- **Step 4 (tactical, right-sized):** full domain models only on the 2 core contexts; the other 11
  are transaction-script / CRUD / bought-adapter with `aggregates: []`. Ran the event-flow
  continuity check — caught `DepotTransferRequested` as an orphan (unconsumed) event.
- **Step 5 (questions):** 9 genuine ambiguities recorded in `QUESTIONS.md` with the assumption
  proceeded on (autonomous run — did not stop).
- **Step 6 (emit):** `context-map.md`, `INDEX.md`, and per-context `README.md` + `model.yaml` for
  all 13 contexts, all `status: draft` / `owner: TBD`, `DOMAIN-0001..0013`. Conflicts and sharing
  levels labelled on the map.

## Output-location note
The skill's detection order would write into the invoking project's `docs/domain/`. The fixture
has `docs/` but no `docs/domain/`, so create-mode would normally create
`fixture/docs/domain/`. Per the eval's hard constraint, the full output contract was instead
written under `runs/after-opus/docs/domain/` (same layout), and no fixture file was modified.
