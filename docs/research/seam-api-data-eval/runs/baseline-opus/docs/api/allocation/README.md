# Allocation API (DOMAIN-0001, core)

Commit the right physical unit to the right window without ever promising the same unit twice.
The **Reservation aggregate is the consistency boundary**; every transactional write stays inside it.

## Aggregate → resource / event → endpoint mapping

| Domain element | Kind | API surface |
|---|---|---|
| `Reservation` (aggregate root) | entity | `/reservations` collection + `/reservations/{reservationId}` item |
| `RentalWindow {start,end}` | value object | embedded `window` object on the Reservation schema (no own endpoint) |
| `Commit` | command | `POST /reservations` — creating the resource *is* the commit (no verb in URI) |
| release / cancel | state change | `DELETE /reservations/{reservationId}` — releases the held unit (idempotent) |
| `EquipmentAllocated` | domain event | `webhooks.equipmentAllocated` (→ Logistics, Shared Kernel) |
| `DepotTransferRequested` | domain event | `webhooks.depotTransferRequested` — **currently unconsumed** (orphan; see below) |
| out-of-service | cross-context query | *inbound* dependency on `Maintenance GET /maintenance-records/{assetTag}`; not an endpoint here |

## Resource model

`Reservation`: `id`, `assetTag`, `depotId` (custodian depot — ownership projection), `window {start,end}`,
`status`. Commit is rejected (never silently) when it would double-book, when the unit is out of
service, or when the window is under one day.

## Invariants → API behaviour

| Invariant (domain) | Enforced as |
|---|---|
| Same unit never committed twice for overlapping windows (even across depots) | `409 Conflict` `reservation-overlap` on `POST /reservations` |
| A unit that is out of service cannot be committed | `422 Unprocessable Entity` `unit-out-of-service` (Allocation queries Maintenance first) |
| Window must be ≥ 1 day (`end` after `start`) | `422` `invalid-window` (also `400` schema validation) |

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 400 | `validation-error` | malformed body / missing field |
| 401 | `unauthorized` | missing/invalid Auth0 JWT |
| 403 | `forbidden` | caller may not commit at this depot |
| 404 | `reservation-not-found` | unknown `reservationId` |
| 409 | `reservation-overlap` | overlapping commit for the same `assetTag` |
| 422 | `unit-out-of-service` / `invalid-window` | semantic rule breach |
| 429 | `rate-limit-exceeded` | throttled |

## Consistency-boundary note (flagged — QUESTIONS Q-D1)

The no-overlap invariant is **set-based over all live reservations for one asset**, so the true
consistency boundary may be a *per-asset reservation book* rather than a single `Reservation`. The
API is unaffected (the collection is per-asset filterable); the persistence side enforces it with an
exclusion constraint (see `docs/data/allocation`). Flagged, not silently decided.

## Versioning / deprecation

URI-versioned `/v1`. `equipmentAllocated` is a Shared-Kernel event whose schema changes by
mutual consent with Logistics (same squad). `depotTransferRequested` is emitted but **has no
subscriber** — kept in the contract as a documented orphan; wiring a handler (or accepting manual
depot planning) is a human decision (`QUESTIONS` Q-A2), not invented here.
