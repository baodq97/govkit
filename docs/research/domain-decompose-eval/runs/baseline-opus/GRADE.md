# GRADE — baseline-opus (domain-decompose over RentField fixture)

Graded strictly against `rubric.md` (the sole authority). **Authoritative total: 44** per the
rubric's own note (§ top — "Do not re-derive the total at grading time; use 44"; the "41" figure is
explicitly superseded). Every verdict quotes the runner's output or states explicit absence.

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 Subdomain labels in problem space only | 2 | PASS | 2 | Core Domain Chart classifies each context ("Allocation … **core**", "Maintenance … supporting", "Catalog … generic *(master-data / reference)*") while the context map carries *relationships* ("open-host / published-language", "customer-supplier", "shared-kernel + partnership", "ACL", "conformist"). All hard anchors hit; no incoherent latitude classification. |
| A2 Subdomain↔context mapping recorded | 2 | PASS | 2 | Core Domain Chart maps each BC→type with DOMAIN ids; deviations recorded: "**Not modelled as domain contexts** … `SharedDomainRules / GlobalRules` … `BuildingBlocks` … the `audit_log` order activity-history", plus "availability folded into Allocation". |
| B1 Core → full model, named invariants | 3 | PASS | 3 | Allocation/Pricing `tactical_pattern: full-domain-model`; invariants: "The same physical unit is never committed twice for overlapping windows — not even from a different depot" and "A quote can never fall below the utilization-derived floor (floor = listRate * (0.60 + 0.40 * utilization))". |
| B2 Supporting → lighter, no ceremony | 3 | PASS | 3 | Maintenance `tactical_pattern: transaction-script`, `aggregates: []`; "Supporting on purpose … plus one calculation (NextDue). No aggregates / repositories / domain events." |
| B3 Generic → buy + thin adapter | 3 | PASS | 3 | VendorIntegrations `bought-adapter`, `aggregates: []`; "off-the-shelf commodity services behind thin adapters (Stripe, Auth0, SendGrid) … No model to build." |
| B4 Master-data → CRUD, no aggregates | 3 | PASS | 3 | Catalog `tactical_pattern: crud`, `aggregates: []`; "Master-data / reference: pure lookups … **Explicitly no aggregates, repositories, or domain events** — an empty model is the correct, complete output here." |
| C1 Ownership not a context | 3 | PASS | 3 | No Ownership context minted; three distinct owner meanings modelled per-context: "depot-owns-committed-unit, account-owned-by-sales-rep, document-owned-by-uploader" (RUN-NOTES), each flagged "modelled ownership, not audit metadata". Authorization projection present (delete rule / rep-only terms change). |
| C2 Audit not a context (+ escalation) | 3 | PASS | 3 | "`audit_log` … infrastructural audit metadata, **not** a domain aggregate or a domain-event stream — do not model it as a context" + escalation: "if the business later attaches legal/retention meaning it would promote to a domain concern (Q8)". |
| D1 ERP → ACL | 2 | PASS | 2 | ErpSync `type: acl`; "Classic Anti-Corruption Layer: defensively maps the ERP's inconsistent/renamed fields … if the ERP breaks its format the damage stops here." Map edge "ACL: quarantine + translate". |
| D2 CRM → conformist | 2 | PASS | 2 | Accounts `type: conformist`; "sourced from a third-party CRM we have no leverage over — we mirror its record shape (field names, segment codes, id format) verbatim -> Conformist." |
| D3 Pricing→Rentals → OHS/published | 2 | PASS | 2 | Map edge "open-host / published-language: PriceQuoted v2"; Pricing notes "Open-Host / Published-Language message crossing to Rentals (versioned v1 -> v2, kept until every consumer migrates)." |
| D4 Allocation+Logistics → partnership | 2 | PASS | 2 | Logistics: "Built by the same squad as Allocation, shares its model types directly, and ships in the same release -> Shared Kernel + Partnership with Allocation." |
| D5 Invoicing → customer-supplier | 2 | PASS | 2 | Invoicing: "Customer-Supplier relationship — Rentals is the customer that holds the pen on the contract; Billing supplies and plans around Rentals' requests." |
| E1 SharedDomainRules rejected/reclassified | 2 | PASS | 2 | "`SharedDomainRules` / `GlobalRules` — shared-kernel anti-pattern (flag) … one code dependency shared by *every* context defeats context autonomy." Rules relocated to owning contexts (ceiling→Pricing, priority→Allocation, customer def→Accounts); "Recommend dissolving `GlobalRules`". |
| E2 Money/UoM accepted as building blocks | 2 | PASS | 2 | "`BuildingBlocks` (Money, UnitOfMeasure) — legitimate shared kernel. Neutral technical value objects with 'no business policy… arithmetic only' … Keep as a shared kernel; **distinct from the `GlobalRules` problem**." |
| E3 Share-Equipment TODO flagged | 2 | PARTIAL | 1 | Catches the TODO (Q6: "a duplicate private `Equipment` class in Rentals (with a TODO to 'share Catalog's Equipment entity directly')") and recommends "Rentals should consume Catalog's Equipment and drop its duplicate." But **never flags the direct class-share as high-coupling / a shared-kernel risk** — the coupling-cost substance the check demands is absent; framed as generic "tech debt", not a warning against sharing a mutable domain class across contexts. |
| F1 Draft-vs-code conflict table, code wins | 2 | PASS | 2 | "Conflicts & reconciliation" table, code authoritative, all four planted divergences present: discount floor vs "no minimum", "unit can be held at two depots at once" vs no-double-allocation, Maintenance placement, "Availability module … availability folded into Allocation". |
| F2 Orphan event flagged | 2 | PASS | 2 | Event-flow table: "`DepotTransferRequested` \| Allocation \| **nobody** … **ORPHAN EMIT — flag.**"; EquipmentAllocated / PriceQuoted / RentalOrderPlaced each marked "OK" with consumers (no false positive). |
| F3 Output contract complete | 2 | PASS | 2 | `context-map.md` (Mermaid + Core Domain Chart), per-context `model.yaml` with `entities`/`value_objects`/`domain_events` keys (`invariants: []` / `aggregates: []` where empty), per-context `README.md` canvases, `INDEX.md`, stable `DOMAIN-0001..0011`, all `status: draft` / `owner: TBD`. |
| **TOTAL** | **44** | | **43** | |

