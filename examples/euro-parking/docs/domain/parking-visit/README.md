---
id: DOMAIN-0003
title: ParkingVisit bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# ParkingVisit bounded context

## Purpose

Decides one vehicle's stay: whether it may come in, where it was sent, what it owes, whether it has
paid, and whether it may leave now. Serves the **driver** at the barrier and the **operator**, whose
parking revenue exists only because a ticket was issued and priced. Five clauses, one stay — the
purpose needs no "and also"; the interface does, see the critique.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` in `model.yaml`; **unplaced** in the chart — differentiation was never sourced | `core-domain-chart.md`, placement + disagreement rows |
| Business-model role | revenue generator — "no ticket, no parking revenue for the operator" | `business-model.md`, capability table |
| Evolution | product (ticketing and entry/exit control) | `business-model.md`, capability table |

Carried, not re-derived. The chart reads it as core by *necessity* — nothing buyable holds its
invariants — not by demonstrated advantage; that changes the depth it earns, not the label.

## Domain roles

**Execution context** — enforces admission, the amount, the window and the right to leave.
Secondary: **fact publisher** — reconciliation, occupancy and the fiscal record are projections of
what it emits; the two change at the same rate, so the pairing is accepted rather than flagged.
Brain-Context check **passes**: all ten outbound domain events are events, it commands nobody.

## Inbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| TerminalOperations | bounded context | `DeclareVehicleDetails`, `PayTicket`, `PayDifference` (driver commands, forwarded) | command | partnership |
| TerminalOperations | bounded context | `MayThisCardLeave?` * | query | partnership |
| TerminalOperations | bounded context | `SpotWrittenToStripe`, `PaidStatusWrittenToStripe`, `EntryBarrierOpened`, `ExitBarrierOpened`, `ExitRefused`, `CardCollected`; `OfflineExitLogUploaded` | event | partnership; published language (`OfflineExitLog`, theirs) |
| VehicleIdentification | bounded context | `VehicleClassMismatchDetected` | event | downstream — we conform to a supplier's class |
| PaymentCapture | bounded context | *(payment captured — no name exists, H9)* | event | ACL |
| GuidanceIntegration | bounded context | `BayAssigned` (garage only; ownership open, H1) | event | ACL |

## Outbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| Tariff | bounded context | `PriceOfStay?` * | query | customer/supplier (we are the customer) |
| SiteConfiguration | bounded context | `SiteTopology?` * | query | published language |
| GuidanceIntegration | bounded context | `FreeBaysOfClass?` * | query | ACL |
| TerminalOperations | bounded context | `CardStripeRecord` (schema we own), `TicketIssued`, `AreaAssigned` | event / published language | partnership |
| RevenueReconciliation | bounded context | `TicketPaid`, `LostTicketCharged`, `AdditionalPaymentCollected`, `VehicleExited` | event | published language, upstream |
| FiscalRecord | bounded context | entry time, exit time, amount, VAT — **no named message anywhere** | event | published language, upstream |
| OccupancyInsight | bounded context | `EntryRecorded`, `VehicleExited` | event | published language, upstream |
| *(none)* | — | `VehicleClassDeclared`, `EntryRefused` | event | **unconsumed** — `context-map.md` |

`*` = typed as a query upstream, no source names it. **Correction:** `3-decompose` filed Tariff,
SiteConfiguration and the free-bay read as *inbound* because data flows in; we place the call.

## Swimlanes — what this context actually decides

| Message in | Decision made here | Message(s) out |
|---|---|---|
| `DeclareVehicleDetails` | admit or refuse; which class of bay to substitute to; at whose rate | `TicketIssued` + `CardStripeRecord`, or `EntryRefused` |
| `PayTicket` | what is owed (priced by Tariff); the visit is paid, at `paidAt` | `TicketPaid` |
| `MayThisCardLeave?` | paid, and still inside 15 minutes? | the answer; then `VehicleExited` |
| `VehicleClassMismatchDetected` | charge the higher of the two rates | folded into `TicketPaid` |
| `OfflineExitLogUploaded` | **none — nothing is decided and nothing is emitted** | — (flow finding 4.2) |

The empty lane is the finding: a late exit leaves no trace, and owes a ten-year fiscal record.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Visit | one vehicle's stay, entry to exit | **the expert never named it** (H13); it is the modeller's identity |
| AssignedSpot | where the driver was sent | **yes** — a bay in a garage, an area in a lot; same card field |
| Vehicle class | what the vehicle *is*, and what the tariff is priced by | **yes** — `INPUT.md` §2 calls disabled and family "vehicle types"; here they are not in the set |
| Paid | the system's record. "The system is the truth." | **yes** — in TerminalOperations, paid-on-the-stripe is a copy that wins offline |
| Full (site) | no bay at all → no ticket | **yes** — unknowable in a lot (H2) |
| Full (class) | no bay of that class → admitted, substituted, charged at the declared class's rate | no |

## Business decisions

Stated rules only; pricing itself is Tariff's decision, applied here.

| Rule | Source |
|---|---|
| Site full → the barrier does not open and no ticket is issued | EXPERT 2026-07-27 |
| A truck is refused when truck bays are full; a truck is never admitted to a car bay | EXPERT 2026-07-27 |
| No bay of the declared class → admit to a substitutable class, charge the declared class's rate (car → truck bay, EV → normal bay) | EXPERT 2026-07-27 |
| Exit must follow payment within 15 minutes; past it the card is refused and the difference is paid at a machine. "We are not changing it." | EXPERT 2026-07-27 |
| The system's paid status is the truth; the stripe is a copy | EXPERT 2026-07-27 |
| Lost ticket → the daily cap for that class, self-service, and a fresh card marked paid | EXPERT 2026-07-27 |
| Declared class ≠ registered class → charge the higher of the two rates, and raise it on the exceptions list | EXPERT 2026-07-27 |
| Assigned bay taken anyway → the driver takes the next free one. No reassignment, no consequence, no rule | EXPERT 2026-07-27 |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Concurrency | two drivers **may** be sent to the same bay; the business tolerates it | resync "a minute or two" | EXPERT | **yes** — it *removes* the invariant most designs would add; no bay reservation, no hold, no release |
| Availability | this context must not be on the critical path of an exit — the barrier opens with the centre unreachable | unstated | EXPERT | **yes** — forbids a synchronous exit dependency; the reason TerminalOperations exists |
| Consistency | paid status is authoritative online; offline the stripe wins and the divergence is settled next morning | staleness = the outage, **unbounded** (flow 4.5) | EXPERT | **yes** — reconciliation is the compensating control, not a report |
| Auditability | entry time, exit time, amount and VAT must reach the fiscal record | 10 / 7 years by country | EXPERT | yes — but the offline path emits none of it (4.2) |
| Latency, volume | how long a driver waits at a barrier; visits per site per day; bays per site | **both unknown** | never asked (H19); the product is priced per managed bay and nobody stated a bay count | no, until known |
| Change cadence | the substitution matrix is partial (H16) and rates change weekly to daily | — | EXPERT | yes if pairs are added often — the matrix becomes data, not code |

## Assumptions

*Domain* — a visit has an identity distinct from its card (**inferred**; H13, and the fiscal record
depends on it). One card carries at most one open visit, and entry and exit happen at the same site
(both **inferred** — no source mentions either). In a lot a false declaration is never detected
(**stated**: "nobody checks"), and a driver whose bay is taken absorbs it (**stated**).

*Scale and behaviour* — one currency per site (**inferred**; DE/AT/NL are euro, so it holds until the
fourth country). Lost tickets and mismatches are exceptions, not routine (**inferred**; no rate was
stated). Sensors are accurate enough to decide admission from (**inferred and contested** — H4 says
test it; flow 1.1 makes it a distributed invariant).

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| < 25% of pull requests touch both ParkingVisit and TerminalOperations, measured over the first 3 months of the pilot | whether the chatty pair (6 of 11 messages, flow 0002) is *message* chatter or genuine shared change. If it exceeds 25%, PC-1 is not optional | VCS/CI, once a repo exists — **no data today** |
| Complaints per 1 000 exits about the 15-minute window | the expert calls it a standing complaint and refuses to change it; this puts a number on what is being refused | the operator's existing complaints log — **collectable today, before any code** |
| Substituted admissions (charged class ≠ declared class) per site per week | if substitution is routine rather than exceptional, it is a pricing rule and H16's missing pairs are blocking, not cosmetic | pilot site exceptions list |
| Exits with no recorded exit time | predicted 0; every offline exit today produces one (4.2) | production, once live |

## Open questions

- **H13** — what identifies a visit, as distinct from the card? Ten years of fiscal record hang on it.
- **H12** — with no visit to look up, which class's daily cap, and how does the exit trust the replacement card?
- **H2** — a lot has no sensors, so how is "the site is full" knowable there at all?
- **H16** — three substitution pairs are stated; motorcycles and every other pair are not.
- **H15** — which rate applies to a vehicle already inside when the rate changes that evening?
- **H18** — can a ticket be issued when the network is down, and is the entry barrier held shut?
- **H1** — does our terminal choose the bay, or the supplier's guidance system?
- **D-3** — how is "the difference" computed, does the cap apply again, does a fresh window start?
- **New here** — what happens to a ticket issued into a site that turns out to be full? Compensation was stated for the *taken bay* case only (flow 1.1). *Expert.*

Nine open questions on the context holding half the model's invariants — the canvas reads that as
"keep modelling"; five of the nine need one person who is unavailable.

## Interface critique

1. **Names.** `AreaAssigned` is the lot half of an assignment with no garage twin — the bay case travels inside `TicketIssued.assignedSpot`. The garage/lot split leaks into the interface unevenly.
2. **Types.** `MayThisCardLeave?` is a query the exit asks before deciding, yet nobody described the
   *online* exit — only the offline one, where the terminal decides alone. `EntryRefused` reaches nobody.
3. **Size.** Ten events, three queries and a contract for one aggregate is at the top of the range,
   but the mass is stated rules (9 of 18 invariants). The answer is PC-1's re-cut, `3-decompose`'s
   to make — not a smaller interface here.
4. **Internals.** `CardStripeRecord` puts this context's state onto rewritable plastic in the driver's
   hand — exposure by design, priced, compensated by reconciliation. Inward, no invariant reads
   `SpotWrittenToStripe` or `PaidStatusWrittenToStripe`: TerminalOperations' internals, leaking back.
5. **Belongs elsewhere.** `LostTicketCharged` and `ReplacementCardIssued` carry a site and a class but
   no visit, because a lost ticket has none to find (H12) — card-and-site facts, TerminalOperations' subject.

## Perturbation experiments

- **Move the exit decision to the edge** (PC-1 option A). Flow 0002 drops from 11 messages to 9, the
  `MayThisCardLeave?` query disappears, one rule serves both paths. Cost: the window moves onto the
  stripe, which must then carry `paidAt` — **H10**; if the answer is no, the move silently deletes a
  stated rule. *Rejected pending H10 — PC-1's verdict, reached independently from the interface.*
- **Move `LostTicketCharged` + `ReplacementCardIssued` to TerminalOperations.** Improves: every
  remaining event is visit-scoped and can carry an identity; the card fleet's owner owns card issue.
  Costs: it acquires a pricing dependency (the cap) and a money concept it has none of. *Not moved —
  H12 decides it.*

## Aggregates (`8-code`, 2026-07-27)

| Aggregate | Canvas | Invariants enforced | Corrective policies | Contention |
|---|---|---|---|---|
| `ParkingVisit` (root `ParkingVisit`) | [aggregates/ParkingVisit.md](aggregates/ParkingVisit.md) | 5 — the window, the price, paid-is-the-truth, higher-of-two-rates, never a truck in a car bay | 5 listed: **3 expert-stated** (drive on to the next bay · reconcile the offline exit · mismatch to the exceptions list), **2 with no policy at all** | **low** — one instance, one driver, no merged command streams |

Two findings this canvas produced that the context canvas did not. **The commands cannot address
their own aggregate**: `PayTicket`, `PayDifference` and `PresentCardAtExit` carry only the stripe
(`assignedSpot`, `paidFlag`), and neither identifies a visit — H13 restated as a repository that
cannot load its root. And **two relaxed invariants have no corrective policy**: the 15-minute window
offline (nothing detects a late exit that *was* paid), and a ticket issued into a genuinely full site.
Both need the business; neither is an error handler.

## Changed in 7-define

Inbound/outbound re-split by initiator; relationship types added; swimlanes, quality attributes,
assumptions, verification metrics, interface critique and perturbations added; rules and hotspots
carried unchanged. No `model.yaml` delta proposed — both candidates (`LostTicketCharged`'s owner, the
exit decision's home) are gated on open questions.
