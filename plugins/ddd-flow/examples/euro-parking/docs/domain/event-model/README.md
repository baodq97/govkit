---
id: DOMAIN-EM-0001
title: Euro Parking — event model, one garage end to end
status: draft
owner: TBD
date: 2026-07-27
mode: code
---

# Event model — one garage: setup → tariff → ticket → pay → exit → next morning

Phase 1 of `8-code`. The scenario is not chosen here: `business-model.md` already names it —
*"Thinnest end-to-end slice: one garage — setup → tariff → ticket → pay → exit (incl. offline) →
next-morning reconciliation."* Input: the ten context READMEs and `model.yaml` files,
`message-flows/` 0001–0004, `discovery/timeline.md` (elements 1–69), `hotspots.md` (H1–H19),
`EXPERT.md`. No code, no schema, **no persistence technology chosen**; the expert is unavailable, so
no gap below is closed by inference.

**Notation:** Event Modeling (yellow = event, blue = command, green = read model), *not*
EventStorming — this specifies what gets built. No branching: where the story forks it is two
slices. Every command, event and aggregate name is reused verbatim from `model.yaml` or
`timeline.md`. Names marked **[new]** do not exist in the model; they are proposed deltas to
`3-decompose` and are **not** used as though they existed.

**Surfaces.** Driver: entrance / payment / exit terminal screens and two signs (FULL, NOT PAID) — no
wireframes exist anywhere; the expert described machines, never screens. Operator: the tariff screen
("you give us the screen"), the reconciliation view, the daily exceptions list, the occupancy
report. A slice with no surface is an automation or a translation and says which.

Legend: **⛔** = no `Then` can be written from any source, so the slice is *not* handover-ready.

## A. Standing setup

**EM-01 · Configure a site** — state change · operator screen · SiteConfiguration (CRUD, no aggregate)
`ConfigureSite{siteId, bays[id, level|area, class], entrances, exits}` → `SiteConfigured`
G a garage with bay 212 on level 3 · W `ConfigureSite` adds a second bay 212 on level 3 · T rejected — a spot identifier is unique within a site (`INPUT.md` §3). **The rejection has no event name [new].**

**EM-02 · Set a tariff** — state change · operator screen · Tariff (transaction script, no aggregate)
`SetTariff{siteId, vehicleClass, ratePerStarted15, freeFirst15, dailyCap, night/weekend}` → `TariffChanged`
G a site priced at €1.00 per started 15 min (rate illustrative; the rule is the stated one) · W the site manager saves €1.50 for Saturday · T `TariffChanged` is emitted, with no support ticket in the path.

**EM-03 · Rates reach the machines** — automation · no surface
`TariffChanged` → *(policy)* → every `Terminal` at that site holds the new rate card
G a rate saved at 16:00 · W the evening passes · T every terminal at that site prices at the new rate. This is the stated purchase condition and it is a latency SLO, not an invariant — see `Terminal.md` §4.

## B. Entry — the garage happy path and its refusals

**EM-04 · Free bays per class** — translation + state view · garage only · **owner unresolved (F1)**
`BayOccupied` / `BayVacated` (GuidanceIntegration ACL) → read model `FreeBaysByClass{siteId, class → count}`
G bay 212 free and sensed · W `BayOccupied{212}` arrives · T the electric-car count for that site drops by one. In a **lot** this slice has no source at all (H2/H3) — see EM-10.

**EM-05 · Admit, bay of the declared class** — state change · entrance terminal
`DeclareVehicleDetails{siteId, declaredClass}` → **ParkingVisit** → `VehicleClassDeclared`, `TicketIssued{visitId, assignedSpot}`
Reads: `FreeBaysByClass`, site topology.
G a garage with a free electric bay · W a driver declares *electric car* · T `TicketIssued` names that bay and the charged class is *electric car*.

**EM-06 · Admit by substitution** — state change · entrance terminal
same command → `TicketIssued` with a bay of another class; charged class unchanged
G no electric bay free and a normal bay free · W a driver declares *electric car* · T admitted to the normal bay, charged at the electric-car rate, no charger (EXPERT). Same for car → truck bay. **Never** truck → car bay (EM-08). H16: only three pairs are stated; motorcycles were never discussed.

**EM-07 · Refuse — the site is full** — state change (rejection) · FULL sign
same command → `EntryRefused{siteId, declaredClass, reason: site full}`
G no bay of any class free · W a driver declares any class · T `EntryRefused`, the sign says FULL, the barrier stays down, **no ticket and no visit are created**. Nobody consumes `EntryRefused` (F4).

