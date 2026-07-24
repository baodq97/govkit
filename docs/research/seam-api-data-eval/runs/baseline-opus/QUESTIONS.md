# QUESTIONS — RentField API + data-model design

Both skills reach points where they would ask the user a targeted question. Per the run
instructions I did **not** stop; each question is recorded here with the assumption I proceeded on.
Every assumption is also flagged inline in the relevant deliverable.

## api-designer

| Id | Question the skill would ask | Assumption I proceeded on | Where |
|---|---|---|---|
| Q-A1 | The hard rule says *every* bounded context gets an emitted `openapi.yaml`, but three contexts (Payments, Identity, Notifications) are generic bought adapters with no first-party API. Emit an (empty) spec, or omit? | **Omit** specs for the 3 generic bought adapters — they expose no resource of ours; a spec would fabricate an API surface the domain declines. Documented explicitly in `docs/api/INDEX.md`; Identity is surfaced as the shared `bearerAuth` scheme. | api/INDEX.md |
| Q-A2 | `DepotTransferRequested` is emitted but has **no consumer** — wire a transfer handler, or accept manual depot planning? | Keep it as a **documented orphan webhook**; no handler invented (the input never describes an automated transfer flow). | api/allocation |
| Q-A3 | Pricing is stateless today (no persisted `Quote`). Should `POST /quotes` be `201 + Location` with a retrievable quote, or `200` with a transient computation? | Model the **target** (`201` + provisional `GET /quotes/{quoteId}`), clearly flagged; note the `200`/no-persistence fallback if the entity decision does not land. | api/pricing |
| Q-A4 | Rentals' `TODO` proposes sharing Catalog's `Equipment` entity directly (Shared Kernel). Action it? | **No.** Reference the unit by `assetTag` id; do not expose/share an `Equipment` entity. | api/rentals, api/catalog |
| Q-A5 | Should placing an order require a committed reservation + a valid quote? | **Not asserted** — the domain states no such invariant; do not invent it. | api/rentals |
| Q-A6 | Sales want an order **activity history** timeline. Add an endpoint? | Sketched as **optional/future** `GET /orders/{orderId}/activity`, backed by the cross-cutting audit store — not part of the aggregate, not required. | api/rentals |
| Q-A7 | `DeliveryRun` lifecycle values are unstated. | Assume `{planned, handed_off, delivered}`, flagged. | api/logistics |
| Q-A8 | Customer Accounts is conformist; the read shape can shift when the CRM shifts. | Model **read-only**, verbatim fields; flag the conformist fragility. | api/customer-accounts |
| Q-A9 | Document upload max size / `413` threshold? | Include a `413` path; leave the limit unspecified (flagged). | api/documents |
| Q-A10 | Billing's invoice field set + lifecycle (owned by another team). | Model only the thin Customer-Supplier contract (`orderId/customerId/amount` + a flagged `status`); fields are team-agreed, not invented. | api/billing |
| — (decision) | Pagination strategy? | **Offset-based, uniform** on every collection (default 20, max 100) for simplicity + totals; cursor noted where a set can grow unbounded (`/reservations`). | api/INDEX.md |
| — (decision) | Auth mechanism? | `bearerAuth` = Auth0 JWT (Identity context), global on every spec. | api/INDEX.md |

## data-model

| Id | Question the skill would ask | Assumption I proceeded on | Where |
|---|---|---|---|
| Q-D0 | An existing schema (`db/migrations/`, `src/`) **and** a "design from the domain" request are both present — FORWARD or AUDIT? | **FORWARD** — the request is explicitly "design the data model based on `docs/domain`". The existing `audit_log` is noted, not re-designed. | data/INDEX.md |
| Q-D2 | Tenancy model? | **Single-tenant** — RentField runs one instance for itself; "customers" are business rows, not SaaS tenants. No `tenant_id`. Flag to revisit if it becomes multi-org SaaS. | data/INDEX.md |
| Q-D-audit | Audit columns on/off? | `created_at`/`updated_at` **ON** for every table (default). `created_by`/`updated_by` where a human actor writes; `synced_at` instead on sync-populated tables. | data/INDEX.md |
| Q-D3 | Soft delete (`deleted_at`)? | **Proposed, not added** — flagged candidates: `document`, `rental_order`. | data/INDEX.md, data/documents, data/rentals |
| Q-D4 | Optimistic-lock `version` on `reservation`? | **Proposed, not added** — the exclusion constraint already guards the core invariant. | data/allocation |
| Q-D1 | Allocation consistency boundary — single `Reservation` or a per-asset reservation book? | Left open, but the **range-exclusion constraint** enforces no-overlap across all live reservations per `asset_tag` at the table level, so correctness does not depend on the choice. | data/allocation |
| Q-D5 | `reservation.status` value set? | Assume `{active, released}`, flagged. | data/allocation |
| Q-D6 | Persist `Quote` at all (stateless today)? | Emit a **PROVISIONAL** `quote` table, heavily flagged; if the answer is "no", Pricing has zero tables. | data/pricing |
| Q-D7 | Rentals placement invariant? | **None** asserted (domain states none). | data/rentals |
| Q-D8 | `delivery_run.status` value set? | Assume `{planned, handed_off, delivered}`, flagged. | data/logistics |
| Q-D9 | Maintenance: one open record per unit, or a full service-event history? | Assume **one record per unit** (`asset_tag` UNIQUE); flag the history alternative. | data/maintenance |
| Q-D10 | Depots referenced by natural `depot_code` or surrogate `id`? | Keep the natural `depot_code` (`DEPOT-LEEDS`) as the referenced key (surrogate `id` is the PK); flag. | data/catalog |
| Q-D11 | Customer Accounts conformist fragility (no ACL). | Model verbatim, no `segment` enum; document the fragility. | data/customer-accounts |
| Q-D12 | Richer asset attributes on `asset_record`? | Keep the clean `{tag, category}` shape; extend via the ACL, never by leaking ERP fields. | data/asset-sync |
| Q-D13 | `document.linked_entity_type` discriminator (rental vs account)? | Added **nullable** to disambiguate the polymorphic link; domain states no discriminator — confirm whether `NOT NULL`. | data/documents |
| Q-D14 | Where do document bytes live? | Assume an external blob store (`storage_key` pointer), not the DB; flagged. | data/documents |

## Contexts deliberately emitting no artifact (not omissions)

- **API:** Payments, Identity, Notifications — generic bought adapters, no first-party API (Q-A1).
- **Data:** Billing (invoice model owned by the Billing team), Payments/Identity/Notifications
  (third party is the system of record). Modelling any of these would fabricate another
  system's schema.
