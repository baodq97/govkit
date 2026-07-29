---
id: DOMAIN-AGG-0001
title: ParkingVisit — aggregate design canvas
status: draft
owner: TBD
date: 2026-07-27
mode: code
context: ParkingVisit
---

# Aggregate: `ParkingVisit` (root: `ParkingVisit`)

Aggregate Design Canvas v1.1. Sourced from `../model.yaml`, `../README.md` (Bounded Context Canvas),
`../../event-model/README.md` slices EM-05–08, EM-14, EM-16–20, `EXPERT.md` 2026-07-27. Nothing here
is an invariant unless a person stated the rule.

## 1. Description

One vehicle's stay at one site, from admission to exit: whether it may come in, where it was sent,
what it owes, whether it has paid, and whether it may leave now. It is the only aggregate that holds
money owed and the right to leave.

**Why this boundary.** The stay is the unit every stated rule is about, and the pricing rule, the
15-minute window and the paid flag all read and write the same instance within one command.

**Alternatives rejected, and what each cost:**

| Rejected boundary | What it would add | Why rejected |
|---|---|---|
| `Site` as the aggregate (capacity inside the boundary) | "no ticket when the site is full" becomes enforceable | merges every driver's independent command stream at a site onto one instance — the slot→day mistake at garage scale. And the business has already relaxed the rule below it: a driver whose bay is taken "drives on and takes the next free one, no consequence" |
| Split payment from exit | smaller instances, less contention | the 15-minute window ties them; `../README.md` states they must stay in one aggregate for exactly that reason |
| Merge with `Terminal` (one context, one aggregate) | 11 messages in flow 0002 drop to far fewer | destroys the seam that lets the barrier open while the centre is unreachable — the behaviour the business refuses to give up (flow 4.1) |

**Not decided here:** whether a lot has this aggregate at all (H2/H3/H17, EM-10). The canvas below is
written from the garage, which is the only site type the sources describe end to end.

## 2. State transitions

```
(no instance) --DeclareVehicleDetails--> admitted --PayTicket--> paid --PresentCardAtExit--> exited
                     |                                 ^                  (inside 15 min)
                     |                                 |
                 refused: no instance is created   PayDifference (window expired, EM-17/EM-20)
```

Four transitions, one loop, no branch: **not anaemic, and no split signal.** Two notes that matter:

- **A refusal creates nothing.** `EntryRefused` carries `{siteId, declaredClass, reason}` and no
  `visitId` — there is no aggregate instance to refuse against (EM-07, EM-08).
- **`paid` is not a timer state.** The window is `PaymentWindow{paidAt, expiresAt}` evaluated when
  the exit asks; the aggregate does not expire itself. That keeps the rule testable without a clock
  inside the model — see `../../code-structure.md` §1.
- **The offline path never reaches `exited`** (F2 / flow 4.2). A visit whose driver left at 02:00
  stays `paid` forever. That is the state machine's honest shape today, not a defect to paper over.

## 3. Enforced invariants — within one transaction on one instance

| # | Invariant | Stated by | Enforceable in schema? |
|---|---|---|---|
| I1 | Exit must follow payment within fifteen minutes; past it the card is refused | EXPERT | **no** — read-then-decide against `paidAt` + now; aggregate only |
| I2 | A stay is priced per started fifteen minutes at the site+class rate, with that site's free-first-15, daily cap and night/weekend rates | EXPERT | **no** — the amount is quoted by Tariff and stored; the schema can hold it, not compute it |
| I3 | The system's paid status is the truth; the stripe is a copy | EXPERT | partly — a `paidAt` column is the record; its authority is a code rule |
| I4 | When the declared class and the registered class disagree, the higher of the two rates is charged | EXPERT | **no** — only if the mismatch is known at payment time; otherwise see C3 |
| I5 | A truck is never admitted to a car bay | EXPERT | **no** — spans the free-bay projection |

Five invariants for a core aggregate is moderate: real local complexity, no smell. **Two rules the
model lists as invariants are not held here:** the lost-ticket charge (EM-16) carries no `visitId`
and so has no instance (H12), and substitution (EM-06) reads a projection this aggregate does not
own (F1).

## 4. Corrective policies — what repairs a relaxed rule

| # | Relaxed rule | Corrective policy | Who defined it |
|---|---|---|---|
| C1 | "No ticket when the site is full" — capacity truth is a supplier's sensors, read through a projection (flow 1.1) | **for the bay-level case only:** the driver drives on and takes the next free bay; sensors resync in a minute or two; nobody chases it, there is no consequence | EXPERT, explicitly |
| C2 | "The system's paid status is the truth" — offline the stripe wins and may have been rewritten | the next morning's reconciliation: an exit with no payment against it is flagged, and the site manager writes it off or pursues the plate. Priced: 4–5 abuses in 15 years against never trapping a driver | EXPERT, explicitly and with the price |
| C3 | I4 when the mismatch arrives after payment | the mismatch goes on that site's daily exceptions list and the site manager works it | EXPERT |
| C4 | **I1 offline** — the window cannot be checked because the stripe carries no `paidAt` (H10) | **none.** Reconciliation catches an exit with *no* payment; it does not catch an exit long after one | **nobody — open** |
| C5 | A ticket issued into a site that is genuinely full (not the bay case) | **none.** The expert named the compensation for the taken-bay case only | **nobody — open** |

