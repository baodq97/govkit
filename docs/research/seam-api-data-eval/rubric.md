# Rubric — SEAM: do `api-designer` + `data-model` correctly CONSUME the domain-decompose contract?

**System under test:** two swe-flow skills, run against a domain model already produced by
`domain-decompose` (graded 44/44):
- `plugins/swe-flow/skills/api-designer/` → writes `docs/api/`
- `plugins/swe-flow/skills/data-model/` (FORWARD mode) → writes `docs/data/`

**What we measure:** fidelity of the *consumer* to the `model.yaml` v0.10.0 output contract
(`subdomain_type` / `tactical_pattern` / `aggregates: []` + `notes` rationale + `relationships`).
The domain model is authoritative input; a correct consumer maps what is there, right-sizes the
same way the model already right-sized, turns the two core invariants into concrete mechanisms,
keeps metadata discipline, preserves names/ids, and emits its full output contract.

**Scoring:** each check is **PASS = full points / PARTIAL = half / FAIL = 0**. Total **36 pts**
across **16 checks**. A check names which skill it grades (`api` = api-designer output under
`docs/api/`, `data` = data-model output under `docs/data/`, `both` = graded on each).

**Citation rule (hard):** every verdict MUST quote the runner's own emitted artifact — the exact
file path plus the quoted line(s) (a table row, a DDL statement, an OpenAPI path/`webhooks` block,
a README sentence). A verdict with no quote from the run output is inadmissible; score that check
**FAIL** for lack of evidence rather than inferring intent. Quote absence explicitly ("grep of
`docs/data/**/schema.postgres.sql` returns no `payments` table") when the PASS condition is the
*absence* of something.

The fixture inputs legitimately contain the model.yaml vocabulary (`subdomain_type`,
`tactical_pattern`, `aggregates: []`, `notes`) — that IS the consumed contract, not a hint. No
input tells the runner what the API/schema should look like; that inference is the thing under test.

---

## Category R — Right-sizing & boundary respect

The model already right-sized every context (only Allocation + Pricing carry a real aggregate; the
other eleven are `aggregates: []` with a `notes:` rationale). A faithful consumer must NOT re-inflate
a light context into tables + resource CRUD it never earned.

### R1 — Bought-adapter generic contexts get no business tables and no resource CRUD  · `both` · **3 pts**
The three generic bought-adapter contexts — **Payments** (Stripe), **Identity** (Auth0),
**Notifications** (SendGrid), each `subdomain_type: generic`, `tactical_pattern: bought-adapter`,
`aggregates: []` — are commodities behind a thin adapter. They own no domain model.
- **PASS:** `data` emits no business tables for these contexts (at most an adapter-config / outbound
  row or a documented cross-context foreign-id reference, explicitly labeled as such); `api` exposes
  no full resource collection/item CRUD surface for them (at most an adapter callback/config or a
  foreign-id field on another context's resource). If a context folder is emitted at all, it states
  the bought-adapter right-sizing.
- **PARTIAL:** materialized for one of the three but correctly declined for the other two; or a
  single thin adapter-config table/endpoint that over-reaches slightly but is labeled infra.
- **FAIL:** any of Payments/Identity/Notifications gets a `payments`/`users`/`notifications` table
  with business columns, or a `/payments` `/users` `/notifications` CRUD resource surface — inventing
  persistence/API the model explicitly declined.
- **Cite:** grep result over `docs/data/**/schema.postgres.sql` and `docs/api/**/openapi.yaml` for
  these context slugs; quote the created table/paths, or quote their absence.

### R2 — Master-data Catalog becomes plain lookup tables + CRUD, no aggregate ceremony  · `both` · **2 pts**
**Catalog** is `subdomain_type: generic` (master-data/reference), `tactical_pattern: crud`,
`aggregates: []`, with `Category` / `Depot` / `Tag` as pure lookups and domain events explicitly
DECLINED.
- **PASS:** `data` emits plain lookup tables (`category`, `depot`, `tag`) with keys/indexes but no
  aggregate-root consistency scaffolding and **no event/outbox table**; `api` emits ordinary CRUD
  collection+item endpoints for them. Names match the ubiquitous language.
- **PARTIAL:** lookup tables/endpoints present but carrying needless aggregate ceremony (e.g. an
  invented `catalog_event` table, a version/optimistic-lock column framed as domain rule).
- **FAIL:** Catalog modeled with domain events, an aggregate root + child-event machinery, or
  invented business rules; or Catalog omitted entirely.
- **Cite:** quote the `category`/`depot`/`tag` DDL and the Catalog OpenAPI paths, or the offending
  event/aggregate artifact.

### R3 — Supporting Maintenance stays a light shape  · `both` · **2 pts**
**Maintenance** is `supporting`, `tactical_pattern: transaction-script`, `aggregates: []` — CRUD over
service records plus one calculation (`NextDue = LastServiced + IntervalDays`).
- **PASS:** `data` emits a single `maintenance_record`-style table (last serviced, interval,
  out-of-service flag) with `NextDue` as a derived/computed value or documented calc — no aggregate,
  no event table; `api` emits CRUD endpoints for maintenance records (and may expose the
  out-of-service state as a read/query). The out-of-service state Allocation reads is preserved.
- **PARTIAL:** modeled light but adds one unearned ceremony (an aggregate wrapper, or persists
  `NextDue` as an invented invariant/event).
- **FAIL:** Maintenance turned into an aggregate with domain events, or folded back into Allocation
  (the stale-draft error the model explicitly rejected), or omitted.
- **Cite:** quote the maintenance table/columns and endpoint list.

### R4 — Domain events are not materialized as tables  · `data` · **2 pts**
Per data-model's documented rule, a `domain_event` is a message, not state — never a table, except
an explicitly-chosen, labeled outbox. The model's events (`EquipmentAllocated`,
`DepotTransferRequested`, `PriceQuoted`, `RentalOrderPlaced`) must not become event tables by default.
- **PASS:** no per-event table exists; if an outbox is used it is a single explicitly-labeled
  `outbox`/event-store table with a stated rationale, not one table per event.
- **PARTIAL:** one incidental event table slips in but the rest are handled as messages.
- **FAIL:** events persisted as tables by default (e.g. `equipment_allocated`, `price_quoted`,
  `rental_order_placed` tables) with no outbox rationale.
- **Cite:** grep `docs/data/**/schema.postgres.sql` for event-named tables; quote them or their absence.

### R5 — Cross-context links are id references only; one context per surface  · `both` · **2 pts**
`aggregate = transaction boundary`; no hard FK across a context/aggregate boundary — reference by id.
And one spec/schema per bounded context; never collapse two contexts into one surface, never fan one
aggregate across contexts. The model's cross-context edges (Rentals→CustomerAccounts customer ref,
Rentals→Pricing quote, Allocation→Maintenance out-of-service query, Asset Sync→Allocation/Catalog)
are id/query dependencies, not shared tables.
- **PASS:** cross-context references (e.g. `RentalOrder.customerId`, `RentalOrder.assetTag`) are plain
  id columns documented as cross-context refs with **no `REFERENCES`/physical FK**; `data`/`api`
  keep one folder per context slug and don't merge two contexts into one table/spec.
