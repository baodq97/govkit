---
id: DOMAIN-BM-0001
title: Euro Parking — business model & user needs
status: draft
owner: TBD
date: 2026-07-27
mode: discover
---

## Sources

- `INPUT.md` — the brief: 12 requirements, verbatim from the SAP DDD Kata. Product scope only; says nothing about money, customers or goals.
- `EXPERT.md` — one domain-expert session, 2026-07-27. Everything commercial below comes from here.
- No code, no schema, no wiki, no pricing page, no README. Nothing else was read because nothing else exists.

## Who was in the room

- **Domain Expert** — 25 years operating parking sites for a mid-size European operator, now advising the start-up. Has the last say on requirements per the kata.
- **Modeller** (author of this doc).

Missing, and it shows in the holes below: the founder (the Germany→Austria→Netherlands sequencing is reported second-hand), anyone owning the P&L, finance, legal/tax counsel, a developer, the hardware suppliers.

**Stated limitation:** no real driver was interviewed, and no site manager other than through the expert. The driver story map below is *an operator's belief about drivers*, not user evidence — it was never validated by watching one (Q8). The expert is himself a proxy for the buying customer: he has run sites, he has not bought this product.

## Business Model Canvas

| Block | Content | Source |
|---|---|---|
| **Customer segments** | Parking operators / "park area providers" running garages and/or lots, in major European cities. Germany first, then Austria and the Netherlands (founder's decision, relayed). Garage and lot are described as **two different products**, not one with a flag — a garage has bay sensors and guidance signage, a lot is "asphalt and painted lines". Whether that makes them two buying segments was not asked (Q10). Municipal tenders: explicitly outside the expert's experience, "a different business" (Q4). Drivers are users, not customers — they pay the operator, not the start-up. | EXPERT 2026-07-27; INPUT.md §company |
| **Value propositions** | (1) Kill the reconciliation work — 4 hours per week per site by hand today. (2) Occupancy reporting per bay type — the number the operator takes to the landlord to argue about rent, and uses to decide whether to repaint 10 car bays into 6 truck bays. (3) Table stakes done well: site setup and tariffs — "everybody's system does them, but if yours does them badly you lose the deal". (4) Tariff changes the operator makes themselves, live at the machines that evening — "if you make me raise a support ticket to change a rate, we will not buy your product". (5) Never trap a driver: the exit barrier opens on the stripe when the network is down. | EXPERT 2026-07-27 |
| **Channels** | Not stated. Only delivery is visible: a per-site integration engagement, billed once. How operators become aware of / evaluate / buy the product — nobody said (Q2). | EXPERT 2026-07-27 (integration fee) |
| **Customer relationships** | Self-service for the operator on tariffs and site setup, insisted on as a purchase condition. Control-room intercom for remote let-out exists at every site, operator-staffed. Support model, SLA and account management: not stated (Q13). | EXPERT 2026-07-27 |
| **Revenue streams** | Per managed bay per month (recurring) — "the per-bay line is the one that hurts if it goes to zero". Plus a one-off integration fee per site. Hardware passed through at cost, i.e. no margin. Parking fees paid by drivers are the *operator's* revenue; the start-up moves that money without booking it. Fee level, and whether an unsensored lot bay prices like a garage bay: not stated (Q11). | EXPERT 2026-07-27 |
| **Key resources** | Not stated as such. Nobody was asked whether any data or know-how here is a competitive asset (Q9). The occupancy dataset is the visible candidate — and it is unproven, because whether the sensors are accurate enough to bill from has never been tested (Q6). | — (absence recorded) |
| **Key activities** | Integrating third-party guidance systems; running entry/ticketing/payment/exit including the offline path; nightly/morning reconciliation; occupancy reporting; tariff and site configuration; retaining the fiscal record for a per-country period. | EXPERT 2026-07-27; INPUT.md §7–11 |
| **Key partners** | Guidance-system suppliers — cameras, bay sensors, LED signs, one supplier per site, three credible ones in Europe. Plate-to-vehicle-class lookup (supplier's system, from the registration). Payment acquirer, via the terminals. Card/terminal hardware. Tax advisers per country. On signage: "nobody has ever chosen us because of the signage; they choose us and then ask which signage we support." | EXPERT 2026-07-27 |
| **Cost structure** | Not stated. The only cost fact given is that hardware carries no margin. Whether the business is cost- or value-driven, and what the biggest line is, needs whoever owns the P&L (Q1). | — (absence recorded) |

## User Story Map

**Driver** — operator-reported, not observed (Q8). ⚠ = pain.

```
BACKBONE   Arrive & be admitted → Collect ticket → Find the spot & park → Pay → Exit
           state vehicle type      card written     GARAGE: signage sends you    per started 15 min   insert card, machine keeps it
           at entrance terminal    with a BAY       to a free bay by type        first 15 min free    ⚠ 15-min window pay→exit; past it
           FULL → barrier stays    (garage) or an   LOT: ⚠ you find it yourself  at most sites        the card is refused, walk back and
           down, no ticket         AREA (lot) —     ⚠ bay taken anyway (sensor   daily cap            pay the difference. "Standing
           truck refused when      "same field,     fault / parked across two):  ⚠ lost ticket →      complaint, we are not changing it."
           truck bays full;        different        drive on, take the next,     flat daily cap,      ⚠ unpaid card → NOT PAID, barrier
           EV gets a normal bay,   meaning"         no consequence, sensors      button on the        down; a payment machine sits before
           just no charger                          resync in a minute or two    machine              every exit for this reason
                                                                                                      ⚠ machine eats the card → intercom
                                                                                                        to control room, let out remotely
                                                                                                      ⚠ network down → terminal trusts the
                                                                                                        stripe and opens; abused ~4–5 times
                                                                                                        in 15 years, caught next morning
```

**Site manager** — the six things an operator does all day, "and none of them are in your requirements list".

```
BACKBONE   Set up the site → Set tariffs → Run the day → Reconcile takings → Work exceptions → Watch occupancy
           bays, types,       per site, per   entry, guidance,  ⚠⚠ every morning,   ⚠ offline exits,   how full at 5pm
           level or area,     class; weekly    payment, exit     per site: machines   plate mismatches,  Friday, per type →
           entrances, exits;  or daily; ⚠ must                   vs bank vs coin box; two barrier stuck open;  argue rent with the
           edited whenever    be live at the                     4h/week per site     patrol notices for landlord; decide
           the lines are      machines that                      BY HAND today        disabled/family    what to repaint
           repainted          same evening                                            bays — "build the
                                                                                      report, not a rule"
```

**Would pay for:** reconciliation and occupancy only. Setup and tariffs are qualifiers — they lose the deal, they do not win it.
**Pain concentrates** at reconcile + exceptions, and both are downstream of entry/exit events the system already has. Thinnest end-to-end slice: one garage — setup → tariff → ticket → pay → exit (incl. offline) → next-morning reconciliation.

## Goals

| Horizon | Goal | Source |
|---|---|---|
| Short (this quarter) | **Unknown.** Neither file states a quarter goal or a dated milestone (Q3). | — |
| Medium (this year) | Germany first, then Austria and the Netherlands. Sequence is the founder's, relayed by the expert; no dates attached, so the horizon is an assumption. | EXPERT 2026-07-27 |
| Long (1–3 years) | Software for parking lots and garages "for all major cities in Europe and for various park area providers". Occupancy-based pricing is mentioned only as a thing to *test before promising*, so it is an option, not a goal. | INPUT.md §company; EXPERT 2026-07-27 |

## Capability classification inputs

| Capability | business_role | evolution_stage | differentiation | Source |
|---|---|---|---|---|
| Reconciliation of takings (machines vs bank vs coin box) | revenue-generator — one of two things they said they would pay for | custom-built — done by hand today, no product named | yes — but the claim rests on one expert; no competitor was checked (Q14) | EXPERT |
| Occupancy reporting per bay type | revenue-generator — the other pay-for; used in rent negotiation | custom-built | yes — expert-stated; sensor accuracy unproven (Q6) | EXPERT |
| Tariff management (per site, per class, per started 15 min, free-first-15 toggle, daily cap, night/weekend) | revenue-generator (deal qualifier) | product | no as a feature — "everybody's system does them"; the *self-service, live tonight* property is a stated deal-breaker | EXPERT |
| Site & topology setup (bays, types, level/area, entrances, exits) | revenue-generator (deal qualifier) | product | no — table stakes, loses the deal if bad, wins nothing if good | EXPERT |
| Ticketing and entry/exit control (card write, barrier, card reuse & refill) | revenue-generator — no ticket, no parking revenue for the operator | product | unknown — never asked whether a competitor doing this better costs deals | INPUT.md §1–10; EXPERT |
| Offline exit fallback + next-morning settlement of offline exits | engagement-creator — trapping a driver "ends up in the local paper"; losing a few euros a year beats it | custom-built — an explicit local policy, not a bought behaviour | unknown | EXPERT |
| Fiscal record retention (site, entry, exit, amount, VAT, method, machine; DE/AT 10y, NL 7y, FR unknown) | compliance-enforcer | unknown | no | EXPERT; INPUT.md §6 |
| Vehicle classification & plate mismatch (garage only; charge the higher rate, raise an exception) | revenue-generator — leakage protection | product — the class lookup is a supplier's | no | EXPERT |
| Guidance-system integration (cameras, bay sensors, LED signs; 3 suppliers) | revenue-generator (deal qualifier) | product — bought, never built | no — "nobody has ever chosen us because of the signage" | EXPERT; INPUT.md §11–12 |
| Payment capture at terminal / acquirer link | revenue-generator | commodity | no | EXPERT (§"anything you don't know") |
| Exceptions handling (offline exits, mismatches, stuck barrier, entitlement-bay report) | cost-reduction | unknown | unknown — listed as daily work, not named as a pay-for | EXPERT |
| Remote let-out via control-room intercom | engagement-creator | unknown | unknown | EXPERT |
| Entitlement-bay usage report (disabled, family) | compliance-enforcer — enforced by a patrol issuing notices, never by the machine | unknown | no — "family bays nobody enforces at all" | EXPERT |

## Open questions

- **Q1** — Cost structure: biggest lines, cost- or value-driven? *Whoever owns the P&L / the founder.*
- **Q2** — Channels: how does an operator hear about, evaluate and buy this? *Founder / whoever sells.*
- **Q3** — Short-horizon goal, and dates for the Germany→Austria→Netherlands sequence. *Founder.*
- **Q4** — Are municipal/city tenders a segment? Expert declared it outside his experience. *Someone with public-tender experience.*
- **Q5** — Retention period for France and any country beyond DE/AT/NL. Expert: "do not build ten years into the code." *A tax adviser per country.*
- **Q6** — Are bay sensors accurate enough to bill from? Blocks occupancy-based pricing and weakens the occupancy value proposition. *Sensor supplier plus a field test.*
- **Q7** — How do payment terminals talk to the acquirer — settlement, chargebacks, reversal on a failed barrier? *Terminal/payment supplier.*
- **Q8** — Everything on the driver map is operator belief; no driver has been observed. *Real drivers at a live site.*
- **Q9** — Key resources: is there data or know-how here a competitor could not get? Never asked. *Founder.*
- **Q10** — Do garage operators and lot operators buy as one segment or two (contract, pricing, sales motion)? Expert split the *products*, not the buyers. *Founder / sales.*
- **Q11** — Per-bay fee level, and whether an unsensored lot bay prices like a garage bay. *Founder.*
- **Q12** — Who signs inside an operator — site manager, head office, procurement? *Founder / an operator's buyer.*
- **Q13** — Support and relationship model beyond self-service: SLA, who owns the control-room integration. *Founder / ops.*
- **Q14** — Do competitors already productise reconciliation? The strongest core claim in this doc rests on one man's word. *Sales / market scan.*
- **Q15** — What happens to the ten-year fiscal record when a site or operator leaves the platform? *Legal/tax counsel.*
