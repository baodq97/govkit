# VERIFY — baseline-sonnet GRADE.md audit

Independently re-read the rubric, the fixture (`AllocationService.cs`, `LogisticsService.cs`,
`rfc-transfer-approval.md`), and every runner artifact (`WORK-BREAKDOWN.md`, `US-1..4*.md`,
`QUESTIONS.md`, `RUN-NOTES.md`). All 14 checks were re-verified (no FAILs exist in this grade, so
all 3 PARTIALs and all 11 PASSes were sampled — exceeding the required 8/2/2 minimum).

> **⚠ B4 verification is STALE / NON-AUTHORITATIVE for calibration.** The B4 result below endorses
> PARTIAL as *"matching the rubric's 'silent on parallelism = PARTIAL, never FAIL' rule."* That rule
> is from an **earlier `rubric.md`**; the current B4 makes **"No concurrency statement at all" a
> Typical FAIL**. Under the current rubric this run's silent, fully-serial backlog grades **B4 =
> FAIL (0/2)**, so the endorsement of PARTIAL here does not reflect the current standard. Retained
> for history; do not use it to calibrate B4 or as the B4 "before" baseline.

## Method

For each row: (1) re-derived the verdict from the rubric text and the fixture/source code
independently, without reading GRADE's reasoning first where practical; (2) grepped the runner's
output files for every quoted string to confirm it appears verbatim (or as a fair, marked
truncation); (3) recomputed the point arithmetic.

## Findings

### 1. Arithmetic error — Group B subtotal and grand total are wrong (verifiable, not a judgment call)

GRADE.md's own per-check scores for Group B are: B1=3, B2=1.5, B3=2, B4=1, B5=1, B6=2, B7=1, B8=2.

Sum = 3 + 1.5 + 2 + 1 + 1 + 2 + 1 + 2 = **13.5**, not the **12.5** printed in the "Category
subtotals" table (`GRADE.md` line 32). Group A's subtotal (14.5) is correct
(3+3+1.5+2+3+2=14.5). Combined, the grand total is **14.5 + 13.5 = 28**, not the **27** printed in
the results table (`GRADE.md` line 25) and the subtotal table.

This is a pure addition slip on the grader's own numbers — none of the 14 individual verdicts need
to change for the total to move from 27 to 28.

### 2. One fabricated/inverted quote in B6 (does not change the verdict)

GRADE.md line 22 (B6) cites: `US-3 "different verifications (break trigger 2)" and "past 'can
demo in one sitting' (trigger 4)"`.

- `"different verifications (break trigger 2)"` — confirmed verbatim in `WORK-BREAKDOWN.md:130`
  ("...are different verifications (break trigger 2)..."). Note: the separate
  `US-3-accept-decision-notifications.md` file uses different wording ("different proofs") for the
  same point — the grader's quote matches the main `WORK-BREAKDOWN.md` doc, which is fine.
- `"past 'can demo in one sitting'"` — **does not appear anywhere in the runner's output.** The
  actual text (`WORK-BREAKDOWN.md:131`) reads: `tip it into "cannot demo in one sitting" (trigger
  4)` — negated. Grepped all five runner files for "demo in one sitting": the only occurrence is
  `WORK-BREAKDOWN.md:131` with "cannot", never "can" alone. The grader's quote silently drops the
  negation, inverting what the runner actually wrote, and presents it as if quoted.
- Verdict impact: none. The row's PASS still holds on the two other correct quotes (Trigger 1
  "title contains \"and\"", confirmed at `WORK-BREAKDOWN.md:13`; and the "different verifications"
  quote above). This is a citation-hygiene defect under the rubric's "mandatory" quoting rule, not
  a substance error.

### 3. Minor: one spliced (non-contiguous) quote in B3, immaterial

GRADE.md line 19 renders US-4's size rationale as `"M — a few behaviours, about a day"`. The
actual text (`WORK-BREAKDOWN.md:169-174`) is: `M — reject's own mechanics (flip status, release
hold) are small (S) on their own; ... but reject plus its email together is still "a few
behaviours, about a day" — it does not need the same accept/notify split...`. The grader spliced
the leading "M —" to a fragment ~40 words later without an ellipsis marker. The size (M) and the
rationale fragment are both real, just not contiguous as quoted. No verdict impact — flagging only
as a citation-precision nit, same family as finding 2.

## Per-check verification results

All 14 verdicts were checked against source and are **substantively correct** — every quoted
slice/size/dependency string (outside the two nits above) was found verbatim in the cited runner
file, and no PASS was built on a vague gesture with no real backing text:

