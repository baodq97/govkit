# VERIFY — baseline-head-sonnet GRADE.md audit

Independent re-read of the runner output (`docs/domain/context-map.md`, per-context `README.md` /
`model.yaml`, `INDEX.md`, `QUESTIONS.md`, `RUN-NOTES.md`) against `rubric.md` and against every
quote in `GRADE.md`, cross-checked against the fixture source files the rubric cites
(`AllocationService.cs`, `PricingEngine.cs`, `MaintenanceScheduleService.cs`, `CatalogService.cs`,
`DocumentService.cs`, `CustomerAccountService.cs`, `LogisticsService.cs`,
`RentalOrderService.cs`, `GlobalRules.cs`, `README.md`, `teams.yaml`, `domain-notes-draft.md`).

This run's GRADE.md has exactly **one FAIL** (E3), none in categories B or C. Sampled that FAIL,
one D verdict, all three E verdicts (to cover "at least one E"), and a spread of PASS/PARTIAL
verdicts across A, B, C, D, F.

## Sampled checks (15 of 19)

| Check | Grader verdict | Verified? | Notes |
|---|---|---|---|
| A1 | PARTIAL | Agree | Core Domain Chart table confirmed verbatim: Allocation=core, Pricing demoted to "supporting *(assumption — see QUESTIONS.md Q1)*". Pricing is a rubric hard anchor for core; the miss is real and the quote is exact. Rest of the hygiene (labels vs. context-map relationships) is clean, so PARTIAL (not FAIL) is the right call. |
| A2 | PASS | Agree | `context-map.md` Core Domain Chart maps every context with a "Why" column; deviation rows quoted correctly — `crm-import ... folds into Accounts` (teams table) and the Conflicts-table row on the draft's "Availability" module being merged, both located verbatim. |
| B1 | PASS | Agree | `allocation/model.yaml` invariant `"The same physical unit (assetTag) can never be committed twice for overlapping windows, even across different depots..."` and `pricing/model.yaml` `"A quote can never fall below a floor derived from fleet utilization (floor = 0.60 + 0.40 x utilization...)"` both match the quotes exactly and match the fixture code (`AllocationService.Commit`, `PricingEngine.Quote`) — invariants are fixture-stated, not invented. |
| B2 | PARTIAL | Agree | `maintenance/model.yaml` confirmed: `value_objects: []`, `domain_events: []`, `invariants: []`, but still wrapped as `aggregates: - name: MaintenanceRecord root: MaintenanceRecord`. Lightness is real (empty fields) but the aggregate-root wrapper the grader flags is exactly present — PARTIAL is textually supported, not a nitpick invented by the grader. |
| B3 | PASS | Agree | `context-map.md` quote "no model to build here" matches `Vendors/ExternalServiceClients.cs` comment verbatim ("There is no model to build here"). No aggregates/entities/events modelled for Stripe/Auth0/SendGrid anywhere in the run. |
| B4 | PARTIAL | Agree | `catalog/model.yaml` mints four aggregates (`Equipment`, `Category`, `Depot`, `Tag`), each with its own `root:`/`entities:` block — confirmed. Minor: the grader's evidence cell renders this as a single quoted sentence `"Aggregates: Equipment, Category, Depot, Tag"`, which is a compressed paraphrase of the `README.md` `## Aggregates` bullet list rather than one exact contiguous quote — a citation-hygiene nit, not a verdict error (the underlying fact is accurate and directly checkable). |
| C1 | PARTIAL | Agree | Confirmed no "Ownership" context exists; ownership stays per-context (`Document.OwnerUserId`, `SalesAccount.SalesRepId`, and — unflagged by the run — `Reservation.DepotId` "owns" the unit per the fixture comment). The run's Naming-note quote — `"none of these terms collide in meaning across contexts in this model, so no polysemy conflicts were found"` — is verbatim from `context-map.md`, and it is the run's *only* statement on cross-context term collision; it explicitly denies polysemy rather than registering the depot/rep/user owner split. PARTIAL, not FAIL (no Ownership context minted), matches rubric wording precisely. |
| C2 | PASS | Agree | `context-map.md` quotes ("deliberately not modeled as a domain aggregate/entity/event", "a convenience for them; there is no legal or retention angle to it", "stays out of docs/domain/ entirely") all located verbatim, matching `README.md`'s "Requests in flight" section and `db/migrations/0001_audit_log.sql`'s framing. Escalation axis (legal/retention) is named as the condition that would change the verdict, satisfying "noted or implied." |
| D1 | PASS | Agree | `erp-sync/model.yaml` relationship `type: acl` + invariant `"Nothing outside the sync job may ever see a raw ERP field..."` match the quote; substance (protective translation of an unstable, unowned upstream) is unambiguous and fixture-grounded (`NightlyErpSyncJob`, `erp-integration-notes.txt`). |
| D4 | PASS | Agree | `allocation/model.yaml` and `logistics/model.yaml` both carry `type: shared-kernel` with matching justification text ("Same squad (Fulfilment per teams.yaml)... both ship in the same release") — verbatim match to the grader's quote, and cross-checked against `teams.yaml` (`fulfilment: owns: [allocation, logistics], release_cadence: shared`) and `LogisticsService.cs`'s direct reference to `Allocation`'s types. Rubric explicitly accepts a justified shared kernel between peers under one owner as equivalent to "partnership." |
| E1 | PARTIAL | Agree | `context-map.md`'s Cross-cutting-concerns section, quoted accurately, keeps `SharedDomainRules` framed as "a single, explicitly platform-wide Shared Kernel... worth flagging as a monolith→microservices risk" — it is never rejected as anti-DDD and never rehomed to governance/architecture-tests (that phrase appears nowhere in the run). PARTIAL is correct per rubric ("uneasy about it but keeps it as a shared domain model"). |
| E2 | PASS | Agree | `context-map.md` quote on `BuildingBlocks` ("no business policy lives here — arithmetic only"... "a shared kernel of pure technical types") matches `Money.cs`/`UnitOfMeasure.cs` verbatim, and is textually distinguished (separate bullet, separate treatment) from the `SharedDomainRules` bullet directly below it — satisfies "distinct treatment from E1." |
| E3 | FAIL | Agree | Grepped every file under `runs/baseline-head-sonnet/` (context-map.md, all `docs/domain/*/README.md` and `model.yaml`, QUESTIONS.md, RUN-NOTES.md) for `TODO`, `Equipment`, `share` — the `RentalOrderService.cs` `TODO(rentals): ... just share Catalog's Equipment entity class directly` is never surfaced anywhere in the run. The run does discuss a *different* Equipment-shape overlap (ErpSync↔Catalog, Q4) but that is not the fixture's planted TODO. Grader's "Absent — searched context-map.md, rentals/README.md, rentals/model.yaml, all run files" claim holds up; confirmed independently via full-tree grep, not just the three files named. |
| F1 | PASS | Agree | `context-map.md`'s "Conflicts & reconciliation" table has all four planted divergences (double-booking, discount floor, Maintenance's home, standalone Availability) plus a fifth code-vs-code item; header states "running/shipped code (and the README...) is chosen as authoritative in every case below" — matches quote exactly. |
| F2 | PASS | Agree | "Event-flow continuity check" section: `DepotTransferRequested (Allocation) → no consumer anywhere in the read code... Flagged as an orphan emit` is verbatim; `EquipmentAllocated`/`PriceQuoted`/`RentalOrderPlaced` each explicitly marked "OK" with a consumer — no false positives, matching the rubric's PARTIAL-trap condition correctly avoided. |
| F3 | PASS | Agree | `INDEX.md` confirmed: DOMAIN-0001..0010, all `status: draft` / `owner: TBD`. All 10 per-context `model.yaml` files sampled carry `entities`/`value_objects`/`domain_events` keys (`[]` when empty); `context-map.md` has both the Mermaid map and the Core Domain Chart. Output contract complete. |

