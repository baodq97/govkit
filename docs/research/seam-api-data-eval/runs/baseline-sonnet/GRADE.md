# GRADE — baseline-sonnet (SEAM: api-designer + data-model consuming the domain contract)

Independent grade against `../../rubric.md`. Zero charity. Every verdict quotes the run's own
emitted artifact (path + line). Total **34.5 / 36**.

## Results table

| Check | Skill | Pts | Verdict | Score | Citation |
|---|---|---|---|---|---|
| R1 Bought-adapter: no tables/no CRUD | both | 3 | PARTIAL | 1.5 | data clean; api materializes `/payments`+`/notifications` resource surfaces |
| R2 Catalog master-data: lookup + CRUD | both | 2 | PASS | 2 | `CREATE TABLE category/depot/tag`; `/categories /depots /tags` CRUD |
| R3 Maintenance light shape | both | 2 | PASS | 2 | single `maintenance_record`, `next_due GENERATED`; `/maintenance-records` |
| R4 Events not tables | data | 2 | PASS | 2 | grep event-named tables → none |
| R5 Cross-context id-only; 1 ctx/surface | both | 2 | PASS | 2 | `asset_tag ... deliberately NOT a foreign key`; only self-FK is `category.parent_code` |
| C1 Allocation overlap mechanism named | data | 3 | PASS | 3 | `EXCLUDE USING gist (asset_tag WITH =, daterange(...) WITH &&)` |
| C2 Pricing floor as validation/constraint | both | 2 | PASS | 2 | openapi: `never returns below ... (listRate x (0.60 + 0.40 x utilization))` + `floor` field |
| C3 PriceQuoted versioned contract in API | api | 3 | PASS | 3 | `webhooks: priceQuoted` → `PriceQuotedEventV2`, `contractVersion: v2` |
| M1 Audit columns = infrastructure | data | 2 | PASS | 2 | INDEX "Technical audit ... on every table"; Audit/Activity-history declined |
| M2 No global owner; per-context ownership | data | 3 | PASS | 3 | `sales_rep_id`/`owner_user_id`/`depot_id` as projections; no global owner/users table |
| M3 Cross-cutting policy decided once | data | 2 | PASS | 2 | INDEX "Tenancy: single-tenant ... No tenant_id/org_id column is added anywhere" |
| N1 UL names flow → paths → tables | both | 2 | PASS | 2 | `Reservation→/reservations→reservation`; `SalesAccount→sales_account` |
| N2 Context ids/slugs stable | both | 2 | PASS | 2 | slugs mirror domain; data READMEs cite DOMAIN-0001..0013 |
| P1 api-designer full output contract | api | 2 | PASS | 2 | 13/13 folders have README.md + openapi.yaml + INDEX.md |
| P2 data-model full output contract | data | 2 | PASS | 2 | INDEX + 8 canonical READMEs w/ mermaid ERD + `-- Dialect: PostgreSQL 15+` |
| P3 Relationships mapped to deps | both | 2 | PASS | 2 | ACL `AssetRecord` clean read-model (ErpRow quarantined); Shared-Kernel + consume-contract |
| **Total** | | **36** | | **34.5** | |

## Category subtotals

| Category | Score | Max |
|---|---|---|
| R — Right-sizing & boundary respect | 9.5 | 11 |
| C — Core invariants → mechanisms | 8 | 8 |
| M — Metadata discipline | 7 | 7 |
| N — Naming / id continuity | 4 | 4 |
| P — Procedural output contract | 6 | 6 |
| **Total** | **34.5** | **36** |

Band: **≥32 = excellent consumer fidelity.** The consumer maps what the model right-sized,
mechanizes both core invariants, keeps metadata discipline, and emits both full output contracts.
Single deduction: over-materialized the API side of two bought-adapter contexts.

---

## Per-check evidence

### R1 — Bought-adapter: no tables / no CRUD · both · PARTIAL · 1.5/3
**data half = clean.** `docs/data/payments/schema.postgres.sql:5` "INTENTIONALLY EMPTY. model.yaml:
empty ubiquitous_language, empty aggregates, 'no domain model.'"; identity and notifications schemas
identical. `docs/data/INDEX.md`: "Payments/Identity/Notifications | **none** — bought commodity, no
domain model". No `payments`/`users`/`notifications` business table exists.
**api half over-reaches.** `docs/api/payments/openapi.yaml:35` `/payments: post ... operationId:
takePayment` plus `/payments/{paymentId}: get ... operationId: getPayment` returning a `Payment`
schema with `id` (readOnly) + `createdAt`; `docs/api/notifications/openapi.yaml` mirrors this with
`/notifications` POST + `/notifications/{notificationId}` GET → `Notification` resource. Two of the
three generic contexts get retrievable resource-item surfaces (create + read-by-id) carrying
identity, beyond the rubric's "at most an adapter callback/config" bar — though labeled
"Deliberately the thinnest possible surface" and no full CRUD (no collection list / PUT / DELETE)
and no persistence invented. Identity is correctly declined (`/me` resolution only, no `/users`
CRUD). Matches PARTIAL: "over-reaches slightly but is labeled infra" / materialized for two, not
zero. Not FAIL (no business tables, not full CRUD).

