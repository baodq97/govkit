# Targeted questions (step 5)

The skill's process says to surface the model and ask **only** about genuine ambiguities. In this
run I did not stop for answers — per the harness instruction, each question is recorded here with
the **assumption I proceeded on**. All are safe to revisit; none block the draft.

---

### Q1 — Is Pricing core or supporting?
**Why it's ambiguous.** The README names **Allocation** as *the* differentiator ("where we win or
lose"). But Pricing carries a proprietary demand-driven floor the code explicitly calls "the rule
that makes this ours" — a classic core signal. A system can have more than one core sub-domain.
**Assumption proceeded on.** Classified Pricing as **core** (DOMAIN-0002, risk High), flagged in
its canvas. If the business sees dynamic pricing as table-stakes rather than a moat, downgrade to
supporting.

### Q2 — Does the canonical asset/fleet registry deserve its own context, or belong in Catalog?
**Why it's ambiguous.** The ERP sync produces clean "asset records," and Allocation / Maintenance /
Rentals all reference units by `AssetTag`, but the README never names a home for the physical-unit
registry. Catalog already holds an `Equipment` shape, yet Catalog is described as "simple lookups."
**Assumption proceeded on.** Modeled a dedicated **Fleet** context (DOMAIN-0008) owning the Asset
registry, with the nightly ERP sync as its ACL. If the team prefers, Fleet's Asset can be folded
into Catalog and the ACL attached there instead.

### Q3 — Is `DepotTransferRequested` a real intended capability, or dead code?
**Why it's ambiguous.** Allocation emits `DepotTransferRequested` when a unit is committed at a
non-home depot, but "nothing listens for this yet — the transfer still gets planned by hand."
**Assumption proceeded on.** Kept the event on the Allocation model and **flagged it as an orphan
emit** in the event-flow continuity check. Did **not** invent a Transfer aggregate or a consumer.
If inter-depot transfer is a real capability, it likely becomes a Logistics handler.

### Q4 — Confirm decomposing `SharedDomainRules`/`GlobalRules` into owning contexts.
**Why it's ambiguous.** The code + its README insist "every module MUST inherit" a single global
rules class (customer definition, allocation priority, money rounding, a 0.35 discount ceiling).
That is a false shared kernel spanning *all* contexts; also, `PricingEngine` ignores the 0.35
ceiling and enforces its own utilization floor.
**Assumption proceeded on.** Did **not** model `GlobalRules` as a context or shared kernel.
Redistributed each rule to its owner (discount → Pricing, customer-def → Accounts, priority →
Allocation, rounding → technical BuildingBlocks) and flagged the 0.35 ceiling as stale. Confirm.

### Q5 — Is `Documents` in scope?
**Why it's ambiguous.** Documents exists in shipped code (with a clear owner-delete rule) but is
absent from the README's capability list and "requests in flight."
**Assumption proceeded on.** Included as a supporting context (DOMAIN-0009), flagged as
code-sourced. Drop it if the README omission was deliberate.

### Q6 — Invoicing: generic vs supporting, and customer-supplier vs partnership?
**Why it's ambiguous.** Billing is a commodity capability (→ generic), but it is built in-house by
a dedicated squad and tightly shaped by Rentals. The README says the two teams "agree the API"
(partnership), while the code says Rentals "drives" it (customer-supplier).
**Assumption proceeded on.** Classified **generic**; modeled the relationship as **customer-supplier**
with Rentals as the driving customer. Adjust if billing is considered a supporting investment or a
true partnership.

---

## Gaps noted (not fabricated into the model)
- **ERP "cost records."** The ERP notes mention cost records arriving alongside assets, but no cost
  model exists in code — left out, noted in Fleet's canvas.
- **Rentals order rules.** No stated invariants on order status transitions or max units per order —
  not invented; left as "None captured yet."
- **Order activity history / `audit_log`.** Deliberately excluded as data-layer audit metadata
  (convenience only, no legal/retention angle) — see "Deliberately NOT modeled" in `context-map.md`.
