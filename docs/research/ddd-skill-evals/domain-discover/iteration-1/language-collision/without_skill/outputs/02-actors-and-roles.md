# Actors and Decision Rights

Derived from one session. Two of the four actors below were in the room; two were discussed but not present.

## Actors

| Actor | In session? | Owns | Explicitly does NOT own | Confidence |
|---|---|---|---|---|
| **Contractor** | No | Requesting a machine at a depot; cancelling | — | `CONFIRMED` (as an actor) |
| **Ops** (HA) | Yes | Raising the relocation; arranging the drive; marking the unit available on arrival | Billing rules — was unaware of the cancellation-billing policy | `CONFIRMED` |
| **Finance** (MINH) | Yes | The £180 Relocation Charge; when it is raised; whether a cancellation still bills | The physical move (*"isn't my problem"*); out-of-service decisions (*"Not me."*) | `CONFIRMED` |
| **Depot Manager** | **No** | Declaring a unit out of service | — | `CONFIRMED` by two speakers, but **never interviewed** |
| **Driver** | No | Physically moving the unit, usually overnight | — | `ASSERTED` — implied by *"someone drives it over"*; may not be a distinct role |

## Decision rights, as stated

| Decision | Holder | Evidence | Confidence |
|---|---|---|---|
| Is a unit out of service? | Depot manager | MINH: *"Not me."* → HA: *"Depot manager."* | `CONFIRMED` |
| Is a Relocation Charge raised, and when? | Finance | MINH: *"We charge on request, not on completion."* | `CONTESTED` — Ops holds a different belief |
| Is a unit available at the receiving depot? | Ops, manually on arrival | HA: *"Once it's physically at the receiving depot we mark it available."* | `CONFIRMED` |
| Who cancels reservations when a unit goes out of service? | **Unassigned** | HA: *"someone has to remember"* | `UNKNOWN` — the gap |

That last row is the finding. An out-of-service declaration creates an obligation — cancel the reservations — that **no named role owns**. It is held by "someone" and a whiteboard. Every other decision in this domain has an owner; this one does not.

## Boundary observation

Ops and Finance touch the same real-world event and share a word for it, but their authority does not overlap at all: Finance cannot declare a unit out of service, Ops does not set billing policy, and neither was aware of the other's rule. This is a clean two-context split, and the shared word `transfer` is the only thing making it look like one context.

The one place they genuinely interact is the **cancellation of a dispatched relocation** — an Ops event with a Finance consequence. That is the integration point worth designing carefully, and it is exactly where the disagreement sits.

## Gaps in coverage

- **Depot manager not interviewed.** They hold a decision that triggers the domain's only automation gap. Highest-value next interview.
- **No contractor-side view.** Everything about contractor behaviour (how a request arrives, what a cancellation looks like to them, whether they see the £180 up front) is second-hand.
- **No one described what happens when the invariant is at risk** — who is notified, who resolves a clash. The rule was stated as absolute; the enforcement mechanism was not described.
