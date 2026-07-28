# Invoicing — Bounded Context Canvas

**Tier: stub** — the business model classifies this capability `compliance-enforcer / commodity / does not differentiate`. Carried from `business-model.md`, not re-derived; the clash with `model.yaml`'s `subdomain_type: core` is an open question below, not a local edit.

## Purpose

Bill customers for the freight they have shipped, and show nine ports' tax authorities that the VAT charged is the VAT owed. Serves the finance staff who raise and chase invoices, and the exporters who receive them.

## What it is bought from

Nothing yet — and that is the finding. No vendor, package or contract is named anywhere in `docs/domain/`, while `invoicing/model.yaml` declares the largest mass in the model (5 aggregates, 34 tables, 311 attributes) "grown over eleven years", of which "three of the five aggregates exist to model VAT variations across the nine ports; two were added when the Finnish tax rules changed in 2024". `commodity` states where this capability belongs, not where it is. Buy target: the tax/VAT rule engine (3 of the 5 aggregates). `Invoice`, `CreditNote`, `PaymentAllocation` and `DunningCase` are ledger shapes any billing product ships. Nothing declared here differentiates Nordic Freight.

## The adapter's interface

From `model.yaml` only — `docs/domain/message-flows/` is empty, so nothing below was traced from observed use.

| direction | message | type | collaborator | relationship |
|---|---|---|---|---|
| in | none traced | — | Customs | downstream — Invoicing conforms to Customs |
| out | `InvoiceIssued` (invoiceId, customerId, total) | event | Notifications | upstream — published language |

The single declared invariant — *"An invoice line must reference a cleared declaration"* — is the adapter's whole design problem: a rule about Customs state, enforced inside Invoicing. A bought package cannot hold it, so it moves into the ACL or back to Customs. Proposal for `3-decompose`, which owns `model.yaml`.

## Assumptions (inferred — attack these)

- Ledger and tax engine get bought as one thing; unbundling them has not been costed.
- The nine ports' VAT variations fit a product's rate tables rather than code. The entire buy case rests on this one.

## Open questions

- `model.yaml` says core; `business-model.md` says commodity and non-differentiating. 4 of 7 contexts are labelled core while 1 capability differentiates, so the tier follows the business model — but the fork is live on disk. Finding for `5-strategize` / `3-decompose`.
- "Consignment" means *a billable line* here and *a physical stack of pallets* to operations (discovery hotspot, finance analyst). A package imposes one of those meanings; nobody has said which side translates.
- "The premium is charged whether or not the container ends up full" (finance analyst, discovery) — no context is assigned that charge. Invoicing or Consolidation?
- Verification metric (collectable, from git/CI): PRs touching `docs/domain/invoicing/` and `docs/domain/customs/` together. If it stays high after a buy, the invariant never really moved.
