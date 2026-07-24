-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Pricing (DOMAIN-0002, core)
--
-- PROVISIONAL: Pricing is a STATELESS engine today (no persisted Quote). This DDL applies ONLY if
-- the entity-vs-value-object decision (Q-D6) makes Quote a persisted entity. Do not apply unprompted.

CREATE TYPE quote_contract_version AS ENUM ('v1', 'v2');  -- Published Language contract version

CREATE TABLE quote (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category          text NOT NULL,           -- cross-context ref (Catalog.category) — no FK
    amount_amount     numeric(12,2) NOT NULL,  -- Money VO (inline)
    amount_currency   char(3) NOT NULL,
    floor_amount      numeric(12,2) NOT NULL,  -- PriceFloor VO (inline)
    floor_currency    char(3) NOT NULL,
    utilization       numeric(4,3) NOT NULL,   -- Utilization VO (inline)
    contract_version  quote_contract_version NOT NULL DEFAULT 'v2',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    created_by        text,

    CONSTRAINT quote_currency_shape CHECK (amount_currency ~ '^[A-Z]{3}$' AND floor_currency ~ '^[A-Z]{3}$'),
    CONSTRAINT quote_utilization_ratio CHECK (utilization >= 0 AND utilization <= 1),
    -- Invariant: a quote may never fall below its utilization floor (same currency assumed).
    CONSTRAINT quote_not_below_floor CHECK (amount_amount >= floor_amount)
);

CREATE INDEX ix_quote_category ON quote (category);
