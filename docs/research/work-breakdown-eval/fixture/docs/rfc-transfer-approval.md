---
id: RFC-9101
title: Depot transfer approval and notification flow
status: accepted
owner: fulfilment-lead
date: 2026-07-20
reviewers:
  - allocation-eng
  - logistics-eng
supersedes: none
governs:
  - src/Allocation/AllocationService.cs
  - src/Logistics/LogisticsService.cs
  - src/Vendors/ExternalServiceClients.cs
  - db/migrations/
---

> SYNTHETIC FIXTURE RFC — id RFC-9101 is intentionally out of the real govkit range.
> This document exists only to exercise the `work-breakdown` skill against the RentField
> fixture. It is not a governed govkit artifact and no engine reads it.

## Summary

Today, when Allocation commits a unit to a depot other than its home depot, it announces a
transfer is needed and then nobody does anything with it — the move is arranged by hand in the
depot office. We want an **approval flow**: a requested transfer sits in a queue until a depot
approver accepts or rejects it, and only an accepted transfer is handed to Logistics to schedule.
Both the sending and receiving depot are notified of the decision by email.

This is the last manual seam in the fulfilment loop. It touches Allocation (where transfers are
born), Logistics (which schedules the accepted move), and notifications (email out on a decision).

## Motivation

- Transfers are invisible after they are requested; there is no record of who approved a move or
  when, and no way to reject a bad one.
- Logistics currently schedules a delivery run the instant a unit is committed. A cross-depot move
  should not be scheduled until a human has accepted it.
- Depots ask to be told when a transfer that involves them is decided, instead of finding out when
  a truck shows up.

## Acceptance criteria

- **AC1** A requested cross-depot transfer is persisted as *pending* and appears in a queue an
  approver can read.
- **AC2** An approver can **accept** a pending transfer; an accepted transfer is what Logistics
  schedules (today Logistics schedules every commit indiscriminately).
- **AC3** An approver can **reject** a pending transfer; a rejected transfer releases the hold and
  is never scheduled.
- **AC4** On accept **and** on reject, the sending depot and the receiving depot each receive an
  email describing the decision.
- **AC5** A transfer decision can be traced back to the exact reservation it concerns.

## Approver surface

The depot office needs a **pending-transfers queue**: a read view listing each pending transfer
(asset, from-depot, to-depot, requested date) with **Accept** and **Reject** actions per row. The
queue is the approver's whole world — if it is empty there is nothing to do. Accept and Reject are
the only two actions; both must leave a visible outcome (the row leaves the queue, an email goes
out). An approver acting on an empty or already-decided transfer must see nothing happen.

## Approval service logic

When a transfer is requested it enters `pending`. An approver decision drives the rest:

- **On accept** — re-confirm the unit is still free for the window (the same overlap rule Allocation
  already enforces at commit time), mark the transfer `accepted`, keep the reservation pointed at the
  accepting depot as its owner, and announce an *accepted* transfer that Logistics can act on.
- **On reject** — mark the transfer `rejected` and release the underlying hold so the unit returns to
  the book.
- **Authorization** — only an approver for either the sending or the receiving depot may decide a
  given transfer; anyone else is refused.
- Accept and reject prove out differently (one ends in a scheduled move, the other in a released
  hold), and neither can be demonstrated without also standing up the persisted pending state and
  the decision path that reads it.

This whole decision engine — pending intake, the accept path, the reject path, the availability
re-check, the authorization rule, and the two announcements — is more than one sitting of work; it
cannot be reviewed as a single change.

## Logistics integration

Logistics today reacts to **every** commit by adding a delivery run (`LogisticsService.On`). Under
this flow Logistics must instead schedule a run only when a transfer is **accepted** — it should
react to the accepted-transfer announcement, not to the raw commit, for cross-depot moves. Because
Allocation and Logistics share model types and ship together, the shape Logistics consumes and the
shape Allocation emits are one decision made on both sides at once.

## Data and events

- A new migration adds a `transfer_approval` table (id, asset_tag, from_depot, to_depot,
  requested_for, status, decided_by, decided_at). Both the queue read view and the persisted
  decision record live on this table.
- The transfer announcement Allocation emits today carries only asset, from-depot, to-depot, and a
  date. To satisfy AC5 the announcement must also carry the **reservation id** so a decision can be
  traced to its reservation; the emit site changes with it.
- The reservation model itself must record whether it currently sits under a pending / accepted /
  rejected transfer, so the same unit is not offered for a second move while one is in flight.

## Notifications

Decisions go out by email through the existing SendGrid adapter. That adapter can only send one kind
of message today (a fixed-subject receipt); a transfer-decision email needs its own subject and body.
The email is only worth sending once there is a real accept/reject outcome to describe.

## Non-goals

- No change to how the initial commit or the overlap invariant works at commit time.
- No approver-role management UI; approvers are assumed to exist.
- No SMS or in-app notification channel — email only.
- No change to pricing, invoicing, maintenance, or the nightly ERP/CRM syncs.
