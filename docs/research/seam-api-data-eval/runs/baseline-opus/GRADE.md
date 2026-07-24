# GRADE — runs/baseline-opus

Graded against `rubric.md` (16 checks / 36 pts). Independent grader, zero charity. Every verdict
quotes the run's emitted artifact (path + line) or an explicit absence grep.

## Results table

| Check | Skill | Pts | Verdict | Score | Citation (path + quoted line) |
|---|---|---|---|---|---|
| R1 Bought-adapter: no tables/no CRUD | both | 3 | PASS | 3 | grep `CREATE TABLE (payments\|users\|notifications)` over `docs/data/*/schema.postgres.sql` → **NONE**; no `docs/api/payments\|identity\|notifications` folder exists (only 10 folders, none of the three). `docs/api/INDEX.md:29` "Why three contexts emit no spec … Emitting an OpenAPI file for them would fabricate an API surface the domain explicitly declines"; `docs/data/INDEX.md:38` "Payments / Identity / Notifications … no persistence of ours (Stripe/Auth0/SendGrid are SoR)". |
| R2 Catalog master-data: lookup + CRUD | both | 2 | PASS | 2 | `docs/data/catalog/schema.postgres.sql:3` `CREATE TABLE category`, `:20` `CREATE TABLE depot`, `:32` `CREATE TABLE tag` — plain lookups, only in-context self-FK `category_parent_fk`, no event/version/aggregate ceremony. `docs/api/catalog/openapi.yaml` paths `/categories` (+`{code}`), `/depots`, `/tags` with GET/POST/PUT/DELETE. No `catalog_event` table (grep NONE). |
| R3 Maintenance light shape | both | 2 | PASS | 2 | `docs/data/maintenance/schema.postgres.sql:6` `CREATE TABLE maintenance_record` with `out_of_service boolean`, `next_due date GENERATED ALWAYS AS (last_serviced + interval_days) STORED`; single table, no event/aggregate. `docs/api/maintenance/openapi.yaml` `/maintenance-records` GET/POST + `/maintenance-records/{assetTag}` GET/PUT (out-of-service query surface). |
| R4 Events not tables | data | 2 | PASS | 2 | grep `CREATE TABLE (equipment_allocated\|price_quoted\|rental_order_placed\|*_event\|outbox)` over `docs/data/*/schema.postgres.sql` → **NONE**. Full table list is 11 domain tables only (reservation, quote, rental_order, delivery_run, maintenance_record, category, depot, tag, sales_account, asset_record, document). |
| R5 Cross-context id-only; 1 ctx/surface | both | 2 | PASS | 2 | grep `REFERENCES` over all schemas → only `catalog/schema.postgres.sql:15` `REFERENCES category (code)` (self-ref, "in-context FK only"). `docs/data/allocation/schema.postgres.sql:11` `asset_tag text NOT NULL, -- cross-context ref … no FK`, `:12` `depot_id … no FK`; `rentals` `customer_id`/`asset_tag` no FK. One folder per context (data 9 / api 10, no merges). |
| C1 Allocation overlap mechanism named | data | 3 | PASS | 3 | `docs/data/allocation/schema.postgres.sql:24` `CONSTRAINT reservation_no_overlap EXCLUDE USING gist (asset_tag WITH =, daterange(start_date, end_date, '[)') WITH &&) WHERE (status = 'active')` + `CREATE EXTENSION btree_gist`. README:27 restates it as "exactly the domain invariant". |
| C2 Pricing floor as validation/constraint | both | 2 | PASS | 2 | `docs/data/pricing/schema.postgres.sql:26` `CONSTRAINT quote_not_below_floor CHECK (amount_amount >= floor_amount)`; `docs/data/pricing/README.md:35` states formula `listRate × (0.60 + 0.40 × utilization)`. `docs/api/pricing/README.md:21` "honoured only down to `floor = listRate × (0.60 + 0.40 × utilization)`. At 100% utilization the floor equals" full rate; `:41` "engine clamps `amount` to `floor`". |
| C3 PriceQuoted versioned contract in API | api | 3 | PASS | 3 | `docs/api/pricing/openapi.yaml` `webhooks: priceQuoted:` "PriceQuoted — Published Language contract (v2) consumed by Rentals"; `PriceQuotedEvent` schema `required: [category, amount, utilization, contractVersion]`, `contractVersion enum: [v1, v2]`. |
| M1 Audit columns = infrastructure | data | 2 | PASS | 2 | `docs/data/INDEX.md:17` "`created_at`/`updated_at` … on **every** table … Standard infra columns, not domain language"; activity-history handled as append-only store — `INDEX.md:22` existing `audit_log` "Left as the cross-cutting append-only store … **not** re-designed as a context"; API `/orders/{orderId}/activity` "backed by the cross-cutting audit store — not part of the aggregate" (QUESTIONS Q-A6). |
| M2 No global owner; per-context ownership | data | 3 | PASS | 3 | grep `CREATE TABLE (owner\|ownership\|users)` → **NONE**. `sales_account.sales_rep_id text, -- commercial-owner projection`; `document.owner_user_id … -- uploader-owner projection`; `reservation.depot_id … -- custodian ownership projection`. `INDEX.md:21` "three **distinct** meanings of 'owner' the domain keeps apart — not one global owner." |
| M3 Cross-cutting policy decided once | data | 2 | PASS | 2 | `docs/data/INDEX.md:16` "**Tenancy** \| **Single-tenant** — no `tenant_id` on any table … No multi-org signal anywhere in the domain." grep `tenant_id\|org_id` across schemas → **NONE** (only the INDEX policy line mentions it). Policy table recorded once, applied uniformly. |
| N1 UL names flow → paths → tables | both | 2 | PASS | 2 | Tables verbatim: `reservation`, `rental_order`, `maintenance_record`, `sales_account`, `category`/`depot`/`tag`, `quote`, `delivery_run`, `asset_record`, `document`. Paths `/reservations`, `/quotes`, `/maintenance-records`, `/categories`. `RentalOrder` → `rental_order` + `rentalOrderPlaced` webhook (collection path shortened to `/orders`; noun preserved). |
| N2 Context ids/slugs stable | both | 2 | PASS | 2 | `docs/api/` and `docs/data/` slugs mirror `docs/domain/` exactly (allocation, pricing, rentals, logistics, maintenance, catalog, customer-accounts, asset-sync, documents; +billing on api). Data READMEs cite ids: `docs/data/allocation/README.md:1` "(DOMAIN-0001, core)", `.../pricing/README.md:1` "(DOMAIN-0002, core)", etc. |
| P1 api-designer full output contract | api | 2 | PASS | 2 | `docs/api/INDEX.md` present; `ls docs/api/*/openapi.yaml` resolves for all 10 folders (allocation, asset-sync, billing, catalog, customer-accounts, documents, logistics, maintenance, pricing, rentals), each paired with a `README.md`. |
| P2 data-model full output contract | data | 2 | PASS | 2 | `docs/data/INDEX.md` present with cross-cutting policy table; all 9 context READMEs contain a Mermaid `erDiagram` fence (grep hit on every file); every schema begins `-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)`. |
| P3 Relationships mapped to deps | both | 2 | PASS | 2 | `docs/api/INDEX.md:54` "Relationship-driven API dependencies": "Pricing → Rentals — Published Language / OHS", "Allocation ↔ Logistics — Shared Kernel … Logistics reuses the `EquipmentAllocated` / `Reservation` schema shapes", "Maintenance → Allocation — synchronous **query** (`IsOutOfService`) … not an event". Data INDEX:48 cross-context id-ref rule mirrors it. |
| **Total** | | **36** | | **36** | |

