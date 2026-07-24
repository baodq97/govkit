# Catalog API (DOMAIN-0006, generic / reference)

The reference lists everyone labels units against: the equipment category tree, the depots, and the
tags. Pure lookups — no aggregates, no domain events, no rules to enforce (correct, complete output
for a master-data context).

## Resource mapping

| Domain element | API surface |
|---|---|
| `Category {code, parentCode?}` | `/categories` + `/categories/{code}` (self-referential tree) |
| `Depot {id, city}` | `/depots` + `/depots/{depotId}` |
| `Tag {label}` | `/tags` + `/tags/{tagId}` |

Three independent reference resources under one context surface (all consumed as lookups by other
contexts). `Category.parentCode` references another category **within the same context** (an
in-context link, fine to expose).

> **Coupling flag (from domain):** Rentals carries a `TODO` to share Catalog's `Equipment` entity
> directly — Shared Kernel coupling. Catalog does **not** expose an `Equipment` resource to satisfy
> that TODO; the shape is not shared as an entity. Recorded, not enacted (QUESTIONS Q-A4).

## Business rules

None. Reads are open to any authenticated caller; writes are admin-gated (`403` otherwise).

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 400 | `validation-error` | malformed body |
| 401 | `unauthorized` | missing/invalid JWT |
| 403 | `forbidden` | non-admin write |
| 404 | `not-found` | unknown code/id |
| 409 | `conflict` | duplicate code / deleting a category with children |

Versioning: URI-versioned `/v1`. These are stable lookups; changes are additive.
