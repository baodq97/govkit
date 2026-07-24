-- 0001_audit_log.sql
-- Requested by Sales: they want to see an activity history on each order —
-- "who touched this order and when" — shown as a timeline in the order screen.
-- Nothing legal or retention-related; it's a convenience for the sales team.

CREATE TABLE audit_log (
    id           BIGSERIAL   PRIMARY KEY,
    entity_type  TEXT        NOT NULL,   -- e.g. 'rental_order'
    entity_id    TEXT        NOT NULL,
    action       TEXT        NOT NULL,   -- created / updated / status_changed
    actor_user   TEXT        NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    detail       TEXT
);

CREATE INDEX ix_audit_log_entity ON audit_log (entity_type, entity_id);
