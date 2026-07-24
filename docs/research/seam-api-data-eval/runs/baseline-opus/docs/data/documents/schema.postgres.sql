-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Documents (DOMAIN-0010, supporting)

CREATE TYPE document_linked_entity_type AS ENUM ('rental', 'account');  -- flagged assumption (Q-D13)

CREATE TABLE document (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id       text NOT NULL,  -- uploader-owner projection (cross-context, Identity) — no FK
    linked_entity_id    text NOT NULL,  -- cross-context ref (rental/account) — no FK
    linked_entity_type  document_linked_entity_type,  -- nullable: domain states no discriminator
    filename            text NOT NULL,
    content_type        text,
    size_bytes          bigint,
    storage_key         text NOT NULL,  -- pointer into blob store; bytes are not in the DB
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_document_linked_entity_id ON document (linked_entity_id);
CREATE INDEX ix_document_owner_user_id    ON document (owner_user_id);

-- NOTE: "only the uploader (owner_user_id) or an admin may delete" is a RUNTIME AUTHORIZATION rule,
-- enforced by the Documents service against the caller's identity. It is not expressible as a
-- table constraint and is intentionally NOT invented as SQL here.
