# Payments — Logical Data Model

Source: `docs/domain/payments/` (DOMAIN-0011). Sub-domain type: **generic** (bought adapter,
Stripe). Status: draft, owner: TBD.

## No schema — by domain-model statement, not an oversight

`model.yaml` for Payments has an **empty `ubiquitous_language`** and an **empty `aggregates`**
list, and states outright: "commodity… no business rules live in the adapter… No domain model."
There is no named attribute anywhere in the domain model to ground a table on (contrast Asset
Sync's `AssetRecord (tag, category)`, which is equally aggregate-less but has named attributes).
Inventing a `payment`/`charge` table with speculated columns (amount, status, provider
reference…) here would be fabricating precision the domain never gave — the exact anti-pattern
the FORWARD hard rule forbids.

The system of record for what actually happened to a card charge is Stripe's own ledger; this
context is a thin adapter in front of it, not a data owner.

## What would change this

If RentField later needs a local reconciliation/audit trail of payment attempts independent of
Stripe's own records, that would be a new, explicitly-scoped design (a `payment_attempt` table
logging request/response/status) — not fabricated here from a domain model that states none of
it.
