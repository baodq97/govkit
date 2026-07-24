-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Allocation (DOMAIN-0001, core)

CREATE EXTENSION IF NOT EXISTS btree_gist;  -- required for the equality + range exclusion constraint

CREATE TYPE reservation_status AS ENUM ('active', 'released');  -- flagged assumption (Q-D5)

CREATE TABLE reservation (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag   text NOT NULL,   -- cross-context ref (Asset Sync clean asset) — no FK
    depot_id    text NOT NULL,   -- cross-context ref (Catalog.depot) — custodian ownership projection, no FK
    start_date  date NOT NULL,
    end_date    date NOT NULL,
    status      reservation_status NOT NULL DEFAULT 'active',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  text,
    updated_by  text,

    -- Invariant: window >= 1 day (end after start)
    CONSTRAINT reservation_window_min CHECK (end_date > start_date),

    -- Invariant: no double-commit of one unit across overlapping windows (even across depots).
    -- Set-based over ALL live (active) reservations for one asset_tag.
    CONSTRAINT reservation_no_overlap
        EXCLUDE USING gist (
            asset_tag WITH =,
            daterange(start_date, end_date, '[)') WITH &&
        ) WHERE (status = 'active')
);

CREATE INDEX ix_reservation_asset_tag ON reservation (asset_tag);
CREATE INDEX ix_reservation_depot_id  ON reservation (depot_id);
CREATE INDEX ix_reservation_status    ON reservation (status);

-- NOTE: "a unit that is out of service cannot be committed" is a CROSS-CONTEXT rule
-- (out_of_service lives in Maintenance). It is enforced in the application before insert,
-- not by a database constraint here.
