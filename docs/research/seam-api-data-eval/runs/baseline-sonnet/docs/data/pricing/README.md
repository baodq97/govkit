# Pricing — Logical Data Model

Source: `docs/domain/pricing/` (DOMAIN-0002). Sub-domain type: **core**. Status: draft,
owner: TBD.

## No schema — by domain-model statement, not an oversight

The domain model is explicit: `Quote` is "currently a **stateless domain service**
(`PricingEngine`) that computes and publishes `PriceQuoted` on a versioned contract; there is
**no persisted `Quote` entity** yet." Per the FORWARD hard rule — "don't fabricate domain
concepts… never invent tables the domain never states" — no `quote` table is created here.

This mirrors the API design (`docs/api/pricing/README.md`): `POST /quotes` is a computation
endpoint, not a resource with a stored identity.

## What would change this

The domain model itself flags an **open entity-vs-value-object question**: "Whether a `Quote`
should become an entity (identity + lifecycle, referenced by the `RentalOrder`) is unstated." If
that question resolves toward "yes, persist it," this folder would then get:

- A `quote` table (id, category, amount_amount, amount_currency, utilization, floor_amount,
  contract_version, created_at…) — the same shape as the `Quote` schema in
  `docs/api/pricing/openapi.yaml`.
- A `rental_order.quote_id` cross-context reference column added in `docs/data/rentals/`.

Not built now — flagged, not decided here.

## Money (Building Block) — not owned here either

`Money`/`UnitOfMeasure` are Building Blocks (per the context map's Sharing levels) shared across
every context that prices something — inlined as `amount`/`currency` columns wherever they
appear (`rental_order.amount_*`, etc.), never given their own table.
