Questions the skill would normally ask, and the assumption taken instead
==========================================================================

Per instructions, execution did not stop for these — each is recorded here with the assumption
made, and the breakdown in `rfc-9101-work-breakdown.md` proceeds on that assumption.

## Q1 — `transfer_approval` schema omits a reservation_id column, but AC5 requires one

The RFC's "Data and events" section lists the new table's columns as `(id, asset_tag,
from_depot, to_depot, requested_for, status, decided_by, decided_at)` — no `reservation_id`.
But AC5 says "a transfer decision can be traced back to the exact reservation it concerns," and
the same section separately says the `DepotTransferRequested` announcement must gain the
reservation id "so a decision can be traced to its reservation." `asset_tag` + `requested_for`
is not a safe join key (nothing rules out two requests for the same asset on the same date once
a rejected transfer's asset returns to the book).

**Assumption:** add `reservation_id` to the `transfer_approval` migration in US-1, treating the
RFC's column list as incomplete rather than as a deliberate omission. Flagged as the single
highest-impact gap in the RFC — if a human reviewer intended traceability to be satisfied purely
via the announcement payload (not persisted), the migration in US-1 would need to drop this
column.

## Q2 — RFC describes a UI, but the fixture has no UI/controller layer at all

The "Approver surface" section describes a read view with per-row Accept/Reject buttons. Every
other module in this fixture (Logistics, Maintenance, Catalog, Documents, ...) stops at a plain
C# service class with no controller, endpoint, or view — there is no precedent anywhere in the
fixture for what an API/UI layer would look like here.

**Assumption:** scope every slice to the service layer, mirroring the existing
`LogisticsService.Pending()` pattern (`TransferApprovalService.Pending()` /
`Accept()` / `Reject()`). The actual UI/API surface is treated as out of scope for this
breakdown; it would be an obvious follow-on slice once *any* module in this codebase has a UI
layer to extend, but inventing one here would be scope creep beyond what the RFC's governed
files list supports.

## Q3 — authorization rule required, but approver-to-depot mapping doesn't exist anywhere

AC-adjacent text requires "only an approver for either the sending or the receiving depot may
decide," but the non-goals explicitly exclude "approver-role management UI," and nothing in the
fixture (not even `Auth0IdentityClient`, which only resolves a bearer token to a subject string)
models which depot(s) an approver belongs to.

**Assumption:** introduce a minimal seam, `IDepotApproverDirectory.CanDecide(approverId,
depotId)`, in US-3, backed by a stub/test double for now. Wiring it to a real identity/authz
source is explicitly out of scope for this breakdown and would need its own follow-up slice once
a source is chosen (this is a genuine open question for a human, not something this breakdown
can resolve from the fixture alone).

## Q4 — `config/teams.yaml` has no owner for the `Vendors` module

Every module the RFC touches has a squad listed in `config/teams.yaml` (`fulfilment` owns
`allocation, logistics`) except `Vendors` (Stripe/Auth0/SendGrid adapters), which appears in no
squad's `owns:` list. AC4 requires extending the SendGrid adapter.

**Assumption:** treat `Vendors` as a shared, low-risk module (consistent with its own doc
comment: "thin adapters... no business rules... if a better vendor came along we would swap the
adapter") that the Fulfilment squad may extend directly for this RFC. The missing ownership row
in `teams.yaml` is flagged here as a separate, small housekeeping gap for a human to close — it
is out of scope for this breakdown since `config/teams.yaml` is not in the RFC's `governs:` list.

## Q5 — no specified signal for "is this commit a cross-depot transfer in flight"

The RFC says Logistics must react to the accepted-transfer announcement "for cross-depot moves"
(implying same-depot commits keep scheduling immediately, unchanged), but doesn't say how
Logistics is supposed to tell the two cases apart — "home depot" resolution
(`HomeDepotOf`) is private to `AllocationService` today.

**Assumption:** extend the shared `EquipmentAllocated` event with an `IsCrossDepotTransfer`
bool, set at the same emit site already being touched in US-1, rather than have Logistics
re-derive or duplicate home-depot resolution. This matches the README's framing that Allocation
and Logistics "share model types" and "evolve together."

## Q6 — no specified file/class for the new approval workflow

The RFC's front-matter `governs:` list is only `AllocationService.cs`, `LogisticsService.cs`,
`ExternalServiceClients.cs`, and `db/migrations/` — it names no new class or file for the
approval/decision engine itself.

**Assumption:** introduce a new class, `TransferApprovalService`, in a new file
`src/Allocation/TransferApprovalService.cs` — same module/namespace as Allocation (the RFC's own
words: "transfers are born" there; the module is already Fulfilment-owned) — rather than folding
the workflow into `AllocationService` itself (which would blur its single existing
responsibility: commit + overlap enforcement) or inventing a new top-level module not implied by
anything in the RFC or the fixture's module list.
