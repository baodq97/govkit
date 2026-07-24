# Asset Sync API (DOMAIN-0009, supporting)

Pull the fleet's asset records from the legacy ERP each night and expose them as our own **clean**
asset shapes. This is an **anti-corruption layer**: nothing past this context sees a raw ERP field.
No aggregate — the ERP is the system of record; we hold a clean read model.

## Resource mapping

| Domain element | API surface |
|---|---|
| `AssetRecord {tag, category}` | `/assets` + `/assets/{tag}` (read-only clean master) |
| clean asset master (→ Allocation / Maintenance / Catalog) | `GET /assets` is the lookup those contexts consume |
| `ErpRow` (raw, shifting) | **never exposed** — quarantined behind the ACL |
| nightly SOAP pull | internal job — **not** an endpoint |

## Read-only ACL boundary

Only translated `AssetRecord` shapes (`tag`, `category`) are exposed — the ERP's inconsistent raw
fields (`ASSET_NO` vs `assetNo`, nulls, reordered columns) stay inside the sync. There is **no write
API**: assets originate in the ERP, and only the nightly sync mutates this read model. If the ERP
changes, only this context changes (that is the whole point of the ACL, versus the Conformist
Customer-Accounts context).

## Business rules

None — translation only.

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 401 | `unauthorized` | missing/invalid JWT |
| 404 | `asset-not-found` | unknown `tag` |

Versioning: URI-versioned `/v1`. The clean `AssetRecord` contract is deliberately insulated from ERP
drift; changing it is our decision, not the ERP's.
