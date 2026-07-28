# Hotspots

Open questions from the 2026-07-27 session. None of these is resolved, and none should be closed by
anyone modelling from this document — an unresolved hotspot is a finding; a quietly closed one is a
decision nobody made.

| # | Question | Raised by | Blocks | Who could answer |
|---|---|---|---|---|
| HS-1 | Does a transfer cancelled after dispatch still incur the £180 charge? | Ha vs Minh — direct contradiction in the room; facilitator parked it | the entire charge lifecycle; whether the billing transfer is a separate concept with its own states | Finance lead + the depot manager, together; ultimately whoever owns the contractor agreement |
| HS-2 | Are the physical move and the £180 charge one lifecycle or two? | surfaced by the "Transfer" collision (Ha vs Minh) | context boundaries; whether cancellation is one event or two | Ops lead + Finance lead |
| HS-3 | Who is accountable for cancelling reservations when a unit goes out of service, and what happens when it is forgotten? | Ha — "someone has to remember. It's on a whiteboard." | the out-of-service policy; INV-1's real enforcement | Depot manager (not present) |
| HS-4 | What actually enforces "never committed twice for overlapping windows" across depots today? | Ha asserted it cannot happen; the 2023 incident says it did | INV-1; whether the invariant is a system rule or a human habit | Ops lead + whoever built the current booking process |
| HS-5 | Which role marks a unit available at the receiving depot, and against what check? | Ha — "we mark it available"; the role was never named | the actor on element 10; the boundary between transfer and availability | Depot manager, receiving depot |

## Why HS-1 was not settled

Ha's reaction — "…that's news to me. I thought a cancelled transfer meant no charge" — is the most
informative moment in the transcript. It is not a misunderstanding to correct; it means two
departments have been operating on incompatible rules, in production, for long enough that neither
noticed. Picking Minh's version because Finance owns invoicing would look tidy and would erase the
finding.

The cheap next move is Example Mapping on this one rule: three concrete cases (cancel before
dispatch, cancel after dispatch, cancel after arrival), one green card each, twenty-five minutes.
That converts a standoff into a specification.

## Adjacent unknowns (not hotspots — nobody disagreed, nobody was asked)

- What state the unit and its commitment are in between dispatch and arrival.
- Whether £180 is fixed, per-unit, per-move, or negotiable.
- Whether a raised charge can be reversed, and by whom.
- Whether "reservation", "booked" and "committed" name one concept or several.
- What happens to an in-flight transfer if the unit is taken out of service mid-drive.

These are the agenda for the next round, not gaps to fill in by inference.
