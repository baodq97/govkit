# Run notes — domain-decompose on RentField fixture

Files read, in order (Read tool calls only; directory listings via `ls`/`find` and the one `grep`
verification pass are noted separately, not counted as file reads).

1. `plugins/swe-flow/skills/domain-decompose/SKILL.md`
2. `docs/research/domain-decompose-eval/fixture/README.md`
3. `docs/research/domain-decompose-eval/fixture/docs/domain-notes-draft.md`
4. `docs/research/domain-decompose-eval/fixture/docs/erp-integration-notes.txt`
5. `docs/research/domain-decompose-eval/fixture/src/Allocation/AllocationService.cs`
6. `docs/research/domain-decompose-eval/fixture/src/Pricing/PricingEngine.cs`
7. `docs/research/domain-decompose-eval/fixture/src/Pricing/PriceQuoted.cs`
8. `docs/research/domain-decompose-eval/fixture/src/Maintenance/MaintenanceScheduleService.cs`
9. `docs/research/domain-decompose-eval/fixture/src/Accounts/CustomerAccountService.cs`
10. `docs/research/domain-decompose-eval/fixture/src/BuildingBlocks/Money.cs`
11. `docs/research/domain-decompose-eval/fixture/src/BuildingBlocks/UnitOfMeasure.cs`
12. `docs/research/domain-decompose-eval/fixture/src/Catalog/CatalogService.cs`
13. `docs/research/domain-decompose-eval/fixture/src/Documents/DocumentService.cs`
14. `docs/research/domain-decompose-eval/fixture/src/ErpSync/NightlyErpSyncJob.cs`
15. `docs/research/domain-decompose-eval/fixture/src/Invoicing/InvoicingClient.cs`
16. `docs/research/domain-decompose-eval/fixture/src/Logistics/LogisticsService.cs`
17. `docs/research/domain-decompose-eval/fixture/src/Rentals/RentalOrderService.cs`
18. `docs/research/domain-decompose-eval/fixture/src/Rentals/Rentals.csproj`
19. `docs/research/domain-decompose-eval/fixture/src/SharedDomainRules/GlobalRules.cs`
20. `docs/research/domain-decompose-eval/fixture/src/SharedDomainRules/README.md`
21. `docs/research/domain-decompose-eval/fixture/src/Vendors/ExternalServiceClients.cs`
22. `docs/research/domain-decompose-eval/fixture/config/teams.yaml`
23. `docs/research/domain-decompose-eval/fixture/db/migrations/0001_audit_log.sql`
24. `plugins/swe-flow/skills/domain-decompose/references/ddd-methodology.md`
25. `plugins/swe-flow/skills/domain-decompose/references/bounded-context-canvas.md`
26. `plugins/swe-flow/skills/domain-decompose/references/aggregate-design-canvas.md`
27. `plugins/swe-flow/skills/domain-decompose/references/output-template.md`

All paths above are relative to `/home/bd/personal-projects/govkit/`.

## Non-Read verification steps
- `ls`/`find` over `plugins/swe-flow/skills/domain-decompose/` and the fixture root, to enumerate
  what existed before reading (no content read beyond file/dir names).
- One `grep -rn "GlobalRules|SharedDomainRules" src/` inside the fixture, to confirm whether
  `SharedDomainRules`/`GlobalRules` is referenced by any module other than its own file — result:
  zero matches outside `src/SharedDomainRules/`, which grounds the Q5/Conflicts finding that
  `GlobalRules` is unadopted scaffolding.

## Process fidelity notes
- Confirmed `fixture/docs/domain/` does not exist (no `INDEX.md`, no `DOMAIN-NNNN` frontmatter, no
  per-context `model.yaml`) before starting — this is **create mode**, per
  `output-template.md` §1.
- Step 1 (find & reconcile existing artifacts) treated `README.md`, `docs/domain-notes-draft.md`,
  and `docs/erp-integration-notes.txt` as prose domain input, and the C# source under `src/**` as
  "code carrying a domain layer" per the skill's own step-1 instruction to look for and reconcile
  against such code — not as reverse-engineering the model from scratch (which SKILL.md's Inputs
  section rules out). Every conflict found between the stale draft and shipped code is recorded in
  `context-map.md`'s Conflicts table with both sides, the chosen side, and a flag for a human —
  never blended into a hybrid.
- Six genuine ambiguities were surfaced as targeted questions (SKILL.md step 5) rather than
  guessed silently; each is recorded in `QUESTIONS.md` with the assumption used to keep moving.
- Per HARD BLINDING CONSTRAINTS for this evaluation run, the output was written to this eval
  `runs/after-sonnet/` directory instead of the fixture's own `docs/domain/` (which does not
  exist in the fixture) — the file layout inside this directory otherwise matches
  `output-template.md` §2 exactly (context-map.md, INDEX.md, one folder per bounded context with
  README.md + model.yaml).
