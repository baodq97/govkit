---
id: DOMAIN-AGG-0002
title: Terminal — aggregate design canvas
status: draft
owner: TBD
date: 2026-07-27
mode: code
context: TerminalOperations
---

# Aggregate: `Terminal` (root: `Terminal`)

Aggregate Design Canvas v1.1. Sourced from `../model.yaml`, `../README.md`,
`../../event-model/README.md` slices EM-03, EM-09, EM-15, EM-19–21, EM-23, `EXPERT.md` 2026-07-27.

## 1. Description

One machine at one site — an entrance, a payment point or an exit — and the decision it takes at the
barrier in front of it. Its reason to exist is stated in one sentence by the expert: **"the barrier
must open when the network is down."** Everything else here follows from a machine having to decide
alone.

**Why this boundary.** The instance must be able to decide with nothing else reachable, so the
boundary can contain nothing that lives elsewhere. One machine, its own connectivity, its own
barrier, its own card reader.

**Alternatives rejected:**

| Rejected boundary | Why rejected |
|---|---|
| `Site` holding all its terminals | a partitioned terminal cannot load an instance that lives at the centre — the boundary would defeat the only requirement the aggregate exists for. It would also merge every gate's independent command stream onto one instance |
| The barrier as its own aggregate | no rule was ever stated about a barrier alone; `BarrierStuckOpen` has no emitter at all (H5) |
| Merge into `ParkingVisit` | flow 4.1: offline, this decision is taken in 4 messages across 0 boundaries; merged, it cannot be taken at all |

**Boundary finding carried, not resolved.** `../README.md` names four domain roles here, one of
which — the card fleet — has **no stated rule** (no stock level, no threshold, no alert). This
canvas models the first three. `RefillEntranceMachines → CardsRefilled` is handled and consumed by
nobody; if no stock rule ever appears, delete the concern rather than model it.

## 2. State transitions

```
connectivity:  online <--> unreachable          (no stated detector — see open questions)
barrier:       closed --open--> open --close--> closed
                                  \--(stuck open, 40 min: no emitter, H5)
```

**This is close to anaemic on purpose, and it is worth naming.** The states are mechanical; the
domain content sits in the *decision rules* of §3–4, not in a lifecycle. A `Terminal` with only
`created → updated` would be a red flag; a `Terminal` whose two state axes are physical and whose
rules are conditional on them is an edge controller, which is what the business described. If a
third axis appears (out of service, maintenance, out of cards) this should be re-examined — none was
stated.

## 3. Enforced invariants — within one transaction on one instance

| # | Invariant | Stated by | Enforceable in schema? |
|---|---|---|---|
| I1 | When the exit terminal cannot reach the system, it reads the stripe; if the stripe says paid, the barrier opens | EXPERT, emphatically | **no** — a decision rule, aggregate only |
| I2 | An unpaid card at the exit is returned, the sign says NOT PAID and the barrier stays down | EXPERT | **no** |
| I3 | On a valid exit the machine keeps the card | EXPERT; `INPUT.md` §8 | **no** |

Three invariants, all conditional on the two state axes. **A fourth listed in `../model.yaml` is not
an invariant of this aggregate:** *"a tariff change is live at that site's machines the same
evening"* spans every terminal at a site and is a propagation SLO — it cannot hold within one
transaction on one instance. Proposed delta 5 in `../../event-model/README.md`; it stays a purchase
condition and a verification metric, and dropping it from the invariant list removes a rule the code
would otherwise pretend to enforce.

## 4. Corrective policies

| # | Relaxed rule | Corrective policy | Who defined it |
|---|---|---|---|
| C1 | I1 trusts a **rewritable** copy; a forged stripe opens a barrier | the exit is logged offline and uploaded; the next morning an exit with no payment is flagged and the site manager writes it off or pursues the plate. Explicitly priced: 4–5 abuses in 15 years at two sites, against never trapping a driver | EXPERT, with the price and the reasoning |
| C2 | The 15-minute window is not checked offline (the stripe has no `paidAt`, H10) | **none** — reconciliation sees a payment, so nothing is flagged | **nobody — open** |
| C3 | A driver let out remotely after paying, or without paying (EM-23) | **none** — no reversal, refund or chargeback concept exists in the language at all | **nobody — open (H9)** |

C1 is the textbook corrective policy: the violating state is legitimate, it may persist forever, the
reaction is a business decision, and the domain expert both defined it and priced it. C2 and C3 are
relaxed rules with nothing behind them.