- **PARTIAL:** id-only refs honored but one folder collapses two contexts (or vice-versa).
- **FAIL:** a physical FK crosses a context boundary (e.g. `rental_order.customer_id REFERENCES
  customer_accounts…`), or two contexts share one aggregate table/spec.
- **Cite:** quote the cross-context column definition (showing no `REFERENCES`) or the offending FK.

---

## Category C — Core invariants become concrete mechanisms

The two core contexts carry real, stated invariants. A consumer that drops them to prose, or names
them without a mechanism, fails the whole point of consuming a core model.

### C1 — Allocation no-double-commit becomes a named schema mechanism  · `data` · **3 pts**
Allocation's invariant: *"The same physical unit may never be committed twice for overlapping
windows, not even from a different depot."*
- **PASS:** the schema prevents overlap with an **actual named mechanism** — a Postgres exclusion
  constraint (`EXCLUDE USING gist (asset_tag WITH =, tstzrange(start,end) WITH &&)` or equivalent), a
  covering unique index, or an explicitly-named transactional/serializable check — asserted in
  `docs/data/allocation/schema.postgres.sql` and/or the canonical README, tied to `asset_tag` +
  window across all depots. The model's own consistency-boundary caveat (per-asset reservation book)
  may be reflected but does not excuse dropping the mechanism.
