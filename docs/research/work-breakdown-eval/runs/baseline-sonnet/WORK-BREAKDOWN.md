## Work breakdown — RFC-9101: Depot transfer approval and notification flow

**Source RFC:** `docs/rfc-transfer-approval.md` (status: accepted)
**Governs:** `src/Allocation/AllocationService.cs`, `src/Logistics/LogisticsService.cs`,
`src/Vendors/ExternalServiceClients.cs`, `db/migrations/`
**Skill applied:** `work-breakdown` (vertical slicing, sizing ladder, four break triggers,
ordering/blocking edges). No other skill invoked — this skill is atomic.

## Why this RFC has to break down

Two independent signals say the RFC is XL and must not ship as one unit:

- **Trigger 1 (title contains "and"):** "Depot transfer approval **and** notification flow" is
  two things wearing one title.
- **Size:** the RFC says it in its own words — "This whole decision engine ... is more than one
  sitting of work; it cannot be reviewed as a single change." That is the XL row of the sizing
  ladder by definition: you cannot hold it in your head, so it must never start as one unit.

## Slice map (ship order)

| # | Slice | Size | ACs covered | Blocked by |
|---|---|---|---|---|
| US-1 | Pending transfer intake and queue | M | AC1, the reservation-in-flight guard, half of AC5 (schema+event plumbing) | none |
| US-2 | Accept schedules the move | L | AC2, authorization + idempotency guard, remaining half of AC5 for the accept path | US-1 |
| US-3 | Accept decision notifies both depots | S | AC4 (accept half) | US-2 |
| US-4 | Reject releases the hold and notifies both depots | M | AC3, AC4 (reject half), AC5 for the reject path | US-3 |

Chain: **US-1 → US-2 → US-3 → US-4.** Each slice names exactly one upstream blocker, per the
skill's "keep the edges few" rule — no slice here is blocked by more than one other.

---

## US-1 — Pending transfer intake and queue

**Vertical cut:** migration (`transfer_approval` table) + the `Commit` emit-site change (the
`DepotTransferRequested` event gains the reservation id) + a listener that persists the pending
row + the read query that backs the approver's queue. Schema, service, and read view land
together — this is the "good" vertical example from the skill (table + endpoint + view + test in
one slice), not a horizontal DB-only cut.

**Acceptance criteria covered:**
- AC1 in full: a cross-depot commit is persisted as *pending* and is visible in a queue.
- The in-flight guard: while a unit already has a transfer `pending`/`accepted`, a second
  cross-depot commit for the same asset is refused (see Q1 in `QUESTIONS.md` — this extends the
  existing overlap-window refusal in `Commit`, it does not add a new operation).
- Half of AC5: the `transfer_approval` row and the `DepotTransferRequested` event both carry the
  reservation id from day one, so every later decision is traceable. AC5 is not fully *demoable*
  until US-2/US-4 produce a real decision to trace — that half of the proof lands there.

**Verification (the demo):**
1. Commit a unit to its home depot → no row appears in the queue.
2. Commit a unit to a non-home depot → exactly one row appears (asset, from-depot, to-depot,
   requested date, reservation id matching the commit).
3. Attempt a second cross-depot commit for the same asset while the first transfer is still
   pending → refused, queue still shows exactly one row for that unit.

**Size rationale:** M — a handful of behaviours (migration, emit-site change, persist, query) that
all serve one proof (request → visible in queue). Fits "ship as one slice; name the ACs."

**Break-trigger check:** none of the four triggers force a further split. It crosses a
schema+service boundary, but that is the expected shape of one vertical slice, not two — there is
nothing to demo about the schema alone without the service, or the service alone without the
schema.

**Blocked by:** none — first slice in the chain.

---

## US-2 — Accept schedules the move

**Vertical cut:** the "decide" entry point (shared by accept and reject) gains the authorization
guard (only an approver for the sending or receiving depot may decide) and the idempotency guard
(deciding an empty or already-decided transfer is a no-op). The accept branch re-checks
availability with the same overlap rule `Commit` already enforces, marks the transfer `accepted`
with `decided_by`/`decided_at`, and announces an accepted-transfer event. Logistics stops
scheduling a cross-depot commit the instant it lands and instead schedules only off that
announcement.

**Acceptance criteria covered:**
- AC2 in full: accept re-confirms availability and is what Logistics schedules.
- The authorization rule and the idempotency rule from "Approval service logic" / "Approver
  surface" (not separate ACs in the RFC's list, but explicit behavioural constraints on AC2/AC3
  that this slice is where they must first exist, since there is no decide-entry before this).
- Remaining half of AC5 for the accept path: an accepted decision can now be traced back to its
  reservation end to end.

**Verification (the demo):**
1. Approver accepts a pending transfer for a unit still free for the window → transfer flips to
   `accepted`, `Logistics.Pending()` gains a new run for it, and it is traceable back to the
   reservation.
2. Approver accepts a transfer for a unit no longer free → refused, nothing scheduled.
3. Someone who is not an approver for either depot on the transfer → refused.
4. Accept called twice, or on a non-existent transfer → second call is a no-op (nothing scheduled
   twice, no error surfaced as a new outcome).

