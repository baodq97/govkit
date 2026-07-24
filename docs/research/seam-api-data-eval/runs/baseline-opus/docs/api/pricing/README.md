# Pricing API (DOMAIN-0002, core)

Quote a dynamic rental price that moves with fleet utilization and can **never fall below a
utilization-derived floor**. This is the load-bearing extraction seam: the `PriceQuoted`
Published-Language contract is what Rentals depends on — never Pricing internals.

## Aggregate → resource / event → endpoint mapping

| Domain element | Kind | API surface |
|---|---|---|
| `Quote {category, amount, utilization, contractVersion}` | aggregate root | `/quotes` collection + `/quotes/{quoteId}` item |
| `Utilization {ratio}` | value object | embedded `utilization` field (0..1) |
| `PriceFloor {amount}` | value object | embedded read-only `floor` field on the quote response |
| `Quote(category, listRate, utilization, requestedDiscount)` | command | `POST /quotes` |
| `PriceQuoted` (v2) | domain event | `webhooks.priceQuoted` — **Published Language / OHS** (→ Rentals) |

## Resource model

Request a quote with `category`, `listRate` (a Money Building Block), `utilization` (0..1), and a
`requestedDiscount`. The engine returns the honoured `amount` — the requested discount is applied
only down to `floor = listRate × (0.60 + 0.40 × utilization)`. At 100% utilization the floor equals
the full list rate (no discount at all).

### Stateless-today flag (QUESTIONS Q-A3)

The domain notes Pricing is currently a **stateless domain service** (`PricingEngine`) — there is
**no persisted `Quote` entity yet**. `POST /quotes` is therefore modelled two ways and the choice is
a flagged open question:
- **As designed (target):** `POST /quotes` → `201 Created` with a `quoteId` + `Location`, and
  `GET /quotes/{quoteId}` retrieves it (Quote becomes an entity referenced by the RentalOrder).
- **Today's reality:** the computation is transient. If the entity decision does not land, treat
  `POST /quotes` as `200 OK` returning the computed offer with **no** persistence and drop
  `GET /quotes/{quoteId}`.

Both are shown in the spec; `GET /quotes/{quoteId}` is marked provisional. Not silently decided.

## Invariants → API behaviour

| Invariant | Enforced as |
|---|---|
| A quote may never fall below the utilization floor | The engine clamps `amount` to `floor`; the response echoes `floor` so the caller can see the clamp. A `requestedDiscount` that would breach the floor is honoured only to the floor (not an error). |
| The floor climbs with utilization; at 1.0 the floor is the full list rate | Derived server-side; `utilization` outside `0..1` → `422 invalid-utilization`. |

## Versioning / deprecation — the load-bearing contract

- **HTTP surface:** URI-versioned `/v1`.
- **`PriceQuoted` event payload:** independently versioned as a Published Language contract.
  `contractVersion` is carried in the payload; **v2 is current, v1 deprecated**. Each side
  translates at its own edge; Rentals is wired to the contract only. Deprecation of the v1 payload
  follows the standard policy: `Deprecation: true` + `Sunset` on any v1 delivery, 6–12 month
  overlap, successor-version link to v2. Keeping this contract as its own artifact (not dissolved
  back into Pricing) is what makes Pricing the cleanest service to extract first.

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 400 | `validation-error` | malformed body |
| 401 | `unauthorized` | missing/invalid JWT |
| 404 | `quote-not-found` | unknown `quoteId` (provisional endpoint) |
| 422 | `invalid-utilization` | utilization outside 0..1 |
| 429 | `rate-limit-exceeded` | throttled |
