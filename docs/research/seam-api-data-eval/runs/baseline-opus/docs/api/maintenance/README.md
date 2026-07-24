# Maintenance API (DOMAIN-0005, supporting)

Track when each unit was last serviced, when it is next due, and whether it is out of service.
No aggregate — a transaction script (CRUD + one `NextDue` calculation).

## Resource mapping

| Domain element | Kind | API surface |
|---|---|---|
| `MaintenanceRecord {assetTag, lastServiced, intervalDays, outOfService}` | record | `/maintenance-records` collection + `/maintenance-records/{assetTag}` item |
| `NextDue = lastServiced + intervalDays` | calculation | read-only `nextDue` field (server-computed) |
| `IsOutOfService(assetTag)` | inbound query (from Allocation) | `GET /maintenance-records/{assetTag}` — Allocation reads `outOfService` before committing |

`assetTag` is the natural identifier (one record per unit). The clean asset tags arrive from Asset
Sync (cross-context data sync), not created through this API.

## Business rules

Only the `NextDue` calculation. No invariants. `outOfService` is a plain flag Allocation queries.

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 400 | `validation-error` | malformed body |
| 401 | `unauthorized` | missing/invalid JWT |
| 404 | `maintenance-record-not-found` | no record for `assetTag` |

Versioning: URI-versioned `/v1`. The out-of-service read is the cross-context contract Allocation
depends on; keep `outOfService` stable.
