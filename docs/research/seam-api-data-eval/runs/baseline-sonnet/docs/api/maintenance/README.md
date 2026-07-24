# Maintenance API

Source: `docs/domain/maintenance/` (DOMAIN-0005). Sub-domain type: **supporting** (transaction
script — CRUD + one calculation). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| No aggregate — `MaintenanceRecord` is a plain record | `POST /maintenance-records`, `GET /maintenance-records`, `GET /maintenance-records/{assetTag}`, `PATCH /maintenance-records/{assetTag}` |
| `NextDue` calculation (`LastServiced + IntervalDays`) | Read-only computed field on the record, not a separate endpoint |
| `Out of service` (read by Allocation) | Field `outOfService` on `GET`, satisfying Allocation's `IsOutOfService(assetTag)` query as a plain field read, not an RPC-style query endpoint |
| Inbound: Asset Sync clean asset tags (sync) | Consumed server-side from `docs/api/asset-sync/openapi.yaml`; not re-exposed here |

Allocation's `IsOutOfService(assetTag)` query is satisfied by `GET /maintenance-records/{assetTag}`
returning `outOfService: boolean` — no separate verb-shaped endpoint invented for what is, in
REST terms, a plain resource read.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/maintenance/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `assetTag`, invalid `lastServiced`/`intervalDays` |
| 404 | `MAINTENANCE_RECORD_NOT_FOUND` | Unknown `assetTag` |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

No 409/422: "Nothing to keep atomically consistent beyond a single record" per the domain model —
no cross-record invariant to enforce.

## Flags (carried from the domain model, not resolved here)

- **Reconciliation note preserved:** the stale draft folded Maintenance inside Allocation as
  "just another unit status." The shipped code — and this API — treat it as its own context that
  Allocation only queries. Not re-litigated here.
