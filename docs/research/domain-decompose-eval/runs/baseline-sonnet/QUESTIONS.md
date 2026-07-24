# Targeted questions (SKILL.md step 5)

Per the run instructions, this run does not stop to wait for answers — each question below is
recorded together with the assumption the model proceeded on, then the decomposition continued.
These are genuine ambiguities (per step 5's five categories), kept separate from the
already-resolved draft-vs-code conflicts in `context-map.md` (those are resolved deterministically:
running code wins).

## Q1 — Is Pricing core or supporting?
README explicitly calls Allocation "the heart of the business... where we win or lose against
competitors" but never uses that language for Pricing, even though Pricing has a real differentiating
algorithm (a utilization-driven discount floor) and its own versioned Published Language contract
(`PriceQuoted` v1→v2, explicitly "STABLE INTEGRATION CONTRACT").

**Assumption proceeded on:** classified Pricing as **core** — the floor-pricing rule and the
investment in a stable, versioned contract read as a genuine competitive lever, not a commodity.
Flagged in the Core Domain Chart for confirmation rather than asserted as settled.

## Q2 — Is Rentals core or supporting/orchestration glue?
Rentals' own code is mostly orchestration: it reacts to Pricing's quote, calls Allocation's outcome
implicitly (an already-committed asset tag), and calls Invoicing. It states no invariant of its own.
But its `OrderId` is a real identity referenced elsewhere (`audit_log.entity_id` for
`entity_type = 'rental_order'`), i.e. it has independent lifecycle/identity even though this slice
of code never shows a persisted collection for it.

**Assumption proceeded on:** classified Rentals as **core** — it's the aggregate that represents the
actual paid transaction (the thing that generates revenue), even though the differentiating rules
live in the contexts it composes (Allocation, Pricing). Flagged for confirmation.

## Q3 — "crm-import" (config) vs `Accounts` (code): same capability?
`config/teams.yaml` lists the platform team as owning a module named `crm-import`, but no
`CrmImport` folder or class exists anywhere in `src/`. The closest match is
`src/Accounts/CustomerAccountService.ImportFromCrm`.

**Assumption proceeded on:** treated these as the **same capability** and used the code's `Accounts`
as the canonical bounded-context name; flagged `teams.yaml`'s `crm-import` as a stale/renamed
reference in the Conflicts table rather than modelling a second, empty `CrmImport` context.

## Q4 — Do ErpSync's assets reconcile with Catalog's equipment?
`ErpSync.AssetRecord` (from the nightly ERP feed) and `Catalog.Equipment` both carry a `Tag` +
`Category` shape, and `Allocation` separately references equipment by a bare `AssetTag` string. No
code links these three together — nothing reads an `AssetRecord` after `ErpSync` upserts it.

**Assumption proceeded on:** modelled `ErpSync` and `Catalog` as two independent contexts with no
stated integration between them (did not invent a reconciliation rule or a shared identifier
mapping), and flagged the silent-drift risk (finance's ERP-derived view of an asset vs. the
operational catalog's view could diverge unnoticed) rather than asserting they're the same record.

## Q5 — Should "order placed" and "invoice raised" be one atomic transaction?
(Aggregate-design-canvas explicitly calls for asking when state that must stay atomically consistent
spans candidate aggregates.) As read, `RentalOrderService.Place()` calls
`_invoicing.RaiseInvoice(...)` directly and *also* publishes `RentalOrderPlaced`, which
`InvoicingClient` handles by calling `RaiseInvoice(...)` again — appearing to raise the invoice
twice per order.

**Assumption proceeded on:** modelled "Rentals → Invoicing" as a single logical customer-supplier
relationship (one event, one call, per the intent both comments describe) and flagged the apparent
double-trigger as a code-level defect for the team to resolve — did not silently pick one path and
hide the other, and did not invent an idempotency rule neither source states.

## Q6 — Is Documents actually coupled to Rentals and Accounts?
README prose says Documents stores files "attached to rentals and accounts." The code only shows a
generic `LinkedEntityId` string on `Document` — no import/reference from `Rentals` or `Accounts` to
`Documents`, and no reverse reference either.

**Assumption proceeded on:** modelled `Documents` as a standalone context with **no formal
relationships** in `model.yaml`, showing the Rentals/Accounts association in `context-map.md` only
as a dashed, "conceptual only, not coded" edge — did not assert a relationship type (e.g.
`downstream`) the code doesn't actually establish.
