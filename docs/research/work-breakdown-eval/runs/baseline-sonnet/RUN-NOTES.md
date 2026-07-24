## Run notes

Execution of the `work-breakdown` skill against the RentField fixture, blind (skill dir + fixture
dir only). Files read, in order:

1. `plugins/swe-flow/skills/work-breakdown/SKILL.md` (the skill itself — full contents)
2. `docs/research/work-breakdown-eval/fixture/README.md`
3. `docs/research/work-breakdown-eval/fixture/docs/rfc-transfer-approval.md` (the RFC to break
   down)
4. `docs/research/work-breakdown-eval/fixture/src/Allocation/AllocationService.cs` (RFC-governed)
5. `docs/research/work-breakdown-eval/fixture/src/Logistics/LogisticsService.cs` (RFC-governed)
6. `docs/research/work-breakdown-eval/fixture/src/Vendors/ExternalServiceClients.cs`
   (RFC-governed)
7. `docs/research/work-breakdown-eval/fixture/db/migrations/0001_audit_log.sql` (RFC governs
   `db/migrations/`; this is the only migration that exists, read to learn the naming convention)
8. `docs/research/work-breakdown-eval/fixture/config/teams.yaml` (team/module ownership —
   confirms Allocation+Logistics are one squad with a shared release cadence)
9. `docs/research/work-breakdown-eval/fixture/src/BuildingBlocks/Money.cs` (referenced by
   `AllocationService.cs`'s `using` — checked for relevance, turned out unused by the transfer
   flow)
10. `docs/research/work-breakdown-eval/fixture/src/SharedDomainRules/GlobalRules.cs` (checked
    whether the "overlap rule" or an authorization concept already lives here — it doesn't)
11. `docs/research/work-breakdown-eval/fixture/src/SharedDomainRules/README.md` (house rule for
    where cross-module business rules must live — informed Q2's framing)
12. `docs/research/work-breakdown-eval/fixture/src/Rentals/RentalOrderService.cs` (checked
    whether Rentals depends on `Reservation` directly, since the RFC changes the reservation
    shape — it doesn't; confirms the RFC's non-goal scoping is accurate)

Also ran, without reading file contents:
- `find` over the skill dir and the fixture dir (directory listings only, to enumerate what
  exists before reading).
- `mkdir -p` + `ls` on `docs/research/work-breakdown-eval/runs/` to create the output directory —
  this surfaced that a sibling directory `runs/baseline-opus/` already exists. Per the hard
  blinding constraint, its contents were never opened, listed, or read.

### Fixture files deliberately not read

The RFC's own non-goals scope out pricing, invoicing, maintenance, rentals-beyond-the-reservation-
link, and the nightly ERP/CRM syncs. These fixture files were left unread as out of scope for this
RFC's breakdown: `src/Accounts/CustomerAccountService.cs`, `src/Catalog/CatalogService.cs`,
`src/Documents/DocumentService.cs`, `src/ErpSync/NightlyErpSyncJob.cs`,
`src/Invoicing/InvoicingClient.cs`, `src/Maintenance/MaintenanceScheduleService.cs`,
`src/Pricing/PriceQuoted.cs`, `src/Pricing/PricingEngine.cs`,
`src/BuildingBlocks/UnitOfMeasure.cs`, `src/Rentals/Rentals.csproj`.

### Constraint compliance

Never read: `rubric.md`, the eval `README.md`, anything under `runs/` (including the sibling
`baseline-opus/` directory — name only, via directory listing, never opened), any other
`docs/research/` directory, or `self-learning`. No skill other than `work-breakdown` was invoked
(the skill is documented as atomic / calls no other skill, and the run instructions asked for
exact, blind execution of the named skill only).

### How targeted questions were handled

The `work-breakdown` skill is declarative teaching content, not an interactive script — it has no
literal "ask the user" prompts written into it. Genuine ambiguities that a real breakdown session
would raise with a stakeholder were instead recorded as Q1–Q8 in `QUESTIONS.md`, each with the
assumption used to keep going, per the run instructions.
