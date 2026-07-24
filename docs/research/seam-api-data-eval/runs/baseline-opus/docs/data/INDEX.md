# Data Model Index — RentField

Persistence step of the swe-flow chain (`domain-decompose` → `data-model`, **FORWARD**). Consumes
the authoritative `docs/domain/` model and projects a **logical model (canonical)** per bounded
context, with a labelled **PostgreSQL DDL projection** generated from it.

> Mode note (QUESTIONS Q-D0): the fixture also ships an existing schema (`db/migrations/`) and C#
> code (`src/`). The request was to **design the data model from `docs/domain/`**, so this is
> FORWARD (design), not AUDIT. The existing `audit_log` migration is noted under cross-cutting
> concerns, not re-designed.

## Cross-cutting policy (decided once, applied uniformly)

| Concern | Decision | Rationale |
|---|---|---|
| **Tenancy** | **Single-tenant** — no `tenant_id` on any table | RentField runs one instance for **itself**; "customers" are business accounts (rows), not SaaS tenants of the platform. No multi-org signal anywhere in the domain. Flagged (Q-D2): if RentField ever becomes a multi-org SaaS, add row-level `org_id` + composite indexes + RLS uniformly. |
| **Technical audit** | `created_at` / `updated_at timestamptz NOT NULL DEFAULT now()` on **every** table (default ON) | Standard infra columns, not domain language. |
| **created_by / updated_by** | On tables with an **interactive human writer** (`reservation`, `rental_order`, `delivery_run`, `maintenance_record`, catalog tables, `document`). **Omitted** on sync-populated tables (`asset_record`, `sales_account`) — replaced by `synced_at` (the writer is a nightly job, no human actor). | Actor id only where an actor exists. |
| **deleted_at (soft delete)** | **Proposed, not added** — flagged per table (Q-D3). Candidates: `document`, `rental_order`. | Not every table needs it; domain states no retention rule. |
| **version (optimistic lock)** | **Proposed, not added** — flagged for `reservation` (concurrent commits) (Q-D4). | The no-overlap invariant is enforced by an exclusion constraint, not row versioning; optimistic lock is optional on top. |
| **Business ownership** | Modelled as id columns where the domain states real ownership: `reservation.depot_id` (custodian), `sales_account.sales_rep_id` (commercial owner), `document.owner_user_id` (uploader), `rental_order.customer_id`. | These are three **distinct** meanings of "owner" the domain keeps apart — not one global owner. |
| **Existing `audit_log`** | Left as the cross-cutting append-only store (one writer, a few queries); **not** re-designed as a context. | Domain declines Audit/Activity-history as a bounded context. |

## Context → schema map

| Domain context | Sub-domain | Tables (this repo) | Emitted schema |
|---|---|---|---|
| Allocation (DOMAIN-0001) | **core** | `reservation` | `allocation/` |
| Pricing (DOMAIN-0002) | **core** | `quote` *(provisional — stateless today)* | `pricing/` |
| Rentals (DOMAIN-0003) | supporting | `rental_order` | `rentals/` |
| Logistics (DOMAIN-0004) | supporting | `delivery_run` | `logistics/` |
| Maintenance (DOMAIN-0005) | supporting | `maintenance_record` | `maintenance/` |
| Catalog (DOMAIN-0006) | generic/reference | `category`, `depot`, `tag` | `catalog/` |
| Customer Accounts (DOMAIN-0008) | supporting | `sales_account` | `customer-accounts/` |
| Asset Sync (DOMAIN-0009) | supporting | `asset_record` | `asset-sync/` |
| Documents (DOMAIN-0010) | supporting | `document` | `documents/` |
| Billing (DOMAIN-0007) | supporting (other team) | — invoice model owned by Billing team | *none (out of scope)* |
| Payments / Identity / Notifications | **generic** | — no persistence of ours (Stripe/Auth0/SendGrid are SoR) | *none* |

### Why four contexts emit no schema

- **Billing** — the invoice model lives in the Billing team's service; we hold only the
  `IInvoicingPort` contract. Modelling it here would fabricate another team's schema (`docs/data`
  hard rule: don't model what isn't ours).
- **Payments / Identity / Notifications** — generic bought adapters; the third party is the system
  of record. No first-party tables. Inventing them would be fabrication.

## Cross-context reference rule (applied throughout)

**Aggregate = transaction boundary.** FKs and cascades stay *inside* an aggregate/context. Every
cross-context link is a **plain id column, no `REFERENCES`** (each context is a candidate separate
schema/service). Cross-context columns in this model: `reservation.asset_tag`,
`reservation.depot_id`, `rental_order.customer_id`, `rental_order.asset_tag`,
`delivery_run.asset_tag` (Shared Kernel — still id, no FK), `maintenance_record.asset_tag`,
`asset_record.category`, `document.owner_user_id`, `document.linked_entity_id`. The only in-schema
FK in the whole model is `category.parent_code → category.code` (Catalog's self-referential tree,
same context).

## Deliverables per context folder

`README.md` (canonical dialect-agnostic logical model: tables, columns, keys, constraints-as-intent,
Mermaid ERD, domain→schema mapping, flagged assumptions) + `schema.postgres.sql` (labelled Postgres
projection generated from the logical model).
