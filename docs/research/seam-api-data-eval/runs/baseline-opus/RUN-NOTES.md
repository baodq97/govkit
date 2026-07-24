# RUN-NOTES — execution log

Executing `api-designer` then `data-model` (both swe-flow skills) blind, consuming
`fixture-input/docs/domain` as the upstream domain model. Outputs under this `runs/baseline-opus/`
directory only.

## Files read, in order

Absolute paths, in the order I opened them with the Read tool.

### Skill definitions
1. `/home/bd/personal-projects/govkit/plugins/swe-flow/skills/api-designer/SKILL.md`
2. `/home/bd/personal-projects/govkit/plugins/swe-flow/skills/data-model/SKILL.md`

### Fixture — orientation + domain model (`fixture-input/`)
3. `.../fixture-input/README.md`
4. `.../fixture-input/docs/domain/INDEX.md`
5. `.../fixture-input/docs/domain/context-map.md`

### Fixture — per-context `model.yaml` (authoritative input)
6. `.../docs/domain/allocation/model.yaml`
7. `.../docs/domain/pricing/model.yaml`
8. `.../docs/domain/rentals/model.yaml`
9. `.../docs/domain/logistics/model.yaml`
10. `.../docs/domain/maintenance/model.yaml`
11. `.../docs/domain/catalog/model.yaml`
12. `.../docs/domain/billing/model.yaml`
13. `.../docs/domain/customer-accounts/model.yaml`
14. `.../docs/domain/asset-sync/model.yaml`
15. `.../docs/domain/documents/model.yaml`
16. `.../docs/domain/payments/model.yaml`
17. `.../docs/domain/identity/model.yaml`
18. `.../docs/domain/notifications/model.yaml`

### Fixture — per-context `README.md`
19. `.../docs/domain/allocation/README.md`
20. `.../docs/domain/pricing/README.md`
21. `.../docs/domain/rentals/README.md`
22. `.../docs/domain/documents/README.md`
23. `.../docs/domain/customer-accounts/README.md`
24. `.../docs/domain/logistics/README.md`
25. `.../docs/domain/maintenance/README.md`
26. `.../docs/domain/catalog/README.md`
27. `.../docs/domain/billing/README.md`
28. `.../docs/domain/asset-sync/README.md`
29. `.../docs/domain/payments/README.md`
30. `.../docs/domain/identity/README.md`
31. `.../docs/domain/notifications/README.md`

### Skill references (loaded on demand, as each SKILL directs)
32. `.../skills/api-designer/references/rest-patterns.md`
33. `.../skills/api-designer/references/versioning.md`
34. `.../skills/api-designer/references/pagination.md`
35. `.../skills/api-designer/references/error-handling.md`
36. `.../skills/api-designer/references/openapi.md`
37. `.../skills/data-model/references/domain-to-schema.md`

## Files deliberately NOT read (and why)

- `skills/data-model/references/audit-checklist.md` — AUDIT-mode only; this run is FORWARD (Q-D0).
- `fixture-input/src/**/*.cs`, `fixture-input/config/teams.yaml`,
  `fixture-input/db/migrations/0001_audit_log.sql`, `fixture-input/docs/domain-notes-draft.md`,
  `fixture-input/docs/erp-integration-notes.txt` — the `docs/domain/` model is the authoritative,
  already-reconciled upstream (the context map records that shipped code beats the stale draft).
  Consuming it directly, without re-deriving the domain from source, is what both skills instruct.
- The evaluation harness files (`rubric.md`, top-level `README.md`, other `runs/`, other
  `docs/research/` dirs, `self-learning`) — excluded by the run's blinding constraints.

## Directory listing only (not content reads)

- `find` over the two skill dirs and the fixture dir (to enumerate files before reading).
- `ls` over the emitted `docs/api/*` and `docs/data/*` (pre-completion artifact check required by
  both skills' hard rules).

## Verification performed (skill workflow steps)

- **api-designer step 3 (lint):** `npx @redocly/cli lint` over all 10 specs. Result: **all valid
  (exit 0)** after fixing one real error — `nullable: true` is invalid in OpenAPI 3.1
  (`catalog/openapi.yaml`), corrected to `type: [string, 'null']`. Remaining output is advisory
  warnings only (`no-server-example.com` for the illustrative `example.com`/`localhost` servers,
  and `tag-description` on Catalog) — cosmetic, not blocking.
- **api-designer step 4 (mock):** `npx @stoplight/prism-cli mock allocation/openapi.yaml` booted and
  served a schema-conformant `200` for `GET /reservations` — mock-verified.
- **Offline YAML well-formedness:** all 10 specs parse as OpenAPI 3.1 with `info` + `paths`.
- **data-model:** no lint tool is specified by the skill; DDL is a labelled projection of the
  canonical logical model. PostgreSQL-specific features used deliberately: `btree_gist` +
  `EXCLUDE … gist` (no-double-commit invariant), a `GENERATED ALWAYS … STORED` column (`next_due`),
  native `ENUM` types, and cross-context columns with **no** `REFERENCES`.

## Output contract produced

- `docs/api/INDEX.md` + 10 `docs/api/<context>/{README.md, openapi.yaml}`
  (allocation, pricing, rentals, logistics, maintenance, catalog, customer-accounts, asset-sync,
  documents, billing).
- `docs/data/INDEX.md` + 9 `docs/data/<context>/{README.md, schema.postgres.sql}`
  (the same set minus billing, which is owned by another team).
- `QUESTIONS.md` (28 recorded rows: 12 api-designer + 16 data-model questions/decisions) and this
  `RUN-NOTES.md`.
