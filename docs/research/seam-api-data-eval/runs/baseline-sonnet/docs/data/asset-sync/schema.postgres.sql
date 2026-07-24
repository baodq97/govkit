-- Dialect: PostgreSQL 15+
-- Projection of the logical model in README.md. Source: docs/domain/asset-sync/ (DOMAIN-0009).
-- Draft — owner: TBD.

CREATE TABLE asset_record (
    -- Our clean asset shape after translation. Used directly as PK.
    tag             text PRIMARY KEY,

    -- Cross-context reference to Catalog's category.code — no FK.
    category        text NOT NULL,

    -- Populated by the nightly ERP SOAP sync (automated), not a human actor —
    -- replaces created_by/updated_by for this table (see docs/data/INDEX.md).
    last_synced_at  timestamptz NOT NULL DEFAULT now(),

    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_record_category ON asset_record (category);

-- No invariants: no Asset aggregate is modelled on our side; the ERP is the system of record.