- **A1 PASS** — confirmed: US-1 genuinely bundles migration + emit-site change + listener + read
  view in one slice; no horizontal schema/service/UI slices exist anywhere in the backlog.
- **A2 PASS** — confirmed: decision engine is cut into 4 slices (US-1 intake M, US-2 accept L, US-3
  accept-notify S, US-4 reject M); none carried as a single L/XL "approval engine" slice.
- **A3 PARTIAL** — confirmed correct. Both `AllocationService.cs` edits (`DepotTransferRequested`
  gains `ReservationId`; `Reservation` gains a transfer-status field) are merged into US-1, so no
  false-parallel claim exists, but grepped all 5 files for "same file"/"disjoint"/"AllocationService.cs"
  coupling language — the run never states the two concerns share a file or can't run independently.
  Matches rubric's PARTIAL condition exactly ("merges incidentally without noting the coupling").
- **A4 PASS** — defensible. Migration is folded into US-1 (first in chain); US-2 explicitly cites
  `Blocked by: US-1 (needs the transfer_approval table...)`; US-4 (the reject decision-record
  consumer) is ordered after transitively via US-3→US-2→US-1, satisfying the rubric's alternate
  "sequence places it first with both consumers after" clause. A stricter reader could call this
  PARTIAL (only one slice cites the table by name directly), but PASS is a reasonable reading of
  the rubric's own wording — not flagged as a disagreement.
- **A5 PASS** — confirmed: US-1 folds the `DepotTransferRequested`/reservation-id emit-site change
  together with the new listener that actually consumes it (`TransferApprovalService`), closing the
  G-ORPHAN gap; WORK-BREAKDOWN.md's US-2 section also explicitly states the "nothing to verify on
  its own" reasoning verbatim.
- **A6 PASS** — confirmed: SendGrid subject generalization appears only inside US-3 (the
  accept-notify slice), never as its own standalone slice or separately sized item.
- **B1 PASS** — confirmed: US-1/US-2/US-4 verification quotes all found verbatim as cited.
- **B2 PARTIAL** — confirmed correct and well-reasoned: real edges (migration→queue/decision,
  Logistics-on-accepted merged with Allocation-emits-accepted in US-2) are sound; the flagged
  invented edge (US-4 "Blocked by: US-3") is real — the run's own QUESTIONS.md/US-4.md text
  concedes "US-1 is reject's only hard technical dependency," exactly matching the rubric's
  canonical "accept blocking reject" invented-edge example.
- **B3 PASS** — sizes + rationale confirmed present for all 4 slices (see nit #3 above on quote
  contiguity; substance is correct).
- **B4 PARTIAL** — ⚠ **STALE (see B4 banner at top): current rubric grades this FAIL (0/2).**
  Chain is fully serial (`US-1 → US-2 → US-3 → US-4`, confirmed verbatim at WORK-BREAKDOWN.md:28),
  no false file-disjoint claim anywhere. The cited *"silent on parallelism = PARTIAL, never FAIL"*
  rule is superseded — the current B4 makes "No concurrency statement at all" a Typical FAIL, so
  this silent backlog now scores 0/2.
- **B5 PASS** — confirmed: all four `Blocked by:` lines are body-text prose; no `blockedBy:`
  front-matter key anywhere in any of the 4 US files.
- **B6 PASS** — verdict correct despite the finding-2 misquote (see above); genuine trigger-1 and
  trigger-2 citations back it independently.
- **B7 PASS** — confirmed: every slice's `Blocked by:` line names exactly one upstream; no slice
  stacks on 2+ upstreams.
- **B8 PASS** — confirmed: AC1 (US-1), AC2 (US-2), AC3 (US-4), AC4 split accept/reject (US-3/US-4),
  AC5 split schema/accept/reject (US-1/US-2/US-4) — all five ACs are mapped to a slice; no RFC
  behaviour is dropped.

## Conclusion

The 14 individual verdicts are well-supported by the cited evidence and hold up against the fixture
and skill source — no FAIL-worthy runner delivery was mis-scored as FAIL (there are no FAILs), and
no PASS was built on a vague gesture; the PARTIALs (A3, B2, B4) are each backed by a concrete,
correctly-quoted gap. The only real defect is arithmetic: Group B's own listed scores sum to 13.5,
not 12.5, making the correct total **28/32**, not the reported **27/32**. One supporting quote in
B6 inverts the runner's actual wording (drops a "cannot"→reads as "can"); it doesn't change that
row's verdict but is a citation-rule violation worth fixing in the record.

**Adjusted total: 28/32** (Group A 14.5/16 unchanged, Group B 13.5/16 corrected from the
grader's own numbers).
