# GRADE — after-opus run (work-breakdown, RFC-9101)

Graded against `rubric.md` (32 pts, 14 checks). Every verdict quotes the runner's output
(`WORK-BREAKDOWN.md`, `QUESTIONS.md`, `RUN-NOTES.md`) and cross-checks each dependency claim
against the fixture source (`AllocationService.cs`, `LogisticsService.cs`,
`ExternalServiceClients.cs`, `db/migrations/`, RFC-9101).

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 (T5) Slices vertical, not layers | 3 | PASS | 3 | Slice map cuts by behaviour (US-A persist+queue, US-B accept, US-C reject, US-D Logistics cutover, US-E email). US-A explicitly rejects a horizontal cut: *"Splitting 'the table' from 'the queue read' would be a horizontal cut (a table nothing reads is not demonstrable); they stay together as one vertical slice whose demonstration surface is the queue."* Each slice header: *"Each is a thin top-to-bottom cut (schema + logic + observable outcome + test), not a horizontal layer."* |
| A2 (T3) XL decision engine split | 3 | PASS | 3 | The decision engine is split into US-A (pending intake), US-B (accept), US-C (reject): *"US-B — Accept a pending transfer"* / *"US-C — Reject a pending transfer"*, each independently reviewable with a distinct proof. Not carried as one L/XL unit — RFC's *"cannot be reviewed as a single change"* quoted and acted on. |
| A3 (T1) Same-file coupling surfaced | 3 | PASS | 3 | Both edits are merged into US-A Touches: `AllocationService.cs` — *"DepotTransferRequested gains ReservationId; Commit emit site persists a pending row; Reservation gains a transfer-status marker."* And §4: *"src/Allocation/AllocationService.cs is the hotspot: US-A, US-B, US-C, and US-D all modify it … Any overlap ⇒ not parallel-safe ⇒ these four must serialize."* Confirmed vs fixture: `Reservation`, `Commit`, and `DepotTransferRequested` all live in that one file. |
| A4 (T4) Migration precedes two slices | 2 | PASS | 2 | Migration folded into US-A first (`db/migrations/0002_transfer_approval.sql`); the two decision-record consumers are ordered after it — US-B *"Blocked by: US-A — HARD. Needs the persisted pending state and the queue that reads it"* and US-C after US-B, both writing the table. Sequence *"A → B → C"* places the migration first with ≥2 feature slices after; no slice silently needs the table. Confirmed only `0001_audit_log.sql` exists in fixture. |
| A5 (T2) Unverifiable emit merged/re-cut | 3 | PASS | 3 | No standalone emit slice. The orphaned `DepotTransferRequested` emit is folded into US-A, which lands its observer: *"On a cross-depot commit, write a pending row"* / Verify: *"a cross-depot Commit produces a pending row visible in the queue."* New `DepotTransferAccepted` sits in US-B whose observable is status+queue, not emit-only. Runner quotes the fixture orphan directly (RUN-NOTES: *"Nothing listens for this yet"*). |
| A6 (T6) SendGrid refactor folded | 2 | PASS | 2 | US-E Touches: *"src/Vendors/ExternalServiceClients.cs (SendGridNotificationClient gains a transfer-decision send with its own subject/body — folded here rather than made its own XS slice)."* Carried inside the S–M email slice, not standalone. Confirmed vs fixture: `SendReceipt` hardcodes `"Your RentField receipt"`. |
| B1 Slices independently testable/rejectable | 3 | PASS | 3 | Every slice ends in a concrete **Verify:** line — US-B: *"accepting a pending transfer sets status accepted … an approver from neither depot is refused"*; US-C: *"releases the hold (the unit is committable again) … never produces a delivery run."* Accept and reject each end in a distinct reviewer-rejectable proof. |
| B2 Blocking edges sound + complete vs code | 3 | PARTIAL | 1.5 | All truly-required edges present and sound: US-B←US-A (migration/pending), Logistics captured via US-D needing *"US-B's DepotTransferAccepted event"* + emit-site+handler coordinated in one slice, Allocation reservation/event change merged into US-A. BUT US-C is *"Blocked by: US-B — HARD"* — the exact **accept-blocking-reject** pattern the rubric names as invented; code (both edit `AllocationService.cs`) requires only serialization/non-concurrency, not a directional prerequisite (reject consumes no output of accept). Same over-strong framing on US-D←US-C. One over-strong/invented directional edge → PARTIAL. |
| B3 Sizes on the XS–XL ladder | 2 | PASS | 2 | Sizes: US-A L, US-B M–L, US-C S–M, US-D M, US-E S–M — all ladder labels, plausibly consistent with scope (US-A L = migration + emit change + reservation marker + queue read + store interface across several files). No off-ladder scale. |
| B4 Parallel-safety derived + concurrency statement | 2 | PASS | 2 | §4 derives from Touches sets; §5 concurrency statement with waves: *"Wave 4: US-D ∥ US-E — parallel-safe … their touched-file sets are disjoint."* Does NOT call the shared-`AllocationService.cs` slices disjoint: *"these four must serialize: A → B → C → D. No two of them may be fanned out."* US-D (Logistics+Allocation emit-site) vs US-E (Notifications+Vendors) confirmed file-disjoint. |
| B5 Deps in body text, not front-matter key | 1 | PASS | 1 | `Blocked by:` lines in each slice body; Q8: *"per the skill's explicit instruction not to invent a blockedBy front-matter key (the govkit schema resolves parent only)."* |
| B6 Break triggers applied | 2 | PASS | 2 | §1 names all four with justification: *"1. Title contains 'and' … 2. ACs verify differently … 3. Crosses >1 boundary … 4. Cannot demo in one sitting."* ≥2 triggers clearly used. |
| B7 Edges kept few (≤~1 upstream) | 1 | PASS | 1 | Chain *"A → B → C → { D ∥ E }"* with *"Every slice stands on at most one direct upstream."* No slice on multiple upstreams. |
| B8 Output contract complete (AC1–AC5) | 2 | PASS | 2 | Slice map table gives id/behaviour(AC)/size/upstream/touches per slice; AC1→US-A, AC2→US-B+US-D, AC3→US-C, AC4→US-E, AC5 threaded via US-A. All five ACs covered; usable backlog. |
| **TOTAL** | **32** | | **30.5** | |

## Category subtotals

- **Group A (traps T1–T6):** 16 / 16
- **Group B (general quality):** 14.5 / 16
- **TOTAL: 30.5 / 32**

## Notes on the single non-PASS

- **B2 (1.5/3):** A full-credit answer would model US-C's relationship to US-B as a
  **parallel-safety / serialization** constraint (same-file, can't run concurrently) rather than a
  **HARD functional blocking edge** — reject does not depend on any output of accept, so
  `US-C Blocked by US-B` reproduces the rubric's named invented edge (accept blocking reject).
  All genuinely required edges (migration, Logistics-on-accepted, the merged Allocation
  reservation/event change) are present and code-verified, which keeps it out of FAIL.
