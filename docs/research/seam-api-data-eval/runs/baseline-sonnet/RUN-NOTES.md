# Run Notes — api-designer → data-model over RentField's `docs/domain/`

Blinding constraints observed: read only the two named skill dirs, the fixture dir, and files
this run itself wrote. Never read `rubric.md`, `README.md`, `runs/`, other `docs/research/` dirs,
or `self-learning`.

## Files read, in order

1. `plugins/swe-flow/skills/api-designer/SKILL.md`
2. `plugins/swe-flow/skills/data-model/SKILL.md`
3. `fixture-input/docs/domain/INDEX.md`
4. `fixture-input/docs/domain/context-map.md`
5. `fixture-input/docs/domain/allocation/README.md`
6. `fixture-input/docs/domain/allocation/model.yaml`
7. `fixture-input/docs/domain/pricing/README.md`
8. `fixture-input/docs/domain/pricing/model.yaml`
9. `fixture-input/docs/domain/rentals/README.md`
10. `fixture-input/docs/domain/rentals/model.yaml`
11. `fixture-input/docs/domain/logistics/README.md`
12. `fixture-input/docs/domain/logistics/model.yaml`
13. `fixture-input/docs/domain/maintenance/README.md`
14. `fixture-input/docs/domain/maintenance/model.yaml`
15. `fixture-input/docs/domain/catalog/README.md`
16. `fixture-input/docs/domain/catalog/model.yaml`
17. `fixture-input/docs/domain/billing/README.md`
18. `fixture-input/docs/domain/billing/model.yaml`
19. `fixture-input/docs/domain/customer-accounts/README.md`
20. `fixture-input/docs/domain/customer-accounts/model.yaml`
21. `fixture-input/docs/domain/asset-sync/README.md`
22. `fixture-input/docs/domain/asset-sync/model.yaml`
23. `fixture-input/docs/domain/documents/README.md`
24. `fixture-input/docs/domain/documents/model.yaml`
25. `fixture-input/docs/domain/identity/README.md`
26. `fixture-input/docs/domain/identity/model.yaml`
27. `fixture-input/docs/domain/payments/README.md`
28. `fixture-input/docs/domain/payments/model.yaml`
29. `fixture-input/docs/domain/notifications/README.md`
30. `fixture-input/docs/domain/notifications/model.yaml`
31. `plugins/swe-flow/skills/api-designer/references/rest-patterns.md`
32. `plugins/swe-flow/skills/api-designer/references/versioning.md`
33. `plugins/swe-flow/skills/api-designer/references/pagination.md`
34. `plugins/swe-flow/skills/api-designer/references/error-handling.md`
35. `plugins/swe-flow/skills/api-designer/references/openapi.md`
36. `plugins/swe-flow/skills/data-model/references/domain-to-schema.md`

(Directory listings via `ls`/`find` on the skill and fixture dirs are not counted as file reads;
only actual file contents opened with the Read tool are listed.)

## Deliberately NOT read (scope decision, not an oversight)

Everything in `fixture-input/` outside `docs/domain/` — `README.md`, `docs/domain-notes-draft.md`,
`docs/erp-integration-notes.txt`, `config/teams.yaml`, `db/migrations/0001_audit_log.sql`, and
all of `src/**`. The task named `fixture-input/docs/domain` as the upstream domain model to
consume, and both skills' own instructions say to treat `docs/domain/` as authoritative and
**not re-derive the domain from source** when it exists. `context-map.md` states plainly that it
already reconciles the draft doc against the shipped code ("shipped code beats a draft doc… each
divergence is recorded") — re-reading the underlying C# and the stale whiteboard draft directly
would mean re-doing that reconciliation instead of consuming its output, which is exactly what
the skills warn against ("don't re-derive the domain or rename its concepts"). No `QUESTIONS.md`
exists in the fixture's `docs/domain/` (referenced by several context READMEs but not present) —
nothing to read there.

## Workflow followed per skill

### api-designer (SKILL.md workflow: read domain → design contract → write spec → mock and
verify → plan evolution)