**EM-08 · Refuse — truck, truck bays full** — state change (rejection) · FULL sign
same command → `EntryRefused{reason: no bay for class}`
G every truck bay taken and car bays free · W a driver declares *truck/bus* · T refused — "a truck cannot use a car bay", the substitution runs one way only.

**EM-09 · Write the spot and open the barrier** — automation · no surface · TerminalOperations
`TicketIssued` → *(policy)* → `SpotWrittenToStripe`, `EntryBarrierOpened`, then `EntryRecorded{entryTime}`
G a ticket issued for bay 212 · W the entrance terminal writes the card · T the stripe carries `assignedSpot`, the barrier opens, entry time is recorded and reaches OccupancyInsight and FiscalRecord.

**EM-10 · ⛔ Admit at a lot** — state change · the same command, a different domain
No capacity source exists in a lot: no sensors, and counting entries minus exits was never stated (H2). EM-04 cannot be built, so EM-05–EM-08 have no input. `assignedSpot` degrades from a bay to an area, and nothing is held or released. *Blocks: H2, H3, H17. Answer before writing a lot slice — do not port the garage one.*

## C. Inside the site

**EM-11 · Plate → registered class → mismatch** — translation, then automation · garage only
`PlateRead` (camera, ACL) → `VehicleClassLookedUp` (supplier) → `VehicleClassMismatchDetected` → *(policy)* the higher of the two rates is charged at payment **and** an exceptions-list entry is raised
G *car* declared and the registration says *truck/bus* · W the driver pays · T the truck rate is charged and the mismatch appears on that site's daily exceptions list.

**EM-12 · ⛔ Plate deleted at seven days** — automation (timer) · no surface
The rule is stated and non-negotiable (works council) but **no event exists** for the deletion **[new]**, and it collides head-on with EM-27. *Blocks: H7.*

**EM-13 · Declined slice — the assigned bay is taken** — no command, no event, no consequence
"The driver drives on and takes the next free one… we do not chase it." Recorded so nobody adds reassignment logic later; this is the corrective policy in `ParkingVisit.md` §4, not a slice.

## D. Payment

**EM-14 · Pay the ticket** — state change · payment terminal · **rejection path missing**
`PayTicket{stripe as read, terminalId}` → **ParkingVisit** → query `PriceOfStay?` → `TicketPaid{visitId, amount, paidAt}`
G entry at 10:00, free-first-15 on, €1.00 per started 15 min, exit priced at 11:07 · W `PayTicket` arrives · T 67 min = 5 started blocks, the first free → €4.00 and `TicketPaid` at 11:07, below the daily cap.
**Two holes, both stated absences:** the payment-captured fact has no name anywhere (H9, flow 2.3), and nothing in the command identifies the visit (H13, flow 2.4) — see F7.

**EM-15 · Write paid to the stripe** — automation · no surface
`TicketPaid` → `PaidStatusWrittenToStripe{paidFlag}`
G a paid visit · W the terminal writes the card · T the stripe says paid — and carries **no payment time** (H10), which is why EM-21 cannot check the window.

**EM-16 · ⛔ Lost ticket** — state change · payment terminal (a button)
`DeclareLostTicket` → `LostTicketCharged{siteId, vehicleClass, amount}`, `ReplacementCardIssued`. With no card there is no visit to look up, so *which* class's daily cap is chosen was never stated, nor how the exit trusts a replacement card. *Blocks: H12.*

**EM-17 · ⛔ Pay the difference** — state change · payment terminal
`PayDifference` → `AdditionalPaymentCollected{visitId, amount, paidAt}`. The event exists; **the amount does not**: no source says whether it is priced from `paidAt` or from entry with the first payment deducted, whether the daily cap applies again, or whether a fresh 15-minute window starts. *Blocks: D-3.*

## E. Exit

**EM-18 · Exit online, inside the window** — state change · exit terminal
`PresentCardAtExit` → query `MayThisCardLeave?` → **ParkingVisit** answers → `ExitBarrierOpened`, `CardCollected`, `VehicleExited{exitTime}`
G paid at 11:07 · W the card is presented at 11:19 · T the barrier opens, the machine keeps the card, `VehicleExited` reaches FiscalRecord, RevenueReconciliation and OccupancyInsight.

**EM-19 · Refuse — unpaid card** — state change (rejection) · NOT PAID sign
`PresentCardAtExit` → `ExitRefused{terminalId, reason}`
G an unpaid visit · W the card is presented · T the card is returned, the sign says NOT PAID, the barrier stays down — and a payment machine sits before every exit for this.

