# Invoicing bounded context

> Canvas tier: **full (core)** — `subdomain_type: core` earns all sections plus the interface
> critique. That tier is contested (see below). No prior `README.md` existed: first canvas, no merge.

## Purpose

Turn work Nordic Freight has already performed into money it can collect: bill customers for
forwarding and surcharges, apply the correct VAT for the port the goods moved through, issue credit
notes when a charge is wrong, chase what is unpaid, and match incoming payments to what is owed.
Actors: finance analysts, and the customers who receive the invoice.

That sentence needs three "and also"s. Billing, tax determination across nine ports, and receivables
(dunning, allocation) are three responsibilities behind one boundary — a finding for `3-decompose`,
recorded below, not written around here.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core | `docs/domain/invoicing/model.yaml` — `subdomain_type: core` |
| Business-model role | compliance enforcer | `docs/domain/business-model.md` |
| Evolution | commodity | `docs/domain/business-model.md` |
| Differentiating | no | `docs/domain/business-model.md` |

**These disagree, and the disagreement is the headline finding.** A commodity, non-differentiating
compliance enforcer carrying the largest declared mass in the model (34 tables / 311 attributes,
densest entity 128 attributes) is the classic shape of a context labelled core because it is *big*,
not because Nordic competes on it — the one capability `business-model.md` marks as differentiating
carries a seventh of this mass.

Not re-classified here — `5-strategize` owns that, and there is **no `docs/domain/core-domain-chart.md`
on disk**, which is why nothing has adjudicated it. Proposal to `5-strategize`: rule on core vs
supporting for Invoicing. If it lands as supporting or generic, this canvas should shrink to ≤90
lines or a stub.

## Domain roles

- **Execution** — enforces the billing workflow (issue → credit → dun → allocate).
- **Compliance / tax determination** — `model.yaml` notes: *"Three of the five aggregates exist to
  model VAT variations across the nine ports; two were added when the Finnish tax rules changed in
  2024."* Six of eleven years of growth here was driven by regulators, not by Nordic.
- **Master data** — `SurchargeSchedule` is a rate table, a different thing from an invoice.

Three roles, three change rhythms. Not a Brain Context though — outbound is one event and zero
commands, so its failure mode is the opposite: an interface too thin for what it owns.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Customs | bounded context | *unnamed* — declaration clearance state | *untraced* | downstream (`model.yaml` `relationships`) |

**Nothing is traced.** `docs/domain/message-flows/` does not exist, so no inbound message has a name,
a type, or a payload — including the one that makes an invoice exist at all. The Customs row is a
declared *relationship*, not an observed message. Proposal to `6-connect`: trace this boundary; the
interface critique below is provisional until it is.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Notifications | bounded context | `InvoiceIssued` (invoiceId, customerId, total) | event | upstream (`model.yaml` `relationships`) |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Consignment | A billable line on an invoice | **Yes** — operations means a physical stack of pallets. Open hotspot (finance analyst) |
| Surcharge | Any fee added to the forwarding rate | Unknown — `Quoting` also deals in rates; not compared |
| Invoice line | Carries `vatCode`; must reference a cleared declaration | n/a |

The `Consignment` clash is the strongest evidence on this canvas that the boundary is real: two
groups already use one word for two things, and Invoicing owns the financial meaning.

## Business decisions

Stated, with attribution — nothing here is inferred.

- **An invoice line must reference a cleared declaration.** (`model.yaml` `invariants`.) This
  invariant reaches across a boundary: the fact it depends on lives in `Customs`. It cannot be
  enforced inside the `Invoice` aggregate.
- **The Guaranteed Consolidation premium is charged whether or not the container ends up full.**
  (finance analyst, `docs/domain/discovery/`.) No traced message says *which* context applies it.

Four of five aggregates — `SurchargeSchedule`, `CreditNote`, `DunningCase`, `PaymentAllocation` —
declare **no** entities, events or invariants. The rules that govern crediting, dunning and payment
matching are unwritten. That absence, on the context holding the model's largest mass, is a finding.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Change cadence | Tax rules change per jurisdiction and force structural change | 2 of 5 aggregates added for one 2024 rule change | `model.yaml` notes | **yes** — argues for isolating tax determination |
| Correctness (cross-context) | No invoice line may be billed against an uncleared declaration | — | `model.yaml` invariants | **yes** — needs a `Customs` event or policy, not a join |
| Auditability | VAT-bearing invoices must be reconstructible for tax authorities | unknown — finance analyst can supply | inferred from compliance-enforcer role | **yes if confirmed** — history becomes domain state |
| Volume | Invoices per month, today and in two years | unknown — finance analyst | not stated | no |

