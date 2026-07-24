# Identity API

Source: `docs/domain/identity/` (DOMAIN-0012). Sub-domain type: **generic**, cross-cutting login
(bought adapter, Auth0). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| "Log users in and resolve their identity" | `GET /me` (identity resolution) |
| Cross-cutting authentication | `bearerAuth` security scheme, reused by every other context's spec |

**No login/token-issuance endpoints are modelled here.** Login itself happens at Auth0 (the
bought provider) via its own hosted flow; this API only resolves the identity behind an
already-issued token — "the authentication side" of the domain model's note. Inventing a
`/login` or `/token` endpoint here would duplicate Auth0's own API, which is exactly the kind of
domain concept this design must not invent.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/identity/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired bearer token |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

No 403 here — resolving your own identity never fails on authorization, only authentication.

## Flags (carried from the domain model, not resolved here)

- **Authorization (who may touch what) is explicitly a separate, declined "Ownership/Permissions"
  context** (see context-map) — this API does not expose per-context ownership projections
  (`account:sales-rep-owner`, `document:uploader-owner`, `reservation:custodian-depot`); those
  live on their own resources in their own contexts (Customer Accounts, Documents, Allocation),
  exactly as the domain model prescribes. Identity's `GET /me` returns only who the caller is.
