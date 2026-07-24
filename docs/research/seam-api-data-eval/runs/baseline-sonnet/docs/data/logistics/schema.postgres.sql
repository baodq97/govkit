-- Dialect: PostgreSQL 15+
-- Projection of the logical model in README.md. Source: docs/domain/logistics/ (DOMAIN-0004).
-- Draft — owner: TBD.

CREATE TYPE delivery_run_status AS ENUM ('planned', 'handed-off');

CREATE TABLE delivery_run (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Shared Kernel with Allocation (same identifier) — still no physical FK: Logistics is
    -- its own candidate service/schema.
    asset_tag      text NOT NULL,

    -- Cross-context reference to Catalog's depot.id — no FK.
    depot_id       text NOT NULL,

    delivery_date  date NOT NULL,
    status         delivery_run_status NOT NULL DEFAULT 'planned',

    -- Technical audit (cross-cutting policy, docs/data/INDEX.md).
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    created_by     text,
    updated_by     text
);

CREATE INDEX idx_delivery_run_asset_tag      ON delivery_run (asset_tag);
CREATE INDEX idx_delivery_run_depot_id       ON delivery_run (depot_id);
CREATE INDEX idx_delivery_run_delivery_date  ON delivery_run (delivery_date);

-- No invariants: the domain model states none for Logistics.