C4 and C5 are the finding this section exists to produce: **a relaxed invariant with no corrective
policy is an unhandled defect with a schedule, not eventual consistency.** Both need the business,
not an architect. Three of five policies are expert-stated, which is the healthy ratio; two are
holes.

## 5 & 6. Handled commands → created events

| Command | Event(s) | Note |
|---|---|---|
| `DeclareVehicleDetails` | `VehicleClassDeclared`, `TicketIssued` \| `EntryRefused` | `VehicleClassDeclared` and `EntryRefused` are consumed by nobody (F4) |
| `PayTicket` | `TicketPaid` | no rejection event exists for a declined payment (H9, F3) |
| `PayDifference` | `AdditionalPaymentCollected` | the amount has no stated rule (D-3) |
| `DeclareLostTicket` | `LostTicketCharged`, `ReplacementCardIssued` | **no instance to handle it against** (H12); both events carry a site and a class, no visit |
| *(query)* `MayThisCardLeave?` | — | a query, correctly not a command |
| **none** | `AreaAssigned` | an event with no command in any flow — the lot half of an assignment whose garage twin travels inside `TicketIssued` |
| **none — missing** | should follow `OfflineExitLogUploaded` | the event arrives and nothing happens (F2). A command is missing, or the fact is; `2-discover` owns which (D-4) |

**The blocker under all of it (F7):** `PayTicket`, `PayDifference` and `PresentCardAtExit` arrive
carrying only the stripe — `assignedSpot` and `paidFlag`. Neither identifies a visit: the same card
serves ~100 of them and a lot's area is shared. **A repository cannot load this root from what its
own commands carry.** H13 is not a naming gap; it is the aggregate's addressability.

## 7. Throughput — will one instance collide?

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate, per instance | ~3–4 commands over a stay of hours (declare · pay · [pay difference] · exit) | **unknown** — nobody stated a stay-length or repeat-payment distribution |
| Total number of clients, per instance | **1** — one driver, at one machine at a time; terminals act sequentially, never concurrently | 2 if a late `VehicleClassMismatchDetected` lands during payment |

→ **concurrency conflict chance: low.** This is the shopping-basket shape, not the conference-booking
shape: one instance, one driver, commands separated by minutes and by physically walking.

**Stated precisely:** the aggregate is safe because it merges **no** independent command streams. A
`Site`-scoped aggregate would merge one stream per driver — hundreds a day onto one instance — which
is the reason §1 rejected it. Attribute count is irrelevant here.

**Unknown, and who could supply it:** visits per site per day, bays per site, peak entries per hour
(H19 — never asked; the operator's current system already holds all three). No number is invented,
because a guessed volume here becomes a guessed boundary and then a schema.

## 8. Size

**Persistence style: not chosen** (`INPUT.md` conditions). The event-sourcing reading of this cell
therefore does not apply as written — see `../../code-structure.md` §5.

| Metric | Value |
|---|---|
| Rows loaded and locked for one operation | one visit row plus its value objects; no collections; **small** |
| Lifetime of an instance | hours to days — bounded by the stay itself, the ideal case for §8's time-scoping heuristic. **Except** the offline path, where an instance never closes (F2) |
| If event sourcing is later chosen | ~6–10 events per instance, lifetime hours → small, no snapshots, natural archival |

The ten-year obligation does **not** live here: the fiscal record is a separate append-only context
that must outlive both the visit and the card. Keeping it out is what stops this aggregate from
being unbounded.

## Handoff

- **`data-model`** takes: `ParkingVisit` root, the value objects `AssignedSpot` (polysemic — bay in a
  garage, area in a lot, never both), `VehicleClass`, `Money`, `ParkingPeriod`, `PaymentWindow`,
  `CardStripeRecord`, and the identity scheme **once H13 is answered**. It does **not** take I1, I2,
  I4, I5 — none is expressible as a constraint; they stay in the aggregate.
- **`api-designer`** takes: `DeclareVehicleDetails`, `PayTicket`, `PayDifference`,
  `DeclareLostTicket` and the `MayThisCardLeave?` query as the public surface; `TicketIssued`,
  `TicketPaid`, `VehicleExited`, `EntryRefused` as published events. It does **not** take
  `SpotWrittenToStripe` / `PaidStatusWrittenToStripe` — those are TerminalOperations' internals
  leaking inward (`../README.md` critique 4).
- **Implementer** takes this canvas plus `../../code-structure.md`. Everything not written down —
  the amount of "the difference", the lost-ticket class, the offline exit's consequence — is an open
  question, not a decision to make in code.
