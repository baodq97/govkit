# Euro Parking — event storm (big picture), 2026-07-27

Level: **big picture**. No aggregates are placed here — design-level aggregates belong to
`3-decompose`, and placing them now would pre-empt the boundary work.

`confirmed` = the domain expert said it in the session of 2026-07-27. `candidate` = only the brief
(`INPUT.md`) implies it and no person has verified it. The expert is not available for follow-up,
so no candidate can be promoted in this run. Storm started at **TicketPaid → VehicleExited →
TakingsReconciled** (where the money, the pain and the sales case sit) and worked outward.

## A. Configuration — the operator's standing setup

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 1 | SiteConfigured | event | Site Manager / ConfigureSite — bays, types, level or area, entrances, exits | confirmed | Expert, 2026-07-27 |
| 2 | SiteLayoutRevised | event | Site Manager / ReviseSiteLayout — "edited whenever they repaint the lines" | confirmed | Expert, 2026-07-27 |
| 3 | TariffChanged | event | Site Manager / SetTariff — per site, per vehicle class | confirmed | Expert, 2026-07-27 |
| 4 | whenever a tariff changes, it is live at that site's machines the same evening — no support ticket | policy | — | confirmed | Expert, 2026-07-27 |
| 5 | whenever a stay is priced: per started 15 minutes at the site+class rate, apply that site's free-first-15 setting, that site's daily cap, and its night/weekend rates where it has them | policy | — | confirmed | Expert, 2026-07-27 |
| 6 | Tariff screen — the operator sets rates themselves, "always"; the start-up supplies the screen | read-model | Site Manager | confirmed | Expert, 2026-07-27 |

