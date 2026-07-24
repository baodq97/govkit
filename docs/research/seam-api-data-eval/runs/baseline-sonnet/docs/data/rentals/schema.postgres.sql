-- Dialect: PostgreSQL 15+
-- Projection of the logical model in README.md. Source: docs/domain/rentals/ (DOMAIN-0003).
-- Draft — owner: TBD.

CREATE TABLE rental_order (
    order_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cross-context reference to Customer Accounts' sales_account.account_id — no FK.
    customer_id     text NOT NULL,

    -- Cross-context reference to Allocation's reservation.asset_tag — no FK.
    asset_tag       text NOT NULL,

    -- Money value object, inlined.
    amount_amount   numeric(12,2) NOT NULL,
    amount_currency char(3) NOT NULL,

    -- Technical audit (cross-cutting policy, docs/data/INDEX.md).
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      text,
    updated_by      text,

    CONSTRAINT rental_order_currency_iso4217_length CHECK (length(amount_currency) = 3)
);

CREATE INDEX idx_rental_order_customer_id ON rental_order (customer_id);
CREATE INDEX idx_rental_order_asset_tag   ON rental_order (asset_tag);

-- No further invariants: the domain model states none for Rentals.
