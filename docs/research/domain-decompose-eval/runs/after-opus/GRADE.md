# GRADE — after-opus run

Graded against `rubric.md` (authoritative total **44**, 19 checks, A–F). Every verdict quotes the
runner's own output (`context-map.md`, per-context `model.yaml`, `INDEX.md`, `RUN-NOTES.md`,
`QUESTIONS.md`) or states explicit absence. Zero-charity grading.

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 Subdomain labels in problem space only | 2 | PASS | 2 | Core Domain Chart classifies each context: "Allocation \| core", "Pricing \| core", "Maintenance \| supporting", "Catalog \| master-data / reference (generic)", "Payments \| generic"; contexts carry context-map relationships (ACL, conformist, OHS, partnership), not intrinsic strategic labels. |
| A2 Subdomain↔context mapping recorded | 2 | PASS | 2 | Core Domain Chart maps every BC→subdomain type; deviations recorded: "Availability … No Availability module exists"; declined candidates (Ownership, Audit, Availability) noted as *not* contexts. |
| B1 Core → full model, named invariants | 3 | PASS | 3 | Allocation invariant: "The same physical unit may never be committed twice for overlapping windows, not even from a different depot"; Pricing: "A quote may never fall below a utilization-derived floor." Both `tactical_pattern: full-domain-model`. |
| B2 Supporting → lighter, no ceremony | 3 | PASS | 3 | Maintenance `tactical_pattern: transaction-script`, `aggregates: []`, "no aggregate - the correct right-sizing for a supporting record-keeping context." |
| B3 Generic → buy + thin adapter | 3 | PASS | 3 | Payments/Identity/Notifications each `bought-adapter`, `aggregates: []`; "commodity, integrated behind a thin adapter … No domain model." |
| B4 Master-data → CRUD, no aggregates | 3 | PASS | 3 | Catalog: "Aggregates, repositories, and domain events are explicitly DECLINED - an empty model is the correct, complete output for a reference context." |
| C1 Ownership not a context | 3 | PASS | 3 | Declined candidates: "'owner' is polysemic … A single 'Ownership' context would force one global owner serving none of them" → per-context ownership projection toward an authorization capability. |
| C2 Audit not a context (+ escalation) | 3 | PASS | 3 | "cross-cutting capability + an append-only store … not an aggregate or repository"; escalation: "Regulated domain (finance/healthcare) or the audit trail itself becomes the product → … promote to a bounded context." |
| D1 ERP → ACL | 2 | PASS | 2 | Map edge "ACL — quarantine + translate"; asset-sync: "ANTI-CORRUPTION LAYER over the legacy ERP … translates it into our clean AssetRecord shapes; nothing past this context sees a raw ERP field." |
| D2 CRM → conformist | 2 | PASS | 2 | Map edge "conformist — mirror verbatim"; customer-accounts: "CONFORMIST: we take the CRM's record shapes EXACTLY as they arrive … We have no leverage to change the CRM, so we conform." |
| D3 Pricing→Rentals → OHS/published | 2 | PASS | 2 | Map edge "Published Language: PriceQuoted v2 / OHS"; "`Pricing.Contracts` is a versioned DTO (v1 → v2) that other modules depend on instead of Pricing internals." |
| D4 Allocation+Logistics → partnership | 2 | PASS | 2 | Map edge "EquipmentAllocated + Shared Kernel / Partnership"; "Acceptable here because one squad (Fulfilment) owns both and ships them together." |
| D5 Invoicing → customer-supplier | 2 | PASS | 2 | Map edge "Customer-Supplier: RentalOrderPlaced / RaiseInvoice"; billing: "Rentals is the customer and drives the API (billing adds the fields Rentals asks for)." |
| E1 SharedDomainRules rejected/reclassified | 2 | PASS | 2 | "dissolve `GlobalRules` … Cross-cutting rules everyone must obey belong to governance / architecture tests, not a shared domain model." |
| E2 Money/UoM accepted as building blocks | 2 | PASS | 2 | Sharing levels: "`Money`, `UnitOfMeasure` … Building Blocks … ~0 … Not a Shared Kernel despite being shared widely" — treated distinctly from the SharedDomainRules anti-pattern row. |
| E3 Share-Equipment TODO flagged | 2 | PASS | 2 | "Sharing a domain entity between two contexts is Shared Kernel coupling (highest). Prefer … duplicate … Do not action the TODO as written." |
| F1 Draft-vs-code conflict table, code wins | 2 | PASS | 2 | Conflicts & reconciliation table, 6 rows, "Chosen (authoritative) = code" each — incl. two-depots invariant, pricing floor, Maintenance location, Availability module. |
| F2 Orphan event flagged | 2 | PASS | 2 | "`DepotTransferRequested` \| Allocation \| — nobody — \| ORPHAN"; `EquipmentAllocated`/`PriceQuoted`/`RentalOrderPlaced` all marked "OK" (no false positive). |
| F3 Output contract complete | 2 | PASS | 2 | `context-map.md` (Mermaid + Core Domain Chart), 13 per-context `model.yaml` + `README.md`, `INDEX.md` with `DOMAIN-0001..0013`, `status: draft`/`owner: TBD`; aggregates carry `entities`/`value_objects`/`domain_events` keys (`value_objects: []` in rentals). |
| **TOTAL** | **44** | | **44** | |

