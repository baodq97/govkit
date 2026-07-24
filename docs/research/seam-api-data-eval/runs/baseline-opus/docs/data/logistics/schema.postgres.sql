-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Logistics (DOMAIN-0004, supporting)

CREATE TYPE delivery_run_status AS ENUM ('planned', 'handed_off', 'delivered');  -- flagged assumption (Q-D8)

CREATE TABLE delivery_run (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag   text NOT NULL,  -- cross-context / Shared Kernel ref (Allocation) — no FK
    depot_id    text NOT NULL,  -- cross-context ref (Catalog.depot) — no FK
    run_date    date NOT NULL,
    status      delivery_run_status NOT NULL DEFAULT 'planned',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  text,
    updated_by  text
);

CREATE INDEX ix_delivery_run_asset_tag ON delivery_run (asset_tag);
CREATE INDEX ix_delivery_run_depot_id  ON delivery_run (depot_id);
CREATE INDEX ix_delivery_run_run_date  ON delivery_run (run_date);
CREATE INDEX ix_delivery_run_status    ON delivery_run (status);
