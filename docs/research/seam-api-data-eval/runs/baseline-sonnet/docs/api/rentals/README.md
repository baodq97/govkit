# Rentals API

Source: `docs/domain/rentals/` (DOMAIN-0003). Sub-domain type: **supporting** (orchestration /
transaction script). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| Aggregate `RentalOrder` (deliberately light — transaction script) | `POST /rental-orders`, `GET /rental-orders`, `GET /rental-orders/{id}` |
| Domain event `RentalOrderPlaced` | Webhook `rentalOrderPlaced` — consumed by Billing (Customer-Supplier) |
| Consumes `PriceQuoted` (v2, Published Language, from Pricing) | Not an endpoint of *this* API — see `docs/api/pricing/openapi.yaml#/webhooks/priceQuoted`; Rentals registers a subscriber (`On(PriceQuoted)`) |
| Consumes customer lookup (query, from Customer Accounts) | Called server-side against `docs/api/customer-accounts/openapi.yaml`; not re-exposed here |

`Place` (booking an order and raising its invoice) maps onto `POST /rental-orders`: the creation
IS the placement, and it synchronously drives `Billing`'s `RaiseInvoice` (Customer-Supplier —
Rentals is the customer and drives the API).

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/rentals/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `customerId`, `assetTag`, or `amount` |
| 404 | `RENTAL_ORDER_NOT_FOUND` | `GET /rental-orders/{id}` for a non-existent id |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 502 | `BILLING_UNAVAILABLE` | `RaiseInvoice` to Billing failed (Customer-Supplier dependency down) |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

No 409/422 here: the domain model states **no business rules** for Rentals ("None captured yet —
the input states none"). Do not invent an "order needs a committed reservation + a valid quote"
gate — this is intentionally absent, flagged as an open question in the domain model, not
silently added here.

## Flags (carried from the domain model, not resolved here)

- **No stated invariants.** `POST /rental-orders` performs no cross-aggregate validation beyond
  request-shape checks; whether an order requires a prior `Reservation`/`Quote` is an open
  question (`QUESTIONS.md` in the domain model), not decided by this API design.
- **Rentals' own `Equipment` is kept private, not shared.** The shipped code's `TODO` to share
  Catalog's `Equipment` entity directly is explicitly **not** actioned (would be Shared Kernel
  coupling per the context map). `assetTag` is passed by reference (an id), never an embedded
  Catalog `Equipment` object.
