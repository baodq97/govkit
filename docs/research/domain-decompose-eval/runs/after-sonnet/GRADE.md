# GRADE — after-sonnet run

Graded strictly against `rubric.md` (the sole authority). Authoritative total per rubric = **44**
(the "41" figure is explicitly superseded and not used). Every verdict quotes the runner's output.

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output |
|---|---:|---|---:|---|
| A1 Subdomain labels in problem space only | 2 | PASS | 2 | Core Domain Chart classifies each context core/supporting/generic; contexts carry map **relationships**, not labels-as-property. Hard anchors hit: Allocation/Pricing "**core**", Maintenance "supporting", Vendors (Stripe/Auth0/SendGrid) "**generic**", Catalog "**generic** *(master-data/reference — see mapping note)*". |
| A2 Subdomain↔context mapping recorded | 2 | PASS | 2 | Core Domain Chart is a per-context subdomain-type table; deviations recorded: "`crm-import`… Modeled as part of `Accounts` (matches the actual module)" and "'Availability'… Shipped code — folded into Allocation". |
| B1 Core → full model, named invariants | 3 | PASS | 3 | Allocation `tactical_pattern: full-domain-model` with "The same physical unit (AssetTag) can never be committed twice for overlapping rental windows, even from a different depot." Pricing `full-domain-model` with "A quote can never fall below a floor of listRate x (0.60 + 0.40 x utilization)". |
| B2 Supporting → lighter, no ceremony | 3 | PASS | 3 | Maintenance `subdomain_type: supporting`, `tactical_pattern: transaction-script`, `aggregates: []`, "Declining aggregate ceremony deliberately, per SKILL.md step 4's supporting-context guidance." |
| B3 Generic → buy + thin adapter | 3 | PASS | 3 | Vendors `generic` / `bought-adapter` / `aggregates: []`; "Three independent thin commodity adapters… none carries business rules by design ('no model to build here')." Names Stripe/Auth0/SendGrid clients. |
| B4 Master-data → CRUD, no aggregates | 3 | PASS | 3 | Catalog `generic` / `crud` / `aggregates: []`; "plain lookup CRUD over Category/Depot/Tag/Equipment; explicitly declining aggregates, repositories, and domain events". |
| C1 Ownership not a context | 3 | PASS | 3 | Declined candidate **Ownership (unified)**: "'Owner' is polysemic across these three… A unified `Ownership` context would force one global `owner`… Modeled instead as a per-context projection." Escalation = platform-wide authz engine. |
| C2 Audit not a context (+ escalation) | 3 | PASS | 3 | Declined candidate **Audit/activity-history**: "a cross-cutting capability plus an append-only store, not a context." Escalation: "The business becomes regulated (finance/healthcare) or the audit trail itself becomes a product feature". |
| D1 ERP → ACL | 2 | PASS | 2 | Edge "ExternalErp… upstream, ACL applied downstream → ErpSync" + "Nightly translation job / Anti-Corruption Layer over the legacy ERP's SOAP export… 'nothing outside this job sees a raw ERP field'". |
| D2 CRM → conformist | 2 | PASS | 2 | Edge "External CRM… upstream, conformist → Accounts"; "Mirrors the third-party CRM's row shape verbatim (Conformist relationship, no translation layer)". Distinct from Invoicing customer-supplier. |
| D3 Pricing→Rentals → OHS/published | 2 | PASS | 2 | Edge "Pricing… open-host + published language: Pricing.Contracts v2 → Rentals"; "already-built Published Language artifact… Rentals may depend on… only Pricing's stable, versioned contract project". |
| D4 Allocation+Logistics → partnership | 2 | PASS | 2 | Shared-kernel with explicit justification (rubric-accepted alt to partnership): "Justified operationally today (same squad, same release cadence per `teams.yaml`)… highest-coupling option on the menu." Core-in-shared-kernel risk flagged. |
| D5 Invoicing → customer-supplier | 2 | PASS | 2 | Edge "Rentals… customer-supplier: Rentals drives the contract → Invoicing"; "Contract is co-negotiated with Rentals (customer-supplier)". |
| E1 SharedDomainRules rejected/reclassified | 2 | PASS | 2 | Declined: "the anti-pattern DDD's bounded contexts exist to eliminate… belongs to governance, not a shared domain model… Recommend dissolving it: return `MaxDiscountRate`→Pricing…". |
| E2 Money/UoM accepted as building blocks | 2 | PASS | 2 | Sharing table: "`BuildingBlocks.Money`, `BuildingBlocks.UnitOfMeasure`… **Building Blocks**… Zero coupling risk — version like any library." Explicitly contrasted with SharedDomainRules ("Mis-labeled"). |
| E3 Share-Equipment TODO flagged | 2 | PASS | 2 | Conflicts row Rentals↔Catalog: TODO caught, "that creates Shared Kernel coupling between Rentals and Catalog. Recommend a Published Language (a small reference DTO) instead." |
| F1 Draft-vs-code conflict table, code wins | 2 | PASS | 2 | Conflicts table with code authoritative on all four planted divergences: discount floor, same-unit double-booking, Maintenance ownership (separate module), and "'Availability'… folded into Allocation". |
| F2 Orphan event flagged | 2 | PASS | 2 | Event-flow continuity check: "`DepotTransferRequested` \| Allocation \| *(none)* \| **Orphan emit**". EquipmentAllocated/PriceQuoted/RentalOrderPlaced all correctly marked with consumers (no false positive). |
| F3 Output contract complete | 2 | PASS | 2 | `context-map.md` (Mermaid + Core Domain Chart), per-context `model.yaml` (aggregates carry `entities`/`value_objects`/`domain_events`, `[]` when empty), per-context `README.md` canvases, `INDEX.md` with `DOMAIN-0001..0011`, `status: draft` / `owner: TBD`. |
| **TOTAL** | **44** | | **44** | |

