---
id: DOMAIN-0009
title: OccupancyInsight bounded context
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# OccupancyInsight bounded context

**Right-sizing.** Classified core, canvassed short of a full core canvas — not because it matters
less (it is one of the two stated pay-fors) but because several sections cannot be filled from
evidence: it owns no state transition, no invariant and no event of its own, and there are no
swimlanes to draw because it decides nothing. Filling those would manufacture the appearance of a
designed capability. What it gets in full is quality attributes and open questions, where its risk
actually sits.

## Purpose

Tells an operator how full a site was, per bay type, at a point in time — the number they take to the
landlord to argue rent, and the one they use to decide whether to repaint ten car bays into six truck
bays. Serves the **site manager** and, through them, the **operator** negotiating a lease.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core by business value; the chart plots it as an **exposed advantage** — high differentiation, low model complexity | `core-domain-chart.md` (x 0.30, y 0.70) |
| Business-model role | revenue generator — the second capability the operator said they would pay for | `business-model.md`, capability table |
| Evolution | custom built, expected to become generic | `business-model.md`; chart trajectory row |

Carried, not re-derived. The chart's instruction is explicit: **build thin, ship fast, do not
architect it** — a guidance supplier sitting on the same sensors could ship this report too.

## Domain roles

**Analysis context**, and only that: it turns other contexts' events into a number somebody argues
with. One role, no tangle. `aggregates: []` is the correct expression of that, not an omission.

## Inbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| GuidanceIntegration | bounded context | `BayOccupied`, `BayVacated`; free bays per level and type — **garage only** | event | ACL, downstream |
| ParkingVisit | bounded context | `EntryRecorded`, `VehicleExited` | event | published language, downstream |
| SiteConfiguration | bounded context | `SiteConfigured`, `SiteLayoutRevised` — bays per type, the denominator | event | published language, downstream |

## Outbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| Site manager | actor (read model) | the occupancy report | query | direct interaction |

Nothing is emitted. The repaint loop back into SiteConfiguration runs through a human decision, not a
message — and that is a finding worth keeping visible: the paid-for capability has no named message
anywhere in the model.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Occupancy | how full, per bay type, at a point in time | — |
| Free (bay) | garage: the sensor says free | **yes** — in a lot it is unknowable: "nobody knows whether bay 17 has a car in it until somebody walks past it" |
| Repaint | converting bays of one type into another; the decision this report exists to support | — |
| Bay type | the denominator of the report | **yes** — SiteConfiguration owns the vocabulary, and it is contested (H16, shared-kernel flag) |

## Business decisions

| Rule | Source |
|---|---|
| Occupancy is reported per bay type, at a point in time | EXPERT 2026-07-27 |
| A persistent shortage of a type is what makes an operator repaint | EXPERT 2026-07-27 |

Two rules is all that was stated. The expert described this capability as an outcome, not a process —
the same gap `discovery/README.md` finding 5 records for both pay-fors.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Accuracy | the report is only as good as the sensors under it, and nobody has tested them | **unknown** — "somebody should test before you promise anyone occupancy-based pricing" | EXPERT (self-declared unknown), H4 | **yes** — if accuracy is not provable, the report needs a stated basis and confidence, which is a domain concept nobody has named |
| Coverage | a lot produces no occupancy signal at all | zero sources | EXPERT, H3 | **yes** — half the product line cannot deliver the paid capability |
| Granularity and history | "how full was I at 5pm on Friday" is a question about the past | **resolution and retention both unstated** | absence recorded | **yes** — history *is* the product here; without a stated resolution and retention period this is not implementable |
| Definitional correctness | a car in a truck bay counts as which type? | both readings defensible | H14 | **yes** — the repaint decision inverts depending on the answer |
| Timeliness | is this a live board or a monthly report? | unstated | absence recorded | yes — a live number and a historical one are different designs |
| Latency | how fast the report must render | **unknown** | never asked | no |

## Assumptions

*Domain* — occupancy is derivable from bay events plus entry/exit facts (**inferred**), and where a
garage has both and they disagree, **nothing states which wins**. The report is per site, because
every use the expert described is per site (**inferred**; a portfolio view was never mentioned, though
"argue rent with the landlord" might imply one).

*Scale and behaviour* — sensors are accurate enough to report from (**inferred and explicitly
contested** — H4). Entitlement bays can be reported on (**inferred, and probably false**: H6 says no
badge is checked, plates die at 7 days and lots have no sensors, so the report the expert actually
asked for cannot be built as described).

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Sensor count vs a hand count, one level, one afternoon; predicted within ±2% | **the H4 field test.** It costs one afternoon, needs no code, and it gates whether this capability is an advantage or a liability | a pilot garage — **collectable today** |
| Number of rent negotiations or repaint decisions per year that cite this report; predicted > 0 | whether the stated pay-for is real. Zero after a year means the value proposition was an operator's belief, not a purchase | the operator, by asking |
| Share of managed bays covered by a working occupancy source | the garage/lot gap, as a number rather than an argument | site inventory; **countable today from any lot** |

## Open questions

- **H3** — in a lot, how is occupancy per bay type produced at all? This is the paid capability, and
  for half the product line it has no source.
- **H4** — are the bay sensors accurate enough to report, let alone bill, from?
- **H14** — a car admitted to a truck bay: does the report count the bay's type or the vehicle's?
- **H6** — the entitlement-bay report has no mechanism. As stated, it cannot be built.
- **New here** — at what resolution and for how long is occupancy history kept? "At 5pm on Friday"
  implies a retained series and nobody described one. *Site manager.*
- **New here** — in a garage, when the sensors and the entry/exit count disagree, which is the
  occupancy? *Expert + a guidance supplier.*

Six open questions on a context with no model at all. That ratio is the finding: this is not a design
waiting to be built, it is a capability waiting to be understood.

## Interface critique

The interface is one read model, so questions 1–4 (coherence, message type, size, exposed internals)
have almost nothing to bite on — and that absence is itself the answer to question 5: **a paid-for
capability with no named message anywhere is the defect.** Until H3, H4 and H14 are answered, adding
one would be inventing the product.

## Perturbation experiment

- **Move occupancy to the guidance supplier** — buy the report with the sensors. Improves: it comes
  from the party that owns the data and already has it. Costs: it covers garages only, leaving lots
  with nothing; and it converts a stated differentiator into a supplier's feature, which the chart
  already names as the likeliest way this context loses its value. *Not moved — but this is the
  cheapest scenario in which the second pay-for disappears, and the founder should see it.*

## Changed in 7-define

Right-sizing note added and justified; classification carried from the chart with its "do not
architect it" instruction; domain role named; quality attributes added (the section that matters most
here — three of six change the model); assumptions, verification metrics, interface critique and one
perturbation added; two new open questions raised. `aggregates: []` stands, and no `model.yaml` delta
is proposed.
