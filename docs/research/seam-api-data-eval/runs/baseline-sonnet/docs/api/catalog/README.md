# Catalog API

Source: `docs/domain/catalog/` (DOMAIN-0006). Sub-domain type: **generic** (master-data /
reference). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| `Category` (`code`, optional `parentCode`) | `GET/POST/PUT/DELETE /categories`, `/categories/{code}` |
| `Depot` (`id`, `city`) | `GET/POST/PUT/DELETE /depots`, `/depots/{id}` |
| `Tag` (free-form label) | `GET/POST/DELETE /tags`, `/tags/{id}` |

Aggregates, repositories, and domain events are **explicitly declined** in the domain model — an
empty model is the correct, complete output for a reference context, not a gap. The API mirrors
that: plain lookup CRUD, no invariants, no events, no `webhooks:` section.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/catalog/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `code`/`city`/`label` |
| 404 | `CATEGORY_NOT_FOUND` / `DEPOT_NOT_FOUND` / `TAG_NOT_FOUND` | Unknown id |
| 409 | `CATEGORY_ALREADY_EXISTS` etc. | Duplicate natural key (`code`) |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

## Flags (carried from the domain model, not resolved here)

- **Resolves the stale draft's open question** ("separate reference-data area, or per-module
  lists?") — Catalog is that reference-data context; this is recorded, not re-decided.
- **Rentals' `TODO` to share `Equipment` directly is NOT actioned here.** Catalog exposes only
  `Category`/`Depot`/`Tag` lookups; there is no `Equipment` resource in this API. Rentals keeps
  its own private equipment reference (see `docs/api/rentals/README.md`).
