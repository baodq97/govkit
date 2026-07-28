# Timeline — equipment depot transfers & availability

Big-picture EventStorming, INTERVIEW mode, 2026-07-27. Elements are in rough time order.

`Status` is `confirmed` (a person said it) or `candidate` (derived from an artifact, unverified).
Nothing here is a candidate — there were no artifacts to mine. Where a participant used a word but
left the detail open, the gap is written into the row rather than filled in.

**Pivotal event: `UnitDispatched` (7).** Both flows hinge on it — it is where Finance says the
charge becomes unavoidable and where Ops says the physical move begins. It is also the exact point
the two accounts diverge (HS-1).

## Flow A — depot-to-depot transfer

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 1 | UnitCommitted | event | — / CommitUnit | confirmed | Ha, 2026-07-27 — "if the machine is already booked"; who commits it was not asked |
| 2 | Contractor | actor | — | confirmed | Facilitator framing, accepted by Ha, 2026-07-27 |
| 3 | MachineRequestedAtDifferentDepot | event | Contractor / RequestMachineAtDepot | confirmed | Facilitator + Ha, 2026-07-27 — "a contractor asks for a machine at a different depot" |
| 4 | TransferRaised | event | Operations / RaiseTransfer | confirmed | Ha, 2026-07-27 — "We raise a transfer" |
| 5 | TransferFeeCharged (£180) | event | Finance / ChargeTransferFee | confirmed (contested — HS-1) | Minh, 2026-07-27 — "we charge on request, not on completion" |
| 6 | whenever a transfer is requested, raise the £180 charge — regardless of whether the drive happens | policy | Finance | confirmed (contested — HS-1) | Minh, 2026-07-27; Ha contradicted it in the room |
| 7 | UnitDispatched | event | *unspecified* / DispatchUnit | confirmed | Ha ("someone drives it over, usually overnight") + Minh ("after we've dispatched"), 2026-07-27 — the role was never named |
| 8 | TransferCancelled | event | Contractor / CancelTransfer | confirmed | Minh, 2026-07-27 — "if they cancel after we've dispatched"; Ha acknowledged the case with a different expected outcome |
| 9 | UnitArrivedAtReceivingDepot | event | — | confirmed | Ha, 2026-07-27 — "once it's physically at the receiving depot" |
| 10 | UnitMarkedAvailable | event | Operations ("we") / MarkUnitAvailable | confirmed | Ha, 2026-07-27 — which role marks it was not asked (HS-5) |
| 11 | Invoice | read-model | Finance | confirmed | Minh, 2026-07-27 — "the £180 line on the invoice" |

**Hole in this flow:** nothing is recorded between 7 and 9 — the in-transit window. Where the unit
and its commitment sit while the truck is moving was never asked, and it is where a cancellation
(8) actually lands. Not filled in; carried as an unknown in `README.md` and behind HS-2.

## Flow B — out of service

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 12 | Depot Manager | actor | — | confirmed | Ha, 2026-07-27; Minh explicitly disclaimed the decision ("Not me") |
| 13 | UnitTakenOutOfService | event | Depot Manager / TakeUnitOutOfService | confirmed | Ha, 2026-07-27 |
| 14 | whenever a unit is taken out of service, cancel any reservations on it | policy | Operations | confirmed | Ha, 2026-07-27 — **manual**: "someone has to remember" |
| 15 | ReservationCancelled | event | *whoever remembers* / CancelReservation | confirmed | Ha, 2026-07-27 — consequence of policy 14 |
| 16 | Out-of-service whiteboard | read-model | Operations | confirmed | Ha, 2026-07-27 — "It's on a whiteboard" |

Policy 14 is stated as a requirement but executed by memory, and the only place the state lives is
a whiteboard (16). An unautomated policy backed by a physical artifact is usually a missing domain
concept, not a process-discipline problem. It is also the mechanism by which INV-1 can be violated
without anyone noticing. Raised as HS-3; not resolved here.

## Invariants

| # | Statement | Status | Source |
|---|---|---|---|
| INV-1 | A unit can never be committed twice for overlapping windows — including across depots | confirmed | Ha, 2026-07-27 — "the one rule we absolutely cannot break… we got burned on that in 2023" |

INV-1 is the strongest statement made in the session: stated absolutely, defended unprompted, and
backed by a named incident. Note the tension it carries — Ha says it *cannot* happen while the 2023
incident says it did, and nothing in this timeline describes what enforces it. That gap is HS-4, not
an assumption to close.
