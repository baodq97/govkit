---
id: DOMAIN-0006
title: GuidanceIntegration bounded context
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# GuidanceIntegration bounded context

**Stub, not laziness.** Generic and bought, so this is purpose, supplier, adapter interface and the questions that block the contract — complete for a context nobody chose us for.

## Purpose and supplier

Lets the rest of the system ask which bays are free without knowing whose hardware is installed; garages only. Serves the **driver** being pointed at a bay. Bought from guidance suppliers — cameras, bay sensors, LED signs, one per site, **three credible ones in Europe** — because "nobody has ever chosen us because of the signage; they choose us and then ask which signage we support" (EXPERT). Generic, product, differentiation `no`: `core-domain-chart.md`, `business-model.md`. Three suppliers behind one boundary is the case for an ACL, not a model.

## The adapter's interface

| Dir | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | Supplier hardware | sensor and camera feeds | event | **ACL — we translate, never adopt their model** |
| in | ParkingVisit | `FreeBaysOfClass?` * | query | ACL |
| out | SiteConfiguration | the bay list to map onto their sensors | query | published language |
| out | ParkingVisit; OccupancyInsight; VehicleIdentification | `BayAssigned` (**ownership unresolved, H1**); `BayOccupied`, `BayVacated`; the plate feed | event | ACL |

Stated absences, twice-confirmed each: **a lot has no guidance system** (`INPUT.md` §12, EXPERT), and a bay found occupied anyway has no consequence — "we do not chase it". Assumption (**inferred**): the three suppliers' feeds normalise to one internal contract; nobody has seen a second one.

## Open questions

- **H1** — does the supplier choose the bay, or does our entrance terminal choose it and write it to the card? `INPUT.md` §11 and the expert disagree. **This is the integration contract; do not build until it is answered.**
- **H4** — can the sensors be trusted enough to report from, let alone bill from? ParkingVisit's admission invariant is decided against them (flow 1.1). Metric, **collectable today**: sensor state vs a hand count, one level of one pilot garage, one afternoon.

*7-define:* restructured as a bought-adapter stub; ACL types per edge; absences, one assumption and one collectable metric recorded. No `model.yaml` delta.
