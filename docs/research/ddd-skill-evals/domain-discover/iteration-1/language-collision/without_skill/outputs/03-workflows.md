# Workflows

Two flows were described. Both are reconstructed from a short verbal walkthrough, so the step lists are thinner than the real processes. Gaps are marked inline rather than smoothed over.

---

## Flow A — Cross-depot relocation

Triggered when a contractor asks for a machine at a depot other than the one holding it.

### Operations view (`Unit Relocation`)

| # | Step | Actor | Evidence | Confidence |
|---|---|---|---|---|
| 1 | Contractor requests a machine at a depot that does not hold it | Contractor | *"a contractor asks for a machine at a different depot"* | `CONFIRMED` |
| 2 | Ops raises the relocation | Ops | *"We raise a transfer."* | `CONFIRMED` |
| 3 | Unit is dispatched | Ops / Driver | implied by MINH's *"after we've dispatched"* | `CONFIRMED` (the event exists; who performs it is `UNKNOWN`) |
| 4 | Unit is driven to the receiving depot, usually overnight | Driver | *"Someone drives it over, usually overnight."* | `CONFIRMED` |
| 5 | **GAP — what is the unit's state during the drive?** | — | never discussed | `UNKNOWN` (**Q2**) |
| 6 | Unit arrives; Ops marks it available at the receiving depot | Ops | *"Once it's physically at the receiving depot we mark it available."* | `CONFIRMED` |

Note step 6: availability is asserted by a human **after** observing physical presence. It is not derived from a dispatch record or an ETA. Whoever designs this should preserve that — the depot's word is the source of truth for location, and the system should not infer arrival.

### Finance view (`Relocation Charge`)

| # | Step | Actor | Evidence | Confidence |
|---|---|---|---|---|
| 1 | £180 line raised against the contractor | Finance | *"the £180 line on the invoice"* | `CONFIRMED` |
| 2 | Trigger is the **request** | Finance | *"We charge on request, not on completion."* | `CONTESTED` (**Q1**) |
| 3 | A post-dispatch cancellation still bills | Finance | *"If they cancel after we've dispatched, we still bill it."* | `CONTESTED` (**Q1**) |

HA's counter-model — *"the charge only exists if the drive actually happened"* and *"I thought a cancelled transfer meant no charge"* — is the version Ops has been operating on. Two departments, two billing models, discovered live in the room.

### Why the two views cannot be one state machine

Under MINH's rule, this sequence is reachable:

```
request → charge raised → dispatched → contractor cancels
  → relocation: CANCELLED
  → charge:     BILLED
```

One entity cannot hold both terminal states honestly. Modelling `Unit Relocation` and `Relocation Charge` as separate things with their own lifecycles, linked by a reference, is what makes the above expressible — and, incidentally, what would have surfaced this disagreement years ago.

### Unanswered on this flow

- What happens to the unit's reservations at the **origin** depot once it leaves? (**Q2**)
- Can the unit be reserved at the receiving depot for a window *after* expected arrival, while still in transit? The invariant says overlapping commitments are forbidden; it says nothing about location feasibility. (**Q2**)
- Is there a cancellation cutoff, or is `dispatched` the only boundary that matters? (**Q1**)
- What happens if the drive fails — breakdown, no-show, unit arrives damaged? Never discussed.

---

## Flow B — Taking a unit out of service

| # | Step | Actor | Evidence | Confidence |
|---|---|---|---|---|
| 1 | Depot manager declares the unit out of service | Depot Manager | *"Depot manager."* | `CONFIRMED` |
| 2 | Existing reservations on that unit must be cancelled | *unassigned* | *"Once it's out of service we have to cancel any reservations on it."* | `CONFIRMED` as a requirement |
| 3 | Cancellation happens **manually, from memory, tracked on a whiteboard** | *"someone"* | *"No, someone has to remember. It's on a whiteboard."* | `CONFIRMED` |

### The gap

Asked directly whether step 2 was automatic, HA said no. This is the one place in the transcript where a participant described the current state as a failure rather than a process.

Two consequences worth carrying forward:

1. **The cancellation obligation has no owner and no record.** A whiteboard has no audit trail, no ordering, and no way to tell a completed obligation from a forgotten one.
2. **This is the mechanism by which the domain's one hard invariant fails.** Not double-booking directly — but a unit out of service with live reservations against it is a promise the business cannot keep. Whether that counts as violating the invariant depends on how "committed" is defined (**Q4**).

### Unanswered on this flow

- What is meant to happen to the *contractor* whose reservation is cancelled? Notification, substitution, refund — none discussed.
- Can a unit go out of service while **in transit**? Two manual states colliding.
- Does out-of-service interact with the Relocation Charge? If a relocation is cancelled because the unit broke down, does the contractor still pay £180? Under MINH's stated rule, apparently yes — that seems unlikely to be intended. Worth asking. (**Q1a**)
- Is there a way back — an in-service declaration? Implied, never stated.