- Read `docs/domain/` fully (context-map + all 13 contexts) before designing anything.
- Mapped each bounded context onto its own `docs/api/<slug>/openapi.yaml` + `README.md` per the
  hard rule ("Every bounded context gets its OWN emitted spec… a README alone is not a
  deliverable") — all 13 present, verified with `ls docs/api/*/openapi.yaml`.
- Loaded all 5 references (`rest-patterns`, `versioning`, `pagination`, `error-handling`,
  `openapi.md`) since every spec touches URI conventions, versioning, pagination, RFC 7807 errors,
  and (for domain events) the webhook-vs-state-transition guidance.
- **Linted every spec** with `npx @redocly/cli lint` (network-available in this sandbox) — all
  13 are valid with **zero warnings** after two passes (added `info.license` + tag
  `description` to clear the initial `info-license`/`tag-description` warnings).
- **Mock-verified** with `npx @stoplight/prism-cli mock` on the Allocation spec (`GET
  /reservations` → 200, `POST /reservations` with a valid body → 201, `GET /reservations/{id}` →
  200) as a representative smoke test of the whole design, given the specs share one convention
  set (pagination, `Problem`, `bearerAuth`) verified once at the schema level via lint across all
  13.

### data-model (SKILL.md workflow: read domain (or prose) → decide cross-cutting policy → design
logical model → apply audit/ownership/tenancy uniformly → write docs/data/ → project to
PostgreSQL DDL → state remaining assumptions/gaps)

- FORWARD mode (domain model present, "design the database" per the user's ask).
- Loaded `references/domain-to-schema.md` (not `audit-checklist.md` — that's the AUDIT-mode
  reference, out of scope for a FORWARD-only request).
- Decided cross-cutting policy **once**, up front, recorded in `docs/data/INDEX.md`:
  single-tenant; audit columns (`created_at`/`updated_at` always, `created_by`/`updated_by` where
  a human actor writes, `last_synced_at` where an automated import writes instead); no
  soft-delete; `version` proposed only on `reservation`.
- Applied the mapping table literally: **8 of 13** contexts get tables (Allocation, Rentals,
  Logistics, Maintenance, Catalog ×3, Customer Accounts, Asset Sync, Documents); **5 of 13** get
  **no schema**, each for a distinct, domain-model-stated reason (Pricing: stateless, no
  persisted `Quote`; Billing: model owned by another team; Payments/Identity/Notifications:
  empty `ubiquitous_language` + empty `aggregates`, "no domain model") — every one of the 5 still
  got its required `README.md` + `schema.postgres.sql` file, the latter a documented no-op, not a
  missing artifact.
- **Verified every `schema.postgres.sql` executes cleanly** against a real `postgres:16-alpine`
  container (Docker was available in this sandbox): all 13 files ran without error in one pass
  (`psql -f`, `ON_ERROR_STOP=1`), including the 5 no-op files. Spot-checked the load-bearing
  invariants directly against the live database:
  - `reservation`'s `EXCLUDE USING gist` constraint correctly rejects an overlapping window on
    the same `asset_tag` from a **different depot** (the exact case the stale draft got backward).
  - `maintenance_record.next_due` (`GENERATED ALWAYS AS`) computes `last_serviced + interval_days`
    correctly.
  - `category.parent_code ON DELETE RESTRICT` correctly blocks deleting a category that still has
    children.
  - Container torn down (`docker rm -f`) after verification; no state left running.

## Output contract check (both skills' hard rules)

- `docs/api/INDEX.md` + 13× (`README.md` + `openapi.yaml`) — present, lint-clean.
- `docs/data/INDEX.md` + 13× (`README.md` + `schema.postgres.sql`) — present, all 13
  `schema.postgres.sql` execute cleanly (8 with real tables, 5 documented no-ops).
- `QUESTIONS.md` — 14 recorded decision points (6 api-designer, 8 data-model) with the assumption
  taken for each, so the run never stalled waiting on a human.
