-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Rentals (DOMAIN-0003, supporting)

CREATE TYPE quote_contract_version_ref AS ENUM ('v1', 'v2');  -- provenance of consumed PriceQuoted

CREATE TABLE rental_order (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id             text NOT NULL,  -- cross-context ref (Customer Accounts) — no FK
    asset_tag               text NOT NULL,  -- cross-context ref (Allocation / Asset Sync) — no FK
    amount_amount           numeric(12,2) NOT NULL,  -- Money VO (inline)
    amount_currency         char(3) NOT NULL,
    quote_contract_version  quote_contract_version_ref,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              text,
    updated_by              text,

    CONSTRAINT rental_order_currency_shape CHECK (amount_currency ~ '^[A-Z]{3}$')
    -- No placement invariant asserted (domain states none; Q-D7).
);

CREATE INDEX ix_rental_order_customer_id ON rental_order (customer_id);
CREATE INDEX ix_rental_order_asset_tag   ON rental_order (asset_tag);