**Size rationale:** L — multiple behaviours (guard, recheck, persist, cross-service scheduling
contract), roughly multi-day. Fits the ladder's "prefer to split; split if any break trigger
fires" — see the trigger-3 discussion below for why it stays as one slice anyway.

**Break-trigger check — trigger 3 deliberately overridden:** this slice spans two modules,
Allocation and Logistics, which would normally force a split ("it crosses more than one
boundary"). Three independent pieces of evidence say not to split here:
- `config/teams.yaml`: `fulfilment: owns: [allocation, logistics]`, `release_cadence: shared`.
- `README.md`: "the two share model types and always ship in the same release."
- The RFC itself, in "Logistics integration": "the shape Logistics consumes and the shape
  Allocation emits are one decision made on both sides at once."

Splitting the emit-side contract from its only consumer, when both are built and released by the
same team as one unit, would produce a slice with nothing to verify on its own (an event no one
reacts to yet is not demoable) — that is the *bad* horizontal pattern the skill warns against, not
a legitimate vertical cut. Trigger 3 stays overridden with evidence recorded, rather than silently
ignored.

**Blocked by:** US-1 — needs the `transfer_approval` table and the pending queue to have something
to accept.

---

## US-3 — Accept decision notifies both depots

**Vertical cut:** generalize `SendGridNotificationClient` beyond its one fixed-subject receipt so
it can send a transfer-decision email with its own subject and body, and call it from the accept
path so both the sending and receiving depot get the email once a real accept has happened.

**Acceptance criteria covered:** AC4, accept half — "on accept ... the sending depot and the
receiving depot each receive an email describing the decision."

**Why this is its own slice and not folded into US-2:** two different proofs are being bundled if
it isn't split out — "the unit gets scheduled" and "the two depots get an email" are different
verifications (break trigger 2), and US-2 is already an L on its own. Adding the email on top would
tip it into "cannot demo in one sitting" (trigger 4). The email is also explicitly *sequenced*
after a real decision exists — the RFC says "the email is only worth sending once there is a real
accept/reject outcome to describe" — which is exactly what "blocked by" is for.

**Why the adapter generalization isn't its own slice:** by the sizing ladder, an XS change (one
method on one class) folds into the larger slice that first needs it, rather than becoming its own
enabler-only slice with nothing shippable in isolation. This is that slice.

**Verification (the demo):** accept a pending transfer → both the sending-depot and
receiving-depot addresses receive an email with a subject/body describing the accept decision
(asset, from-depot, to-depot). No email fires on a refused or no-op accept attempt.

**Size rationale:** S — one behaviour (send two emails off a real outcome), well under half a day
once the adapter method exists.

**Blocked by:** US-2 — needs a real accepted decision to describe, and reuses the decide-entry this
slice hangs its emails off of.

---

## US-4 — Reject releases the hold and notifies both depots

**Vertical cut:** the reject branch of the same decide-entry marks the transfer `rejected` and
releases the reservation's hold so the unit returns to the book, then sends the same
transfer-decision email (now describing a reject) to both depots. Reuses the authorization guard,
the idempotency guard, and the generalized email adapter built for accept — no new guard or
adapter work here.

**Acceptance criteria covered:**
- AC3 in full: reject releases the hold and the transfer is never scheduled.
- AC4, reject half: both depots get an email on reject.
- AC5 for the reject path: a rejected decision is traceable back to its reservation.

**Verification (the demo):** reject a pending transfer → transfer flips to `rejected`, the
reservation's hold is released (the unit is free again / no Logistics run is ever created for it),
both depots receive a reject-decision email, and the decision traces back to the reservation.
Reject on an empty or already-decided transfer → no-op, no second email.

**Size rationale:** M — reject's own mechanics (flip status, release hold) are small (S) on their
own; the RFC's own text does treat reject as a distinct proof from accept ("Accept and reject prove
out differently — one ends in a scheduled move, the other in a released hold"), but reject plus its
email together is still "a few behaviours, about a day" — it does not need the same accept/notify
split, because reject's mechanics are much lighter than accept's (no availability recheck, no
cross-service scheduling contract to negotiate).

**Blocked by:** US-3 — reuses the decide-entry guard from US-2 and the generalized email adapter
from US-3; declaring the single furthest-along edge (US-3) is sufficient since neither US-2 nor
US-3 could have shipped without the other already being in place.

Note on this edge (see Q8 in `QUESTIONS.md`): US-1 is the only *hard* technical dependency reject
has — accept shipping first is a sequencing choice (build the higher-value/more complex path
first, since it is also the one that touches Logistics scheduling), not an inherent constraint.
A team that prioritizes reject first could invert the chain instead.

---

## Not in scope (RFC's own non-goals — do not re-slice into this territory)

- No change to the commit-time overlap invariant itself.
- No approver-role management UI — an approver's identity and which depot(s) they can decide for
  is assumed to already resolve somehow (see Q2).
- Email only — no SMS or in-app channel.
- No change to pricing, invoicing, maintenance, rentals, or the nightly ERP/CRM syncs.

## Assumptions and open questions

Seven ambiguities were resolved with a stated assumption rather than blocking the breakdown; see
`QUESTIONS.md` for the full list (Q1–Q8, including the accept-first sequencing choice as Q8).
