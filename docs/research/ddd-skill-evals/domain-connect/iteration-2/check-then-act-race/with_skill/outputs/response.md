# Nordic Freight — does the split hold up?

Short answer: **the set of contexts is fine; three of the seams between them are not.** I traced
three scenarios end to end and wrote them up under `docs/domain/message-flows/` — the flow files are
the artefact, this is the summary.

## The two conditions that would have rejected the decomposition did not fire

There is a hard rule in this step: **more than 9 messages in one scenario**, or **one context
appearing at every step**, means go back and re-cut. Neither happened. The flows came in at 8, 6 and
2 messages, and no context is on every flow — Booking is absent from the billing flow, Invoicing
from the two booking flows. So this is not a re-cut. It is three located defects with message
numbers on them.

## What I traced

| Flow | Scenario | Why |
|---|---|---|
| FLOW-0001 | Book a part-load shipment onto a departure | the happy path — the main booking scenario you asked about |
| FLOW-0002 | Guaranteed Consolidation premium billed on a sealed container | the path with money on it (the +18% premium the business model calls the differentiator) |
| FLOW-0003 | The departure is full | the failure path — and hotspot 1, the March double-commit, is a failure path |

I deliberately did **not** draw hotspot 3 (a partner carrier refuses a sealed container). Routing has
no refusal message and no relationship to any context that could re-plan, so drawing it would have
meant inventing the entire flow. It is recorded as an open question instead.

## The three seams that break

**1. Booking↔Consolidation is a check-then-act race — and it is your March incident.**
`booking/model.yaml` says it out loud: *"synchronous remaining-capacity check before reserving"*. On
the flow that is messages 4 and 5 — Booking asks Consolidation how much room is left, then commands
the reservation based on the answer, with a boundary crossed in between. Between those two messages
a second booking can pass its own check and reserve the same cubic metres.

The rule it breaks — *"a container's committed volume must never exceed its capacity"* — is
Consolidation's invariant over Consolidation's data, but the decision to commit is taken in Booking.
One rule, two enforcers, no transaction between them. Under concurrency it is not enforceable, and
the failure is silent: a container is over-committed, a shipment is bumped, and the Guaranteed
Consolidation promise the premium is sold on is broken.

Hotspot 1 said *"nobody agrees where the check should have happened."* The answer is that the check
should not exist. Collapse messages 4 and 5 into one `ReserveCapacity` command that Consolidation
accepts or rejects, and the question of where the check happens disappears with it.

**2. The happy path breaks a confirmed regulatory rule.**
`customs/model.yaml` carries the clerk's rule: *"a shipment cannot be handed to a carrier before its
declaration is submitted."* But Routing hands the shipment over on `BookingConfirmed`, and
`routing/model.yaml` has exactly two relationships — Booking and the partner network. There is no
Customs edge, on the model or on the context map, so nothing in the design can stop it. Your own
confirmed timeline has them in the wrong order: `ShipmentHandedToCarrier` is event #6,
`DeclarationSubmitted` is #8. This is not a race condition; it is the normal path.

**3. The premium you are paid for cannot be billed through these boundaries.**
Invoicing's only inbound relationship is Customs. Walk FLOW-0002 and read the payloads: `fillRate`,
`declarationId`, `clearedAt`. Nothing carries the price, the quote or the premium. Finance's rule —
*"the premium is charged whether or not the container ends up full"* — is confirmed, and this
decomposition has no way to execute it, because Invoicing never learns a Guaranteed Consolidation
premium was sold. Somebody needs to say whether Quoting or Invoicing prices it, and then the
boundary needs an edge it does not have.

## And the model has no word for "no"

Seven contexts, eleven domain events, every one of them a success. No refusal, no rejection, no
bump, no cancellation. The failure-path flow stops after two messages — not because I picked a small
scenario, but because after the capacity check there is no message in the model that says *no*.

That matters more than it looks. The compensating action already exists in the business — the
planner described it: a shipment gets bumped. An unnamed compensation is not eventual consistency,
it is an unhandled bug, and right now every context will grow its own ad-hoc error handling with the
customer-facing wording invented by whoever writes Booking first.

## Two smaller ones worth fixing before people build

- `ConsignmentLine` is a Shared Kernel that both Booking and Consolidation write, and the two
  definitions already differ — Booking's has `hazardClass`/`weightKg`, Consolidation's has
  `stackable`. One name, two models, two writers, and a coordinated release every time either
  changes.
- `Consignment` means "the goods a customer hands over" in Booking and "a billable line" in
  Invoicing, and both meanings sit on the same flow. That is hotspot 2, still open.
- `DeclarationCleared` carries `{declarationId, clearedAt}`, but Invoicing's invariant says an
  invoice line must reference a cleared declaration. Nothing in that event identifies the shipment,
  though the `Declaration` entity itself holds a `shipmentRef`. Either the payload widens or
  Invoicing ends up querying Customs at runtime — a dependency nobody has drawn.

## One honest positive

FLOW-0002 is a clean flow as a *shape*: four contexts, six messages, zero queries crossing a
boundary, each context making one decision it owns. The Consolidation → Customs → Invoicing →
Notifications chain is event-driven and works. Its problems are all about what the messages carry,
not how the contexts couple. Worth recording so nobody re-litigates that part of the split.

## What I did not do

I did not touch the model. Six boundary changes are written up as **proposals** in
`docs/domain/message-flows/README.md` for `3-decompose` to merge — it owns the reconciliation, the
stable ids and the human edits, and a boundary quietly redrawn by the step that found the problem is
a change nobody reviewed.

Seven questions go back to discovery, not to me. Chief among them: what the business actually says
when capacity is short. Your business model sells *"a departure slot even on a partly-filled
container"*, so a flat refusal may itself breach the premium — that is a commercial decision, and
inventing a `CapacityRefused` event here would have produced a diagram that validates the design
against fiction.

Worth flagging: no customer took part in discovery, so every step I attributed to the exporter is
proxy — and the failure-path questions are precisely the ones a customer would have answered.

## If you fix one thing first

PC-1 — collapse the check-then-act pair into a single command Consolidation accepts or rejects. It
closes the race, moves the capacity invariant to the one aggregate that owns the data, and gives the
failure path its missing messages for free. Three of the thirteen findings resolve with it.

## Artefacts

- `docs/domain/message-flows/README.md` — index, verdict, all 13 findings, 6 proposed changes,
  7 discovery questions
- `docs/domain/message-flows/0001-book-a-part-load-shipment.md`
- `docs/domain/message-flows/0002-premium-billed-on-a-sealed-container.md`
- `docs/domain/message-flows/0003-the-departure-is-full.md`
