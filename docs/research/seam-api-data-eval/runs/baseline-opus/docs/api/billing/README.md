# Billing API (DOMAIN-0007, supporting — owned by the Billing team)

The internal invoicing service. The **invoice model is owned by the Billing team** — not modelled
here. What this spec captures is the **Customer-Supplier contract** Rentals (the customer) drives and
Billing (the supplier) accommodates: the `RaiseInvoice` API and invoice reads. Documented from the
consumer side.

## Contract mapping (we hold `IInvoicingPort`)

| Domain element | Kind | API surface |
|---|---|---|
| `RaiseInvoice` | command (Rentals → Billing) | `POST /invoices` |
| `Invoice` | Billing-owned record (opaque to us) | `GET /invoices/{invoiceId}`, `GET /invoices?orderId=` |
| `RentalOrderPlaced` | event trigger | Billing may also raise on the event; the API is the explicit path Rentals calls |
| charge card (→ Payments) | implied, **not wired** | not modelled as an endpoint (see context-map) |

## Why this spec exists but the model does not

Per the domain, the invoice model lives in the Billing team's service; we do not own its internals.
The api-designer rule is to translate a Customer-Supplier boundary as the **agreed API**, not to
re-expose the supplier's internals. So this file is the contract shape Rentals depends on — thin,
extended by fields Rentals asks for ("when rentals needs a new field on an invoice, billing adds
it"). Field set beyond `orderId/customerId/amount` is a flagged assumption (QUESTIONS Q-A10): the
two teams agree it, we do not invent it.

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 400 | `validation-error` | malformed RaiseInvoice |
| 401 | `unauthorized` | missing/invalid JWT |
| 404 | `invoice-not-found` | unknown `invoiceId` |
| 409 | `invoice-already-raised` | duplicate RaiseInvoice for an order (idempotency) |

`POST /invoices` accepts an `Idempotency-Key` so a retried RaiseInvoice is not double-billed.

Versioning: URI-versioned `/v1`. The two teams version this contract by agreement (Customer drives).
