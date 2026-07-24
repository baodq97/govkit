# GRADE — baseline-sonnet (work-breakdown, RFC-9101)

Graded strictly against `rubric.md` (32 pts, 14 checks). Every verdict quotes the runner's output
(files: `WORK-BREAKDOWN.md`, `US-1..US-4*.md`, `QUESTIONS.md`, `RUN-NOTES.md`) and cross-checks
dependency claims against the fixture source.

> **⚠ B4 row is STALE / NON-AUTHORITATIVE — do not use for calibration.** This grade was filled
> against an earlier `rubric.md` in which *silence on parallelism* earned PARTIAL (the row's note
> reads *"Silent on parallelism = half credit per rubric"*). The current `rubric.md` B4 makes **"No
> concurrency statement at all" a Typical FAIL** (SK: *"Silence is an incomplete breakdown, not a
> safe default"*). This run's backlog is a fully-serial chain with **no concurrency statement**, so
> under the current rubric **B4 → FAIL (0/2)**, not the PARTIAL (1/2) recorded below — the total
> falls by one point accordingly. The B4 verdict and its "silent = half credit" note are retained
> for history but must **not** be used to calibrate the current B4 standard or as the B4 "before"
> baseline in the before/after regression protocol. All other rows remain usable.

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 (T5) Slices vertical, not layers | 3 | PASS | 3 | US-1: "migration (`transfer_approval` table) + the `Commit` emit-site change ... + a listener that persists the pending row + the read query that backs the approver's queue. Schema, service, and read view land together". No schema/service/UI horizontal slices exist. |
| A2 (T3) XL decision engine split | 3 | PASS | 3 | Slice map splits the decision engine into US-1 intake, US-2 "Accept schedules the move" [L], US-4 "Reject releases the hold" [M], US-3 accept-notify — accept and reject are distinct slices; not carried as one L/XL. |
| A3 (T1) Same-file coupling surfaced | 3 | PARTIAL | 1.5 | Both `AllocationService.cs` edits are merged into US-1 ("`DepotTransferRequested` gains a `ReservationId` field" + "`Reservation`: a new transfer-status field"), so no false-parallel error is made — but the run never states these two concerns share the file / cannot run disjoint. Merge is present; the coupling itself is not surfaced in words. |
| A4 (T4) Migration precedes two slices | 2 | PASS | 2 | Migration folded into US-1 and placed first; US-2 "Blocked by: US-1 (needs the `transfer_approval` table and pending queue...)"; reject decision-record consumer US-4 is ordered after via the chain. Two table-consumers ordered after the migration, one citing the table explicitly. |
| A5 (T2) Unverifiable emit merged/re-cut | 3 | PASS | 3 | Emit folded with its consumer AND flagged: US-2 "Splitting the emit-side contract from its only consumer ... would produce a slice with nothing to verify on its own (an event no one reacts to yet is not demoable)". Emit-site change + persisting listener both in US-1. |
| A6 (T6) SendGrid refactor folded | 2 | PASS | 2 | US-3: "an XS change (one method on one class) folds into the larger slice that first needs it, rather than becoming its own enabler-only slice". Folded into the accept-email slice, not standalone. |
| B1 Slices independently testable/rejectable | 3 | PASS | 3 | Every slice has a Verification block, e.g. US-1: "Commit a unit to a non-home depot → exactly one pending row"; US-2: "transfer flips to `accepted`, `Logistics.Pending()` gains a new run"; US-4: "the reservation's hold releases ... both depots receive a reject-decision email". Distinct proofs. |
| B2 Blocking edges sound + complete vs code | 3 | PARTIAL | 1.5 | Real edges present & sound: queue/decision ← migration (US-1→US-2), Logistics-on-accepted ← Allocation-emits-accepted merged in US-2. But US-4 declares "Blocked by: US-3" (reject ← accept chain), which is not a hard code dep — the run itself admits "US-1 is reject's only hard technical dependency". One declared edge is not a real code edge (the rubric's flagged "accept blocking reject"). |
| B3 Sizes on XS–XL ladder + rationale | 2 | PASS | 2 | Ladder sizes + rationale each slice: US-1 "M — a handful of behaviours ... that all serve one proof"; US-2 "L — multiple behaviours ... roughly multi-day"; US-3 "S — one behaviour"; US-4 "M — a few behaviours, about a day". |
| B4 No false parallelizability/file-disjoint claim | 2 | PARTIAL | 1 | ⚠ **STALE — non-authoritative; see B4 note above the table (current rubric → FAIL).** No false claim made — but no affirmative concurrency statement either; the backlog is a fully serial chain "US-1 → US-2 → US-3 → US-4." Silent on parallelism = half credit per rubric. |
| B5 Deps in body text, not front-matter key | 1 | PASS | 1 | Dependencies modelled as body lines, e.g. US-2 "Blocked by: US-1 (needs the `transfer_approval` table and pending queue...)". No `blockedBy:` YAML front-matter key invented. |
| B6 Break triggers applied | 2 | PASS | 2 | Multiple triggers named/used: Trigger 1 "title contains 'and'"; Trigger 3 override in US-2 with team/README/RFC evidence; US-3 "different verifications (break trigger 2)" and "past 'can demo in one sitting' (trigger 4)". |
| B7 Edges kept few (≤~1 upstream) | 1 | PASS | 1 | "Each slice names exactly one upstream blocker, per the skill's 'keep the edges few' rule — no slice here is blocked by more than one other." Linear chain confirms. |
| B8 Output contract complete (AC1–AC5) | 2 | PASS | 2 | Backlog carries id/title/size/AC/ordering per slice; AC map covers all five — AC1 (US-1), AC2 (US-2), AC3 (US-4), AC4 accept-half (US-3)+reject-half (US-4), AC5 (US-1 schema + US-2/US-4 decision). |
| **TOTAL** | **32** | | **27** | |

## Category subtotals

| Group | Score | Max |
|---|---:|---:|
| A. Traps T1–T6 | 14.5 | 16 |
| B. General breakdown quality | 12.5 | 16 |
| **Total** | **27** | **32** |

## Per-check notes on non-PASS (what full credit needed)

- **A3 (1.5/3):** Full credit needed an explicit statement that the reservation-status field and the
  `DepotTransferRequested` reservation-id/emit-site change both live in `AllocationService.cs` and
  therefore cannot be split into parallel/file-disjoint work. The run correctly merged both into
  US-1 but treated the merge as incidental to vertical slicing — it never names the same-file
  coupling. Rubric: merge "incidentally without noting the coupling" is PARTIAL.
- **B2 (1.5/3):** All real code edges are present and sound (migration→queue/decision;
  Allocation-emits-accepted merged with Logistics-consumes). The defect is the declared
  "Blocked by: US-3" on US-4 — reject depending on accept is not a hard code dependency (the run
  concedes "US-1 is reject's only hard technical dependency"). This is the rubric's canonical
  invented edge ("accept blocking reject"), even though the run justifies it as guard/adapter reuse
  and flags it invertible.
- **B4 (1/3→1/2):** ⚠ **STALE — see B4 banner at top; current rubric grades this FAIL (0/2), not
  PARTIAL.** No false file-disjointness claim (good) but no affirmative "these may run
  concurrently on a file-level basis" statement — the plan is fully serial. (The old rule invoked
  here, "Rubric awards PARTIAL for correct-but-silent-on-parallelism," is superseded: the current
  B4 makes "No concurrency statement at all" a Typical FAIL.)
