# Schema Audit (AUDIT mode)

Review an **existing** data layer and report issues. Read-only: you produce `docs/data/audit.md`,
you never touch the project's schema, migrations, or ORM models.

## 1. Locate & reconstruct

Find the schema, in priority order:

1. Raw DDL — `*.sql`, `schema.sql`, `**/migrations/*.sql`
2. ORM models — SQLAlchemy/Django (Python), Prisma (`schema.prisma`), TypeORM/Sequelize entities,
   Entity Framework (`*Context.cs`, model classes)
3. A live-DB dump if the user provides one

Reconstruct the **logical model** (tables, columns, types, keys, FKs, indexes, constraints).
Identify the **dialect** (Postgres/MySQL/SQL Server/SQLite) — it determines what is *normal* vs. a
real smell. If migrations exist, read them in order; the final state is what you audit (not every
historical step).

## 2. Precision discipline (read before flagging)

A false positive destroys trust in an audit. Therefore:

- **Flag only with evidence** — cite the exact `table.column` (or constraint/index) and what's
  wrong. No vague "consider reviewing indexes."
- **Never flag a dialect-normal choice as a smell.** `uniqueidentifier` (SQL Server), `serial`
  (Postgres), `AUTOINCREMENT` (SQLite), `tinyint(1)` booleans (MySQL), `nvarchar` — these are
  idiomatic, not bugs. Compare against the *logical* expectation, not a Postgres-shaped one.
- **List what you checked and found clean** — coverage must be visible, or "3 findings" reads as
  "only looked at 3 tables."
- When unsure whether something is a real issue, mark it **Low / needs-confirmation** rather than
  asserting it.
- **Cross-cutting concerns need evidence too.** Flag *missing audit columns* on real business
  tables, but don't demand them on pure join/reference tables. Flag *missing tenant isolation*
  (#12) **only when there is evidence the system is multi-tenant** (a `tenant`/`organization` table,
  a tenant column on some tables, app context) — never assume multi-tenancy by default.

## 3. Issue catalog

| # | Issue | Severity | How to detect | Recommended fix |
|---|---|---|---|---|
| 1 | **FK column with no index** | High | A column referencing another table's PK that has no index/unique covering it | Add an index on the FK column |
| 2 | **Missing FK (orphan reference)** | High | A `*_id` column that clearly references another table but has no FK constraint (same-DB only) | Add the FK, or document if it's a deliberate cross-service ref |
| 3 | **Hard FK across an aggregate/context boundary** | Med | A FK linking two independent aggregates/services with cascade | Replace with an id reference; remove cross-boundary cascade |
| 4 | **Missing UNIQUE for a natural key** | High | A column the domain/app treats as unique (email, slug, external_id) with no `UNIQUE` | Add a `UNIQUE` constraint |
| 5 | **Nullable that should be NOT NULL** | Med | A column required by the domain but nullable | Add `NOT NULL` (+ backfill plan) |
| 6 | **Type smell** | Med | Money as `float`/`double`; timestamps as `varchar`; enums as free `text` with no check | `numeric`/`decimal` for money; proper timestamp type; `CHECK`/enum |
| 7 | **No primary key** | High | A table with no PK | Add a surrogate PK |
| 8 | **Normalization issue** | Med | Repeating groups (`tag1,tag2,tag3`), comma-lists, duplicated entity data across tables | Extract child table / normalize |
| 9 | **N+1 risk** | Low | A frequently-joined/filtered column with no supporting index | Add a covering index |
| 10 | **Over-wide / god table** | Low | A table with many unrelated nullable columns spanning multiple concepts | Split by concept/aggregate |
| 11 | **Missing audit columns** | Med | Business tables with no `created_at`/`updated_at` (and no `created_by`/`updated_by` where a user context exists) | Add standard audit columns |
| 12 | **Missing tenant/owner isolation** | High | A multi-tenant app whose tenant-scoped tables have no `tenant_id`/`org_id` (data-isolation + security risk) | Add the tenant column + composite index `(tenant_id, …)` + RLS |

## 4. Drift vs. `docs/domain/` (only if it exists)

Compare the reconstructed schema to the domain model:

- **Aggregate without a table** — modelled but not persisted (or persisted elsewhere).
- **Table without a domain concept** — persistence the domain never describes (legacy? missing
  from the model?).
- **Name divergence** — `model.yaml` says `Enrolment`, the table is `registrations`.
- **Boundary leak** — a single table mixing two bounded contexts.

Report drift as observations to reconcile, not automatically as bugs — the domain model may be the
thing that's stale.

## 5. Output: `docs/data/audit.md`

```markdown
# Data Model Audit — <project/scope>

Dialect: PostgreSQL · Source: db/migrations/*.sql · Tables reviewed: 7

## Findings

| Severity | Location | Issue | Evidence | Fix |
|---|---|---|---|---|
| High | orders.customer_id | FK has no index | `customer_id uuid REFERENCES customers(id)`, no index found | `CREATE INDEX ON orders(customer_id);` |
| High | users.email | No UNIQUE on a natural key | column `email text`, app assumes unique | `ALTER TABLE users ADD UNIQUE (email);` |
| Med  | payments.amount | Money stored as float | `amount double precision` | use `numeric(12,2)` |

## Checked and clean
- `products`, `categories`, `inventory` — PKs present, FKs indexed, types sound.

## Drift vs docs/domain (if present)
- Aggregate `Subscription` (DOMAIN-0004) has no table — confirm where it persists.
```

Severity counts at the top help the reader triage. Keep findings specific and fixable.
