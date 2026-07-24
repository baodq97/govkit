-- Dialect: PostgreSQL 15+
-- Projection of the logical model in README.md. Source: docs/domain/documents/ (DOMAIN-0010).
-- Draft — owner: TBD.

CREATE TABLE document (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Business ownership: uploader-owner projection (document:uploader-owner), not audit
    -- metadata. External Identity subject id — no local users table, so no FK.
    owner_user_id       text NOT NULL,

    -- Polymorphic cross-context reference (rental_order.order_id OR sales_account.account_id).
    -- No single FK target is possible; also cross-context, so no FK regardless.
    linked_entity_id    text NOT NULL,
    linked_entity_type  text NOT NULL,

    -- Mechanical fields needed for a stored file to be representable at all (not domain-stated
    -- business columns).
    filename            text NOT NULL,
    content_type        text,
    storage_uri         text NOT NULL,

    uploaded_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT document_linked_entity_type_valid
        CHECK (linked_entity_type IN ('rental', 'account'))
);

CREATE INDEX idx_document_owner_user_id    ON document (owner_user_id);
CREATE INDEX idx_document_linked_entity_id ON document (linked_entity_id);

-- The "owner or admin may delete" rule is enforced at the application layer, not here —
-- "admin" is an authorization-role concept this table cannot check by itself.
