# GRADE — baseline-head-opus

Graded against `rubric.md` (the entire law). **Authoritative total: 44** (rubric §top explicitly
supersedes the earlier "41" figure; graded max = 44). Independent grade; zero charity.

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 Subdomain labels in problem space only | 2 | PASS | 2 | Core Domain Chart classifies every context (`Allocation \| core`, `Pricing \| core`, `Maintenance \| supporting`, `Payments/Identity/Notifications \| generic`); contexts described by context-map relationships, not intrinsic labels. All hard anchors hit. |
| A2 Subdomain↔context mapping recorded | 2 | PASS | 2 | Core Domain Chart maps each BC→type with "Why"; deviations recorded ("Availability … folded into Allocation", "Maintenance … own context (DOMAIN-0005)", audit/ownership "Deliberately NOT modeled"). |
| B1 Core → full model, named invariants | 3 | PASS | 3 | Allocation invariant "The same physical unit can never be committed twice for overlapping windows, not even from a different depot"; Pricing invariant "A quote can never fall below the utilization-derived floor". Both rich models with events. |
| B2 Supporting → lighter, no ceremony | 3 | PASS | 3 | Maintenance: single `MaintenanceRecord`, `value_objects: []`, `domain_events: []`; README "nothing to keep atomically consistent beyond a single record", "Routine record-keeping". Genuine right-sizing vs core. |
| B3 Generic → buy + thin adapter | 3 | PASS | 3 | Payments/Identity/Notifications each `aggregates: []`; Payments README "a thin adapter with no business rules. Candidate to keep bought, not built." No domain model for any of the three. |
| B4 Master-data → CRUD, no aggregates | 3 | PARTIAL | 1.5 | Catalog treated as reference data ("None captured — pure reference data") BUT still minted three aggregate roots — `catalog/model.yaml` has `name: Category / root: Category`, `Depot`, `Tag` as aggregates. Rubric PARTIAL: "still given an aggregate or repository". |
| C1 Ownership not a context | 3 | PARTIAL | 1.5 | No Ownership context created; ownership kept per-context (Documents owner-delete, Accounts rep-owns-account, Allocation depot-owns-unit). BUT the "owner" polysemy is never registered — absent, searched context-map.md + all READMEs; only *Depot* polysemy noted ("'Depot' is polysemous"). Rubric PARTIAL: "keeps ownership inside each context but doesn't register the polysemy". |
| C2 Audit not a context (+ escalation) | 3 | PASS | 3 | "Order activity history / `audit_log` … not a domain aggregate … no `ActivityHistory` context … (Contrast: had it carried a legal/retention obligation, it would be a domain concern.)" Capability + escalation condition. |
| D1 ERP → ACL | 2 | PASS | 2 | "ACL (anti-corruption layer) — downstream translates the upstream's shifting/foreign model into its own clean shapes and never lets the raw model leak inward. *(Fleet ← Legacy ERP.)*" |
| D2 CRM → conformist | 2 | PASS | 2 | "conformist — downstream accepts the upstream's model verbatim, no translation. *(Accounts ← CRM…)*"; Accounts invariant "mirror the CRM's field names, segment codes, and id format verbatim". Distinct from customer-supplier (used for Invoicing). |
| D3 Pricing→Rentals → OHS/published | 2 | PASS | 2 | "Pricing -->\|open-host / published-language: PriceQuoted\| Rentals"; "already a *Published Language*: a standalone, versioned contract project (`Pricing.Contracts`, v1→v2)". |
| D4 Allocation+Logistics → partnership | 2 | PASS | 2 | "Allocation <-->\|shared-kernel\| Logistics"; justified — "fulfilment \| Allocation, Logistics … shared code + shared release → shared kernel", "ships them together as one deployable". Explicitly-justified shared kernel under one owner. |
| D5 Invoicing → customer-supplier | 2 | PASS | 2 | "Rentals -->\|customer-supplier customer\| Invoicing"; "Rentals is Invoicing's customer and drives its API shape." |
| E1 SharedDomainRules rejected/reclassified | 2 | PASS | 2 | "`SharedDomainRules` / `GlobalRules` as a context or shared kernel. A platform-wide 'every module MUST inherit' base is a false shared kernel that couples *all* contexts. Its rules are redistributed to their owners". |
| E2 Money/UoM accepted as building blocks | 2 | PASS | 2 | "`Money`, `UnitOfMeasure` (`BuildingBlocks`) … shared *technical* value objects … referenced as value objects where used, not elevated to a bounded context." Handled distinctly from the rejected SharedDomainRules. |
| E3 Share-Equipment TODO flagged | 2 | PASS | 2 | Conflicts row: `RentalOrderService` "TODO to 'just share Catalog's Equipment entity class directly'" → "recommend Rentals conform to Catalog rather than a mutual shared kernel." Recommends against + integrate-via-contract. |
| F1 Draft-vs-code conflict table, code wins | 2 | PASS | 2 | "Conflicts & reconciliation" table, "running/shipped code wins over the draft doc"; ≥2 required rows present — floor, double-depot, Maintenance placement, Availability all chosen "B (code/README)". |
| F2 Orphan event flagged | 2 | PASS | 2 | "`DepotTransferRequested` \| Allocation \| **none** \| ⚠ **Orphan emit**"; `EquipmentAllocated`, `PriceQuoted`, `RentalOrderPlaced` all marked OK (no false positives). |
| F3 Output contract complete | 2 | PASS | 2 | `context-map.md` (Mermaid + Core Domain Chart), 13× `model.yaml` (all aggregates carry `entities`/`value_objects`/`domain_events`, `[]` when empty — verified incl. logistics), 13× README canvases, `INDEX.md` DOMAIN-0001…0013 all `status: draft` / `owner: TBD`. |
| **TOTAL** | **44** | | **41** | |

## Category subtotals

| Group | Score | Max |
|---|---:|---:|
| A. Space hygiene | 4 | 4 |
| B. Right-sizing | 10.5 | 12 |
| C. Capability vs context | 4.5 | 6 |
| D. Context mapping | 10 | 10 |
| E. Sharing discipline | 6 | 6 |
| F. Procedural regression | 6 | 6 |
| **Total** | **41** | **44** |

## Per-check evidence notes (non-PASS)

**B4 — PARTIAL (1.5/3).** Catalog is correctly called reference data ("pure reference data", "No
behaviour beyond storage and retrieval"), but the run still minted `Category`, `Depot`, and `Tag`
as three aggregate roots in `catalog/model.yaml` (`name:`/`root:` each). Full credit required
explicitly *declining* aggregates/repositories/events for master data (MM: "Không aggregate, không
domain event, không repository"). Modeling them as aggregate roots is precisely the invented
ceremony the check penalizes.

**C1 — PARTIAL (1.5/3).** The run avoided the FAIL (no "Ownership" context; ownership stays
per-context — depot-owns-unit, rep-owns-account, uploader-owns-document). But it never registers
that "owner" is *polysemous* across those three modules. Searched context-map.md and every README;
the only polysemy called out is "Depot", not "owner". Full credit required noticing the owner
polysemy explicitly (AA: "`owner` mang hai nghĩa khác nhau và cả hai đều đúng") as the reason not to
build an Ownership context.

## Notes
- Total discrepancy: the grader harness prompt said "/41", but rubric §top declares 41
  **superseded** and 44 authoritative ("Do not re-derive the total at grading time; use 44"). The
  rubric is the law → max = 44. The run scored **41/44**.
- B-group cargo-cult FAIL check: NOT triggered — Payments/Identity/Notifications carry
  `aggregates: []` while core carries events+invariants, so modelling is not uniform.
