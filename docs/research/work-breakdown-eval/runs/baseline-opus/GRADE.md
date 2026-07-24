# GRADE — baseline-opus (work-breakdown vs RFC-9101)

Graded against `rubric.md` (32 pts, 14 checks). Zero-charity, every verdict quotes runner output or
records explicit absence; every dependency edge cross-checked against the fixture source.

> **⚠ B4 row is STALE / NON-AUTHORITATIVE — do not use for calibration.** This row was filled under
> an earlier B4 ("No false parallel/file-disjoint claim"). The current `rubric.md` B4
> ("Parallel-safety derived + concurrency statement") makes a closing concurrency statement a
> **mandated output** and makes *a parallelism claim contradicted by shared files* a **Typical
> FAIL**. The runner's "Wave 2: US-02 and US-03 (parallel)" over two slices that both edit
> `AllocationService.cs` is exactly that FAIL pattern, so under the current rubric **B4 → FAIL
> (0/2)** (as VERIFY.md already argues), not the PARTIAL (1/2) recorded below — the recorded total
> falls by one point accordingly. The B4 verdict here is retained for history but must **not** be
> used to calibrate the current B4 standard or as the B4 "before" baseline in the before/after
> regression protocol. All other rows remain usable.

## Results table

| Check | Pts | Verdict | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 (T5) Slices vertical, not layers | 3 | PASS | 3 | "Cut **vertically**: each slice is schema → domain logic → event → read/side-effect → test." US-02 is end-to-end demonstrable: "accept a pending transfer ⇒ row leaves the queue, a `DeliveryRun` appears". No schema/service/UI horizontal slices exist. |
| A2 (T3) XL decision engine split | 3 | PASS | 3 | Decision flow split across US-02 (accept), US-03 (reject), US-05 (authz), intake in US-01. "US-03 … **Why separate from US-02 (break trigger 2):** accept and reject *prove out differently*". No single "approval engine" slice; none sized XL. |
| A3 (T1) Same-file coupling surfaced | 3 | PASS | 3 | Both AllocationService.cs edits merged into ONE slice (US-01): "**Event shape:** … Add the **reservation id** … change the single emit site at `AllocationService.cs:70`" AND "**Reservation model:** record whether a reservation currently sits under a pending/accepted/rejected transfer". Never presented as parallel/independent — rubric's primary PASS path ("merges them into one slice"). |
| A4 (T4) Migration precedes two slices | 2 | PASS | 2 | Migration folded into US-01 (first): "**Schema:** new migration under `db/migrations/` adding `transfer_approval`". Two decision-record consumers ordered after: US-02 "`Blocked by:` US-01" and US-03 "`Blocked by:` US-01"; queue read view sits in the same slice as the migration. Sequence "places it first with both consumers after." |
| A5 (T2) Unverifiable emit merged/re-cut | 3 | PASS | 3 | Emit folded with its consumer in US-01: "a handler that listens for `DepotTransferRequested` and inserts the `pending` row (nothing listens today — `AllocationService.cs:67-68`)." New `TransferDecided` emit + Logistics consume kept in one slice (US-02); §0: "an emitter nothing consumes, then a consumer nothing feeds — neither demonstrable on its own." |
| A6 (T6) SendGrid refactor folded | 2 | PASS | 2 | Folded into notify slice US-04, not standalone: "the adapter change is **not** shipped alone — it rides this wiring slice … an adapter method nobody calls would be a horizontal XS sliver." Subject tweak carried inside; not sized as its own item. |
| B1 Slices independently testable | 3 | PASS | 3 | Every slice ends in a **Test:** with an observable outcome — US-01 "exactly one `pending` row appears in the queue"; US-03 "reservation is `released`, the unit can be re-committed … no delivery run exists"; US-05 "an approver from an unrelated depot is refused". No plumbing-only slice. |
| B2 Blocking edges sound + complete | 3 | PASS | 3 | Edges verified in code: US-02/03 ← US-01 (migration/pending state); US-04 ← US-02 (introduces `TransferDecided`); US-05 ← US-02 (needs `Decide(...)`). G-LOG handled by merging Allocation-emit + Logistics-consume into US-02. No invented edge — "US-03 … *Independent of US-02*" avoids accept-blocks-reject. |
| B3 Sizes on ladder + rationale | 2 | PASS | 2 | Each slice sized on XS–XL with rationale: US-01 "**Why L and not split further:** … AC1's single bundled proof"; US-02 "**Why L and one slice:** AC2 is one behaviour whose proof requires the announcement *and* the Logistics consumption together"; US-05 "Small enough (S) to ship on its own". |
| B4 No false parallel/file-disjoint claim | 2 | PARTIAL | 1 | ⚠ **STALE — non-authoritative; see B4 note above the table (current rubric → FAIL).** "**Wave 2:** US-02 and US-03 (parallel; both only need US-01)." Cross-check: US-02 edits `AllocationService.cs` (Reservation status flip, `Overlaps`) and US-03 edits `AllocationService.cs` (`Reservation.Release()` :18) + both add branches to the shared new `Decide(...)`. Runner discloses the overlap — "whichever decision slice lands first scaffolds the shared `Decide` skeleton, a merge detail, not a hard block" — so it is a caveated, not naked-false, parallel claim; no clean file-level parallel-safety note → not PASS. |
| B5 Deps in body, not front-matter | 1 | PASS | 1 | "`Blocked by:` lines above go in each user story's **body** — do **not** add a `blockedBy` front-matter key (unsupported by the govkit schema, which resolves `parent` only)." |
| B6 Break triggers applied | 2 | PASS | 2 | All four named in §0: "1. **Title contains 'and'.**"; "2. **ACs need different verification.**"; "3. **It crosses more than one boundary.**"; "4. **It cannot be demoed in one sitting.**" Plus trigger #2 reused for US-03/US-05 splits. |
| B7 Edges kept few (≤~1 upstream) | 1 | PASS | 1 | "Every slice stands on **at most one** upstream dependency." US-01: none; US-02←US-01; US-03←US-01; US-04←US-02; US-05←US-02 — each a single upstream. |
| B8 Output contract complete (AC1–AC5) | 2 | PASS | 2 | Slice table (id/title/size/delivers/blocked-by) + AC coverage table maps AC1–AC5 to slices with proofs: "All five ACs covered; no slice is XL; no slice carries more than one upstream edge." |
| **TOTAL** | **32** | | **31** | |

## Category subtotals

- **Group A (traps T1–T6):** 16 / 16
- **Group B (general breakdown quality):** 15 / 16
- **TOTAL: 31 / 32**

## Non-PASS remediation note

- **B4 (1/2):** A full-credit answer would either (a) not list US-02 and US-03 as concurrently
  runnable, since both edit `AllocationService.cs` (Reservation status transitions) and both add
  branches to the same new `Decide(...)` method, or (b) give an explicit file-level parallel-safety
  statement that carves the shared `Decide`/Reservation surface out of the concurrency claim. The
  runner disclosed the shared skeleton but still placed the two in one parallel wave.
