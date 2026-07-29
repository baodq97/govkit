---
id: DOMAIN-0010
title: FiscalRecord bounded context
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# FiscalRecord bounded context

**Right-sizing.** Supporting, with the deep sections filled: its whole reason to be a context is a retention rule that is legally mandated, varies by country and outlives everything around it, so quality attributes and assumptions matter more than the interface. No swimlanes — it decides nothing.

## Purpose

Keeps the one thing a tax auditor asks for — site, entry time, exit time, amount, VAT, payment method and the machine it was paid at — for as long as that country requires. Serves the **operator**, the party audited, and the **tax auditor**, the only reader.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting; the chart plots it generic / mission-critical parity — "a GoBD failure loses Germany, and Germany is the first market" | `core-domain-chart.md` (x 0.25, y 0.10) |
| Business-model role | compliance enforcer, differentiation recorded as `no` | `business-model.md`, capability table |
| Evolution | **unknown** — the capability table records no stage; the chart expects it to become a cost sink | `business-model.md`; chart trajectory row |

## Communication

Split by initiator, not by data flow. `FiscalRecordRetained` has no internal consumer by design — the consumer is outside the system — and both inbound edges have no named message anywhere in the model, the same gap flow 2.3 records on the money leg.

| Dir | Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|---|
| in | ParkingVisit | bounded context | entry time, exit time, amount, VAT — **no named message exists** | event | published language, downstream |
| in | PaymentCapture | bounded context | payment method, the machine paid at — **no named message exists** | event | ACL, downstream |
| out | Tax auditor | external actor | the retained record | query | — |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Fiscal record | site, entry, exit, amount, VAT, payment method, machine paid at. **Not the plate** | **yes** — `INPUT.md` §6 says "the ticketing information", which is a wider and vaguer set |
| Retention period | per country: DE 10 years (GoBD), AT 10, NL 7, FR unknown | **yes** — `INPUT.md` §6 states a flat 10 years, which the expert refused |

## Business decisions

| Rule | Source |
|---|---|
| The record kept is site, entry time, exit time, amount, VAT, payment method, and the machine it was paid at | EXPERT 2026-07-27 |
| The plate is **not** in the fiscal record; it lives only in the garage camera system and dies at 7 days | EXPERT 2026-07-27 |
| Retention is per country — DE and AT ten years, NL seven, FR unknown. "Do not build ten years into the code" | EXPERT 2026-07-27 |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Retention | per country, configurable, and explicitly not hard-coded | DE 10, AT 10, NL 7, FR **unknown** (H8) | EXPERT | **yes** — the period is data, and it is the reason this is a context rather than a table |
| Immutability | a record a tax auditor relies on cannot be quietly amended | unstated, but implied by the purpose | absence recorded | **yes if stated** — append-only is a modelling decision nobody has actually taken |
| Longevity vs identity | the record must outlive the visit, the card and possibly the customer relationship | 10 years vs ~100 visits per card | EXPERT, H13 | **yes** — with no visit identity (H13) there is nothing durable to key a decade-old record by |
| Completeness | an offline exit produces no exit time today | flow 4.2 | absence recorded | **yes** — a legally required field is missing on a path the business deliberately keeps |
| Privacy | the plate is excluded, on a works-council agreement | 7-day deletion elsewhere | EXPERT | no here — it is a constraint on what may arrive |

## Assumptions

Exactly one fiscal record exists per visit (**inferred**; a stay paid twice — the expired-window case —
emits two payment events and nobody said whether that is one record or two). The country is derived from
the site (**inferred**; nobody said so, and it is what the retention period is keyed by). The record is
written once at exit (**inferred**), and VAT arrives already computed (**inferred**; no context owns the calculation — see Tariff).

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Exits with no complete fiscal record; predicted 0, actual today = every offline exit | whether the compliance obligation is actually met on the path the business insists on keeping | production, once live |
| Countries live ÷ retention periods configured; predicted 1.0 | whether "do not build ten years into the code" survived contact with a deadline | the config itself |
| Records still retrievable at year 1, 3, 7, 10 of the pilot | the only real test of a ten-year obligation is time; the checkpoint has to be scheduled now or it will not happen | a scheduled audit rehearsal |

## Open questions

- **H8** — France, and every country past DE/AT/NL. Nobody in the room knew; no tax adviser was consulted.
- **H8 / Q15** — what happens to the record when a site or an operator leaves the platform? The obligation outlives the contract and nobody said who then holds it.
- **H13** — nobody named what identifies the visit a ten-year record belongs to.
- **New here** — a stay paid twice (window expired, difference paid): one fiscal record or two? *Tax adviser.*

**Escalation condition** (carried): if legal hold, chain of evidence or per-record read authorisation ever becomes a stated requirement, this context earns a real aggregate and `risk: Critical`.

## Changed in 7-define

Right-sizing note; classification carried from the chart with evolution recorded as **unknown** rather
than guessed; communication re-split by initiator, both inbound edges marked as having no named message;
quality attributes, assumptions, verification metrics and one new open question added. No `model.yaml` delta — immutability is a decision for a human, not a modeller's default.
