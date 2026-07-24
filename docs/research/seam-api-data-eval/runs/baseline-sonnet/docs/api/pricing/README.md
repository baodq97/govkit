# Pricing API

Source: `docs/domain/pricing/` (DOMAIN-0002). Sub-domain type: **core**. Status: draft,
owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| Aggregate `Quote` (root: Quote; currently a **stateless calculation**, no persisted entity) | `POST /quotes` — a computation endpoint, not a resource-with-id (see Flags) |
| Value object `Utilization` | Inline `utilization` field (0..1) |
| Value object `PriceFloor` | Inline `floor` field on the response (computed, read-only) |
| `List Rate` (`Money` Building Block) | Inline `listRate: Money` request field |
| Domain event `PriceQuoted` (v2) | Webhook `priceQuoted` — **Published Language / Open-Host Service** consumed by Rentals |

`Quote(category, listRate, utilization, requestedDiscount)` (the inbound command) maps directly
onto `POST /quotes`; the response *is* the quote and *is* what gets published as `PriceQuoted`.

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/pricing/v1`.
`PriceQuoted` is versioned independently as a Published-Language contract (currently **v2**) —
see `PriceQuotedEventV2` schema. Bumping the event's contract version does not require bumping
the API's own `/v1` path; the two evolve on separate tracks (contract vs. transport), consistent
with `Pricing.Contracts` being the load-bearing extraction seam noted in the context map.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid `category`, `listRate`, or `utilization` outside `[0,1]` |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | Standard auth failures |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

There is no 409/422 here: the floor is enforced by *silently clamping* the requested discount
(the invariant "never below the floor" is expressed by the computed `amount`, not by rejecting
the request) — this is what "honoured only down to the floor" means in the ubiquitous language.
Not a fabricated rule: the domain model states the floor is a computed clamp, not a validation
gate.

## Flags (carried from the domain model, not resolved here)

- **`Quote` has no persisted identity today** — the domain model's open question
  (entity-vs-value-object) is unresolved. `POST /quotes` therefore returns **200 OK** (a computed
  representation), not 201/Location. If `Quote` becomes a persisted entity referenced by
  `RentalOrder`, add `GET /quotes/{id}` and switch to 201 — not done here, flagged only.
- **`GlobalRules.MaxDiscountRate = 0.35`** (the flat, global ceiling) is a superseded duplicate
  per the context-map Conflicts table; this API implements only the utilization-derived floor
  from `PricingEngine`, never the flat rate.
