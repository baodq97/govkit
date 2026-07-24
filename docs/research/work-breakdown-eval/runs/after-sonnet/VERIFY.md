# VERIFY — audit of `after-sonnet/GRADE.md`

Independent re-verification of the grade against the rubric, the runner's actual output
(`rfc-9101-work-breakdown.md`, `QUESTIONS.md`, `RUN-NOTES.md`), and the fixture source
(`AllocationService.cs`, `LogisticsService.cs`, `ExternalServiceClients.cs`, the RFC).

## Method

`GRADE.md` records 12 PASS, 2 PARTIAL, 0 FAIL (30/32). Per the verification brief, sampled
**all 14 checks** (exceeds the "≥8, every FAIL, ≥2 PARTIAL, ≥2 PASS" floor — there are no
FAILs, so both PARTIALs plus every PASS were checked):

- A1–A6 (all PASS)
- B1, B3, B4, B5, B6, B8 (all PASS)
- B2, B7 (PARTIAL)

For each: (1) grepped every quoted string against the actual runner-output file to confirm it
is real and not fabricated/misremembered, (2) re-read the cited fixture source
(`AllocationService.cs`, `LogisticsService.cs`, `ExternalServiceClients.cs`, RFC front-matter
and body) to confirm the code facts the grade leans on, (3) re-applied the rubric's PASS /
PARTIAL / FAIL bar independently rather than trusting the grader's label.

## Findings

**No fabricated quotes.** Every quoted fragment in the results table (A1–A6, B1–B8) was found
verbatim (or as a legitimate ellipsis-elided excerpt) in `rfc-9101-work-breakdown.md`, or in
the case of A5/A6's fixture citations, in `AllocationService.cs` / `ExternalServiceClients.cs`.
Two quotes wrap across source lines (e.g. A2's "it cannot be reviewed as a single change",
A5's "Nothing listens for this yet") — grep on a single line misses them, but reading the raw
file confirms the words are contiguous prose broken only by the file's line width. Not
fabrication.

**No FAIL-where-runner-delivered.** There are no FAILs in this grade to check for this failure
mode.

**No PASS built on a vague gesture.** Re-checked each PASS against the rubric's own PASS bar,
not just against the presence of a quote:
- A3 (same-file coupling): confirmed `AllocationService.cs` really does hold `Reservation`,
  `Commit`, and both event records in one file; confirmed the runner merges
  `Reservation.TransferStatus` + `DepotTransferRequested.ReservationId` + the emit-site edit
  into one slice (US-1), and separately (correctly) flags the US-1/US-4 file overlap as adding
  "no new constraint" rather than falsely calling it disjoint.
- A5 (unverifiable emit): confirmed US-1 pairs the modified `DepotTransferRequested` emission
  with a new consumer (`TransferApprovalService`'s handler) in the same slice — satisfies the
  rubric's "folded into a slice that also lands its consumer" bar, not just an assertion.
- B4 (parallel-safety derived): confirmed a real `Touches:` table per slice, a derivation
  ("US-2's touched set … is disjoint" / "US-3 and US-4 both touch … → overlap"), and a closing
  concurrency statement — matches the rubric's stricter "derived, not declared" bar, not a bare
  claim.
- B6 (break triggers): all four SK triggers invoked by number with a distinct justification
  each — clears the "≥2 named" bar comfortably.

None of the PASSes rest on hand-waving; each has a specific, checkable quote tied to a real
code fact or a real structural feature of the backlog.

**The two PARTIALs are correctly diagnosed, not over- or under-scored:**
- **B2 (1.5/3).** Cross-checked against the fixture: `LogisticsService.On(EquipmentAllocated)`
  today schedules unconditionally; the RFC requires it to react to an *accepted* transfer
  instead. In the runner's design, `TransferAccepted` is only ever **emitted** in US-4
  (`Accept()`); US-2 only gets the event **shape** from US-1. The runner's own dependency graph
  lists `US-2 — Blocked by: US-1` only, and its prose states outright "this slice does **not**
  need US-3 or US-4's logic" and later "does **not** need to wait for US-2 … so US-4 and US-2
  may also run concurrently" — i.e., it explicitly clears US-2 to ship/run independent of US-4,
  even though AC2 (accept → Logistics schedules) is non-functional until both exist (the
  runner's own AC table admits "neither alone satisfies AC2"). That is exactly one real edge
  (Logistics-schedules-on-accepted ← Allocation-emits-accepted, per rubric G-LOG) missing while
  the other three real edges (migration → decision slices, AllocationService.cs coupling → both
  merged into US-1) are present and correctly represented. This is squarely the rubric's PARTIAL
  bucket ("most edges right but one real edge missing"), not a FAIL (no edges are fabricated,
  most are right) and not a PASS (the missing edge is real, not cosmetic). 1.5/3 is the correct
  half-credit arithmetic.
- **B7 (0.5/1).** Confirmed US-4 is the only slice carrying two `Blocked by:` lines
  ("`Blocked by: US-1 …` Hard edge. `Blocked by: US-3 …` Hard edge, by file overlap.") while
  US-1/US-2/US-3 each carry ≤1. That is a 2-deep stack, not the 3+ the rubric reserves for FAIL,
  and it is left unaddressed (no re-slice/merge to collapse it to one upstream even though US-3
  already carries US-1 transitively) — matches the rubric's PARTIAL description exactly.

## Arithmetic check

Group A: 6 × PASS = 16/16 (matches). Group B: 3+1.5+2+2+1+2+0.5+2 = 14/16 (matches). Total
16+14 = 30/32 (matches `GRADE.md`'s stated total).

## Verdict

Grade stands. No disagreements found across any of the 14 checks re-verified.

sampled: 14
disagreements: none
adjustedTotal: 30 (unchanged from GRADE.md)
