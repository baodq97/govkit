# Run notes — domain-decompose on RentField fixture

## Scope / blinding
This run was blinded to everything except: the skill's own folder
(`plugins/swe-flow/skills/domain-decompose/`), the target fixture
(`docs/research/domain-decompose-eval/fixture/`), and files this run itself wrote. It did not
read the eval rubric, README, or any prior run under `docs/research/domain-decompose-eval/`.

## Output location deviation (declared, not silent)
Per `references/output-template.md` §1, detection order on the fixture would normally resolve to
"`docs/` exists, no `docs/domain/` → create `docs/domain/`" **inside the fixture repo**. The task's
hard constraint instead requires all output to land under
`docs/research/domain-decompose-eval/runs/baseline-sonnet/`. This run treated that directory as the
`docs/domain/` root and produced exactly the layout §2 specifies (`context-map.md`, `INDEX.md`,
one folder per bounded context with `README.md` + `model.yaml`) — just rooted one level up from
where the skill would normally place it inside the target repo. No file was written into the
fixture itself.

## Mode
**Create mode.** The fixture holds no prior `docs/domain/` (no `DOMAIN-NNNN` frontmatter,
`INDEX.md`, or `model.yaml` anywhere) — confirmed by listing the fixture tree before reading.

## Files read, in order

1. `plugins/swe-flow/skills/domain-decompose/SKILL.md`
2. `docs/research/domain-decompose-eval/fixture/README.md`
3. `docs/research/domain-decompose-eval/fixture/config/teams.yaml`
4. `docs/research/domain-decompose-eval/fixture/docs/domain-notes-draft.md`
5. `docs/research/domain-decompose-eval/fixture/docs/erp-integration-notes.txt`
6. `docs/research/domain-decompose-eval/fixture/src/Accounts/CustomerAccountService.cs`
7. `docs/research/domain-decompose-eval/fixture/src/Allocation/AllocationService.cs`
8. `docs/research/domain-decompose-eval/fixture/src/BuildingBlocks/Money.cs`
9. `docs/research/domain-decompose-eval/fixture/src/BuildingBlocks/UnitOfMeasure.cs`
10. `docs/research/domain-decompose-eval/fixture/src/Catalog/CatalogService.cs`
11. `docs/research/domain-decompose-eval/fixture/src/Documents/DocumentService.cs`
12. `docs/research/domain-decompose-eval/fixture/src/ErpSync/NightlyErpSyncJob.cs`
13. `docs/research/domain-decompose-eval/fixture/src/Invoicing/InvoicingClient.cs`
14. `docs/research/domain-decompose-eval/fixture/src/Logistics/LogisticsService.cs`
15. `docs/research/domain-decompose-eval/fixture/src/Maintenance/MaintenanceScheduleService.cs`
16. `docs/research/domain-decompose-eval/fixture/src/Pricing/PriceQuoted.cs`
17. `docs/research/domain-decompose-eval/fixture/src/Pricing/PricingEngine.cs`
18. `docs/research/domain-decompose-eval/fixture/src/Rentals/RentalOrderService.cs`
19. `docs/research/domain-decompose-eval/fixture/src/Rentals/Rentals.csproj`
20. `docs/research/domain-decompose-eval/fixture/src/SharedDomainRules/GlobalRules.cs`
21. `docs/research/domain-decompose-eval/fixture/src/SharedDomainRules/README.md`
22. `docs/research/domain-decompose-eval/fixture/src/Vendors/ExternalServiceClients.cs`
23. `docs/research/domain-decompose-eval/fixture/db/migrations/0001_audit_log.sql`
24. `plugins/swe-flow/skills/domain-decompose/references/output-template.md`
25. `plugins/swe-flow/skills/domain-decompose/references/ddd-methodology.md`
26. `plugins/swe-flow/skills/domain-decompose/references/bounded-context-canvas.md`
27. `plugins/swe-flow/skills/domain-decompose/references/aggregate-design-canvas.md`

Two non-Read directory listings (`find`/`ls`) were also run, over the fixture root and the
skill's `references/` folder, purely to enumerate what existed before reading — no file content
came from those beyond names.

## Process followed (SKILL.md steps)

1. **Find & reconcile existing artifacts** — no prior `docs/domain/`; `docs/domain-notes-draft.md`
   found and treated as a stale draft (its own header says so), reconciled against running code —
   5 divergences found and resolved code-wins, all recorded in `context-map.md`'s Conflicts table.
2. **Frame the input** (event-storming style) — extracted events, actors, nouns directly from
   prose + code comments/config while reading.
3. **First-pass strategic decomposition** — 11 bounded contexts, classified core/supporting/
   generic/master-data, relationships sketched, load-bearing extraction seam named
   (`Pricing.Contracts` / `PriceQuoted`).
4. **First-pass tactical model**, sized per subdomain type — full aggregates only for Allocation
   and Rentals; Pricing (core) deliberately modelled with zero aggregates since its one concept
   (`Quote`) has no identity; supporting/generic/master-data contexts given light or declined
   models with a `notes:` rationale each. Event-flow continuity check run: one orphan event
   (`DepotTransferRequested`) and one likely double-triggered path (`RentalOrderPlaced` +
   direct `RaiseInvoice` call) both flagged in `context-map.md`.
5. **Targeted questions** — 6 genuine ambiguities recorded in `QUESTIONS.md`, each with the
   assumption this run proceeded on; did not stop and wait.
6. **Emit the docs** — create mode, full layout per `output-template.md` §2–§6, written to the
   directory this run was constrained to instead of the fixture's own `docs/domain/`.

## Known limitations of this run
- Two shared-kernel modules (`BuildingBlocks`, `SharedDomainRules`) were deliberately **not**
  given their own context folder — they own no business capability, so aren't candidate service
  boundaries. They're documented once in `context-map.md`'s shared-kernel table instead.
- `SharedDomainRules` is documented in its own README as mandatory for every module, but no call
  site to `GlobalRules` was found anywhere in the read source — flagged as a conflict, not
  silently treated as "in force."
