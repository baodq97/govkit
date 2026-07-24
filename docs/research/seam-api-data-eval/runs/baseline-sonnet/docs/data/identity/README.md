# Identity — Logical Data Model

Source: `docs/domain/identity/` (DOMAIN-0012). Sub-domain type: **generic**, cross-cutting login
(bought adapter, Auth0). Status: draft, owner: TBD.

## No schema — by domain-model statement, not an oversight

`model.yaml` has an **empty `ubiquitous_language`** and an **empty `aggregates`** list: "Login /
user identity via Auth0 — commodity behind a thin adapter… no domain model." Auth0 is the system
of record for user identity; RentField's own database holds no local `user` table.

This is why every other context's `created_by`/`updated_by` audit column (see
`docs/data/INDEX.md`) is typed as an unconstrained `text` Auth0-subject-id with **no FK** — there
is no local `identity`/`user` table anywhere in this data model for those columns to reference.

## What would change this

If RentField ever needs to cache Auth0 profile data locally (e.g. for offline lookups or
per-user preferences), that would be a new, explicitly-scoped `identity_profile` read-model table
— not fabricated here from a domain model that states none of it.