### R2 — Catalog master-data · both · PASS · 2/2
`docs/data/catalog/schema.postgres.sql:5,17,27` `CREATE TABLE category (...)`, `CREATE TABLE depot`,
`CREATE TABLE tag` — plain lookups with PKs/indexes, closing comment "No further invariants: 'no
rules to enforce'". No event/outbox table, no aggregate scaffolding. `docs/api/catalog/openapi.yaml`
exposes `/categories`, `/depots`, `/tags` with list/create/get/replace/delete — ordinary CRUD.

### R3 — Maintenance light shape · both · PASS · 2/2
`docs/data/maintenance/schema.postgres.sql:5` single `CREATE TABLE maintenance_record` with
`next_due date GENERATED ALWAYS AS (last_serviced + interval_days) STORED` and `out_of_service`
flag — no aggregate, no event table. `docs/api/maintenance/openapi.yaml:23` `/maintenance-records`
CRUD with an `outOfService` query filter (line 31) preserving the state Allocation reads.

### R4 — Events not tables · data · PASS · 2/2
`grep -riE "CREATE TABLE.*(event|outbox|allocated|quoted|placed|transfer)"` over
`docs/data/**/schema.postgres.sql` → **no matches**. `docs/data/INDEX.md` mapping row: "Domain event
(EquipmentAllocated, PriceQuoted, ...) | **Not a table** — no outbox/event-sourcing was requested;
events are messages, not state."

### R5 — Cross-context id-only; one context per surface · both · PASS · 2/2
`docs/data/rentals/schema.postgres.sql:8` "Cross-context reference to Customer Accounts'
sales_account.account_id — no FK"; `allocation` `asset_tag`/`depot_id` "deliberately NOT a foreign
key". Only `REFERENCES` in the whole tree is `category.parent_code REFERENCES category` — a
self-referential in-context FK. One folder per context slug in both `docs/api/` and `docs/data/`.

### C1 — Allocation no-double-commit named mechanism · data · PASS · 3/3
`docs/data/allocation/schema.postgres.sql:44` `CONSTRAINT reservation_no_double_commit EXCLUDE USING
gist (asset_tag WITH =, daterange(window_start, window_end, '[)') WITH &&) WHERE (status =
'committed')` with `CREATE EXTENSION IF NOT EXISTS btree_gist`. Actual DDL, tied to `asset_tag` +
window across all depots ("even from a different depot").

