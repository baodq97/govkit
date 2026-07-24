# VERIFY — baseline-opus GRADE.md

Independent re-verification of `runs/baseline-opus/GRADE.md` against `rubric.md` and the raw
runner output in `runs/baseline-opus/docs/`. Every cited quote below was checked with `grep -n`
against the actual file; line numbers given are what the file actually contains.

**Note on sampling coverage:** the grade under review scored all 16 checks PASS (36/36) — there
are zero FAILs and zero PARTIALs in this run's GRADE.md, so the instruction to sample "every FAIL"
and "at least two PARTIALs" cannot be literally satisfied (the population doesn't contain any). A
perfect 36/36 is itself the highest-risk signal for grader leniency, so I instead sampled nearly
every one of the 16 PASS checks (R1–R3, R4, R5, C1–C3, M1–M3, N1–N2, P1–P3 — 15 of 16), re-running
the grep each citation claims and re-reading the surrounding context to check whether the verdict
should have been downgraded.

## Checks sampled and outcome

| Check | Verdict under review | My finding |
|---|---|---|
| R1 Bought-adapter no tables/CRUD | PASS | Confirmed. `docs/api/INDEX.md` has no payments/identity/notifications folder (10 folders total, none of the three); `docs/data/INDEX.md:38` quote is verbatim: `Payments / Identity / Notifications \| **generic** \| — no persistence of ours (Stripe/Auth0/SendGrid are SoR) \| *none*`. Grep for `CREATE TABLE (payments\|users\|notifications)` over all schemas returns nothing. PASS upheld. |
| R2 Catalog lookup + CRUD | PASS | Confirmed. `category`/`depot`/`tag` tables exist as plain lookups, no event/aggregate ceremony. Minor citation slip: GRADE cites `schema.postgres.sql:3` for `CREATE TABLE category`, actual line is 4 (off by one) — quote text itself is accurate, just the line pointer is wrong. Verdict unaffected. |
| R3 Maintenance light shape | PASS | Confirmed verbatim against `docs/data/maintenance/schema.postgres.sql` (single `maintenance_record` table, `next_due` as `GENERATED ALWAYS AS ... STORED`) and `docs/api/maintenance/openapi.yaml` (`/maintenance-records`, `/maintenance-records/{assetTag}`). |
| R4 Events not tables | PASS | Confirmed. Full `CREATE TABLE` grep across all 9 schema files returns exactly the 11 tables GRADE lists (reservation, quote, rental_order, delivery_run, maintenance_record, category, depot, tag, sales_account, asset_record, document) — no event-named table. |
| R5 Cross-context id-only | PASS | Confirmed. Only `REFERENCES` hit in any schema is Catalog's self-referential `category.parent_code → category.code`. `rental_order.customer_id`/`asset_tag` and `reservation.asset_tag`/`depot_id` all carry `-- cross-context ref … no FK` comments as quoted. Minor citation slip: GRADE cites allocation schema lines `:11`/`:12` for `asset_tag`/`depot_id`, actual lines are 10/11 (off by one, same direction as several other citations in this GRADE — a recurring but harmless line-pointer sloppiness). |
| C1 Allocation overlap mechanism | PASS | Confirmed verbatim: `CONSTRAINT reservation_no_overlap EXCLUDE USING gist (asset_tag WITH =, daterange(start_date, end_date, '[)') WITH &&) WHERE (status = 'active')` at `docs/data/allocation/schema.postgres.sql:25-29`, plus `CREATE EXTENSION IF NOT EXISTS btree_gist` at line 4. The exclusion groups on `asset_tag` only (not `depot_id`), which correctly enforces "not even from a different depot." Verdict upheld, mechanism is real and correct. |
| C2 Pricing floor validation | PASS | Confirmed. `CONSTRAINT quote_not_below_floor CHECK (amount_amount >= floor_amount)` exists (actual line 25, GRADE cites 26 — off by one, text accurate). API side has a `422` on `/quotes` plus the formula stated in both `docs/data/pricing/README.md:35` and `docs/api/pricing/README.md:21,41`, all quotes verified verbatim. |
| C3 PriceQuoted versioned contract | PASS | Confirmed verbatim against `docs/api/pricing/openapi.yaml`: `webhooks: priceQuoted:` (line 98-99), summary text matches exactly, `PriceQuotedEvent` schema `required: [category, amount, utilization, contractVersion]` (line 168), `contractVersion: { type: string, enum: [v1, v2] }` (line 173). Strong, well-earned PASS. |
| M1 Audit columns as infra | PASS | Confirmed. `docs/data/INDEX.md:17-22` quotes verbatim. `/orders/{orderId}/activity` exists in `docs/api/rentals/openapi.yaml:103`; the "backed by the cross-cutting audit store" phrase is correctly sourced to `QUESTIONS.md` line 16 (Q-A6), not the OpenAPI file itself — GRADE attributes it correctly. |
| M2 No global owner table | PASS | Confirmed verbatim: `sales_rep_id text, -- commercial-owner projection`, `owner_user_id text NOT NULL, -- uploader-owner projection`, `depot_id text NOT NULL, -- cross-context ref (Catalog.depot) — custodian ownership projection`. No `owner`/`ownership`/`users` table anywhere. |
| M3 Cross-cutting policy once | PASS | Confirmed. `docs/data/INDEX.md:16` tenancy row quoted verbatim; grep for `tenant_id\|org_id` across every schema file returns nothing. |
| **N1 UL names flow → paths → tables** | **PASS** | **Disagree — should be PARTIAL, not PASS.** GRADE's own citation flags "collection path shortened to `/orders`" but waves it off as cosmetic. Re-checking every emitted API path (`grep -n '^\s*/[a-z]' docs/api/*/openapi.yaml`) shows **two** contexts where the path drops the domain qualifier to a bare CRUD-generic noun: `RentalOrder` → `/orders` (not `/rental-orders`) and `SalesAccount` → `/accounts` (not `/sales-accounts`). Every other context preserves the full noun (`/reservations`, `/assets`, `/invoices`, `/categories`+`/depots`+`/tags`, `/documents`, `/delivery-runs`, `/maintenance-records`, `/quotes`). The rubric's own PARTIAL bar for N1 reads: *"most names carried but 1–2 renamed into technical/CRUD-generic names (e.g. Reservation → bookings, SalesAccount → customers)"* — the rubric literally uses `SalesAccount` as its worked PARTIAL example, and the run reproduces exactly that pattern (`SalesAccount` → `/accounts`) plus one more (`RentalOrder` → `/orders`). Table/schema names (`rental_order`, `SalesAccount`) are preserved, but the rubric's PASS bar explicitly requires the *path* to carry the noun too (`RentalOrder → /rental-orders + rental_order table`). This is 2 renamed paths out of ~10 contexts — squarely inside the rubric's stated PARTIAL range, not a "cosmetic" footnote. **Recommend downgrading N1 both-skill score from 2/2 to 1/2.** |
| N2 Context ids/slugs stable | PASS | Confirmed. All 9 `docs/data/*/README.md` cite their `DOMAIN-00NN` id (verified via `grep -L` finding zero misses); `docs/api/`/`docs/data/` slugs mirror `docs/domain/` with no re-slugging. |
| P1 api-designer full contract | PASS | Confirmed via `ls docs/api/*/openapi.yaml` and `ls docs/api/*/README.md` — 10/10 pairs present. |
| P2 data-model full contract | PASS | Confirmed: `docs/data/INDEX.md` present with cross-cutting policy table; `grep -rl erDiagram docs/data/*/README.md` hits all 9 READMEs; `grep -c '^-- Dialect: PostgreSQL'` hits all 9 schema files exactly once each. |
| P3 Relationships mapped | PASS | Confirmed. Shared-kernel `EquipmentAllocatedEvent` schema in `docs/api/allocation/openapi.yaml` and `docs/api/logistics/openapi.yaml` is byte-identical (not a divergent duplicate) — correctly satisfies the "shared-kernel reuses shared components" bar. Asset Sync ACL language (`docs/api/asset-sync/README.md`) confirmed to keep raw `ErpRow` quarantined. `docs/api/INDEX.md:54-67` relationship table quotes verified verbatim. |

## Fabrication check

No fabricated quotes found. Every quoted string in the 15 checks sampled exists verbatim (or with
only line-number drift, never content drift) in the runner's emitted files. The GRADE.md does have
a recurring citation-precision defect — several line numbers are off by one from the actual file
(`catalog/schema.postgres.sql:3` vs actual 4; `allocation/schema.postgres.sql:11/:12` vs actual
10/11; `pricing/schema.postgres.sql:26` vs actual 25) — but in every instance the quoted text
itself is accurate and locatable, so this is a documentation-hygiene issue, not evidence
fabrication, and doesn't change any verdict except where noted below.

## Disagreements

1. **N1 (UL names flow → paths → tables), both skills, 2 pts.** GRADE scored PASS/2. I score
   PARTIAL/1. Two of ~10 API paths drop the domain qualifier to a bare technical noun
   (`RentalOrder` → `/orders`, `SalesAccount` → `/accounts`) — this is exactly the pattern and
   exactly the count (1–2 instances) the rubric's own PARTIAL bar names, using `SalesAccount` as
   its literal worked example. GRADE's own citation notices the `/orders` case but classifies it
   as "cosmetic friction... noun preserved" via the table name, which is not the rubric's test
   (the rubric explicitly requires the *path* to carry the noun, separately from the table).

No other check's verdict is disputed. R1–R5, C1–C3, M1–M3, N2, P1–P3 all hold up against the raw
runner output; citations are (mostly) accurate and the underlying artifacts genuinely earn PASS.

## Adjusted total

36 → **35/36** if N1 is downgraded to PARTIAL (both category subtotal N: 4/4 → 3/4).

This does not change the grade band (still "≥32 excellent consumer fidelity"), but it does mean
the GRADE.md's headline 36/36 — a perfect score — is not fully defensible; one check was graded
past what its own rubric text allows.
