# GRADE — baseline-sonnet (domain-decompose on RentField fixture)

Graded strictly against `rubric.md` (the entire law). Per its own §"Authoritative total: 44"
clause, the max of record is **44**, not 41 (the 41 figure is explicitly superseded by the
rubric and is not used here).

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 Subdomain labels in problem space only | 2 | PASS | 2 | Core Domain Chart classifies every context (`\| Allocation \| **core** \|`, `\| Catalog \| **master-data / reference** \|`, `\| Vendors \| generic \|`), and every context also carries context-map **relationships** (Mermaid edges + per-model `relationships:`), not a bare intrinsic label. Hard anchors hit: Allocation/Pricing core, Maintenance supporting, Vendors generic, Catalog master-data. |
| A2 Subdomain↔context mapping recorded | 2 | PASS | 2 | The Core Domain Chart is an explicit context→subdomain-type table, and deviations are recorded: Vendors "Three unrelated commodity adapters (Stripe, Auth0, SendGrid) grouped under one context"; BuildingBlocks/SharedDomainRules "sit outside this map because neither owns a business capability… so no context folder was created for either." |
| B1 Core → full model, named invariants | 3 | PASS | 3 | Allocation `tactical_pattern: full-domain-model`, aggregate Reservation invariant "The same physical unit can never be committed twice for overlapping windows, not even from a different depot." Pricing floor named: "The core invariant (the utilization-driven discount floor)". Both planted invariants captured from source, not invented. |
| B2 Supporting → lighter, no ceremony | 3 | PASS | 3 | Maintenance `subdomain_type: supporting`, `tactical_pattern: transaction-script`; notes: "Kept as a light transaction-script/active-record per the supporting subdomain type… this is not full aggregate-design ceremony." No domain events; lightness explicitly stated + contrasted with core. |
| B3 Generic → buy + thin adapter | 3 | PASS | 3 | Vendors `subdomain_type: generic`, `tactical_pattern: bought-adapter`, `aggregates: []`; notes: "Three unrelated commodity adapters (Stripe, Auth0, SendGrid)… none carries a domain model." All three handled; no aggregates/entities/events. |
| B4 Master-data → CRUD, no aggregates | 3 | PASS | 3 | Catalog `subdomain_type: master-data`, `tactical_pattern: crud`, `aggregates: []`; notes: "aggregates, repositories, and domain events are explicitly declined per SKILL.md's subdomain-type table, not omitted by oversight." Depots + Tags folded in as lookup terms. |
| C1 Ownership not a context | 3 | PARTIAL | 1.5 | Never mints an Ownership context (good), but never registers the polysemy: "owner" is separately defined in Documents (uploader), Accounts (rep), Allocation (depot owns unit) with **no** statement that the term means different things across modules and **no** explicit decline of an Ownership context. Matches PARTIAL "keeps ownership inside each context but doesn't register the polysemy." |
| C2 Audit not a context (+ escalation) | 3 | PARTIAL | 1.5 | Treats audit as not-a-context: "technical audit metadata is an infrastructural, cross-cutting concern decided in the data layer… deliberately **not** modelled as a bounded context or aggregate." But the escalation condition is **absent** — it quotes "no legal or retention angle" (current state) yet never states what would flip it to a context (regulated / retention-legal-hold / audit-as-product). Matches PARTIAL "omits the escalation condition." |
| D1 ERP → ACL | 2 | PASS | 2 | Mermaid: "ErpSync -->\|ACL, quarantines the raw feed\| ERP[Legacy ERP — external, SOAP, nightly]"; model.yaml `type: acl`, notes "Generic Anti-Corruption-Layer integration: translation only, no domain model of RentField's own." |
| D2 CRM → conformist | 2 | PASS | 2 | Mermaid: "Accounts -->\|conformist, mirrors shape verbatim\| CRM"; accounts notes "Conformist to the external CRM: fields are mirrored exactly, no translation." Not conflated with customer-supplier (which it uses correctly for Rentals→Invoicing). |
| D3 Pricing→Rentals → OHS/published | 2 | PASS | 2 | Mermaid: "Pricing -->\|open-host / published-language: PriceQuoted v2\| Rentals"; extraction-seam section: "textbook **Open Host Service / Published Language**… versioned with a changelog… Rentals 'may depend on… Pricing's stable, versioned contract project only — never on anything inside Pricing.'" |
| D4 Allocation+Logistics → partnership | 2 | PASS | 2 | Mermaid: "Allocation ---\|shared-kernel, same squad\| Logistics"; logistics notes "one squad's shared-kernel pair (same team, shared model types, joint releases per README.md and code comments)." Justified shared kernel under one owner = the acceptable variant. |
| D5 Invoicing → customer-supplier | 2 | PASS | 2 | Mermaid: "Rentals -->\|customer-supplier: Rentals drives the API\| Invoicing"; model.yaml `type: customer-supplier`; downstream-drives-contract substance present. |
| E1 SharedDomainRules rejected/reclassified | 2 | PARTIAL | 1 | Reclassifies to governance ("an unenforced or abandoned governance rule, not a working shared kernel") — but rejects it on **empirical non-use** grounds, not as an anti-pattern: "either the mandate was never enforced, or every consumer has silently drifted from a rule the team believes is followed." Implies wiring it up would be fine, missing that a single universal business-rule model forced on every context is itself the anti-DDD trap. Also lists it under the "Shared kernel" table header. |
| E2 Money/UoM accepted as building blocks | 2 | PASS | 2 | "`BuildingBlocks` … Purely technical, no business policy — genuine shared kernel per the code's own comments" — accepted, and treated **differently** from SharedDomainRules ("not a working shared kernel"). Technical-vs-domain distinction made. |
| E3 Share-Equipment TODO flagged | 2 | PARTIAL | 1 | Catches the TODO but frames it as "duplication debt: private Equipment copy, not wired" and describes sharing as the alternative — **never flags sharing Catalog's `Equipment` class as a high-coupling shared-kernel risk and never recommends against it**. Matches PARTIAL "notices the duplication but is neutral about sharing the class." The "debt" framing leans toward resolving via sharing, the inverse of the intended judgment. |
| F1 Draft-vs-code conflict table, code wins | 2 | PASS | 2 | Conflicts & reconciliation table with "Chosen (authoritative) = code" on all rows; includes all four candidates — Availability folded into Allocation, no-minimum vs floor, two-depots vs no-double-commit, Maintenance-inside-Allocation vs separate module. |
| F2 Orphan event flagged | 2 | PASS | 2 | Event-flow table: "`DepotTransferRequested` … **none found** … **Orphan.**" EquipmentAllocated / PriceQuoted / RentalOrderPlaced all correctly marked OK (no protected-event false positive). |
| F3 Output contract complete | 2 | PASS | 2 | `context-map.md` (Mermaid + Core Domain Chart), per-context `model.yaml` with `entities`/`value_objects`/`domain_events` keys (`[]` when empty), per-context `README.md` canvases, `INDEX.md`, stable `DOMAIN-0001..0011` all `status: draft` / `owner: TBD`. |
| **TOTAL** | **44** | | **39** | |

