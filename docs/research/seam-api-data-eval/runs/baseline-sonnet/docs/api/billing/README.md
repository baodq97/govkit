# Billing API

Source: `docs/domain/billing/` (DOMAIN-0007). Sub-domain type: **supporting**, model owned by
**another team** (the Billing team). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| `Invoice` (a billable record raised for a placed order) — **model lives in the Billing team's own service, not modelled here** | `POST /invoices` (the `IInvoicingPort.RaiseInvoice` contract), `GET /invoices/{id}` |
| Inbound: `RentalOrderPlaced` / `RaiseInvoice` (from Rentals, Customer-Supplier) | `POST /invoices` request body carries the `RentalOrderPlaced` payload |
| Outbound: charge card (implied, not wired, to Payments) | **Not modelled** — see Flags |

This spec documents **only the `IInvoicingPort` contract surface Rentals depends on** — the
Customer-Supplier relationship where "Rentals is the customer and drives the API." It is
deliberately thin: no invoice line items, tax, or payment-status detail are invented, because the
domain model states none and the full model is owned elsewhere.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/billing/v1`.
Per Customer-Supplier: "when Rentals needs a new field on an invoice, Billing adds it — the two
teams agree the API." Breaking changes to this contract require agreement with Rentals, not a
unilateral Billing-side change.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `rentalOrderId`/`amount` |
| 404 | `INVOICE_NOT_FOUND` | Unknown id |
| 409 | `INVOICE_ALREADY_RAISED` | `rentalOrderId` already has an invoice |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

## Flags (carried from the domain model, not resolved here)

- **"Not ours to state" invoice business rules.** No invoice-status lifecycle, tax rule, or
  payment linkage is invented; the domain model explicitly says the model is the Billing team's,
  not modelled here.
- **Charge-card link to Payments is "implied, not wired."** Not modelled as an API dependency —
  no call from this spec to `docs/api/payments/openapi.yaml` is documented, matching the domain
  model's explicit caveat.
