## US-4 — Reject releases the hold and notifies both depots

Parent: RFC-9101 (Depot transfer approval and notification flow)
Size: M
Blocked by: US-3 (reuses the decide-entry guard from US-2 and the generalized email adapter from
US-3 — declaring the furthest-along edge is enough since neither could have shipped without the
other)

### Story

As a depot approver, I want to reject a pending transfer so the hold releases and the unit returns
to the book, and I want both depots to be told why.

### Touches

- The shared `Decide` entry point from US-2: reject branch — mark `rejected`, release the
  reservation's hold, never hand it to Logistics. Reuses the authorization and idempotency guards
  already built for accept — no new guard work.
- The email capability from US-3, called with the reject decision instead of accept — no new
  adapter work.

### Acceptance criteria

- **AC3** — reject releases the hold; a rejected transfer is never scheduled.
- **AC4 (reject half)** — both depots receive an email describing the reject decision.
- **AC5 (reject path)** — a rejected decision is traceable end to end back to its reservation.

### Verification

Reject a pending transfer → transfer flips to `rejected`, the reservation's hold releases (the
unit is free again; no Logistics run is ever created for it), both depots receive a
reject-decision email, and the decision traces back to the reservation. Reject on an empty or
already-decided transfer → no-op, no second email.

### Note on sizing

Reject's own mechanics (flip status, release hold) are lighter than accept's (no availability
recheck, no cross-service scheduling contract) — small enough that, unlike accept, bundling reject
with its email still fits one M slice rather than needing its own split.

### Note on the ordering choice (see Q8 in `QUESTIONS.md`)

US-1 is reject's only hard technical dependency. Shipping accept before reject is a priority call
(accept is the path that also touches Logistics scheduling), not an inherent constraint — a team
that prioritizes reject could build the shared guard and the email adapter there first and invert
this edge.