## Category subtotals

| Group | Score | Max |
|---|---:|---:|
| A. Space hygiene | 4 | 4 |
| B. Right-sizing | 12 | 12 |
| C. Capability vs context | 3 | 6 |
| D. Context mapping | 10 | 10 |
| E. Sharing discipline | 4 | 6 |
| F. Procedural regression | 6 | 6 |
| **TOTAL** | **39** | **44** |

## Per-check notes on non-PASS (what full credit needed)

- **C1 (PARTIAL):** Full credit needed an explicit note that "owner" is polysemous across modules
  (depot-holds-unit vs sales-rep-owns-account vs uploader-owns-document) and therefore an
  "Ownership" bounded context is deliberately declined. The run scatters three owner definitions
  but never names the polysemy or the decline.
- **C2 (PARTIAL):** Full credit needed the escalation condition — that audit becomes a bounded
  context if the industry turns regulated / retention-legal-hold / audit-as-product rules become
  real. The run states only the current "no legal or retention angle."
- **E1 (PARTIAL):** Full credit needed rejecting the "every module MUST inherit these business
  rules" mandate as an anti-pattern in principle (a single universal domain model forced on every
  context belongs to governance / architecture tests). The run rejected it merely because no call
  site uses it, implying it would be legitimate if wired — missing the trap.
- **E3 (PARTIAL):** Full credit needed flagging the TODO's proposal to share Catalog's `Equipment`
  class directly as a high-coupling shared-kernel risk, recommending against it (keep the duplicate
  + map, or integrate via the published contract). The run labels the duplication "debt" and stays
  neutral on the sharing, never naming the coupling cost.

## Note on the total-of-record

The task harness references "/41"; the rubric explicitly supersedes that: "Authoritative total: 44…
An earlier corpus brief quoted '41'; that figure is superseded… Do not re-derive the total at
grading time; use 44." This grade uses **39/44**.
