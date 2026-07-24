-- Dialect: PostgreSQL 15+
-- Projection of the logical model in README.md. Source: docs/domain/maintenance/ (DOMAIN-0005).
-- Draft — owner: TBD.

CREATE TABLE maintenance_record (
    -- Used directly as the natural key (one record per unit); cross-context reference to
    -- Asset Sync's asset_record.tag — no FK.
    asset_tag       text PRIMARY KEY,

    last_serviced   date NOT NULL,
    interval_days   integer NOT NULL,

    -- NextDue = LastServiced + IntervalDays (the one stated calculation).
    next_due        date GENERATED ALWAYS AS (last_serviced + interval_days) STORED,

    out_of_service  boolean NOT NULL DEFAULT false,

    -- Technical audit (cross-cutting policy, docs/data/INDEX.md).
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      text,
    updated_by      text,

    CONSTRAINT maintenance_record_interval_positive CHECK (interval_days > 0)
);

CREATE INDEX idx_maintenance_record_out_of_service ON maintenance_record (out_of_service);