## Category subtotals

| Group | Max | Score |
|---|---:|---:|
| A. Space hygiene | 4 | 4 |
| B. Right-sizing | 12 | 12 |
| C. Capability vs context | 6 | 6 |
| D. Context mapping | 10 | 10 |
| E. Sharing discipline | 6 | 5 |
| F. Procedural regression | 6 | 6 |
| **Total** | **44** | **43** |

## Per-check evidence notes (non-PASS)

- **E3 (PARTIAL, 1/2).** The run caught the `RentalOrderService` TODO and did not endorse
  sharing-to-avoid-mapping (it says drop the duplicate, make Catalog the system-of-record), so it is
  above FAIL. But full credit requires *flagging the direct class-share as high-coupling — a shared
  kernel / shared mutable model that would couple Rentals and Catalog*, and that explicit coupling
  warning is nowhere in Q6, the Rentals `model.yaml`/`README`, or the Catalog `model.yaml`. A
  full-credit answer would have said: sharing Catalog's `Equipment` class directly is a shared-kernel
  anti-pattern that couples the two contexts; instead integrate via a published contract / Catalog-
  as-SoR reference, or duplicate + map — and named the coupling cost, not just labelled it tech debt.

## Note on the total

The task brief referenced "/41"; the rubric explicitly supersedes that ("An earlier corpus brief
quoted '41'; that figure is **superseded** … use 44"). This grade is scored out of **44** per the
rubric, which is the sole authority. Final: **43 / 44**.
