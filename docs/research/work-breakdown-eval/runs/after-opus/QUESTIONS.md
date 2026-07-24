# Questions raised during breakdown (with the assumption taken to proceed)

The work-breakdown skill would surface these to the RFC owner. Per the run harness, each is
recorded with the assumption I proceeded on rather than blocking.

## Q1 — `transfer_approval` is missing a `reservation_id`, but AC5 needs one
The RFC lists columns (id, asset_tag, from_depot, to_depot, requested_for, status, decided_by,
decided_at) with no reservation reference, yet AC5 requires tracing a decision back to the **exact**
reservation, and `asset_tag` is not unique per reservation (a unit has many reservations over time).
**Assumption:** add a `reservation_id` column and carry the reservation id on the
`DepotTransferRequested` announcement (the "Data and events" section already says the announcement
must carry the reservation id). Treat the RFC's column list as illustrative, not exhaustive. Lands
in US-A.

## Q2 — Notifications: event-driven or direct call from the decision path?
AC4 emails fire on accept/reject. The wiring could be a direct call inside `Accept`/`Reject`, or an
event-driven notifier subscribing to decision events.
**Assumption:** event-driven notifier, matching the codebase's existing `IEventBus` publish/subscribe
pattern (Allocation publishes `EquipmentAllocated`/`DepotTransferRequested`; Logistics subscribes).
This keeps US-E's files disjoint from `AllocationService.cs`, enabling the US-D ∥ US-E fan-out.

## Q3 — Does reject need its own announcement event?
The RFC explicitly says only **accept** announces (for Logistics); reject "releases the hold". But
AC4 requires an email on reject too.
**Assumption:** US-C publishes a `DepotTransferRejected` event so the notifier can email on reject.
Nothing schedules on it (Logistics ignores it); it exists only to drive the notification.

## Q4 — Are same-depot commits still scheduled immediately?
The flow gates cross-depot moves behind approval. It is unstated whether same-depot commits keep
scheduling on commit.
**Assumption:** yes — only cross-depot moves are gated. Same-depot commits keep firing
`EquipmentAllocated` → immediate Logistics scheduling, unchanged. US-D preserves this and only
diverts cross-depot moves.

## Q5 — Staging to avoid a regression window in the Logistics cutover
If US-A suppressed cross-depot commit→schedule immediately (before the accept path exists),
cross-depot moves would go unscheduled until US-D — a regression window.
**Assumption:** US-A is purely additive (adds the pending row + queue, leaves existing scheduling
intact); the scheduling cutover happens atomically in US-D across both Allocation's emit-site and
Logistics' handler. No regression window; the flip is one coordinated change, as the RFC frames it
("one decision made on both sides at once").

## Q6 — Approver identity and depot→email resolution
Approver-role management is an explicit non-goal ("approvers are assumed to exist"), and the fixture
has no identity/role model beyond `Auth0IdentityClient`.
**Assumption:** approver identity and each depot's email are provided by existing identity/config.
US-B/US-C authorize a given approver against a transfer's {from, to} depot set without building role
management; US-E resolves the two depots' addresses from existing depot reference/config.

## Q7 — Persistence technology for `transfer_approval`
The fixture persists nothing in a real DB — `AllocationService` holds an in-memory
`List<Reservation>`, and migrations are raw SQL with no ORM present.
**Assumption:** model the store behind an interface (`ITransferApprovalStore`) consistent with the
fixture's in-memory / event-bus style; the SQL migration defines the eventual relational shape.
Exact persistence tech is out of scope for slicing and does not change the slice boundaries. The
`Touches:` file names for new store/queue components are best-effort estimates (code not written
yet), as the skill requires.

## Q8 — Output artifact/format
The skill teaches a method and mandates a concurrency statement but does not prescribe a file
format.
**Assumption:** emit a single `WORK-BREAKDOWN.md` with slices US-A…US-E in govkit user-story
vocabulary. Dependencies are written as `Blocked by:` lines and file estimates as `Touches:` lines
**in the slice body text** — per the skill's explicit instruction not to invent a `blockedBy`
front-matter key (the govkit schema resolves `parent` only).