**EM-20 · Refuse — the window expired** — state change (rejection) · sign text unknown
`PresentCardAtExit` → `ExitRefused{reason}` (the same event as EM-19 — flow 3.1)
G paid at 11:07 · W the card is presented at 11:28 · T the card is refused and the driver pays the difference at a machine (EM-17). **What the sign shows a driver who *has* paid was never stated** (D-2).

**EM-21 · Offline exit** — state change at the edge · exit terminal, alone
`PresentCardAtExit` (system unreachable) → query the stripe → **Terminal** opens → `OfflineExitGranted{stripeSnapshot, exitTime}`, `OfflineExitLogged` on **OfflineExitLog**
G the terminal cannot reach the system and the stripe says paid · W the card is presented at 02:00 · T the barrier opens and the exit is logged at the terminal. The 15-minute window is **not** checked — the stripe has no time (H10, flow 4.4); nobody stated that dropping it was intended.

**EM-22 · Upload on reconnect** — automation · no surface
`OfflineExitLogUploaded{entries}` → RevenueReconciliation **and** ParkingVisit
G a logged offline exit · W the link returns · T RevenueReconciliation receives the exit (EM-25). **ParkingVisit does nothing**: no `VehicleExited`, no exit time, so a ten-year fiscal record is never written (F2, flow 4.2, D-4). No upload deadline is stated (flow 4.5).

**EM-23 · ⛔ Remote let-out** — state change · intercom + control-room screen
`LetDriverOut` → `RemoteExitGranted`. Consumed by nobody; whether a captured payment is reversed, or an unpaid driver is pursued, has no concept in the language at all. *Blocks: H9.*

## F. The next morning

**EM-24 · ⛔ Reconcile the takings** — state change · reconciliation view
`ReconcileTakings{siteId, businessDate}` → **DailyReconciliation** → `TakingsReconciled`. Two of the three legs (bank, coin box) have **no emitter anywhere in the model** (flow 4.3), and there is **no event for a reconciliation that does not balance [new]** — which is the entire reason the context exists. *Blocks: PC-4, H9.*

**EM-25 · Flag an unmatched exit** — automation · exceptions list
`OfflineExitLogUploaded` → *(policy)* → `UnmatchedExitFlagged{siteId, exitReference}`
G an uploaded exit with no payment against it · W the morning run executes · T it is flagged and appears on that site's daily exceptions list.

**EM-26 · Write off an exception** — state change · exceptions list
`WriteOffException` → `ExceptionWrittenOff`
G a flagged unmatched exit · W the site manager writes it off · T it is recorded and leaves the list. **No threshold, no authority limit and no approval step were ever stated** — recorded as a stated absence, not designed around.

**EM-27 · ⛔ Pursue the plate holder** — state change · exceptions list
`PursuePlateHolder` → `ClaimSentToPlateHolder{plate}`. The plate is deleted at seven days, "not negotiable", and an upload has no deadline: past day 7 the claim has no subject. *Blocks: H7.*

**EM-28 · ⛔ The fiscal record** — translation into an append-only store
`TicketPaid` + `VehicleExited` → `FiscalRecordRetained{site, entry, exit, amount, VAT, method, machine}`. Two holes: nothing identifies the visit the record belongs to (H13), and the offline path (EM-22) produces no exit time. VAT appears only as a field — nobody said who derives it. *Blocks: H13, H8, D-4.*

**EM-29 · ⛔ The occupancy report** — state view · operator screen
`BayOccupied`/`BayVacated` + `EntryRecorded`/`VehicleExited` + `SiteConfigured` → occupancy per bay type over time. Unspecifiable today: a car in a truck bay counts as which type (H14), a lot observes nothing (H3), the sensors are untested (H4), and the resolution and retention of the series were never stated. *One of the two paid-for capabilities.*

**EM-30 · ⛔ The daily exceptions list** — state view · operator screen
Four item kinds; two have no source: `BarrierStuckOpen` has no emitter (H5) and entitlement-bay users cannot be identified by any mechanism that exists (H6). `CardsRefilled` is emitted and consumed by nobody — no stock level, no threshold, no alert.

## Aggregates the slices touch — what earns a canvas

