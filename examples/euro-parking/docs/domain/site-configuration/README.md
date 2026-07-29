---
id: DOMAIN-0001
title: SiteConfiguration bounded context
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# SiteConfiguration bounded context

**Right-sizing.** Supporting: purpose, language, communication and business decisions, plus the deep
sections its one contested issue earns — it publishes the `VehicleClass` vocabulary into five contexts,
flagged as a shared-kernel risk by the context map and the topology alike. No swimlanes, no interface critique: nothing here decides anything.

## Purpose

Holds one operator's standing setup for a site — how many places, of what type, on which level or in
which area, and where the entrances and exits are; edited "whenever they repaint the lines". Serves the **site manager** and every context that needs to know what a site contains.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | supporting; the chart plots it generic (parity) | `core-domain-chart.md` (x 0.25, y 0.15) |
| Business-model role | revenue generator as a **deal qualifier** — "loses the deal if bad, wins nothing if good" | `business-model.md`, capability table |
| Evolution | product | `business-model.md`, capability table |

## Communication

Split by initiator, not by data flow. `*` = typed as a query upstream, no source names it; the consumers place these calls, so the reads are **inbound** here — `3-decompose` had them as a broadcast.

| Dir | Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|---|
| in | Site manager | actor | `ConfigureSite`, `ReviseSiteLayout` | command | direct interaction |
| in | ParkingVisit, TerminalOperations, Tariff, GuidanceIntegration | bounded contexts | `SiteTopology?` * — bays per class, entrances, exits, the `VehicleClass` list | query | published language |
| out | ParkingVisit, TerminalOperations, OccupancyInsight, GuidanceIntegration | bounded contexts | `SiteConfigured`, `SiteLayoutRevised` | event | published language |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Site | one garage or one lot; the unit of setup, tariffs, reconciliation and occupancy, run by an **operator** who sets its tariffs, "always" | — |
| Garage / Lot | a site with bay sensors, cameras and signage / "asphalt and painted lines" | — |
| Bay / Area | a garage place (number and floor) / a lot's painted zone (number and area) | **yes** — `INPUT.md` §3 calls both a "parking spot", and they share one card field with two meanings |
| Bay type | motorcycle, car, electric car, truck/bus, plus disabled and family bays that are painted but never enforced | **yes** — `INPUT.md` §2 calls all six "vehicle types"; Tariff and ParkingVisit price by *class*, which excludes the last two |
| Managed bay | the start-up's billing unit, per bay per month | **yes, possibly meaningless in a lot** (H17) |

## Business decisions

| Rule | Source |
|---|---|
| Each parking place has a unique identifier: number & floor in a garage, number & area in a lot | `INPUT.md` §3 |
| A site is either a garage or a lot, and they behave as two different products — a garage has bay sensors and guidance, a lot has neither | EXPERT 2026-07-27; `INPUT.md` §11–12 |
| Bay types exist per site, including the disabled and family bays nobody enforces | EXPERT 2026-07-27; `INPUT.md` §2 |
| **Stated absence:** nobody described the operator↔site relationship beyond "the operator sets tariffs, always" | EXPERT 2026-07-27 |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Vocabulary stability | the `VehicleClass` list is live in five contexts across all three proposed teams; changing it needs consent from all of them | 5 contexts (context map), 3 teams (topology) | `context-map.md`, `team-topology.md` | **yes** — publish it as a versioned enumeration, never as a shared model. The list is also incomplete (H16) |
| Effective dating | the lines get repainted; a layout revision changes the denominator of every occupancy report already produced | **unstated** | absence recorded | **yes if required** — a past occupancy figure is meaningless without the layout in force at the time |
| Change cadence | edited "whenever they repaint the lines" — rare, and by a non-technical user | EXPERT | EXPERT | no |

## Assumptions

A site belongs to exactly one operator and never moves (**inferred**; nobody described the
relationship). Entrances and exits are properties of a site, not entities with identity (**inferred**;
H11 leaves the terminal-to-entrance mapping unsettled). A layout revision applies from now on and does not restate history (**inferred**; the row above says it may be wrong).

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Changes to the `VehicleClass` enumeration per year, and how many contexts each one forced a change in; predicted ≤ 1 context | whether the published-enumeration recommendation held, or a shared kernel formed anyway | VCS, once a repo exists |
| Layout revisions per site per year | whether "whenever they repaint" is rare enough to justify no effective dating | the operator's own records — **collectable today** |

## Open questions

- **H11** — three terminal types are named and four behaviours described, so the entrance topology this context must describe is not settled.
- **H16** — the bay-type vocabulary is contested: the brief lists disabled and family as vehicle types, the expert refuses a rule for them, and motorcycles were never discussed.
- **H17** — is a "managed bay", the start-up's revenue unit, meaningful in a lot where no bay is individually known?
- **New here** — when the lines are repainted, what happens to occupancy history measured against the old layout? *Site manager.*

## Changed in 7-define

Right-sizing note; classification carried from the chart; communication re-split by initiator (the
topology reads are inbound queries, not an outbound broadcast); the `VehicleClass` shared-kernel risk
promoted into a quality attribute with a remedy; assumptions, verification metrics, one new open question, and one stated absence promoted into the business-decisions table. No `model.yaml` delta.