### C2 — Pricing floor as validation/constraint · both · PASS · 2/2
`docs/api/pricing/openapi.yaml` (POST /quotes description): "never returns below the
utilization-derived floor (listRate x (0.60 + 0.40 x utilization))" plus a computed read-only
`floor: Money` response field. Formula stated, enforcement asserted (clamp), carried into the schema
— the honest surface for a stateless engine. (Tension: README explicitly declines a 422 in favor of
"silent clamping"; the formula-bearing note + `floor` field clear the "flagged constraint-note that
states the floor formula and that it is enforced" PASS path.) `docs/data/pricing/schema.postgres.sql`
correctly emits no `quote` table; floor is not reduced to `MaxDiscountRate` (README flags that as a
"superseded duplicate").

### C3 — PriceQuoted versioned contract in API · api · PASS · 3/3
`docs/api/pricing/openapi.yaml` `webhooks: priceQuoted: post ... schema: PriceQuotedEventV2`;
`PriceQuotedEventV2` requires `[category, amount, utilization, contractVersion]` with
`contractVersion: { example: v2 }`. Version marker in both schema name (`...V2`) and payload field.
"Published Language / Open-Host Service — Rentals depends on Pricing.Contracts (this schema), never
Pricing internals" — dependency direction reflected.

### M1 — Audit columns = infrastructure · data · PASS · 2/2
`docs/data/INDEX.md` cross-cutting policy: "Technical audit: created_at ... and updated_at ... on
every table, default ON. created_by/updated_by ... added on every table whose rows a human actor
creates/edits". Recorded once, applied uniformly, clearly infra (no FK, Identity external).
Activity-history handled as the domain's declined "Audit / Activity-history" candidate ("no legal or
retention angle") — not modeled as an aggregate.

### M2 — No global owner; per-context ownership · data · PASS · 3/3
`grep "CREATE TABLE (owner|ownership|users|owners)"` → none. Three per-context projections:
`sales_account.sales_rep_id` ("Business ownership projection ... not audit metadata"),
`document.owner_user_id` ("uploader-owner projection ... not audit metadata"),
`reservation.depot_id` ("Custodian Depot: business-ownership projection ... not audit metadata").
INDEX: "three different ownership projections the domain explicitly says are **not** a single global
owner ... never unified."

### M3 — Cross-cutting policy decided once · data · PASS · 2/2
`docs/data/INDEX.md` "Cross-cutting policy (decided once here, applied uniformly below)": "Tenancy:
single-tenant ... No tenant_id/org_id column is added anywhere. **Flagged assumption**". Recorded in
one place; no fabricated per-table tenant column.

### N1 — UL names flow model.yaml → paths → tables · both · PASS · 2/2
`Reservation` → `/reservations` (`docs/api/allocation`) + `reservation` table; `RentalOrder` →
`/rental-orders` + `rental_order`; `SalesAccount` → `/sales-accounts` + `sales_account`;
`MaintenanceRecord` → `maintenance_record`; `Category`/`Depot`/`Tag` → `/categories` etc. Nouns
preserved verbatim.

### N2 — Context ids/slugs stable · both · PASS · 2/2
All 13 slugs mirror `docs/domain/` in both `docs/api/` and `docs/data/`; no renumber/re-slug. Data
READMEs cite the source id — `grep "DOMAIN-00NN"` returns DOMAIN-0001..DOMAIN-0013, e.g.
`docs/data/catalog/README.md` "Source: docs/domain/catalog/ (DOMAIN-0006)".

### P1 — api-designer full output contract · api · PASS · 2/2
`docs/api/INDEX.md` present; loop over `docs/api/*/` → all 13 folders report `OK` (both `README.md`
and `openapi.yaml` exist). `ls docs/api/*/openapi.yaml | wc -l` = 13.

### P2 — data-model full output contract (FORWARD) · data · PASS · 2/2
`docs/data/INDEX.md` present with the cross-cutting policy; 8 table-bearing contexts carry a
canonical README with a ` ```mermaid ` ERD fence (`grep -l` lists all 8); every
`schema.postgres.sql` opens `-- Dialect: PostgreSQL 15+`. The 5 no-table contexts are README-only
with a stated reason — legitimate light shape. README canonical, SQL a labeled projection.

### P3 — Relationships mapped to deps · both · PASS · 2/2
ACL: `docs/api/asset-sync/README.md:15` "read-only clean read-model the ACL produces ... ErpRow
Quarantined — not exposed"; `docs/data/asset-sync/schema.postgres.sql` "Our clean asset shape after
translation". Shared Kernel: `docs/api/logistics/README.md:11` "Consumes EquipmentAllocated (from
Allocation, Shared Kernel) ... not re-exposed here"; `delivery_run` references the shared `asset_tag`
without duplicating a divergent Reservation. Consume-contract: `docs/api/rentals/README.md:12`
"Consumes PriceQuoted (v2, Published Language, from Pricing) ... registers a subscriber". Conformist
vs ACL distinction drawn (`customer-accounts/README.md`).

---

## Worst 5 (only R1 lost points; remainder are the closest-scrutinized passes)

1. **R1** (PARTIAL, −1.5) — api side gives Payments + Notifications retrievable `/payments` /
   `/notifications` resource-item surfaces (create + read-by-id with identity), over the
   "adapter callback/config" bar; data side and Identity are clean.
2. **C2** (PASS, closest call) — floor carried via OpenAPI description + `floor` field, but the run
   explicitly declines a 422 in favor of "silent clamping"; passes on the constraint-note path only.
3. **R5** (PASS) — relies on documented no-FK id refs; a stray physical FK would have flipped it.
4. **P2** (PASS) — 5 of 13 contexts are README-only no-ops; legitimate but depends on the stated
   light-shape allowance.
5. **R3** (PASS) — `next_due` persisted as `GENERATED ... STORED`; acceptable as a derived value,
   would be PARTIAL if framed as an invented invariant.
