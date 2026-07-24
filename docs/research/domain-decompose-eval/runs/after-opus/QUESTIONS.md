# Targeted questions (step 5) — RentField domain-decompose

The skill's step 5 says to surface the model and ask **only** about genuine ambiguities. This is
an autonomous eval run, so I do not stop: each question below is recorded with the **assumption I
proceeded on**. A human should confirm or correct these before the model advances past draft.

Batched, ranked by impact:

## Q1 — Pricing floor: three-way disagreement (highest impact)
The stale draft says "no minimum discount"; `GlobalRules.MaxDiscountRate` says a flat `0.35`
ceiling; the shipped `PricingEngine` enforces a **utilization-derived floor**
(`listRate × (0.60 + 0.40 × utilization)`). These cannot all be true.
- **Assumption proceeded on:** the shipped `PricingEngine` floor is authoritative (running code
  over a draft doc); the draft "no minimum" note is obsolete; `GlobalRules.MaxDiscountRate` is a
  contradictory duplicate to be dissolved. Recorded in context-map Conflicts.
- **Confirm:** is the utilization floor the real, current rule, and should `GlobalRules`'s flat
  ceiling be removed?

## Q2 — `GlobalRules` / `SharedDomainRules` dissolution
The `SharedDomainRules` module forces one global definition of "customer", the discount ceiling,
and allocation priority across every context — the single-universal-model anti-pattern.
- **Assumption proceeded on:** flagged as an anti-pattern and recommended for dissolution into
  per-context models + governance tests (technical rounding kept as a Building Block). **Not
  enacted** — this is a recommendation, not a change.
- **Confirm:** do you want to dissolve `GlobalRules`, and are "customer" / "allocation priority"
  genuinely context-specific (polysemic) rather than one shared definition?

## Q3 — Allocation aggregate boundary (set-based invariant)
The no-overlap invariant spans **all** live reservations for one asset, but the code models each
`Reservation` individually with a service enforcing overlap across the shared book.
- **Assumption proceeded on:** modelled the aggregate as `Reservation` (matching the code) and
  flagged that the true consistency boundary may be a **per-asset reservation book**.
- **Confirm:** should the aggregate root be a per-asset booking (holding that asset's reservations)
  so the no-overlap invariant is enforced inside one aggregate?

## Q4 — Rentals: core vs supporting, and its invariants
`RentalOrderService` is thin orchestration; no invariant is stated (e.g. "an order requires a
committed reservation and a valid quote").
- **Assumption proceeded on:** classified Rentals **supporting** (transaction script) with a light
  `RentalOrder` aggregate that only carries the `RentalOrderPlaced` event; asserted **no**
  invariants (none were stated — not invented).
- **Confirm:** does placing an order require a committed reservation + a non-expired quote? If so,
  that is a real invariant that would promote Rentals toward a richer model.

## Q5 — RentalOrder ↔ Reservation atomic consistency
An order references a committed unit, but order-placement and reservation-commit live in different
contexts.
- **Assumption proceeded on:** kept them as **separate aggregates with eventual consistency** (the
  order references the reservation by id; no distributed transaction).
- **Confirm:** must an order and its reservation commit atomically, or is eventual consistency
  (with compensation on failure) acceptable?

## Q6 — Pricing `Quote`: entity or transient value?
Today `PriceQuoted` is a transient value on the versioned contract — no persisted `Quote` with
identity/lifecycle.
- **Assumption proceeded on:** modelled the floor invariant under a `Quote` aggregate but noted it
  is currently a stateless calculation; did not invent persistence.
- **Confirm:** should a `Quote` be persisted (identity + lifecycle, referenced by the order), or
  remain a computed value?

## Q7 — `DepotTransferRequested` — orphan event
The code emits `DepotTransferRequested` when a unit is committed away from its home depot, but
"nothing listens for this yet — the transfer still gets planned by hand."
- **Assumption proceeded on:** flagged it as an unconsumed event in the event-flow check; **did
  not invent** a depot-transfer handler/flow the input never describes.
- **Confirm:** should a depot-transfer handler consume this event (automate the move), or is manual
  planning the intended design?

## Q8 — Billing: modelled context vs external system
The Billing team runs the invoicing service internally; we hold only `IInvoicingPort`.
- **Assumption proceeded on:** included Billing as a bounded context (Customer-Supplier with
  Rentals) but emitted **no domain model** — the invoice model is owned by the Billing team.
- **Confirm:** correct to treat Billing as an internal Customer-Supplier context whose model we do
  not own here?

## Q9 — Generic vendors as separate contexts
Payments (Stripe), Identity (Auth0), Notifications (SendGrid) are all off-the-shelf.
- **Assumption proceeded on:** modelled them as three **generic** contexts with `aggregates: []`
  (bought behind thin adapters, no domain model), rather than lumping them or building models.
- **Confirm:** fine to keep them as declared-generic, no-model contexts?
