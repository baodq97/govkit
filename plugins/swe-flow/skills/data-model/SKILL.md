---
name: data-model
description: >
  Design or audit a relational data model. FORWARD mode turns a domain model (docs/domain/
  from the ddd-flow plugin, or a prose description) into a logical schema and ERD; AUDIT mode
  reviews an EXISTING database (migrations, DDL, or ORM models) and flags issues with
  severity. Use FORWARD for "design the database", "data model", "schema from the domain",
  "turn aggregates into tables", "ERD", "design tables". Use AUDIT for "audit my schema",
  "review the database", "is my schema healthy", "data model review", or when the user points
  at an existing schema/migrations folder. The persistence step of the chain and the go-to
  skill for reviewing the data layer of a legacy project.
---

# Data Model

Design a relational data model from a domain (FORWARD), or audit an existing one (AUDIT).
The **logical model is canonical** (dialect-agnostic); a PostgreSQL DDL projection is generated
from it. Audit compares a real schema — in any dialect — against that logical expectation.

## Where this fits

The persistence step of the swe-flow chain: `ddd-flow:3-decompose`
(ships in the `ddd-flow` plugin; the handoff is the `docs/domain/` tree) → **`data-model`**
(sibling of `api-designer`). FORWARD consumes `docs/domain/`; both modes write to `docs/data/`.

## Pick the mode

- **FORWARD** — the user wants a schema/ERD designed. Input: `docs/domain/` if present, else a
  prose description.
- **AUDIT** — the user wants an existing data layer reviewed. Input: existing schema artifacts
  (`migrations/`, `*.sql`, ORM models). If `docs/domain/` also exists, additionally diff for drift.

If both an existing schema and a "design" request are present, ask which the user wants. If neither
input exists, ask for a domain description (FORWARD) or a path to the schema (AUDIT).

## FORWARD — domain → logical model

Read the mapping rules in `references/domain-to-schema.md`. When `docs/domain/` exists, consume it
as authoritative (stable ids, ubiquitous-language names verbatim); never re-derive the domain.

| Domain element | Schema |
|---|---|
| Aggregate root | A table (its own consistency boundary) |
| Entity (non-root, in aggregate) | A table with a FK to its aggregate root |
| Value object (single) | Inline columns on the owning table |
| Value object (multi-valued) | A child table owned by the parent |
| Invariant | A constraint (`NOT NULL`, `UNIQUE`, `CHECK`) when expressible — else a flagged note |
| Domain event | **Not** a table (events are messages) — see the outbox exception in references |

- **Aggregate boundary = transaction boundary.** FKs and cascades stay *inside* an aggregate.
- **Cross-aggregate and cross-context links are id references only — never a hard FK across a
  context boundary** (each context is a candidate service / own schema; see `relationships` in
  `model.yaml`).
- Surrogate PK per table; add `UNIQUE` for natural keys the domain states (e.g. a unique email).
- Index every FK and every column the domain says is filtered/looked-up by.

### Cross-cutting concerns (decide once, apply uniformly)

Audit and ownership/tenancy are standard in production systems — they are **not** "fabrication".
Treat them as a deliberate, system-wide decision, then apply consistently to every table. Default
to including them; ask only when the policy is genuinely ambiguous (detail in
`references/domain-to-schema.md`).

- **Technical audit** (infra, not domain language): `created_at` / `updated_at` (default ON);
  `created_by` / `updated_by` when a user/actor context exists. Optional `deleted_at` (soft delete)
  and `version` (optimistic locking) — propose, confirm.
- **Business ownership** (from the domain): the owning party an aggregate belongs to —
  `owner_id` / `user_id` / `team_id`. Model it where the domain states a real ownership relationship.
- **Tenancy** (architectural decision): single-tenant, row-level (`tenant_id` / `org_id` on every
  table + composite index `(tenant_id, …)` + RLS), schema-per-tenant, or db-per-tenant. Decide once
  and reflect it uniformly — it drives PKs, indexes, and isolation.
- **Event-log** alternative: in event-sourced designs, domain events are the audit trail — note
  that instead of per-row audit columns where that's the chosen approach.

Record the chosen policy at the top of the model (INDEX.md) so it's visible and consistent.

Workflow: read domain (or prose) → **decide cross-cutting policy** → design the logical model →
apply audit/ownership/tenancy uniformly → write `docs/data/` → project to PostgreSQL DDL → state
remaining assumptions/gaps.

## AUDIT — existing schema → findings

Read `references/audit-checklist.md` (issue catalog + detection + precision rules). Locate the
schema (migrations, DDL, ORM models), reconstruct the logical model, and flag issues with
severity, the exact `table.column` location, evidence, and a recommended fix. Among the checks:
**missing cross-cutting concerns** — tables lacking audit columns (`created_at`/`updated_at`), or
(when the app is multi-tenant) lacking a tenant/owner isolation column — are findings too. If
`docs/domain/` exists, add a **drift** section (table without a domain concept, aggregate without a
table, name divergence).

**Precision is as important as recall.** A false positive destroys trust in an audit. Only flag an
issue you can point to with evidence; never flag a choice that is merely *dialect-normal* (e.g.
`uniqueidentifier` in SQL Server, `serial` in Postgres) as a smell. List the tables you checked and
found clean, so coverage is visible.

## Output

Write under `docs/data/`, mirroring the `docs/domain/` and `docs/api/` layout (create it if
missing; if no `docs/` convention exists, ask where docs live).

```
docs/data/
├── INDEX.md
└── <context-slug>/
    ├── README.md            # CANONICAL logical model: tables, columns, keys, constraints-as-intent,
    │                        #   ERD (Mermaid), domain→schema mapping notes, FLAGGED assumptions/gaps
    └── schema.postgres.sql  # PROJECTION: Postgres DDL generated from the logical model (dialect-labeled)
```

AUDIT writes `docs/data/audit.md` (findings table + drift section + tables-checked-clean list)
instead of generating a schema.

## Hard Rules

- The **logical model is canonical**; `schema.postgres.sql` is a labeled projection, never the source of truth.
- **Aggregate = transaction boundary**: no hard FK across aggregate/context boundaries — reference by id.
- **Don't fabricate domain concepts** — in FORWARD, never invent *business* columns/tables the
  domain never states (e.g. a `loyalty_points` nobody asked for). When a business detail is
  underspecified (unclear cardinality, an implied rule), emit a **flagged assumption/gap**, not
  invented precision. This is distinct from the standard **cross-cutting concerns** (audit /
  ownership / tenancy), which ARE applied deliberately — omitting them silently is itself a gap.
- **AUDIT is read-only** — never modify the project's schema, migrations, or ORM models. Only write `docs/data/audit.md`.
- **AUDIT precision**: flag only with evidence; never flag dialect-normal choices as smells; list what was checked clean.
- **Schema, not migration history** — do not emit Alembic/Prisma/TypeORM migration files; design the target schema.
- Every bounded context gets its own `docs/data/<context>/README.md` (+ `schema.postgres.sql` in FORWARD).
  Before declaring done, verify each context folder actually contains its artifacts.
