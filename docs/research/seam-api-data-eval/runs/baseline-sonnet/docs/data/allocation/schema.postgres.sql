-- Dialect: PostgreSQL 15+
-- Projection of the logical model in README.md. Source: docs/domain/allocation/ (DOMAIN-0001).
-- Draft — owner: TBD.

-- Required for the temporal-overlap EXCLUDE constraint below.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE reservation_status AS ENUM ('committed', 'released');

CREATE TABLE reservation (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The physical unit committed. Cross-context reference to Asset Sync's
    -- asset_record.tag — deliberately NOT a foreign key (cross bounded-context boundary).
    asset_tag     text NOT NULL,

    -- Custodian Depot: business-ownership projection (reservation:custodian-depot),
    -- not audit metadata. Cross-context reference to Catalog's depot.id — no FK.
    depot_id      text NOT NULL,

    -- RentalWindow value object, inlined.
    window_start  date NOT NULL,
    window_end    date NOT NULL,

    status        reservation_status NOT NULL DEFAULT 'committed',

    -- Optimistic locking — PROPOSED for this core, high-risk aggregate only. Confirm.
    version       integer NOT NULL DEFAULT 1,

    -- Technical audit (cross-cutting policy, docs/data/INDEX.md).
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    text,
    updated_by    text,

    CONSTRAINT reservation_window_at_least_one_day CHECK (window_end > window_start),

    -- The no-double-commit invariant: the same asset_tag may never have two COMMITTED
    -- reservations with overlapping windows, even from a different depot.
    CONSTRAINT reservation_no_double_commit EXCLUDE USING gist (
        asset_tag WITH =,
        daterange(window_start, window_end, '[)') WITH &&
    ) WHERE (status = 'committed')
);

CREATE INDEX idx_reservation_asset_tag ON reservation (asset_tag);
CREATE INDEX idx_reservation_depot_id  ON reservation (depot_id);
CREATE INDEX idx_reservation_status   ON reservation (status);

-- NOTE: the "unit is out of service" invariant is NOT expressed here — it depends on
-- Maintenance's state, a different bounded context. Enforced at the application layer
-- (see README "Invariants -> constraints"), not the database.
