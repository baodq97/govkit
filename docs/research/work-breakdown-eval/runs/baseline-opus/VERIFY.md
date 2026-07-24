# VERIFY — baseline-opus GRADE.md re-audit

Independent re-verification of `GRADE.md` (31/32) against the runner output
(`WORK-BREAKDOWN.md`, `RUN-NOTES.md`, `QUESTIONS.md`) and the primary sources
(`rubric.md`, `plugins/swe-flow/skills/work-breakdown/SKILL.md`, the RentField fixture:
`AllocationService.cs`, `LogisticsService.cs`, `ExternalServiceClients.cs`,
`0001_audit_log.sql`, `teams.yaml`, `rfc-transfer-approval.md`).

> **⚠ B4 finding (§3) is STALE / NON-AUTHORITATIVE for calibration.** Finding 3 characterizes the
> rubric's "PARTIAL band" as *"defined for silence"* (*"stays silent on parallelism"*). That
> reflects an **earlier `rubric.md`**; the current B4 makes **silence a Typical FAIL** ("No
> concurrency statement at all"). The finding's *substantive* conclusion — that the runner's
> explicit "Wave 2 … parallel" over two slices that both edit `AllocationService.cs` matches the
> **FAIL** pattern, not PARTIAL — is in fact *consistent* with the current rubric (a parallel claim
> contradicted by shared files is now a Typical FAIL). Only the "PARTIAL = silence" framing is
> stale; do not use it to calibrate the current B4 standard or as the B4 "before" baseline.

## Scope sampled

All 14 checks were re-checked (every FAIL — there are none; the only PARTIAL, B4; and all 13
PASSes), because the grade under review claims a near-perfect 31/32 and a full audit costs little
more than the requested 8-check sample.

## Method

1. Grepped every quoted string in `GRADE.md`'s evidence column against the actual runner files
   to confirm each quote is verbatim (allowing for markdown bold/italics and my own transcription
   noise from copy-paste).
2. Opened every fixture file `GRADE.md`/`WORK-BREAKDOWN.md` cites (`AllocationService.cs` lines
   17–18, 46–51, 67–70, 82; `LogisticsService.cs` lines 5–15; `ExternalServiceClients.cs` line
   32; `teams.yaml`; the RFC) and confirmed the code facts (G-FILE, G-ORPHAN, G-NOID, G-LOG,
   G-MIG, G-SG) match what the runner and the grader claim about them.
3. Re-derived each verdict from the rubric's own PASS/PARTIAL/FAIL language rather than trusting
   `GRADE.md`'s prose.

## Findings

### 1. No fabricated quotes
Every string quoted in `GRADE.md`'s evidence column exists verbatim in the runner's output.
One sourcing imprecision, not a fabrication: A1's quote *"Cut **vertically**: each slice is
schema → domain logic → event → read/side-effect → test."* is pulled from `RUN-NOTES.md` (line
43), not `WORK-BREAKDOWN.md` — `GRADE.md` doesn't flag which file it came from. This is still
"runner output" per the task's scope (RUN-NOTES.md is a deliverable in the same run dir) and the
underlying claim also holds in `WORK-BREAKDOWN.md` itself (line 53: *"Five vertical slices. Each
is a thin top-to-bottom cut (schema → domain logic → event → read/side-effect → test)"*), so this
does not change the verdict. Flagging only for hygiene.

### 2. All 13 PASS verdicts hold up on substance, not vague gestures
Spot-checked A1, A2, A3, A5, A6, B1, B3, B5, B6, B7, B8 in full and A4/B2 against the fixture:
- A3 (same-file coupling): confirmed `AllocationService.cs` really does hold `Reservation`,
  `Commit`, and both event records in one file (lines 8–19, 34–73, 81–82), and both the
  reservation-status field and the event-id/emit-site change are genuinely folded into one slice
  (US-01, lines 82–89 of `WORK-BREAKDOWN.md`). PASS is correct.
- A4 (migration precedes two slices): both `Blocked by: US-01` lines for US-02 (line 137) and
  US-03 (line 165) are real, and the queue read view is inside the same US-01 slice as the
  migration. PASS is correct.
- A5/A6: emit-with-consumer folding and the SendGrid-subject folding are both literally present
  as quoted. PASS is correct.
- B5/B6/B7/B8: all directly verifiable against the document text (the `blockedBy` front-matter
  warning, the four numbered break triggers in §0, the single-upstream table, and the AC1–AC5
  coverage table). PASS is correct.

### 3. B4 (No false parallelizability claim) — PARTIAL is too generous; this is closer to the
   rubric's own "Typical FAIL" example (disagreement, moderate confidence)

⚠ **STALE framing — see the B4 banner at the top of this file.** The "PARTIAL = silence" reading
below is superseded; under the current rubric this case is a clean FAIL.

`GRADE.md` scores B4 PARTIAL (1/2), reasoning that the runner "discloses the overlap" between
US-02 and US-03 and so the claim is "caveated, not naked-false."

Re-reading `WORK-BREAKDOWN.md` itself:
- Line 234: **"Wave 2:** US-02 and US-03 (parallel; both only need US-01)."**
- Line 166: **"*Independent of US-02*"** stated directly under US-03's `Blocked by:` line.
- Both slices write to `Reservation.Status` inside `AllocationService.cs` (US-02 line 121 "flip
  `status → accepted`"; US-03 line 150 "flip `status → rejected`"), and both slices add a branch
  to the *same not-yet-existing* `Decide(...)` method the runner itself invents (US-02 line 117
  "introduce the approval-service `Decide(...)` path with its accept branch"; US-03 line 150
  "**Reject branch** on the `Decide(...)` path").
- The runner's own hedge (line 166–167) is: **"whichever decision slice lands first scaffolds the
  shared `Decide` skeleton, a merge detail, not a hard block."**

That is: the runner explicitly calls two slices that both write the same field on the same class
in the same file, and both add a branch to a shared method neither slice alone fully owns,
"parallel" and "Independent." The rubric's own **Typical FAIL** line for B4 is *"calling the two
`AllocationService.cs` edits file-disjoint or safe to run concurrently"* — which is exactly what
"Wave 2 … parallel" plus "Independent of US-02" does, hedge notwithstanding. The rubric's PARTIAL
band, by contrast, is defined for *silence* ("no explicit parallelism note … stays silent on
parallelism") or *generic* concurrency guidance — not for an explicit, on-the-record independence
claim that the runner itself immediately concedes creates a shared-skeleton merge issue. A
"disclosed but still asserted" false claim is not clearly a rubric-defined PARTIAL case; it reads
closer to the FAIL example than to the PARTIAL one.

Secondary evidence the coupling is real and under-modelled, not merely stylistic: US-05
("Decision authorization guard") states its guard covers **"both the accept and the reject
branch at one point"** (line 210) yet is only `Blocked by: US-02` (line 219), never US-03 — so if
US-03 is genuinely independent and could land after US-05 (both are only downstream of US-01/
US-02 respectively, and nothing orders US-03 before US-05), the runner's own graph allows a
sequencing where US-05 ships before the reject branch it claims to guard exists. This is not
separately penalized by any rubric check as written, but it corroborates that the "parallel wave"
framing understates the real coupling around the shared `Decide(...)` entry point.

This is a judgment call — a grader could reasonably keep PARTIAL on the theory that disclosure
earns half credit — so it is reported as a disagreement rather than a hard error, at moderate
confidence.

### 4. Minor, non-scoring observation
B3 (sizing + rationale): 4 of 5 slices carry an explicit "**Why [size]**" rationale; US-03 only
carries a "**Why separate from US-02**" rationale (justifying the split, not the M size
specifically). Content-wise the M size is still defensible from the bullet list, so this does not
change the PASS verdict, but a stricter reading could have marked B3 PARTIAL for the one
under-justified size. Not raised as a disagreement given the low stakes (0.5 pt) and the
substantial rationale present for the other four slices.

## Conclusion

- No fabricated evidence found; every quote in `GRADE.md` traces to real runner output.
- No FAIL-should-have-PASSed or PASS-built-on-nothing cases found among the 13 PASS verdicts —
  each cites specific, verifiable slice text and the underlying code facts check out.
- One disagreement: **B4** — `GRADE.md`'s PARTIAL (1/2) is defensible but generous; the
  runner's explicit "parallel" / "Independent of US-02" claim over two slices that share a file
  and an unbuilt shared method matches the rubric's stated FAIL pattern more closely than its
  PARTIAL pattern. If resolved toward FAIL, B4 → 0/2, Group B → 14/16, **total → 30/32** instead
  of 31/32.
