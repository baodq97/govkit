# Allocation API

Source: `docs/domain/allocation/` (DOMAIN-0001). Sub-domain type: **core**. Status: draft,
owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| Aggregate `Reservation` (root: Reservation) | `POST /reservations`, `GET /reservations`, `GET /reservations/{id}` |
| Value object `RentalWindow` (`start`, `end`) | Inline `window: { start, end }` fields on `Reservation` |
| Domain event `EquipmentAllocated` | Webhook `equipmentAllocated` — consumed by Logistics (Shared Kernel) |
| Domain event `DepotTransferRequested` | Webhook `depotTransferRequested` — **documented but UNCONSUMED**, see Flags |
| Query dependency: `Maintenance.IsOutOfService(assetTag)` | Called by this service server-side before committing; not itself an endpoint of this API |

Committing a unit **is** creating a `Reservation` — there is no separate "commit" action; the
`Commit` verb in the ubiquitous language maps onto `POST /reservations` (a creation-type event
rides its `POST`, per `references/openapi.md` § Webhooks).

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/allocation/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `window.end` not after `window.start`, or window shorter than 1 day |
| 404 | `RESERVATION_NOT_FOUND` | `GET /reservations/{id}` for a non-existent id |
| 409 | `DOUBLE_BOOKING` | The unit is already committed for an overlapping window (no-double-commit invariant) |
| 422 | `UNIT_OUT_OF_SERVICE` | The unit is currently out of service per Maintenance (`IsOutOfService`) |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

All error bodies are RFC 7807 `application/problem+json`.

## Flags (carried from the domain model, not resolved here)

- **Consistency-boundary caveat:** the no-overlap invariant is set-based over *all* live
  reservations for one asset. The domain model flags that the true consistency boundary may be a
  per-asset reservation book rather than a single `Reservation`. This API still exposes
  `Reservation` as the resource; if the boundary changes, the resource shape may need revisiting —
  flagged, not decided here.
- **`DepotTransferRequested` is an orphan event** — emitted by the aggregate per `model.yaml` but
  has no consumer today (manual depot planning). Modelled as a webhook here for completeness and
  future-proofing, not because a subscriber exists yet.