## Category subtotals

| Group | Checks | Max | Score |
|---|---|---:|---:|
| A. Space hygiene | A1–A2 | 4 | 4 |
| B. Right-sizing | B1–B4 | 12 | 12 |
| C. Capability vs context | C1–C2 | 6 | 6 |
| D. Context mapping | D1–D5 | 10 | 10 |
| E. Sharing discipline | E1–E3 | 6 | 6 |
| F. Procedural regression | F1–F3 | 6 | 6 |
| **Total** | | **44** | **44** |

## Per-check evidence notes

Every check earned full credit; no PARTIAL/FAIL, so no full-credit-gap remediation lines are
required. Highlights confirmed against `fixture/`:

- **A1/A2** — Only Allocation + Pricing carry a domain model; the other 11 contexts are right-sized
  to transaction-script/CRUD/bought-adapter. The run explicitly rejects uniform tactical modelling:
  "Imposing aggregate machinery on all thirteen would be the cargo-cult failure this decomposition
  avoids." Hard anchors all hit (core Allocation+Pricing, supporting Maintenance, generic
  payments/identity/notifications, master-data Catalog).
- **B group** — No uniform-ceremony failure. `aggregates: []` on every supporting/generic/master-data
  context; full models only on the two core contexts, each with fixture-grounded named invariants
  (`AllocationService.Commit` overlap rule, `PricingEngine.Quote` floor — both verified in fixture
  source).
- **C1/C2** — Fixture polysemy verified: `Reservation.DepotId`, `SalesAccount.SalesRepId`,
  `Document.OwnerUserId` each mapped to a distinct per-context ownership projection. Audit escalation
  matches fixture README "no legal or retention angle."
- **D group** — All five relationships named AND substantiated; each edge cross-checked against
  fixture (`NightlyErpSyncJob` ACL, `CrmAccountRow` verbatim conformist, `PriceQuoted.cs` versioned
  contract, `teams.yaml` Fulfilment squad partnership, `InvoicingClient` customer-supplier "we agree
  the contract together and they plan their work around our requests").
- **E group** — SharedDomainRules dissolved to governance/arch-tests; Money/UoM kept as ~0-coupling
  Building Blocks in a distinct row; `RentalOrderService` Equipment TODO flagged as Shared-Kernel
  coupling with a duplicate-first recommendation.
- **F group** — Conflicts table records code-wins on all six divergences; orphan
  `DepotTransferRequested` isolated with no false positives; full output contract emitted with stable
  ids and draft/TBD front-matter.

**Verdict: 44/44 — a clean sweep. No defects survived verification.**
