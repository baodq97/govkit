# Rentals API (DOMAIN-0003, supporting)

Turn a quote and a reservation into a booked order, then hand it to billing. Deliberately light
(transaction script); the single aggregate exists mainly to carry the `RentalOrderPlaced` event.

## Aggregate → resource / event → endpoint mapping

| Domain element | Kind | API surface |
|---|---|---|
| `RentalOrder {orderId, customerId, assetTag, amount}` | aggregate root | `/orders` collection + `/orders/{orderId}` item |
| `Place` | command | `POST /orders` — booking the order (and raising its invoice) |
| `RentalOrderPlaced` | domain event | `webhooks.rentalOrderPlaced` (→ Billing, Customer-Supplier) |
| `Quote` (consumed `PriceQuoted`) | Published Language input | `amount` on the order + `quoteContractVersion` provenance field |

## Cross-context references (id only — no shared entity)

| Field | Points at | Rule |
|---|---|---|
| `customerId` | Customer Accounts `SalesAccount.accountId` | lookup via `GET /accounts/{accountId}`; stored as an id, never a shared row |
| `assetTag` | the committed unit (Allocation Reservation / Asset Sync) | id reference only |
| `amount` | last `PriceQuoted` from Pricing | consumed from the versioned contract |

> **Coupling flag (from domain):** a code `TODO` proposes sharing Catalog's `Equipment` entity
> directly — that is Shared Kernel coupling and is **not** actioned. Rentals keeps its own reference
> by id / private duplicate. Recorded, not enacted (QUESTIONS Q-A4).

## Business rules

**None stated in the domain.** The tempting "an order needs a committed reservation and a valid
quote" rule is **not invented** — it is flagged as an open question (QUESTIONS Q-A5), not asserted
as a `409`/`422`. The API accepts a `Place` and emits `RentalOrderPlaced`.

## Request in flight — activity history (declined as a resource)

Sales wants a timeline of who touched an order. The domain **declines** this as a first-class
concept: it is "a convenience… no legal or retention angle," mapped to the cross-cutting
append-only audit store, not a Rentals aggregate. A read-only `GET /orders/{orderId}/activity`
backed by that store is sketched in the spec as **optional/future** and flagged (QUESTIONS Q-A6) —
it is not part of the RentalOrder aggregate and adds no write path.

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 400 | `validation-error` | malformed body |
| 401 | `unauthorized` | missing/invalid JWT |
| 404 | `order-not-found` | unknown `orderId` |
| 422 | `unprocessable-order` | reserved for a future placement rule (none today) |
| 502 | `billing-unavailable` | downstream Billing `RaiseInvoice` failed |

## Versioning / deprecation

URI-versioned `/v1`. Rentals consumes Pricing's `PriceQuoted` contract at its published version
(`quoteContractVersion`) and translates at its own edge.
