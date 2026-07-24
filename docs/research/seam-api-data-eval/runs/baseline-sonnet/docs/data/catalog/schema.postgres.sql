-- Dialect: PostgreSQL 15+
-- Projection of the logical model in README.md. Source: docs/domain/catalog/ (DOMAIN-0006).
-- Draft — owner: TBD.

CREATE TABLE category (
    code        text PRIMARY KEY,
    parent_code text REFERENCES category (code) ON DELETE RESTRICT,

    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  text,
    updated_by  text
);

CREATE INDEX idx_category_parent_code ON category (parent_code);

CREATE TABLE depot (
    id          text PRIMARY KEY,
    city        text NOT NULL,

    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  text,
    updated_by  text
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

-- No further invariants: "no rules to enforce" per the domain model.
