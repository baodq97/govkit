# Billing — Logical Data Model

Source: `docs/domain/billing/` (DOMAIN-0007). Sub-domain type: **supporting**, model owned by
**another team**. Status: draft, owner: TBD.

## No schema — by domain-model statement, not an oversight

The domain model states the `Invoice` model "lives in the Billing team's own service, not
modelled here… it is not ours to model." We hold only the `IInvoicingPort` contract (see
`docs/api/billing/openapi.yaml`), not Billing's persistence. Designing Billing's internal schema
here would fabricate a model that isn't ours to own — the same discipline `api-designer` applied
by documenting only the contract surface, not Billing's internals.

## What this means for Rentals

`rental_order` (see `docs/data/rentals/`) does **not** carry an `invoice_id` column — the domain
model's `RentalOrder` attributes are exactly `[orderId, customerId, assetTag, amount]`, with no
invoice reference stated. If Rentals later needs to track invoice status locally, that would be a
new, explicitly-confirmed column on `rental_order` — not invented here.
