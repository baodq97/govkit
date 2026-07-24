-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Maintenance (DOMAIN-0005, supporting)

CREATE TABLE maintenance_record (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag       text NOT NULL,   -- cross-context ref (Asset Sync) — no FK
    last_serviced   date NOT NULL,
    interval_days   integer NOT NULL,
    out_of_service  boolean NOT NULL DEFAULT false,
    -- The one domain calculation: NextDue = LastServiced + IntervalDays.
    next_due        date GENERATED ALWAYS AS (last_serviced + interval_days) STORED,  -- date + int -> date (days)
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      text,
    updated_by      text,

    CONSTRAINT maintenance_record_asset_unique UNIQUE (asset_tag),
    CONSTRAINT maintenance_record_interval_pos CHECK (interval_days >= 1)
);

CREATE INDEX ix_maintenance_out_of_service ON maintenance_record (out_of_service);
CREATE INDEX ix_maintenance_next_due       ON maintenance_record (next_due);
