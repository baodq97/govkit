# Logistics API

Source: `docs/domain/logistics/` (DOMAIN-0004). Sub-domain type: **supporting** (transaction
script, no aggregate). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| No aggregate — `DeliveryRun` is a plain record | `POST /delivery-runs`, `GET /delivery-runs`, `GET /delivery-runs/{id}`, `PATCH /delivery-runs/{id}` |
| Consumes `EquipmentAllocated` (from Allocation, Shared Kernel) | Registered as a webhook subscriber against `docs/api/allocation/openapi.yaml#/webhooks/equipmentAllocated`; not re-exposed here |
| `Hand-off` (a depot handing a unit over) | Modelled as a status field transition (`PATCH .../status`), not an invented domain event — Logistics has none of its own |

No domain event of its own means no `webhooks:` section in this spec — `DeliveryRun` records are
built server-side from Allocation's `EquipmentAllocated`, not published onward.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/logistics/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `assetTag`, `depotId`, or `deliveryDate` |
| 404 | `DELIVERY_RUN_NOT_FOUND` | Unknown id |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

No 409/422: the domain model states no invariants for Logistics ("Nothing to keep atomically
consistent… no aggregate"). Plain CRUD-shaped errors only — not fabricating a business rule this
transaction script doesn't have.

## Flags (carried from the domain model, not resolved here)

- **Shared Kernel coupling (Allocation ↔ Logistics)** is real, highest-coupling-among-cooperating-
  patterns per the context map — acceptable because one squad (Fulfilment) owns both. This API
  does not attempt to hide that coupling; `assetTag`/`depotId` on `DeliveryRun` are the same
  identifiers Allocation uses, by design (Partnership), not an accidental leak.