## Category subtotals

| Category | Checks | Score / Max |
|---|---|---|
| R — Right-sizing & boundary respect | R1–R5 | 11 / 11 |
| C — Core invariants → mechanisms | C1–C3 | 8 / 8 |
| M — Metadata discipline | M1–M3 | 7 / 7 |
| N — Naming / id continuity | N1–N2 | 4 / 4 |
| P — Procedural output contract | P1–P3 | 6 / 6 |
| **Total** | | **36 / 36** |

## Assessment

Excellent consumer fidelity (band ≥32). The run consumed the domain model without re-inflating a
single light context: the three bought-adapters and Billing get no tables/specs (with recorded
rationale), Catalog stays plain lookups, Maintenance is one light record, and no domain event became
a table. Both core invariants landed as real mechanisms — the no-double-commit exclusion constraint
is emitted as actual GiST DDL (not a TODO note), and the utilization floor is carried both as a
Postgres `CHECK` and as the stated formula on the API surface. `PriceQuoted` is a versioned
`webhooks:` contract with the UL payload fields. Metadata discipline is clean: no global owner/users
table, three per-context ownership projections explicitly kept apart, single-tenant recorded once,
no fabricated `tenant_id`. Full output contracts emitted on both sides.

Only cosmetic friction, none crossing a rubric threshold: the Rentals collection path is `/orders`
rather than `/rental-orders` (table `rental_order` and webhook `rentalOrderPlaced` preserve the full
noun, so N1's "noun is preserved" bar is met); Redocly advisory warnings on server examples were left
in (RUN-NOTES documents them as cosmetic).