(15 sampled ≥ required 8; covers the run's only FAIL — E3 — is in category E not B/C so the
"every FAIL in B and C" instruction is vacuously satisfied since none exist there; ≥1 D verdict —
sampled D1 and D4; all three E verdicts sampled; 8 PASSes and 5 PARTIALs sampled across every
other group.)

## Findings

None that change a verdict. Every quoted string in the sampled rows was located verbatim (or, in
one case, as an accurate close paraphrase) in the corresponding runner file, and every non-PASS
verdict is textually supported by genuine absence in the run output, confirmed via full-tree grep
rather than trusting the grader's narrower file list.

One minor citation-hygiene observation, not rising to a scoring disagreement: the **B4** evidence
cell renders the `catalog/README.md` `## Aggregates` bullet list (four separate `- \`Name\` — ...`
lines) as a single compressed sentence in quotation marks rather than one exact contiguous quote.
The underlying claim (four minted aggregates: Equipment, Category, Depot, Tag) is fully accurate
and independently verified in both `catalog/README.md` and `catalog/model.yaml`, so this does not
change the PARTIAL verdict or the score — flagged only because the rubric's grading rule is strict
about "exact sentence" quoting.

Arithmetic re-verified independently, check-by-check: A=3, B=9, C=4.5, D=10, E=3, F=6 → **35.5/44**,
matching `GRADE.md`'s stated total and per-group subtotals exactly.

## Verdict

**Agree with GRADE.md as written. No score adjustment.** Total stands at 35.5/44.
