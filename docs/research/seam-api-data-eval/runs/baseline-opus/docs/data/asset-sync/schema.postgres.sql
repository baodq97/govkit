-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Asset Sync (DOMAIN-0009, supporting) — clean read model behind an ACL over the legacy ERP

CREATE TABLE asset_record (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tag         text NOT NULL,   -- clean natural key
    category    text NOT NULL,   -- cross-context ref (Catalog.category) — no FK; clean value
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    synced_at   timestamptz NOT NULL DEFAULT now(),  -- writer is the nightly SOAP job

    CONSTRAINT asset_record_tag_unique UNIQUE (tag)
    -- No raw ERP columns: quarantined inside the sync (the ACL). ERP is the system of record.
);

CREATE INDEX ix_asset_record_category ON asset_record (category);
