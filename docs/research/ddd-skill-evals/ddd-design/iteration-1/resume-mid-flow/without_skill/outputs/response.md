Not from scratch. `docs/domain/` already has a discovery timeline (11 events, 10 confirmed), a
business model, a context map and seven tactical models. Re-running discovery would re-collect what
is on disk and throw away the three hotspots your planners gave you.

Start by reconciling the artifacts you already have. Three of them claim to say which part of this
business matters, and all three disagree.

## The number that decides everything else

I summed the `mass` blocks across the seven `model.yaml` files and lined them up against the
`differentiation` column in `business-model.md`:

| Context | Label in context map | Differentiation | Tables | Attributes |
|---|---|---|---|---|
| Invoicing | core | **no** ("nobody has ever chosen us because of our invoices") | 34 (45%) | 311 (51%) |
| Customs | core | no ("two vendors already do it well") | 12 (16%) | 96 (16%) |
| Quoting | core | partial ("we are no faster") | 11 (14%) | 78 (13%) |
| Booking | core | — | 9 (12%) | 54 (9%) |
| **Consolidation** | **supporting** | **yes**, the +18% premium | **5 (7%)** | **41 (7%)** |
| Routing | supporting | no | 3 (4%) | 17 (3%) |
| Notifications | generic | no | 2 (3%) | 11 (2%) |

The two capabilities nobody picks you for hold 67% of the attributes in the system. The one
capability you charge an 18% premium for holds 7%, has a single aggregate, no value objects, and by
its own notes still plans loads "partly on a whiteboard in the Gothenburg depot." Your short-term
company goal, container fill 71% to 80%, lives entirely inside that 7%.

Four of seven contexts are labelled `core`, and the reasons given are proximity to the customer,
transaction position and size. None of them is defensibility. That is how Consolidation ended up
`supporting`.

## Twelve findings, ranked

Written up in `docs/domain/ASSESSMENT.md`. The four that would change what you do this month:

**F1. The classification is inverted (blocker).** Proposed: Consolidation to `core`, Invoicing and
Customs to `generic`, Quoting and Booking to `supporting`. That leaves one core context, which is
the point. It also puts two buy/build questions on the table, and `customs/model.yaml` already
wrote half the argument: *"Two commercial customs platforms cover all nine ports; we integrate with
neither."*

**F2. Booking and Consolidation race on the capacity invariant (blocker, already fired).** Booking
does a "synchronous remaining-capacity check before reserving" and then commands the reserve.
Consolidation owns the invariant. Between the read and the command, another booking takes the same
space. Hotspot 1 says this happened in March and "nobody agrees where the check should have
happened." The model answers it: one command, `ReserveCapacity(bookingId, volumeM3)`, decided
inside the `ContainerLoad` aggregate. You also need a `CapacityRefused` event, which does not exist
anywhere.

**F3. `ConsignmentLine` is a Shared Kernel across that exact seam.** Both contexts list it as an
entity inside their own aggregate with different attributes, and the field they share, `volumeM3`,
is what the contested invariant is computed from. F2 is not fixable until one context owns it.

**F4. The whole strategy rests on proxy evidence.** No customer was in either session.
`business-model.md` says so itself and marks the rows `proxy`. Cost structure is unknown because
nobody in the room owned the P&L, so nobody can say whether the premium is profitable.

The rest, in `ASSESSMENT.md`: the customs invariant sits in a context that cannot enforce it
(Routing does the handover and has no edge to Customs); no relationship anywhere declares an ACL,
OHS or Conformist; only happy-path events exist while all three hotspots are failure paths;
"Consignment" means two different things with no declared translation; a 128-attribute entity; no
owner or team recorded anywhere in the repo.

## Where to start, concretely

Two tracks, different people, run them in parallel. Full plan in `docs/domain/next-steps.md`.

**Track A (commercial director, P&L owner, customers)**
- A1. Reclassification session, 90 minutes, this week. Input is the mass table above. Question for
  the room: the capability you charge 18% for holds 7% of the model, the ones nobody picks you for
  hold 67%. Which of those two facts is wrong? Decision is the commercial director's; engineering
  proposes.
- A2. Cost the buy/build on Customs and Invoicing, if A1 lands them as generic. Belongs in an ADR.
- A3. Four or five customer conversations. The only step that produces new evidence.
- A4. Get a team list. There is no headcount anywhere in the repo.

**Track B (engineering + depot planners)**
- B1. Fix the Booking/Consolidation seam. Move the decision to the invariant, add `CapacityRefused`
  and `ShipmentBumped`, then split `ConsignmentLine`.
- B2. One session on failure paths. Assign each new event to exactly one owning context.
- B3. Half a day on context-map mechanics: the missing Customs/Routing edge, the direction notation
  (undefined, and the PartnerNetwork edge is inverted), integration patterns on every relationship.
- B4, B5. Settle Routing's status after B2; put a schema and a CI validator on the seven
  `model.yaml` files.

If only three things get done: **A1** (90 minutes, unblocks every investment question, needs no new
data), **B1** (fixes a defect that already broke the premium product), **A3** (everything in Track
A rests on it).

## What to leave alone

Invoicing's 128-attribute entity and Customs' tactical model, until A2 decides whether either
system survives. Consolidation's model depth, until A1 confirms it is core. And do not re-run
discovery on the happy path.

## Caveats

I read no code. Every figure comes from the `mass` blocks in the `model.yaml` files, so spot-check
them against the real schemas before you act on the buy/build direction. The reclassification is a
proposal for the commercial director to confirm, not a decision I can make from the repo. I left
every doc at `status: draft, owner: TBD` and changed none of the existing artifacts, since
reclassifying is a business call and the docs are governed.

Written: `docs/domain/ASSESSMENT.md`, `docs/domain/next-steps.md`.
