-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Customer Accounts (DOMAIN-0008, supporting) — CONFORMIST read model (nightly CRM import)

CREATE TABLE sales_account (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    text NOT NULL,   -- CRM natural key, verbatim
    name          text NOT NULL,
    segment       text NOT NULL,   -- CRM code verbatim; intentionally NOT an enum (conformist)
    sales_rep_id  text,            -- commercial-owner projection
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    synced_at     timestamptz NOT NULL DEFAULT now(),  -- writer is the nightly job, not a human actor

    CONSTRAINT sales_account_account_id_unique UNIQUE (account_id)
);

CREATE INDEX ix_sales_account_segment      ON sales_account (segment);
CREATE INDEX ix_sales_account_sales_rep_id ON sales_account (sales_rep_id);
