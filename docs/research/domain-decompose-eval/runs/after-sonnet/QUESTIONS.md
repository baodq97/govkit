# Targeted questions (SKILL.md step 5)

Per the skill's autonomy instructions, these were not blocking — each is recorded here with the
assumption I proceeded on. Flip any of them by editing the model and re-running the skill in
update mode.

## Q1 — Is Pricing core or supporting?

Allocation is explicitly called out in README.md as "the heart of the business... this is where we
win or lose against competitors." Pricing has a real, actively-protected invariant (a
utilization-derived discount floor a rep may never break — "no matter how badly they want the
deal"), but README never uses differentiator language for it the way it does for Allocation.

**Assumption — proceeded as core.** A floor that's enforced against sales pressure and moves with
fleet utilization is a genuine, non-trivial business rule central to revenue capture, not a
commodity calculation. Flip to `supporting` if the business considers dynamic pricing a
non-differentiating necessity.

## Q2 — Is Rentals core or supporting?

Rentals ties a quote and a reservation to an invoice. No invariant of its own is stated anywhere
(no minimum line items, no stated order-level rule) — it reads as orchestration over
Allocation/Pricing/Invoicing, described in one plain sentence in README.md versus the emphatic
language given to Allocation and Pricing.

**Assumption — proceeded as supporting**, modeled as a transaction script with one light aggregate
entry (kept only so `RentalOrderPlaced` has a schema home). Flip to `core` if the business considers
order capture itself a differentiator.

## Q3 — Does Documents deserve its own bounded context?

Documents has a dedicated module and one real invariant (owner/admin-only delete), but it serves
both Rentals and Accounts by a generic `LinkedEntityId`, and `config/teams.yaml` groups it under
`platform` alongside other generic/commodity concerns (erp-sync, crm-import, maintenance).
ddd-methodology.md §2.6 also warns that "owner" is often just an authorization projection, not
evidence of a rich shared domain concept.

**Assumption — proceeded with Documents as its own light `generic` context** (own module boundary,
no aggregate, the ownership rule recorded as an authorization projection rather than a business
invariant). Flip to "capability of Rentals/Accounts" (delete the context, fold the rule into each
owning context) if the team disagrees.

## Q4 — Is the missing Rentals→Allocation wiring intentional?

README.md says Rentals turns "a quote **and a reservation**" into an order, but `Rentals.csproj` has
no project reference to `Allocation`, and `RentalOrderService.Place()` never touches a
Reservation/AssetTag-commit call — it only reacts to `PriceQuoted` and calls Invoicing.

**Assumption — did not fabricate a Rentals→Allocation edge.** Modeled only the evidenced
Rentals→Pricing and Rentals→Invoicing relationships; recorded the gap in context-map.md's Conflicts
table. Confirm whether an orchestrator/saga outside the given source calls
`Allocation.Commit()` before `Rentals.Place()`, or whether this is a real integration gap.

## Q5 — Is SharedDomainRules/GlobalRules live or dead?

Its own README says "every module MUST inherit" from it, but a repo-wide grep found zero references
to `GlobalRules`/`SharedDomainRules` outside its own file — `PricingEngine` computes its own
independent floor formula, `AllocationService` never touches `AllocationPriority`, and `Accounts`
uses a `Segment` vocabulary that doesn't match `GlobalRules.IsCustomer`'s `accountType` values.

**Assumption — treated shipped code as authoritative** (each context's own rule), and flagged
`GlobalRules` as unadopted scaffolding that is *also* a mis-modeled anti-pattern if it ever were
adopted as literally described (a mandatory shared business-rules class is the "universal model"
DDD's bounded contexts exist to eliminate — ddd-methodology.md §2.4, correction 3). See
context-map.md Conflicts row.

## Q6 — Should Vendors be one context or three?

Stripe (payments), Auth0 (identity), SendGrid (email) are unrelated domains wrapped by three
classes in one `RentField.Vendors` namespace/module, each with zero business logic ("no model to
build here").

**Assumption — kept as one `Vendors` context**, matching the actual code module boundary; none of
the three has enough of its own model to justify a separate bounded context. Split it later only if
one of the three grows real business rules.