## 5 & 6. Handled commands → created events

| Command | Event(s) | Note |
|---|---|---|
| `PresentCardAtExit` (online) | `ExitBarrierOpened`, `CardCollected` \| `ExitRefused` | one `ExitRefused` covers two different refusals — unpaid and expired window (flow 3.1, D-2) |
| `PresentCardAtExit` (unreachable) | `OfflineExitGranted` → `OfflineExitLog` (see that canvas) | the only lane that genuinely decides |
| `LetDriverOut` | `RemoteExitGranted` | consumed by nobody |
| `RefillEntranceMachines` | `CardsRefilled` | consumed by nobody; no rule behind it |
| *(policy, no command)* on `TicketIssued` | `SpotWrittenToStripe`, `EntryBarrierOpened` | an automation, correctly not a command |
| *(policy, no command)* on `TicketPaid` | `PaidStatusWrittenToStripe` | writes `paidFlag` and **not** `paidAt` (H10) |
| *(policy, no command)* on `TariffChanged` | — the rate card is distributed, nothing is emitted | EM-03 |
| **none — no emitter** | `BarrierStuckOpen` | in the interface with nothing producing it (H5). `7-define` proposed removing it; still not applied |

Two of the three driver-facing commands produce events nobody reads, and the two stripe-write events
are hardware acknowledgements that no invariant anywhere consumes (`../README.md` critique 2).

## 7. Throughput — will one instance collide?

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate, per instance | **unknown** — cars per hour at one gate was never stated | **unknown**, and this is the number that matters: entry and exit load is bursty (shift ends, events, airport banks) |
| Total number of clients, per instance | **1** — one vehicle is physically at a barrier at a time; the queue serialises before the software does | 2 — a driver command and a `TariffChanged` push can land together, on disjoint state |

→ **concurrency conflict chance: low**, and low for a structural reason rather than a hopeful one:
**one gate merges no independent command streams — the physical queue is the serialiser.**

**Unknown, and who could supply it:** terminals per site, peak vehicles per hour per gate, outages
per year and their duration (`../README.md`: an abuse rate was given, an outage rate never). The
operator holds the first two today; the terminal supplier holds the third. None is invented here —
they decide whether the edge needs to buffer more than one exit at a time.

## 8. Size

**Persistence style: not chosen.** The event-count reading of this cell does not apply; measured as
rows loaded and locked per operation.

| Metric | Value |
|---|---|
| Rows loaded and locked for one operation | one terminal row plus the current rate card; **small** |
| Lifetime of an instance | **unbounded — a machine lives for years.** The §8 warning case |

The unbounded lifetime is safe **only because this aggregate holds current state, not history**: the
history is `OfflineExitLog`, which is where the time-scoping heuristic must be applied (see that
canvas). If a per-terminal journal of every barrier movement is ever added here, it must be scoped
to a period — a day or a shift — or this instance becomes the ever-growing stream §8 warns about.

## Handoff

- **`data-model`** takes: `Terminal` (terminalId, siteId, role, connectivityState, barrierState) and
  the `CardStripeRecord` and `TerminalRole` value objects. It does **not** take I1–I3 — all three are
  decision rules, none is a constraint. It **must** know that this aggregate is replicated to the
  edge and has to be readable and writable while the centre is unreachable: that is a storage
  requirement, not a deployment detail.
- **`api-designer`** takes: `PresentCardAtExit`, `LetDriverOut`, `RefillEntranceMachines` as the
  surface, and `OfflineExitLogUploaded` as the one published contract. It does **not** take
  `SpotWrittenToStripe`, `PaidStatusWrittenToStripe`, `CardCollected` — hardware acknowledgements.
- **Implementer** takes: the two state axes, the three invariants, and the explicit instruction that
  a slow answer from the centre is **not** a refusal. Which way to fail on a slow answer is an open
  question (`../README.md`), so it must not be decided silently in a timeout constant.

## Open questions this canvas depends on

H10 (does the stripe carry `paidAt`) · H18 (what an entrance terminal does offline) · H5 (what
detects a stuck barrier) · H11 (three terminal types or four) · H9 (reversal after a remote let-out)
· plus: how a terminal distinguishes "unreachable" from "refused", and whether there is an upload
deadline. All need the expert or a hardware supplier; none can be answered from the sources.
