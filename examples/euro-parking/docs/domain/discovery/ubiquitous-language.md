# Euro Parking — ubiquitous language, 2026-07-27

Definitions are the holder's words, not tidied. Where one word carries two meanings, **both rows
stay** — the collision is the finding, and it is the strongest boundary signal this session
produced. `Held by` names who used the word that way.

## Collisions — one word, two meanings

| Term | Definition | Held by | Status |
|---|---|---|---|
| Parking spot | a uniquely identified place to park; garage = number & floor, lot = number & area | INPUT.md §3 (brief) | candidate |
| Bay | a garage place with a ceiling sensor, individually assignable and releasable — "go to level 3, bay 212" | Expert (garage operations), 2026-07-27 | confirmed |
| Area | a lot's painted zone; nothing is held, nothing is released, "the best we can honestly do is area C and let them find a space" | Expert (lot operations), 2026-07-27 | confirmed |
| Vehicle type | one of: motorcycle, car, electric car, truck/bus, handicapped person, family-friendly | INPUT.md §2 (brief) | candidate |
| Vehicle class | what the vehicle **is**, and what the tariff is priced by; disabled and family are **not** in it | Expert, 2026-07-27 | confirmed |
| Entitlement | a property of the **person**, not the car — disabled and family bays; unenforceable by machine, reported not ruled | Expert, 2026-07-27 | confirmed |
| Ticket | the thing collected at the entrance, containing a spot ID; its information is stored 10 years | INPUT.md §4–6 (brief) | candidate |
| Card | the physical plastic with the read/write stripe, collected at the exit, refilled twice a week, "a hundred different visits over its life" | Expert, 2026-07-27 | confirmed |
| Fiscal record | site, entry time, exit time, amount, VAT, payment method, machine paid at — the thing a tax auditor asks for; **not** the plate | Expert, 2026-07-27 | confirmed |
| Paid (in the system) | the truth. "The system is the truth." | Expert, 2026-07-27 | confirmed |
| Paid (on the stripe) | a copy, "so the machines can be quick" — and the only authority the exit terminal has when the network is down, rewritable, abused 4–5 times in 15 years | Expert, 2026-07-27 | confirmed |
| Full (site) | no bay at all: the sign says FULL, the barrier does not open, no ticket is issued | Expert, 2026-07-27 | confirmed |
| Full (class) | no bay of that class: the driver is still admitted and given a substitutable bay at their own class's rate — "you just don't get a charger" | Expert, 2026-07-27 | confirmed |
| Free (bay) | garage: the sensor says free. Lot: unknowable — "nobody knows whether bay 17 has a car in it until somebody walks past it" | Expert, 2026-07-27 | confirmed |

## Single-meaning terms

| Term | Definition | Held by | Status |
|---|---|---|---|
| Site | one garage or one lot; the unit of setup, tariffs, reconciliation and occupancy | Expert, 2026-07-27 | confirmed |
| Garage | a site with bay sensors, cameras and guidance signage — "a different product" from a lot | Expert, 2026-07-27 | confirmed |
| Lot | "asphalt and painted lines"; no sensors, no guidance, no plate reading | Expert, 2026-07-27 | confirmed |
| Tariff | per started 15 minutes, set by the operator per site and per vehicle class; free-first-15 is a per-site setting; a daily cap per site; night/weekend rates at some sites | Expert, 2026-07-27 | confirmed |
| Daily cap | the most a class can pay in a day at that site — and also the flat charge for a lost ticket | Expert, 2026-07-27 | confirmed |
| Started fifteen minutes | the billing increment; a stay of 16 minutes is billed as two | Expert, 2026-07-27 | confirmed |
| The window | the 15 minutes allowed between paying and exiting; past it the exit refuses the card | Expert, 2026-07-27 | confirmed |
| Lost ticket | a self-service button on the payment machine: pay the daily cap for the class, get a fresh card that says paid | Expert, 2026-07-27 | confirmed |
| Offline exit | a barrier opened on the stripe's word alone, logged in the terminal and uploaded when the link returns | Expert, 2026-07-27 | confirmed |
| Exceptions list | the daily list a site manager works: offline exits, plate mismatches, the barrier stuck open | Expert, 2026-07-27 | confirmed |
| Write-off | the site manager's usual decision on an unmatched exit — "losing a few euros a year to that beats trapping one customer" | Expert, 2026-07-27 | confirmed |
| Reconciliation | machines vs bank vs coin box, every morning, per site; 4 hours a week by hand today | Expert, 2026-07-27 | confirmed |
| Occupancy | how full, per bay type, at a point in time — the number taken to the landlord to argue rent, and the basis for repainting | Expert, 2026-07-27 | confirmed |
| Guidance system | the bought package: cameras, bay sensors, LED signs; one supplier per site, three credible in Europe | Expert, 2026-07-27; INPUT §11 | confirmed |
| Mismatch | the plate's registered class disagrees with the class typed at the entrance → higher rate, exceptions list | Expert, 2026-07-27 | confirmed |
| Managed bay | the start-up's billing unit, per bay per month — "the per-bay line is the one that hurts if it goes to zero" | Expert, 2026-07-27 | confirmed |
| Terminal | a machine at an entrance, a payment point or an exit — the brief names three types but describes four behaviours (H11) | INPUT.md §7; Expert, 2026-07-27 | candidate |
| Notice | what a patrol issues to a car in a disabled bay; the only enforcement that exists | Expert, 2026-07-27 | confirmed |
| Remote let-out | a control-room operator opening a barrier on the intercom when a machine ate the card | Expert, 2026-07-27 | confirmed |

## Words nobody used

The brief's *"parking spot ID"* survives only as a card field whose meaning changes by site type
(bay vs area). Nobody used *reservation*, *booking*, *subscription*, *season ticket*, *refund*,
*cancellation* or *customer account* in this domain — do not introduce them downstream.
