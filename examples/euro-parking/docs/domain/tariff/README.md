---
id: DOMAIN-0002
title: Tariff bounded context
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# Tariff bounded context

**Right-sizing.** Supporting, so the deep sections would normally be skipped — filled because the chart adjusted this context **+0.30** for being under-modelled and H15 would force a real aggregate.

## Purpose

Holds what a stay costs at a site, and prices one on request. The operator sets every number — "the
operator. Always. You give us the screen." Serves the **site manager** who sets rates and the
**driver** who pays them. A reference/policy context: no workflow, nothing executed.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting; the chart plots it generic / mission-critical parity | `core-domain-chart.md` (x 0.45, y 0.25) |
| Business-model role | revenue generator, as a **deal qualifier** — "everybody's system does them, but if yours does them badly you lose the deal" | `business-model.md`, capability table |
| Evolution | product. The deal-breaker is *liveness*, a deployment property, not the model | `business-model.md`, capability table |

## Communication

Split by initiator, not by data flow. `*` = typed as a query upstream, no source names it.

| Dir | Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|---|
| in | Site manager | actor | `SetTariff` | command | direct interaction — self-service is a stated purchase condition |
| in | ParkingVisit | bounded context | `PriceOfStay?` * (site, class, entry time, now) | query | customer/supplier — we supply |
| out | ParkingVisit | bounded context | `TariffChanged`; the priced amount | event / response | customer/supplier |
| out | TerminalOperations | bounded context | `TariffChanged` — live at that site's machines the same evening | event | customer/supplier, with a liveness SLO |
| out | SiteConfiguration | bounded context | reads the `VehicleClass` vocabulary rates are keyed by | query | published language — **shared-kernel risk, flagged in `context-map.md`** |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Tariff | rates the operator sets per site and per vehicle class; billed per **started** fifteen minutes | — |
| Daily cap | the most a class can pay in a day at that site | **yes** — in ParkingVisit the same figure is the flat charge for a lost ticket |

## Business decisions

| Rule | Source |
|---|---|
| Priced per **started** fifteen minutes, at a rate set per site and per vehicle class | EXPERT 2026-07-27 |
| Per-site settings: free first fifteen minutes at most sites, a daily cap, and night/weekend rates at some sites but not all | EXPERT 2026-07-27 |
| The operator sets the rates, always, and a change is live at that site's machines the same evening with no support ticket | EXPERT 2026-07-27 |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Propagation latency, change cadence | a saved rate reaches every machine at that site the same evening; rates change weekly, at some sites daily | "that evening"; a stated purchase condition | EXPERT | no — deployment, and the whole product decision here. Self-service editing by a non-technical user is the design constraint |
| Temporal correctness | a stay may cross a rate change or a night/weekend boundary | **unstated** (H15) | absence recorded | **yes** — an answer forces effective-dated, versioned rate cards, i.e. a real aggregate |
| Auditability | which rate priced a given stay, provable years later | 10 / 7 years by country, via the fiscal record | EXPERT (indirect) | **yes if required** — a past stay must still reproduce its original amount |

## Assumptions

The rate in force when pricing happens is the rate charged (**inferred**; the cheap reading of H15,
possibly wrong for a vehicle already inside). VAT is derived outside this context (**inferred** — it
appears only as a fiscal-record field and nobody said who computes it: a gap on a tax-relevant
number). One currency per site, and a class list stable enough to be an enumeration (**inferred, the
second contested** — H16; it is live in five contexts). Volumes were never asked.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| p95 minutes from saving a rate to every machine at that site holding it; predicted < the same evening | the stated purchase condition, as a number | pilot telemetry |
| Rate changes per site per month, and the share made without contacting us; predicted 100% | whether self-service holds. Any support ticket for a rate change is a lost deal, by the expert's own words | the support queue, once live |
| Stays crossing a rate change or a rate boundary, as a share of all stays | how much H15 costs: a rounding error means the cheap reading is safe, common means versioning comes first | production, once live |

## Open questions

- **H15** — which rate applies to a vehicle already inside, and to a stay crossing a night/weekend boundary?
- **H16** — the class list rates are keyed by is contested and incomplete (motorcycles never discussed).
- **VAT** — it appears only as a fiscal-record field; nobody said how it is derived or by whom.
- **New here** — can a rate change be scheduled ahead ("live Friday evening for the event"), or only applied now? The expert's example implies the first. *Site manager.*

## Changed in 7-define

Right-sizing note; classification carried from the chart; communication re-split by initiator with
relationship types; the SiteConfiguration vocabulary dependency made explicit; quality attributes,
assumptions and verification metrics added; one new open question. No `model.yaml` delta — H15 is the trigger to revisit `aggregates: []`.
