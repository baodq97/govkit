-- Dialect: PostgreSQL (projection of the canonical logical model in README.md — not the source of truth)
-- Context: Catalog (DOMAIN-0006, generic/reference)

CREATE TABLE category (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         text NOT NULL,
    parent_code  text,   -- in-context tree parent (self-reference)
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    created_by   text,
    updated_by   text,

    CONSTRAINT category_code_unique UNIQUE (code),
    CONSTRAINT category_parent_fk FOREIGN KEY (parent_code)
        REFERENCES category (code) ON DELETE RESTRICT  -- in-context FK only
);

CREATE INDEX ix_category_parent_code ON category (parent_code);

CREATE TABLE depot (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    depot_code  text NOT NULL,   -- natural key referenced elsewhere as depot_id
    city        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  text,
    updated_by  text,

    CONSTRAINT depot_code_unique UNIQUE (depot_code)
);

CREATE TABLE tag (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label       text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  text,
    updated_by  text,

    CONSTRAINT tag_label_unique UNIQUE (label)
);
