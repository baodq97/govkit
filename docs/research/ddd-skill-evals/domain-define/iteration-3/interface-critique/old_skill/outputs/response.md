# Booking — does the design hold up before you freeze the interface?

**Verdict: don't freeze yet.** Not because the two messages you have are wrong in principle, but
because only two of them exist on paper, one of them leaks a neighbour's identifier, and the most
important part of the contract — how capacity gets reserved — is currently a query-then-decide
across a boundary, which is the exact shape of the March double-commit incident.

I filled the Bounded Context Canvas for Booking (core → full canvas) and ran the five interface
questions plus the perturbation test. Canvas: `docs/domain/booking/README.md`. I left `model.yaml`
alone and wrote the proposed deltas at the bottom of the canvas — `3-decompose` owns that file.

## The four findings, ranked

**1. The capacity check is a check-then-act race, and it has already fired.**
`booking/model.yaml` records a *synchronous remaining-capacity check* into Consolidation, after which
Booking decides to confirm. The invariant being protected — *committed volume must never exceed
capacity* — belongs to Consolidation (`consolidation/model.yaml`, stated by a planner on 2026-05-25).
Booking is enforcing an invariant on data it neither owns nor can lock. Hotspot #1 in the discovery
timeline is two shipments committed to the same slot in March, with "nobody agrees where the check
should have happened". This design answers that question the wrong way.

Fix: one `ReserveCapacity` command that Consolidation accepts or rejects. Interface-critique question
2 (is the message the right type?) is what surfaces it. The cost is real: Booking has to model a
pending state and a rejection path, and it models neither today — `status` is a bare attribute with
no enumerated values anywhere.

**2. `BookingConfirmed {bookingId, containerId}` publishes Consolidation's internals.**
`containerId` is Consolidation's identifier sitting inside Booking's public event. Routing, the only
evidenced subscriber, needs `bookingId` and nothing else. Every future subscriber inherits a
dependency on the container model to read a booking fact. Drop it; if a consumer genuinely needs the
container, it can ask Consolidation. (Lesser version of the same problem: `ShipmentRef {prefix,
sequence}` is shared with three contexts, so a numbering-scheme change is a four-context change.)

**3. `ConsignmentLine` is a shared kernel built on a word the business doesn't agree on.**
`context-map.md` marks it **Shared Kernel — both write it**, the highest-coupling relationship
available. The two definitions have already diverged: Booking's line carries `hazardClass`,
Consolidation's carries `stackable`. Meanwhile hotspot #2 records finance and operations using
"consignment" in two different senses, and Invoicing's own glossary defines it as *"a billable line
on an invoice"*. Three meanings, one shared type. Unshare it before freezing anything.

**4. The interface isn't too big — it's too small to be frozen.**
Two evidenced messages for a core context, and the gaps are the load-bearing ones: there is no name
anywhere for the command that creates a booking, and nothing at all for the negative path. Freeze now
and the rest of the contract gets decided by whoever writes the first endpoint.

## The perturbation test

| Moved | Result |
|---|---|
| Capacity decision → Consolidation (one command, accept/reject) | **take** — the March incident becomes structurally impossible; cost is a pending state and rejection path in Booking |
| `ConsignmentLine` → Consolidation only | **take** — kills the shared kernel and forces the naming clash into the open; cost is duplicated volume synced by event |
| `containerId` out of `BookingConfirmed` | **take** unless a consumer objects |
| Whole confirmation → Consolidation | **rejected** — Booking holds the commercial commitment and the premium; moving it puts money in a back-office planning context and grows a Brain Context |

## Two things upstream that this canvas could not resolve

- **`core-domain-chart.md` doesn't exist** and the classifications disagree with each other.
  `context-map.md` calls Consolidation *supporting*; `business-model.md` names load consolidation the
  one differentiating revenue-generating capability — it's what the +18% Guaranteed Consolidation
  premium is sold on. So a core context is making a synchronous call into a supposedly-supporting one
  that is arguably the real core. I carried both statements instead of picking; re-cutting that is
  `5-strategize`'s call, not this step's.
- **`business-model.md` has no Booking row at all**, so business-model role and evolution stage are
  recorded as `unknown` on the canvas rather than guessed.

## What I'd need before you freeze

Six open questions are on the canvas. Three block the freeze:

1. Name the create-booking command and the rejection message. Nothing in the repo names either.
2. May Booking accept a booking while Consolidation is unreachable? The answer decides whether the
   synchronous call is allowed to survive at all.
3. Core or supporting for Consolidation — it decides who owns the capacity decision.

Also worth saying plainly: neither recorded session had a customer or anyone accountable for the
product in the room (`business-model.md` and `discovery/timeline.md` both note this). Public-interface
decisions are product commitments — freezing this contract with only planners and engineers signed
off is the risk that isn't on any diagram.

## How you'll know if we got the boundary wrong

Predictions on the canvas, all collectable: PRs touching Booking that also touch Consolidation
(< 25% over three months, from VCS); double-commit incidents (0 per quarter after the reservation
becomes one command, from the incident log); consumers reading `containerId` off `BookingConfirmed`
(0, by grep in CI). If the first climbs, the line between Booking and Consolidation is in the wrong
place and the shared kernel is why.