| Context | Type | Aggregate(s) touched | What it gets |
|---|---|---|---|
| ParkingVisit | core | `ParkingVisit` (EM-05–08, 14, 16–20) | full canvas |
| TerminalOperations | core | `Terminal` (EM-03, 09, 15, 19–21, 23), `OfflineExitLog` (EM-21, 22) | full canvas each |
| RevenueReconciliation | core | `DailyReconciliation` (EM-24–27) | full canvas |
| Tariff | supporting | none — a rate card plus one calculation (EM-02, 03, 14) | transaction script; H15 is the trigger that would force an aggregate |
| SiteConfiguration | supporting | none — standing setup, one uniqueness rule (EM-01) | CRUD + published topology; **no aggregate, no repository, no domain event beyond the change notice** |
| VehicleIdentification | supporting | none — a supplier lookup, a comparison, a timer (EM-11, 12) | transaction script |
| FiscalRecord | supporting | none — append-only writes plus a per-country retention parameter (EM-28) | record store; escalate only for legal hold |
| OccupancyInsight | core by value | none, by construction (EM-29) | projection; nothing to canvas until H3/H4/H14 |
| GuidanceIntegration · PaymentCapture | generic | none (EM-04, 11, 14) | bought adapters behind an ACL; no domain model |

Four aggregates in three contexts, from thirty slices. Six contexts get an explicit "no aggregate"
with a reason — that is the correct result for them, not an omission.

## What phase 1 exposed that the canvases would not

- **F1 — a read model nobody owns.** `FreeBaysByClass` decides admission (EM-04 → EM-05) but no context declares it. PC-2 proposes ParkingVisit; `3-decompose` has not applied it, so today the invariant "no ticket when the site is full" is enforced against an unowned projection of a supplier's sensors.
- **F2 — an event whose consumer does nothing.** `OfflineExitLogUploaded` reaches ParkingVisit and produces nothing (EM-22): the visit never reaches `exited`, and the fiscal record for that stay is never written. The most expensive gap in the model.
- **F3 — five missing rejection paths.** EM-01 (duplicate spot id), EM-14 (payment declined), EM-21 (the log write fails while the barrier opens — F8), EM-24 (does not balance), EM-30 (a card the exit cannot read). None has a name; all five were found by being forced to write a `Then`.
- **F4 — four events with no consumer** (`VehicleClassDeclared`, `EntryRefused`, `CardsRefilled`, `RemoteExitGranted`) and **F5 — one event with no emitter** (`BarrierStuckOpen`, H5). Carried from `context-map.md`, unchanged by slicing.
- **F7 — the commands cannot find their aggregate.** `PayTicket`, `PayDifference` and `PresentCardAtExit` arrive carrying only the stripe: `assignedSpot` and `paidFlag`. Neither identifies a visit — the same plastic serves ~100 of them, and in a lot an area is shared. **A repository cannot load the root from what the command carries.** This is H13 stated as an implementation blocker, and it blocks EM-14, EM-17 and EM-18.
- **F8 — one atomicity decision the model has not taken.** At EM-21 the barrier (`Terminal`) and the journal (`OfflineExitLog`) change in the same instant with nothing else reachable. Either they are one aggregate or the consistency is eventual; there is no third option. See `OfflineExitLog.md` §1.
- **F9 — the two paid-for capabilities are the two unspecifiable slice groups.** EM-24 and EM-29 are both ⛔. `discovery/README.md` finding 5 predicted this; slicing turns it into 2 of 30 slices carrying 100% of the stated willingness to pay.

**Counts:** 30 slices · 18 handover-ready · 11 ⛔ · 1 declined by the business · 3 names proposed
**[new]** and not used · 0 messages invented.

## Proposed deltas to `3-decompose` (not applied — it owns `model.yaml`)

1. **Name the rejection of a reconciliation that does not balance.** `TakingsReconciled` names only success (RevenueReconciliation's own strongest finding). A `2-discover` question, not a modeller's invention.
2. **`BarrierStuckOpen` leaves the interface until H5 names an emitter** — already proposed and not applied by `7-define`; slicing corroborates it (EM-30).
3. **Give `FreeBaysByClass` an owner** (PC-2), or admission is enforced against nobody's read model.
4. **Reconsider `Terminal` + `OfflineExitLog` as one aggregate** — F8; evidence and trade-off in `OfflineExitLog.md`.
5. **`A tariff change is live at that site's machines the same evening` is not an invariant** of the `Terminal` aggregate — it spans every terminal at a site and is a latency SLO. Move it out of the invariant list; it stays a purchase condition and a verification metric.

## Open questions carried into phase 2

H1 · H2 · H3 · H4 · H5 · H6 · H7 · H8 · H9 · H10 · H12 · H13 · H14 · H15 · H16 · H18 — plus D-2,
D-3, D-4 and PC-4. Sixteen of nineteen hotspots survive into the aggregate design; none was answered
here and none could be, because the expert is not available and no source states them.
