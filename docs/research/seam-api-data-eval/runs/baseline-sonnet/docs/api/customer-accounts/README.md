# Customer Accounts API

Source: `docs/domain/customer-accounts/` (DOMAIN-0008). Sub-domain type: **supporting**
(Conformist CRUD, no aggregate). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| `SalesAccount` (`accountId`, `name`, `segment`) | `GET /sales-accounts`, `GET /sales-accounts/{accountId}` |
| `SalesRep` owner projection (`SalesRepId`) | Inline `salesRepId` field — an ownership projection (`account:sales-rep-owner`), not audit metadata |
| Inbound: `CrmAccountRow` nightly import (sync, external CRM) | **Not exposed as a public write endpoint** — see Flags |
| Outbound: customer lookup (query, to Rentals) | `GET /sales-accounts/{accountId}` |

**Conformist, not ACL:** field names, segment codes, and id format are taken from the CRM
**verbatim, with no translation** — this API's `SalesAccount` schema mirrors the CRM record shape
exactly, unlike Asset Sync's translated `AssetRecord`.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/customer-accounts/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 404 | `SALES_ACCOUNT_NOT_FOUND` | Unknown `accountId` |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

No 400/409 on writes: this API is **read-only** by design (see Flags) — there is no client-facing
create/update surface to validate.

## Flags (carried from the domain model, not resolved here)

- **Read-only API, by assumption — flagged, not stated in the domain model.** The domain model
  says `tactical_pattern: crud` and "CRUD over conformed records," but its only *stated* consumer
  is Rentals' "customer lookup (query)" — a read. The nightly `CrmAccountRow` import is the
  write path, and the domain model doesn't say whether that import runs through this public API
  or a separate batch/internal channel. This design exposes **GET only** and treats the import as
  an internal batch job outside the public contract; if the import should in fact go through this
  API, add a write endpoint — flagged, not silently added.
