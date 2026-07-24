# GRADE — baseline-head-sonnet

Graded against `rubric.md` (the entire law). **Authoritative total: 44** (the rubric supersedes the
old "41" figure). Independent grading; every verdict quotes the runner's output or notes explicit
absence.

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 Subdomain labels in problem space only | 2 | PARTIAL | 1 | Core Domain Chart classifies each context (Allocation **core**, Maintenance/Rentals/Logistics/Invoicing **supporting**, Catalog/Accounts/ErpSync/Documents **generic**) and contexts carry context-map relationships, not intrinsic labels. But **Pricing** — a hard anchor for **core** ("the two enforced invariants live here") — is demoted: "Pricing \| supporting *(assumption — see QUESTIONS.md Q1)*". Hard-anchor miss → loses credit. |
| A2 Subdomain↔context mapping recorded | 2 | PASS | 2 | Core Domain Chart maps every context to a subdomain type with a "Why" column; deviations recorded: "crm-import, which this model folds into **Accounts** rather than splitting out — see QUESTIONS.md Q5" and "Standalone 'Availability' module … No `Availability` class/namespace exists … merged". |
| B1 Core → full model, named invariants | 3 | PASS | 3 | Allocation modelled as a rich `Reservation` aggregate ("the consistency boundary that guarantees one unit is never committed twice"). Both invariants named: "The same physical unit (assetTag) can never be committed twice for overlapping windows, even across different depots" and (Pricing) "A quote can never fall below a floor derived from fleet utilization (floor = 0.60 + 0.40 x utilization)". |
| B2 Supporting → lighter, no ceremony | 3 | PARTIAL | 1.5 | Maintenance is `supporting` with empty `value_objects: []`, `domain_events: []`, `invariants: []`, and "nothing to keep atomically consistent beyond a single record". But it is still wrapped as an aggregate root (`MaintenanceRecord` aggregate) — aggregate ceremony imposed — and never explicitly prescribes a transaction-script/CRUD shape "lighter than the core." Lightness implied, not stated. |
| B3 Generic → buy + thin adapter | 3 | PASS | 3 | "**`Vendors` (Stripe, Auth0, SendGrid)** — thin third-party SDK adapters, explicitly 'no model to build here' per the code's own comment … Not modeled as contexts." No aggregates/entities/events for any of the three. |
| B4 Master-data → CRUD, no aggregates | 3 | PARTIAL | 1.5 | Catalog is `generic` ("Pure lookups … no rules to enforce"), but the run **mints four aggregates** — `catalog/model.yaml` lists `- name: Equipment … root: Equipment`, `Category`, `Depot`, `Tag`, each with an `entities` block; README "Aggregates: Equipment, Category, Depot, Tag". Treated lightweight (no events/invariants) but given aggregates rather than explicitly declining them. |
| C1 Ownership not a context | 3 | PARTIAL | 1.5 | No "Ownership" context is created; ownership stays per-context (Documents "Owner \| The user who uploaded the document"; Accounts "Sales rep (owner)"). But the run **fails to register the `owner` polysemy** — it asserts the opposite: "none of these terms collide in meaning across contexts in this model, so no polysemy conflicts were found." The depot/rep/user owner split is never surfaced. |
| C2 Audit not a context (+ escalation) | 3 | PASS | 3 | "`audit_log` … deliberately **not** modeled as a domain aggregate/entity/event … this is 'a convenience for them; there is no legal or retention angle to it' … this stays out of `docs/domain/` entirely." Escalation axis (legal/retention) named — implied condition per the check's "noted or implied". |
| D1 ERP → ACL | 2 | PASS | 2 | `ErpSync -->|acl| ERP((ERP · external))`; model.yaml `type: acl` — "Nothing outside the sync job may ever see a raw ERP field — all translation from the ERP's shifting export shapes happens here". |
| D2 CRM → conformist | 2 | PASS | 2 | `Accounts -->|conformist| CRM`; "Mirrors the CRM's record shape verbatim … no translation layer — a Conformist relationship, not an ACL"; README quotes "we have no leverage to change them" (the zero-leverage power dynamic). |
| D3 Pricing→Rentals → OHS/published | 2 | PASS | 2 | `Pricing -->|open-host: PriceQuoted v2 contract| Rentals`; "Publishes PriceQuoted via the separate Pricing.Contracts package; Rentals may depend only on that contract, never on Pricing internals (enforced by project reference in Rentals.csproj)." |
| D4 Allocation+Logistics → partnership | 2 | PASS | 2 | `shared-kernel` both directions, explicitly justified: "Same squad (Fulfilment per teams.yaml); Logistics references Allocation's EquipmentAllocated type directly, and both ship in the same release." Justified shared kernel between peers under one owner. |
| D5 Invoicing → customer-supplier | 2 | PASS | 2 | `Invoicing -->|upstream, Customer/Supplier| Rentals`; "Rentals is upstream in influence (Customer/Supplier pattern): Invoicing's API evolves around Rentals' requests". |
| E1 SharedDomainRules rejected/reclassified | 2 | PARTIAL | 1 | Flags the risk but does not reject it as an anti-pattern nor rehome it to governance/arch-tests: "a single, explicitly platform-wide Shared Kernel … Not a bounded context … but worth flagging as a monolith→microservices risk … decide before the first extraction." Kept as a Shared Kernel; right home (governance / architecture test) never named. |
| E2 Money/UoM accepted as building blocks | 2 | PASS | 2 | "`BuildingBlocks` (Money, UnitOfMeasure) — shared technical value objects with no business policy of their own ('no business policy lives here — arithmetic only') … a shared kernel of pure technical types." Treated distinctly from SharedDomainRules (accepted vs. flagged-as-risk; technical vs. business rules). |
| E3 Share-Equipment TODO flagged | 2 | FAIL | 0 | **Absent — searched context-map.md, rentals/README.md, rentals/model.yaml, all run files.** The fixture's `RentalOrderService.cs` `TODO(rentals): … just share Catalog's Equipment entity class directly between the two modules` is never surfaced. The run discusses the ErpSync→Catalog `AssetRecord`/`Equipment` shape match (Q4) but never catches the shared-kernel/high-coupling TODO. |
| F1 Draft-vs-code conflict table, code wins | 2 | PASS | 2 | Conflicts & reconciliation table with all four planted divergences (Double-booking, Discount floor, Maintenance's home, Standalone "Availability"), each "Chosen (authoritative): B (code/README)"; header states "running/shipped code … is chosen as authoritative in every case." |
| F2 Orphan event flagged | 2 | PASS | 2 | "**`DepotTransferRequested` (Allocation) → no consumer anywhere in the read code** … Flagged as an orphan emit". No false positives: EquipmentAllocated, PriceQuoted, RentalOrderPlaced each marked "OK" with consumers. |
| F3 Output contract complete | 2 | PASS | 2 | `context-map.md` (Mermaid + Core Domain Chart), per-context `model.yaml` with `entities`/`value_objects`/`domain_events` (`[]` when empty), per-context `README.md` canvases, `INDEX.md` with `DOMAIN-0001…0010`, `status: draft`, `owner: TBD`. |
| **TOTAL** | **44** | | **35.5** | |

## Category subtotals

| Group | Earned | Max |
|---|---:|---:|
| A. Space hygiene | 3 | 4 |
| B. Right-sizing | 9 | 12 |
| C. Capability vs context | 4.5 | 6 |
| D. Context mapping | 10 | 10 |
| E. Sharing discipline | 3 | 6 |
| F. Procedural regression | 6 | 6 |
| **Total** | **35.5** | **44** |

## Per-check evidence & what full credit needed

- **A1 (PARTIAL):** Hygiene is clean, but Pricing — a hard core anchor (enforced floor invariant) —
  was classified `supporting`. Full credit keeps Pricing in **core** alongside Allocation.
- **A2 (PASS):** Explicit context→subdomain chart + recorded deviations (crm-import folded into
  Accounts, Availability merged into Allocation).
- **B1 (PASS):** Rich Allocation model; both planted invariants (no-double-allocation, utilization
  floor) named from the fixture.
- **B2 (PARTIAL):** Maintenance still framed as an aggregate root; full credit gives it an explicit
  transaction-script/CRUD-plus-one-calculation shape called out as lighter than the core, no
  aggregate wrapper.
- **B3 (PASS):** Stripe/Auth0/SendGrid all thin adapters, no domain model.
- **B4 (PARTIAL):** Catalog minted four aggregates (Equipment/Category/Depot/Tag). Full credit
  explicitly declines aggregates/repositories/events for reference data (Minimal-API + DbContext).
- **C1 (PARTIAL):** No Ownership context (good), but the run denies polysemy outright rather than
  registering that `owner` means depot-holds-unit vs sales-rep-owns-account vs user-uploaded-doc.
- **C2 (PASS):** audit_log kept as cross-cutting capability out of the domain model; legal/retention
  escalation axis named.
- **D1–D5 (PASS ×5):** ACL, Conformist, Open-Host/Published Language, justified Shared-Kernel
  partnership, Customer/Supplier — each named with substance.
- **E1 (PARTIAL):** SharedDomainRules flagged as a coupling risk but kept as a Shared Kernel; full
  credit rejects it as anti-DDD and rehomes cross-cutting rules to governance / architecture tests.
- **E2 (PASS):** Money/UoM accepted as technical building blocks, distinct from the E1 treatment.
- **E3 (FAIL):** The share-Catalog's-Equipment-class TODO is never flagged as a shared-kernel /
  high-coupling risk. Full credit catches the `TODO(rentals)` and recommends against sharing the
  class (duplicate + map, or integrate via contract).
- **F1 (PASS):** Full conflict table, all four divergences, code authoritative.
- **F2 (PASS):** DepotTransferRequested orphan flagged; no false positives.
- **F3 (PASS):** Complete output contract per the template.
