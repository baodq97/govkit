# Asset Sync API

Source: `docs/domain/asset-sync/` (DOMAIN-0009). Sub-domain type: **supporting** (anti-corruption
layer, no aggregate). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| `AssetRecord` (our clean asset shape: `tag`, `category`) | `GET /asset-records`, `GET /asset-records/{tag}` — **read-only** |
| `ErpRow` (raw, shifting ERP row) | **Not exposed.** Quarantined — "nothing past this context sees it." No schema for it exists in this API by design. |
| Inbound: Legacy ERP raw dump (SOAP, nightly) | Internal — the ERP's SOAP interface is not this API; this spec documents only the clean read-model this context produces |
| Outbound: clean asset master data (to Allocation / Maintenance / Catalog, sync) | `GET /asset-records` / `GET /asset-records/{tag}` — those contexts read from here |

This is the **read-only clean read-model** the ACL produces. "The ERP is the system of record for
assets; we hold a clean read-model" — no `POST`/`PUT`/`DELETE` here; this context does not
originate asset data, it translates it.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/asset-sync/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 404 | `ASSET_RECORD_NOT_FOUND` | Unknown `tag` |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 503 | `ERP_SYNC_STALE` | Nightly sync failed/hasn't run; data may be stale (advisory, not blocking) |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

## Flags (carried from the domain model, not resolved here)

- **No `Asset` aggregate invented.** The domain model explicitly declines one ("no invariants
  stated on our side") — this API stays a plain read-model, matching that.
- **Anti-corruption, not Conformist** — contrast Customer Accounts. `AssetRecord.tag`/`category`
  are OUR clean field names, never the ERP's raw `ASSET_NO` / inconsistent casing. If the ERP
  changes, only this context (and its internal sync job) should need touching, per the domain
  model's stated design intent — not the consumers of this API.