- **PARTIAL:** the invariant is carried as a flagged constraint-note ("enforce via exclusion
  constraint — TODO") without emitting the actual DDL, i.e. named but not mechanized.
- **FAIL:** overlap left to application prose, a plain non-unique index, or the invariant dropped.
- **Cite:** quote the exclusion/unique/txn statement from the Allocation schema, or its absence.

### C2 — Pricing utilization floor becomes a validation/constraint  · `both` · **2 pts**
Pricing's invariant: a quote may never fall below `listRate × (0.60 + 0.40 × utilization)`; at 100%
utilization the floor equals full list rate. Pricing is a stateless engine (no persisted Quote yet),
so the honest surface is a validation/constraint or a flagged constraint-note — not silence.
- **PASS:** the floor appears as a concrete mechanism in the run output — a `CHECK` where a quote/
  price is persisted, an API request-validation rule / 422 on the quote endpoint, and/or an
  explicitly flagged constraint-note that states the floor formula and that it is enforced. The
  stateless nature may be acknowledged, but the floor rule is carried, not dropped.
- **PARTIAL:** the floor is mentioned in prose but not tied to any enforcement point (no CHECK, no
  validation, no 422), i.e. named without a mechanism.
- **FAIL:** the floor is absent from both `docs/data/` and `docs/api/`, or reduced to a flat
  `MaxDiscountRate = 0.35` (the stale-draft duplicate the model explicitly dissolved).
- **Cite:** quote the CHECK / validation rule / 422 / flagged constraint-note carrying the formula.

### C3 — PriceQuoted exposed as a versioned contract in the API surface  · `api` · **3 pts**
`PriceQuoted` is Published Language (v2) — the Open-Host contract Rentals consumes; Rentals depends on
`Pricing.Contracts` only. It is the load-bearing extraction seam.
- **PASS:** `docs/api/pricing/openapi.yaml` exposes `PriceQuoted` as a versioned contract — a webhook/
  event (OpenAPI `webhooks:`/callbacks) or a state-transition/quote resource — carrying a version
  marker (v2 in the schema name, path, or a versioned schema component) and the ubiquitous-language
  payload fields (category, amount, utilization, contractVersion). The Pricing→Rentals dependency is
  reflected (Rentals consumes the contract, not Pricing internals).
- **PARTIAL:** PriceQuoted exposed but unversioned, or version dropped from `contractVersion`, or
  present only in prose without an OpenAPI element.
- **FAIL:** PriceQuoted absent from the API surface, renamed, or collapsed into a generic
  price-lookup with no contract/versioning.
- **Cite:** quote the `webhooks:`/schema block and the version marker from the Pricing spec.

---

## Category M — Metadata discipline (data-model documented hard rules)

### M1 — Audit columns treated as infrastructure, not domain  · `data` · **2 pts**
`created_at`/`updated_at`/`created_by`-style columns are a uniform cross-cutting policy, kept OUT of
the domain model — not ubiquitous language, not aggregates. The "activity history on orders" request
(explicitly "no legal or retention angle") is a cross-cutting capability + append-only store, not a
domain aggregate.
- **PASS:** audit columns applied as a stated, uniform cross-cutting policy (recorded once, e.g. in
  INDEX.md) and are clearly infra, not domain entities; any activity-history is treated as an
  append-only log, not modeled as an aggregate/business table.
- **PARTIAL:** audit columns present but applied ad hoc / inconsistently, or activity-history handled
  but not clearly separated from domain tables.
- **FAIL:** audit fields modeled as domain attributes/ubiquitous language, or activity-history turned
  into a first-class aggregate/domain-event machinery.
- **Cite:** quote the INDEX.md policy line and an audit-column block, or the offending domain modeling.

### M2 — No single global owner table; ownership stays per-context  · `data` · **3 pts**
The domain model DECLINED a global Ownership context: "owner" is polysemic — `SalesAccount.SalesRepId`
(commercial owner), `Document.OwnerUserId` (uploader who may delete), `Reservation.DepotId` (custodian
depot) are three distinct local meanings, each an ownership projection toward an authorization
capability, NOT audit metadata. A consumer must keep them per-context.
- **PASS:** ownership lives as **per-context id columns** (`sales_rep_id` on the CustomerAccounts
  table, `owner_user_id` on the Documents table, `depot_id` on the Reservation table) — no single
  global `owners`/`ownership` table and no global `users` table unifying all three; the columns are
  modeled as ownership/authorization projections, not treated as `created_by` audit metadata.
- **PARTIAL:** ownership kept per-context but one projection is mislabeled as audit metadata, or two
  are merged where the model kept them apart.
- **FAIL:** a single global `owner`/`ownership`/`users` table (or an "Ownership" context/schema)
  created to unify the three polysemic owners — the anti-pattern the model explicitly rejected.
- **Cite:** quote the three per-context owner columns, or the offending global owner table/context.

### M3 — Cross-cutting policy decided once and recorded  · `data` · **2 pts**
data-model requires deciding audit/ownership/tenancy once and recording the chosen policy at the top
of the model (INDEX.md), applied uniformly. RentField gives no multi-tenancy signal, so tenancy
should be single-tenant (or a flagged assumption) — not invented `tenant_id` on every table.
- **PASS:** a cross-cutting policy line is recorded once (INDEX.md or equivalent) and applied
  consistently; tenancy is single-tenant or a flagged assumption, not fabricated per-table `tenant_id`
  without evidence.
- **PARTIAL:** policy applied but not recorded in one place, or recorded but applied inconsistently.
- **FAIL:** no policy stated and columns applied ad hoc; or `tenant_id`/`org_id` invented across
  tables with no multi-tenancy evidence in the fixture.
- **Cite:** quote the recorded policy line, or show its absence + the inconsistent/invented columns.

---

## Category N — Naming / id continuity

### N1 — Ubiquitous-language names flow model.yaml → API paths → table names  · `both` · **2 pts**
Consumers must reuse the ubiquitous-language names verbatim, never re-derive or rename into technical
layers.
- **PASS:** aggregate/entity names carry through — `Reservation` → `/reservations` + `reservation`
  table; `RentalOrder` → `/rental-orders` + `rental_order`; `Quote`/`PriceQuoted`; `MaintenanceRecord`
  → `maintenance_record`; `SalesAccount` → `sales_account`; `Category`/`Depot`/`Tag`. Casing/pluralization
  conventions are fine; the noun is preserved.
- **PARTIAL:** most names carried but 1–2 renamed into technical/CRUD-generic names (e.g. `Reservation`
  → `bookings`, `SalesAccount` → `customers`).
- **FAIL:** systematic renaming/re-derivation of domain nouns into invented technical names.
- **Cite:** quote a table name / OpenAPI path next to the source `model.yaml` term.

### N2 — Context ids and slugs stay stable across layers  · `both` · **2 pts**
Each context keeps its `DOMAIN-NNNN` id and its kebab-case slug from `docs/domain/` through
`docs/api/` and `docs/data/` (one folder per context, same slug). Only data-model's own documented
template demonstrates citing the source id (`aggregate root: Enrolment, DOMAIN-0001`); api-designer's
SKILL.md and references never mention or demonstrate this pattern. So the `DOMAIN-NNNN` id-citation
expectation is scoped to `data` only — grade the `api` half on slug/folder continuity alone.
- **PASS:** `docs/api/` and `docs/data/` mirror the `docs/domain/` slugs (e.g. `allocation`, `pricing`,
  `customer-accounts`, `asset-sync`) with no context renumbered or re-slugged; and `docs/data/` READMEs
  reference the source `DOMAIN-NNNN` id (the citation data-model's template demonstrates). `docs/api/`
  is graded on slug/folder continuity alone and is not required to cite the id.
- **PARTIAL:** slugs mirrored but `docs/data/` omits the `DOMAIN-NNNN` id citation, or one context re-slugged.
- **FAIL:** contexts renumbered / re-slugged, breaking traceability to `docs/domain/INDEX.md`.
- **Cite:** quote a `docs/api|data/<slug>/` path + any `DOMAIN-NNNN` reference vs. the domain INDEX row.

---

## Category P — Procedural (each skill's full output contract)

### P1 — api-designer emits its full output contract  · `api` · **2 pts**
Per SKILL.md: `docs/api/INDEX.md` + one folder per bounded context, each with **both** `README.md`
(resource model + aggregate→resource / event→endpoint mapping) and `openapi.yaml` (the spec file must
actually exist — a linked-but-missing spec is incomplete).
- **PASS:** `docs/api/INDEX.md` present; every context folder the run designs contains both `README.md`
  and a real `openapi.yaml` (`ls docs/api/*/openapi.yaml` resolves for each).
- **PARTIAL:** INDEX + most folders complete, but ≥1 context has a README with no `openapi.yaml`
  (or vice-versa).
- **FAIL:** no INDEX, or specs are described but not emitted as files.
- **Cite:** quote the `ls docs/api/` / `ls docs/api/*/openapi.yaml` listing.

### P2 — data-model emits its full output contract (FORWARD)  · `data` · **2 pts**
Per SKILL.md: `docs/data/INDEX.md` (with the cross-cutting policy) + one folder per context, each with
`README.md` (CANONICAL logical model: tables, columns, keys, constraints-as-intent, **Mermaid ERD**,
domain→schema mapping, flagged assumptions) and `schema.postgres.sql` (dialect-labeled **projection**).
- **PASS:** `docs/data/INDEX.md` present; each modeled context has a canonical `README.md` (with an
  ERD) and a dialect-labeled `schema.postgres.sql`; the README is treated as canonical and the SQL as
  a projection (light contexts with no tables may legitimately have a README-only shape, stated).
- **PARTIAL:** artifacts present but ERD missing, or SQL emitted without the canonical logical README,
  or the logical/projection relationship inverted.
- **FAIL:** no INDEX, or schema emitted with no canonical logical model, or migration files emitted
  instead of a target schema.
- **Cite:** quote the `ls docs/data/` listing + an ERD fence + the dialect-label line.

### P3 — Relationships mapped onto API/schema dependencies  · `both` · **2 pts**
api-designer must map `model.yaml` `relationships` onto API dependencies (downstream calls upstream;
shared-kernel reuses shared schema components; ACL translates rather than re-exposes). data-model uses
`relationships` to decide in-schema FK vs. cross-context id ref.
- **PASS:** the run reflects the model's relationship semantics — e.g. Allocation↔Logistics
  shared-kernel reuses shared `Reservation`/`EquipmentAllocated` components rather than duplicating a
  divergent copy; Asset Sync (ACL) presents a translated clean shape, not the raw ERP row; Pricing→
  Rentals is a consume-the-contract dependency. Stated in README mapping notes or reflected in schema
  refs.
- **PARTIAL:** dependencies honored for the core seams but 1–2 relationships ignored/mislabeled.
- **FAIL:** relationships ignored — e.g. contexts wired with hard cross-boundary coupling, ACL
  re-exposing raw ERP fields, or shared-kernel pair duplicated into divergent schemas.
- **Cite:** quote the mapping-notes sentence or schema/spec reference implementing the relationship.

---

## Results table (fill per run)

| Check | Skill | Pts | Verdict (PASS/PARTIAL/FAIL) | Score | Citation (path + quoted line) |
|---|---|---|---|---|---|
| R1 Bought-adapter: no tables/no CRUD | both | 3 | | | |
| R2 Catalog master-data: lookup + CRUD | both | 2 | | | |
| R3 Maintenance light shape | both | 2 | | | |
| R4 Events not tables | data | 2 | | | |
| R5 Cross-context id-only; 1 ctx/surface | both | 2 | | | |
| C1 Allocation overlap mechanism named | data | 3 | | | |
| C2 Pricing floor as validation/constraint | both | 2 | | | |
| C3 PriceQuoted versioned contract in API | api | 3 | | | |
| M1 Audit columns = infrastructure | data | 2 | | | |
| M2 No global owner; per-context ownership | data | 3 | | | |
| M3 Cross-cutting policy decided once | data | 2 | | | |
| N1 UL names flow → paths → tables | both | 2 | | | |
| N2 Context ids/slugs stable | both | 2 | | | |
| P1 api-designer full output contract | api | 2 | | | |
| P2 data-model full output contract | data | 2 | | | |
| P3 Relationships mapped to deps | both | 2 | | | |
| **Total** | | **36** | | | |

**Grade bands (guidance):** ≥32 excellent consumer fidelity · 26–31 solid, minor over-materialization
· 18–25 mixed (core invariants or right-sizing partly lost) · <18 the consumer re-derived/inflated the
model rather than consuming it.
