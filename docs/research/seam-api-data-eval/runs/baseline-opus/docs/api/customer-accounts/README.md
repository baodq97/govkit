# Customer Accounts API (DOMAIN-0008, supporting)

Hold the customer accounts imported nightly from the third-party CRM. **Conformist** — the CRM's
record shapes are taken exactly as they arrive (field names, segment codes, id format), with no
translation. No aggregate.

## Resource mapping

| Domain element | API surface |
|---|---|
| `SalesAccount {accountId, name, segment, salesRepId}` | `/accounts` + `/accounts/{accountId}` (read-only) |
| customer lookup (→ Rentals) | `GET /accounts/{accountId}` is the lookup Rentals consumes |

## Read-only by design

Writes come from the **nightly CRM sync**, not this API — this surface is a read model. There is no
`POST`/`PUT`/`DELETE`: mutating a conformed record here would diverge from the CRM system of record.
The sync job is internal (not an exposed endpoint).

- `segment` is the CRM's code **verbatim** — an opaque string, not re-mapped to our own enum
  (conformist). Documented as such in the schema.
- `salesRepId` is the commercial-owner projection (a real ownership relationship), not audit metadata.

## Business rules

None. Conformed data.

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 401 | `unauthorized` | missing/invalid JWT |
| 404 | `account-not-found` | unknown `accountId` |

Versioning: URI-versioned `/v1`. Because we conform to the CRM, the shape can shift when the CRM
shifts — flagged (QUESTIONS Q-A8): conformist reads inherit the upstream's instability.
