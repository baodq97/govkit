# Targeted questions (step 5) — asked, but not blocking

The skill's step 5 says to surface the model and ask **only** about genuine ambiguities. Per the
run harness I do not stop for answers: each question is recorded here with the **assumption I
proceeded on**, and the first-pass model reflects that assumption. These are the points a human
should confirm; none is a fabricated rule.

## Q1 — Is Rentals core or supporting?
**Ambiguity:** The README names the differentiators as **Allocation** ("the heart… where we win or
lose") and **Pricing** ("the rule that makes this ours"). Rentals is described as orchestration —
"turning a quote and a reservation into a booked order, then handing it to billing."
**Assumption proceeded on:** **core** — Rentals owns the central `RentalOrder` aggregate and the
commercial transaction lifecycle, but I flagged it as the lightest of the three cores.
**If supporting instead:** demote to a transaction-script over `RentalOrder`, `aggregates: []`.

## Q2 — Is Invoicing supporting or generic?
**Ambiguity:** Billing is the canonical *generic* subdomain, but here it is an **internal** service
with a **custom** API that Rentals drives — not a bought commodity.
**Assumption proceeded on:** **supporting**, with a **Customer-Supplier** relationship (Rentals is
the customer that holds the pen on the contract).
**If generic instead:** treat like the vendor adapters (`bought-adapter`, no model).

## Q3 — Discount policy: do the floor and the ceiling both apply?
**Ambiguity:** Three sources disagree. Draft note: "no minimum." `PricingEngine`: a utilization-
derived **price floor**. `GlobalRules.MaxDiscountRate = 0.35`: a **discount ceiling**.
**Assumption proceeded on:** the two code mechanisms **both apply** (a rep may discount at most 35%,
and never below the utilization floor); the draft "no minimum" is stale and retired.
**Confirm:** that both coexist and which is authoritative when they conflict at high utilization.

## Q4 — Dissolve `SharedDomainRules` / `GlobalRules` into the owning contexts?
**Ambiguity:** The rules are real, but "every module MUST inherit `GlobalRules`" is a shared-kernel
anti-pattern that blocks context autonomy.
**Assumption proceeded on:** the rules belong to their natural owners — discount ceiling + rounding →
Pricing, allocation priority → Allocation, customer/active-rental definitions → Accounts/Rentals —
and I attributed them there while flagging `GlobalRules` for dissolution.
**Confirm:** the relocation, and each rule's true owner, before any service split.

## Q5 — One `VendorIntegrations` context, or split Payments / Identity / Notifications?
**Ambiguity:** The code and config group Stripe / Auth0 / SendGrid as one set of thin adapters
("no model to build here"); the DDD default treats payments / auth / email as three generic
subdomains.
**Assumption proceeded on:** **one grouped generic context** (right-sizing — no ceremony for three
model-less adapters).
**If split:** three generic contexts, each `aggregates: []`, `bought-adapter`.

## Q6 — Who is the system-of-record for the Equipment/Asset registry?
**Ambiguity:** `Catalog.Equipment`, the ERP ACL's `AssetRecord`, and a **duplicate** private
`Equipment` class in Rentals (with a TODO to "share Catalog's Equipment entity directly") all model
the same unit.
**Assumption proceeded on:** **Catalog** is the canonical system-of-record; the ERP ACL feeds it;
Rentals should consume Catalog's `Equipment` and drop its duplicate.
**Confirm:** the asset registry's owner.

## Q7 — Is Logistics the intended consumer of `DepotTransferRequested`?
**Ambiguity:** Allocation emits `DepotTransferRequested` when a commit lands off the home depot, but
"nothing listens for this yet — the transfer still gets planned by hand." It is an **orphan emit**.
**Assumption proceeded on:** left it as an unconsumed event and **flagged** it (did not invent a
handler). Candidate consumer noted: Logistics, which already plans hand-offs.
**Confirm:** whether Logistics should subscribe, or the event should be dropped.

## Q8 — Does the order activity-history (`audit_log`) stay infrastructural?
**Ambiguity:** Sales wants a "who touched this order and when" timeline, explicitly "no legal or
retention angle… a convenience."
**Assumption proceeded on:** **infrastructural audit metadata**, deferred to the data-model skill —
not a domain context, aggregate, or domain-event stream.
**Confirm:** that no legal/retention requirement is coming; if one is, it would promote to a domain
concern.
