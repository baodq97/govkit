## Questions this breakdown would normally stop and ask — and the assumption used instead

Per the run instructions, none of these blocked the work. Each is recorded here with the
assumption the breakdown proceeded on.

### Q1 — What is a "second move" that must be blocked while a transfer is in flight?

The RFC says the reservation must record its transfer status "so the same unit is not offered for
a second move while one is in flight," but `AllocationService.Commit` only ever creates *new*
reservations — there is no existing operation that moves an already-committed one. It is unclear
whether this is a brand-new refusal path or just a restatement of the existing overlap check.

**Assumption:** treat it as a guard inside `Commit`'s cross-depot branch: if the asset already has
a reservation whose transfer status is `pending` or `accepted`, refuse a further cross-depot commit
for that asset the same way an overlapping-window commit is refused today. Scoped into US-1 since
it shares the same code path as the emit-site change.

### Q2 — Where does approver-to-depot membership come from?

The RFC's authorization rule ("only an approver for either the sending or the receiving depot may
decide") needs something to check against, but the RFC explicitly puts approver-role management
out of scope ("approvers are assumed to exist") and nothing in the fixture models an
approver-to-depot mapping today.

**Assumption:** the decide-entry point takes an already-resolved approver identity and depot
membership as a given dependency (e.g. an injected directory or a claim on the caller). US-2 builds
only the *check* against that membership, not the directory itself — consistent with the RFC's
non-goal.

### Q3 — Does accept reassign `Reservation.DepotId`, or is that phrase just confirming existing behavior?

"Keep the reservation pointed at the accepting depot as its owner" reads as if something changes on
accept, but `Commit` already sets `DepotId` to the destination depot at commit time — before any
transfer decision exists.

**Assumption:** no `DepotId` reassignment on accept; accept only flips the reservation's
transfer-status marker from `pending` to `accepted`. If the RFC intends something else (e.g. the
depot that *votes* to accept becomes the owner, which could differ from the destination depot),
US-2 needs a small addition to reassign `DepotId` — flagging this for confirmation before US-2
starts.

### Q4 — How does Logistics tell a same-depot commit from a cross-depot one?

Logistics reacts to `EquipmentAllocated` today and schedules unconditionally. `EquipmentAllocated`
itself carries no "is this cross-depot" flag — only the separate `DepotTransferRequested` event
does, and only for cross-depot commits. Non-goals require same-depot commits to keep scheduling
instantly, so Logistics needs a way to suppress scheduling only for the cross-depot case.

**Assumption:** Logistics also subscribes to `DepotTransferRequested` to suppress immediate
scheduling for that specific reservation, and schedules later only off the new accepted-transfer
event. Built inside US-2 as the shared Allocation+Logistics contract change.

### Q5 — One email capability or two?

"A transfer-decision email needs its own subject and body" could mean one parameterized email
(accept vs. reject just fill in different words) or two distinct email types.

**Assumption:** one capability, parameterized by decision outcome, reused by both US-3 (accept) and
US-4 (reject) — the RFC describes it as a single new capability, not two.

### Q6 — Who owns `src/Vendors/ExternalServiceClients.cs` for review/sign-off?

`config/teams.yaml` lists `vendors:` only as a vendor-name mapping (stripe/auth0/sendgrid), not
inside any squad's `owns:` list, so it is unclear which squad's process governs a change to this
file.

**Assumption:** treat it as shared, thin-adapter code (per its own header comment — "no business
rules... if a better vendor came along we would swap the adapter") that Fulfilment can change
directly for this RFC, without a separate cross-team slice. Flagged for the reader to confirm
actual review routing.

### Q7 — Migration filename/number convention?

Only one prior migration exists (`0001_audit_log.sql`), with no documented numbering policy beyond
the visible zero-padded sequence.

**Assumption:** the new migration is `0002_transfer_approval.sql`.

### Q8 — Should accept or reject ship first?

Both US-2 (accept) and a reject-mechanics slice only strictly depend on US-1. Building the shared
authorization/idempotency guard and the generalized email adapter inside the accept slices first
(so reject reuses them) is a sequencing choice, not a technical necessity.

**Assumption:** ship accept first — it is the path the RFC frames as the primary business outcome
("only an accepted transfer is handed to Logistics to schedule") and the one that also touches
Logistics scheduling, so it is the higher-value slice to prove out first. A team that prioritizes
reject could invert the chain instead (build the guard and adapter in a reject slice, and have
accept depend on that).
