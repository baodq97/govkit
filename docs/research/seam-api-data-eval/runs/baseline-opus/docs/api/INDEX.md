# API Design Index — RentField

API-design step of the swe-flow chain (`domain-decompose` → **`api-designer`**). Consumes the
authoritative domain model in `docs/domain/` (13 bounded contexts, context map, sharing levels).
One spec per bounded context; ubiquitous-language names reused verbatim; no context collapsed into
another and no aggregate fanned across contexts.

> Status: draft, owner TBD. Derived from `docs/domain/` (all rows `status: draft`). Advancing
> status/owner is a human act.

## Context → API surface map

| Domain context | Sub-domain | API surface (this repo) | Emitted spec |
|---|---|---|---|
| Allocation (DOMAIN-0001) | **core** | `/reservations` + `equipmentAllocated`/`depotTransferRequested` webhooks | `allocation/openapi.yaml` |
| Pricing (DOMAIN-0002) | **core** | `/quotes` + `priceQuoted` webhook (Published Language, v2) | `pricing/openapi.yaml` |
| Rentals (DOMAIN-0003) | supporting | `/orders` + `rentalOrderPlaced` webhook | `rentals/openapi.yaml` |
| Logistics (DOMAIN-0004) | supporting | `/delivery-runs` (subscribes to `equipmentAllocated`) | `logistics/openapi.yaml` |
| Maintenance (DOMAIN-0005) | supporting | `/maintenance-records` (out-of-service query surface) | `maintenance/openapi.yaml` |
| Catalog (DOMAIN-0006) | generic/reference | `/categories`, `/depots`, `/tags` | `catalog/openapi.yaml` |
| Customer Accounts (DOMAIN-0008) | supporting | `/accounts` (read-only, CRM-conformed) | `customer-accounts/openapi.yaml` |
| Asset Sync (DOMAIN-0009) | supporting | `/assets` (read-only clean asset master, ACL) | `asset-sync/openapi.yaml` |
| Documents (DOMAIN-0010) | supporting | `/documents` (+ `/content`) | `documents/openapi.yaml` |
| Billing (DOMAIN-0007) | supporting (other team) | `/invoices` — the Customer-Supplier contract Rentals drives | `billing/openapi.yaml` |
| Payments (DOMAIN-0011) | **generic** | — no first-party API — outbound Stripe adapter | *none (see below)* |
| Identity (DOMAIN-0012) | **generic** | — no first-party API — outbound Auth0 adapter (secures all specs) | *none (see below)* |
| Notifications (DOMAIN-0013) | **generic** | — no first-party API — outbound SendGrid adapter | *none (see below)* |

### Why three contexts emit no spec

Payments, Identity, and Notifications are **generic, bought bounded contexts** — thin outbound
adapters over Stripe / Auth0 / SendGrid, with **no domain model and no inbound resource of our
own** (per `context-map.md`: "Bought adapter, no model"). `api-designer` maps *our* resources onto
API surfaces; these contexts expose none. Emitting an OpenAPI file for them would fabricate an API
surface the domain explicitly declines — the cargo-cult failure the decomposition avoids. Instead:
- **Identity** is documented once as the `bearerAuth` (Auth0 JWT) security scheme applied across
  every emitted spec.
- **Payments** and **Notifications** are downstream integrations (implied by the narrative, *not
  wired* in the reviewed code) — recorded here, not modeled as endpoints.

This tension between the skill's "every context gets a spec" hard rule and its "never invent domain
concepts" rule is recorded in `QUESTIONS.md` (Q-A1).

## Cross-cutting API conventions (decided once, applied to every spec)

| Concern | Decision |
|---|---|
| **Versioning** | URI versioning, base path `/v1` on every surface. The `PriceQuoted` *event payload* carries its own Published-Language contract version (`contractVersion`, currently `v2`; `v1` deprecated) — versioned independently of the HTTP surface, per the domain's OHS pattern. See `pricing/README.md`. |
| **Pagination** | Uniform **offset-based** on every collection (`?offset`&`?limit`, default 20, max 100), with a shared `Pagination` object (`offset,limit,total,has_more`). Chosen for simplicity + total counts over these modest, mostly-reference datasets; cursor pagination noted where a set could grow unbounded (`/reservations`). |
| **Errors** | RFC 7807 `application/problem+json` everywhere. Shared `Problem` schema; per-context error catalog in each README. |
| **Auth** | `bearerAuth` (Auth0 JWT) global on every spec except public health. Authorization (owner/rep/depot/admin) enforced per resource → `403` with a `problem+json`. |
| **Idempotency** | `Idempotency-Key` header on the two money/commitment-critical creates: `POST /reservations` (Commit) and `POST /invoices` (RaiseInvoice). |

## Relationship-driven API dependencies (from `model.yaml` `relationships`)

- **Pricing → Rentals** — Published Language / OHS: Rentals subscribes to the `priceQuoted` webhook
  and depends on the versioned contract only, never Pricing internals (load-bearing extraction seam).
- **Allocation ↔ Logistics** — Shared Kernel (one Fulfilment squad): Logistics reuses the
  `EquipmentAllocated` / `Reservation` schema shapes; both specs carry the same event schema by
  agreement (mutual-consent change).
- **Rentals → Billing** — Customer-Supplier: Rentals (customer) calls Billing's `/invoices` API;
  Billing (supplier) accommodates fields Rentals asks for.
- **Maintenance → Allocation** — synchronous **query** (`IsOutOfService`), surfaced as
  `GET /maintenance-records/{assetTag}` (Allocation reads before committing); not an event.
- **Customer Accounts → Rentals** — customer **lookup** (`GET /accounts/{accountId}`).
- **Asset Sync → Allocation/Maintenance/Catalog** — clean asset master via `GET /assets`; the
  nightly SOAP pull is an internal ACL job, not an exposed endpoint.

## Deliverables per context folder

Each `<context>/` contains `README.md` (resource model, aggregate→resource / event→endpoint
mapping, error catalog, versioning/deprecation) and `openapi.yaml` (OpenAPI 3.1, self-contained).