## B. Entry

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 7 | VehicleClassDeclared | event | Driver / DeclareVehicleDetails at the entrance terminal | confirmed | Expert, 2026-07-27; INPUT §7.1 |
| 8 | EntryRefused — site full: sign says FULL, barrier stays down, no ticket issued | event | — | confirmed | Expert, 2026-07-27 |
| 9 | EntryRefused — truck when the truck bays are full: "the truck does not come in" | event | — | confirmed | Expert, 2026-07-27 |
| 10 | whenever no bay of the declared class is free, admit to a substitutable class at the declared class's rate — car→truck bay yes, EV→normal bay yes (no charger), truck→car bay never | policy | — | confirmed | Expert, 2026-07-27 |
| 11 | TicketIssued | event | Driver / CollectTicket at the entrance terminal | confirmed | Expert, 2026-07-27; INPUT §4, §7.2 |
| 12 | BayAssigned — garage: a specific bay, "level 3, bay 212" | event | — (see H1: terminal or supplier's signage?) | confirmed | Expert, 2026-07-27 |
| 13 | AreaAssigned — lot: an area only, "the best we can honestly do is area C" | event | — | confirmed | Expert, 2026-07-27 |
| 14 | SpotWrittenToStripe — same field on the card, bay in a garage, area in a lot | event | Entrance terminal | confirmed | Expert, 2026-07-27; INPUT §5, §9, §10 |
| 15 | EntryBarrierOpened | event | — | confirmed | Expert, 2026-07-27 (stated as its negation: "the barrier does not open") |
| 16 | EntryRecorded — entry time is kept; it is a field of the fiscal record | event | — | confirmed | Expert, 2026-07-27 |
| 17 | FULL sign at the entrance | read-model | Driver | confirmed | Expert, 2026-07-27 |
| 18 | Free bays per level and per type — counted by the guidance system; **garage only** | read-model | Guidance signage | confirmed | Expert, 2026-07-27 |

## C. Inside the site

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 19 | PlateRead — garage camera; **no equivalent in a lot** | event | Garage camera | confirmed | Expert, 2026-07-27 |
| 20 | VehicleClassLookedUp — supplier's system returns the class from the registration | event | Registration lookup (external) | confirmed | Expert, 2026-07-27 |
| 21 | VehicleClassMismatchDetected — typed class disagrees with the plate's class | event | — | confirmed | Expert, 2026-07-27 |
| 22 | whenever the classes disagree, charge the higher of the two rates at payment and put it on the daily exceptions list | policy | — | confirmed | Expert, 2026-07-27 |
| 23 | BayOccupied — ceiling sensor per bay; **garage only** | event | Bay sensor | confirmed | Expert, 2026-07-27 |
| 24 | BayVacated — "sensor clears in a garage. In a lot there is nothing to release, because nothing was held" | event | Bay sensor | confirmed | Expert, 2026-07-27 |
| 25 | whenever the assigned bay is taken anyway (sensor fault, car across two bays), the driver drives on and takes the next free one — no consequence, no reassignment, sensors resync "within a minute or two" | policy | — | confirmed | Expert, 2026-07-27 |
| 26 | whenever a plate record is 7 days old, delete it — agreed with the works council, "not negotiable" | policy | — | confirmed | Expert, 2026-07-27 |
| 27 | Guiding system does not exist in a lot | (stated absence) | — | confirmed | Expert, 2026-07-27; INPUT §12 |

## D. Payment

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 28 | TicketPaid | event | Driver / PayTicket at a payment terminal (method details out of scope) | confirmed | Expert, 2026-07-27; INPUT §7.3 |
| 29 | PaidStatusWrittenToStripe — the stripe is a copy; the system is the truth | event | Payment terminal | confirmed | Expert, 2026-07-27; INPUT §10 |
| 30 | LostTicketCharged — flat charge = the daily cap for that vehicle class, a button on the machine, no attendant | event | Driver / DeclareLostTicket | confirmed | Expert, 2026-07-27 |
| 31 | ReplacementCardIssued — "a fresh card that says paid, and you leave" | event | Payment terminal | confirmed | Expert, 2026-07-27 |
| 32 | whenever more than 15 minutes pass between payment and exit, the exit refuses the card and the driver pays the difference at a payment machine — "a standing complaint, we are not changing it" | policy | — | confirmed | Expert, 2026-07-27 |
| 33 | AdditionalPaymentCollected — the difference, after an expired window | event | Driver / PayDifference | confirmed | Expert, 2026-07-27 |
| 34 | Payment acquirer — a machine's takings arrive at a bank; the link itself is unknown (H9) | external-system | — | candidate | Expert, 2026-07-27 ("I have never needed to know") |

## E. Exit

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 35 | ExitRequested | event | Driver / PresentCardAtExit | confirmed | INPUT §7.4, §8; Expert, 2026-07-27 |
| 36 | ExitRefused — unpaid: the machine gives the card back, the sign says NOT PAID, the barrier stays down | event | — | confirmed | Expert, 2026-07-27 |
| 37 | CardCollected — on a valid exit the machine keeps the card | event | Exit terminal | confirmed | Expert, 2026-07-27; INPUT §8 |
| 38 | ExitBarrierOpened / VehicleExited — exit time is kept, it is a field of the fiscal record | event | — | confirmed | Expert, 2026-07-27 |
| 39 | OfflineExitGranted — terminal cannot reach the system, reads the stripe, stripe says paid, it opens | event | Exit terminal | confirmed | Expert, 2026-07-27 |
| 40 | never trap a driver: whenever the exit terminal is offline, trust the stripe — "a driver trapped in a garage at 2am … ends up in the local paper" | policy | — | confirmed | Expert, 2026-07-27 |
| 41 | OfflineExitLogged — the exit is logged in the terminal even offline | event | Exit terminal | confirmed | Expert, 2026-07-27 |
| 42 | OfflineExitLogUploaded — when the link returns, the terminal uploads what it did | event | Exit terminal | confirmed | Expert, 2026-07-27 |
| 43 | RemoteExitGranted — the machine ate the card, the driver uses the intercom, the control room opens the barrier | event | Control Room Operator / LetDriverOut | confirmed | Expert, 2026-07-27 |
| 44 | CardsRefilled — a technician refills the entrance machines from the collected stack, twice a week; the same plastic serves ~100 visits | event | Technician / RefillEntranceMachines | confirmed | Expert, 2026-07-27 |

## F. The next morning — the operator's day

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 45 | TakingsReconciled — every morning, per site: what the machines say they took vs what the bank says arrived vs what the coin box held; 4 hours a week per site by hand today | event | Site Manager / ReconcileTakings | confirmed | Expert, 2026-07-27 |
| 46 | Reconciliation view — machines vs bank vs coin box | read-model | Site Manager | confirmed | Expert, 2026-07-27 |
| 47 | UnmatchedExitFlagged — the upload says a ticket left without a payment against it | event | — | confirmed | Expert, 2026-07-27 |
| 48 | ExceptionWrittenOff — "usually we write it off"; abuse seen 4–5 times in 15 years, always the same two sites | event | Site Manager / WriteOffException | confirmed | Expert, 2026-07-27 |
| 49 | ClaimSentToPlateHolder — "occasionally we send it to the plate we captured" (conflicts with #26 → H7) | event | Site Manager / PursuePlateHolder | confirmed | Expert, 2026-07-27 |
| 50 | BarrierStuckOpen — named as an exceptions-list item ("stuck open for forty minutes last night"); how it is detected was never stated (H5) | event | — | confirmed | Expert, 2026-07-27 |
| 51 | Daily exceptions list — offline exits, plate mismatches, stuck barriers, entitlement-bay users | read-model | Site Manager | confirmed | Expert, 2026-07-27 |
| 52 | Occupancy report — "how full was I at 5pm on Friday, per type"; taken to the landlord to argue rent | read-model | Site Manager | confirmed | Expert, 2026-07-27 |
| 53 | whenever occupancy shows a persistent shortage of a type, the operator repaints — "ten car bays into six truck bays" — which loops back to #2 | policy | — | confirmed | Expert, 2026-07-27 |
| 54 | EntitlementBayUsageReported — disabled and family bays: "build the report that shows a site manager who parked there" | read-model | Site Manager | confirmed | Expert, 2026-07-27 |
| 55 | no machine rule for disabled or family bays — "the machine has no way to check a disabled badge and we have never pretended it does"; family bays nobody enforces at all | (stated absence) | — | confirmed | Expert, 2026-07-27 |
| 56 | PatrolNoticeIssued — a patrol walks the site and issues a notice | event | Patrol Officer | confirmed | Expert, 2026-07-27 |
| 57 | FiscalRecordRetained — site, entry time, exit time, amount, VAT, payment method, and the machine it was paid at. **Not the plate.** | event | — | confirmed | Expert, 2026-07-27; INPUT §6 |
| 58 | retention is per country — DE/AT 10 years (GoBD), NL 7, FR unknown — "do not build ten years into the code" | policy | — | confirmed | Expert, 2026-07-27 |

## G. Actors and external systems

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 59 | Driver | actor | issues DeclareVehicleDetails, CollectTicket, PayTicket, PresentCardAtExit | confirmed | Expert, 2026-07-27 |
| 60 | Site Manager | actor | configures, prices, reconciles, works the exceptions, reads occupancy | confirmed | Expert, 2026-07-27 |
| 61 | Control Room Operator | actor | opens a barrier remotely on the intercom | confirmed | Expert, 2026-07-27 |
| 62 | Technician | actor | refills entrance machines from collected cards | confirmed | Expert, 2026-07-27 |
| 63 | Patrol Officer | actor | issues notices in disabled bays | confirmed | Expert, 2026-07-27 |
| 64 | Tax auditor | actor | asks for the fiscal record | confirmed | Expert, 2026-07-27 |
| 65 | Guidance system — cameras, bay sensors, LED signs, one supplier per site, three credible suppliers in Europe; bought, never built | external-system | — | confirmed | Expert, 2026-07-27; INPUT §11 |
| 66 | Plate-to-class registration lookup — the supplier's system | external-system | — | confirmed | Expert, 2026-07-27 |
| 67 | Bank — "what the bank says arrived" | external-system | — | confirmed | Expert, 2026-07-27 |
| 68 | Coin box — counted physically, third leg of the reconciliation | external-system | — | confirmed | Expert, 2026-07-27 |
| 69 | Control-room intercom — every site has one | external-system | — | confirmed | Expert, 2026-07-27 |