## Category subtotals

| Group | Checks | Subtotal |
|---|---|---:|
| A. Space hygiene | A1, A2 | 4 / 4 |
| B. Right-sizing | B1–B4 | 12 / 12 |
| C. Capability vs context | C1, C2 | 6 / 6 |
| D. Context mapping | D1–D5 | 10 / 10 |
| E. Sharing discipline | E1–E3 | 6 / 6 |
| F. Procedural regression | F1–F3 | 6 / 6 |
| **TOTAL** | | **44 / 44** |

## Per-check evidence notes

- **A1** — No incoherent classification anywhere (Allocation is core, Catalog is not core). Catalog
  is labelled `generic` but the run explicitly records it as master-data/reference in a mapping note
  and sets `tactical_pattern: crud`; this is coherent, not a muddle. Full credit.
- **A2** — The subdomain-type column plus the Conflicts rows that fold `crm-import` into Accounts and
  `Availability` into Allocation constitute the explicit mapping + recorded deviations the check
  demands.
- **B1** — Both core invariants are named from the fixture (`AllocationService.Commit` overlap rule;
  `PricingEngine.Quote` floor formula), not invented.
- **B2/B3/B4** — Group anti-pattern (uniform tactical modelling) is avoided: supporting/generic/
  master-data contexts all carry `aggregates: []` and lighter tactical_pattern values, while only
  the two core contexts get `full-domain-model`.
- **C1/C2** — Both minted-capability traps declined with escalation conditions stated. Fixture facts
  confirmed: three distinct `owner` meanings (`SalesRepId`/`DepotId`/`OwnerUserId`) and the audit
  table's "Nothing legal or retention-related" comment.
- **D1–D5** — Every relationship names the pattern AND its substance; all five patterns distinct.
  D4 taken via the rubric-sanctioned justified-shared-kernel route rather than the "partnership"
  label — accepted, with the core-in-shared-kernel cost flagged.
- **E1/E2** — The two side-by-side sharing artifacts are handled differently: SharedDomainRules
  rejected/reclassified to governance; Money/UoM accepted as zero-coupling technical building
  blocks. E3 TODO caught and steered to Published Language.
- **F1** — All four candidate conflicts present (rubric requires ≥2), code authoritative throughout.
- **F2** — Correct orphan identified; no false positives on the three consumed events.
- **F3** — Full output contract satisfied; model.yaml aggregate schema keys present with `[]` for
  empties.

**No non-PASS checks.** This run scores full marks on every criterion.