Nothing else was elicited: the quality storming has not been run with the room. Only the first two
rows are sourced from artifacts; the rest are marked unknown rather than invented.

## Assumptions

Domain:

- *(inferred)* An invoice is created only after customs clearance — read backwards from the
  invariant. Nothing states the actual trigger.
- *(inferred)* Nine ports are nine tax variations of **one** billing model, not distinct products.
  If false, the three VAT aggregates are separate contexts, not variations.
- *(inferred)* Invoicing, not `Quoting` or `Consolidation`, applies the Guaranteed Consolidation
  premium. The rule is stated; the owner is not.
- *(inferred)* Invoicing never needs the operational meaning of *consignment* (physical pallets).

Scale / behaviour:

- *(inferred)* The 311 attributes reflect regulatory variation, not transaction volume — so
  splitting by tax regime would reduce the model more than sharding by volume ever would.
- *(inferred)* Eleven years of growth means live data in all 34 tables; nothing here is dead.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Share of commits touching `invoicing/` that are tax/VAT-regime driven. **Prediction: >50% over two quarters** | If it holds, tax determination is a separate concern (extract or buy) and "core" is wrong | VCS history + tracker labels |
| How often `Invoicing` and `Customs` change in the same PR. **Prediction: <25%** | If higher, the cleared-declaration invariant is cutting across a boundary that is in the wrong place | CI / VCS change coupling |
| Number of distinct teams opening PRs here per quarter | >1 on a context this size means ownership is de facto shared and the boundary is not holding | Issue tracker |
| Attribute churn on the 128-attribute entity | A god-entity that keeps growing says the aggregate boundary inside `Invoice` was never drawn | VCS history |

## Open questions

1. Is Invoicing core, or was it labelled core because it is the biggest thing on disk? Unresolved —
   `model.yaml` says core, `business-model.md` says commodity and non-differentiating, and no
   `core-domain-chart.md` exists. (for `5-strategize`)
2. Does *consignment* mean the billable line or the pallet stack, and who decides? Open hotspot,
   raised by the finance analyst, no owner named.
3. What creates an invoice? No inbound message is traced anywhere in the model.
4. Which context charges the Guaranteed Consolidation premium?
5. When a partner carrier refuses a sealed container — the third open hotspot, planner, no owner —
   does that produce a credit note? `CreditNote` has no declared trigger.
6. What retention period applies to VAT-bearing invoices? Nobody has stated one.

Six open questions on a context declared core. The room that could close 2, 4 and 5 (finance analyst
+ planner + customs clerk together) has not met.

## Interface critique

1. **Coherent names?** One message, `InvoiceIssued`, for a context that also credits, duns and
   allocates payments. Coherent, but nowhere near covering the description.
2. **Right types?** `InvoiceIssued` is correctly an event. Nothing to critique inbound — nothing is
   named there, which is itself the answer.
3. **Too big?** Inverted: too small. Five aggregates and 311 attributes behind a single event.
   Neighbours who need credit or payment state have no message to use, so they will reach into the
   data instead.
4. **Exposing internals?** `InvoiceIssued`'s payload is a fact, not internals — fine. The exposure
   risk runs the other way: satisfying "line must reference a cleared declaration" by reading
   `Customs`' declaration tables would make `Customs` leak. A `DeclarationCleared` event would not.
5. **Belongs elsewhere?** `SurchargeSchedule` — *"any fee added to the forwarding rate"* — is rate
   data, and `Quoting` owns rates.

**Perturbation 1 — move the three VAT-variation aggregates into a `TaxDetermination` context
(proposed).** Invoicing loses most of its mass and its fastest-changing part; the 2024-style
regulatory change stops touching the billing model. Cost: `InvoiceLine.vatCode` becomes a
cross-boundary lookup, and the invoice must record the tax decision it was given so audits stay
reproducible. Worth the cost — this is the change the metrics above are designed to confirm.

**Perturbation 2 — move `SurchargeSchedule` to `Quoting` (rejected for now).** It removes rate
maintenance from Invoicing, but a quoted rate and a billed rate diverge over time and invoices must
reproduce the schedule that was in force on the invoice date. Retest once `Quoting`'s canvas states
whether it versions rates.

## Proposals to other steps

Recorded here, not applied — those files belong to their owning skills.

- `5-strategize` / `1-understand`: adjudicate core vs commodity (Q1); produce `core-domain-chart.md`.
- `3-decompose`: Invoicing carries three responsibilities and the model's largest mass; split
  candidate is Perturbation 1. Also, four of five aggregates have no declared entities or
  invariants — the decomposition of this context is nominal.
- `6-connect`: no message flows exist for this boundary; the inbound interface is unknown.
- `2-discover`: close the *consignment* hotspot; obtain the retention rule and invoice volumes.
