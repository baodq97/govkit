-- Dialect: PostgreSQL 15+
-- Projection of the logical model in README.md. Source: docs/domain/customer-accounts/
-- (DOMAIN-0008). Draft — owner: TBD.

CREATE TABLE sales_account (
    -- Conformist: the CRM's id format, taken verbatim. No translation, no surrogate.
    account_id      text PRIMARY KEY,

    name            text NOT NULL,
    segment         text NOT NULL,

    -- Business ownership projection (account:sales-rep-owner) — not audit metadata.
    -- External CRM rep id; no local SalesRep table exists, so no FK.
    sales_rep_id    text,

    -- Populated by the nightly CRM import (automated), not a human actor —
    -- replaces created_by/updated_by for this table (see docs/data/INDEX.md).
    last_synced_at  timestamptz NOT NULL DEFAULT now(),

    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_account_segment      ON sales_account (segment);
CREATE INDEX idx_sales_account_sales_rep_id ON sales_account (sales_rep_id);

-- No further invariants: "CRUD over conformed records; no stated invariant."
