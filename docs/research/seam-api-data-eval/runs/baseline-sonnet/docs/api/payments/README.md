# Payments API

Source: `docs/domain/payments/` (DOMAIN-0011). Sub-domain type: **generic** (bought adapter,
Stripe). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| "Take card payments" (the whole stated purpose) | `POST /payments`, `GET /payments/{id}` |

No aggregate, no domain event, no business rule — "no business rules live in the adapter." The
API surface is deliberately the thinnest possible proxy over `StripePaymentClient`: a single
create + a status read. Nothing else is invented.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/payments/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid `amount` or card token |
| 402 | `CARD_DECLINED` | Stripe declines the charge |
| 404 | `PAYMENT_NOT_FOUND` | Unknown id |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 502 | `PAYMENT_PROVIDER_UNAVAILABLE` | Stripe unavailable |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

## Flags (carried from the domain model, not resolved here)

- **Charge-on-invoice link to Billing is "implied by the narrative but not wired in the reviewed
  code."** Not modelled as an inbound trigger from `docs/api/billing/openapi.yaml` — this API only
  exposes the capability Payments itself states ("take card payments"), invoked by whichever
  caller is authorized; no assumption about who calls it is asserted.
- **Vendor swap is a stated design goal** ("if a better vendor came along we would swap the
  adapter") — the schema below is provider-agnostic (`cardToken`, `Money`), not Stripe-shaped,
  so the contract survives a provider swap.
