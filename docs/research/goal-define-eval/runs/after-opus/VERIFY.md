# VERIFY — independent audit of GRADE.md (after-opus)

**Scope:** re-read `rubric.md`, `GOAL.md` (graded artifact, fence lines 10–49),
`QUESTIONS.md`, `RUN-NOTES.md`, and all five `fixture/` source files. Every
quoted "subject-goal quote" and "source line cited" in `GRADE.md` was checked
against the actual bytes of these files (not against the grader's summary).

**Coverage:** all 13 checks were re-verified (the grade under review contains
zero FAILs and only one PARTIAL, so "every FAIL" = 0 items and "at least two
PARTIALs" cannot be met from this grade — noted as a sampling-constraint, not
a defect). All 13 checks exceeds the ≥8-check floor.

## Method

1. Extracted the goal body independently with `sed -n '10,49p' GOAL.md` and
   ran both `wc -c` and `wc -m` to check the C10 character-budget claim
   without trusting the grader's number.
2. For each check, located the exact substring quoted in `GRADE.md`'s
   "Subject-goal quote" and "Source line cited" columns inside `GOAL.md` and
   the relevant `fixture/*` file respectively.
3. Re-applied the rubric's PASS/PARTIAL/FAIL language to the same evidence,
   independent of the grader's stated conclusion, before comparing.

## Findings by check

- **C1 (PASS, 3/3).** Quote verified verbatim in `GOAL.md` line 26
  (`ONLY SES for outbound; NO new code on SendGrid (contract lapses
  2026-08-31, unrenewed — email-01/02).`) and line 49 Pause-if. Fixture
  citation matches `email-01-marcus-sales.md` line 24–26 and `email-02`
  p.s. (line 30–32). The Pause-if genuinely ties the SES fence to whichever
  channel wins (T1↔T2 interlock) — PASS is correct, not the "floats free"
  PARTIAL.

- **C2 (PARTIAL, 1/3).** Quotes verified against `GOAL.md` lines 22, 34, 46.
  Independently confirmed: the goal never flags the one-question-tap vs.
  multi-question-survey split as its own contested point anywhere in
  Constraints/Method/Done-when/Pause-if — "capture responses" is the only
  language used. Channel axis is fully surfaced (Pause-if + Operating rule);
  format axis is not. This matches the rubric's own worked PARTIAL example
  almost verbatim. Point math: 3 × 0.5 = 1.5 → floor 1. Correct.

- **C3 (PASS, 3/3).** `Scope IN:` / `OUT = Priya's "north star" platform`
  quote matches `GOAL.md` line 12 verbatim (elisions only around the
  parenthetical citations). `NO Kafka, NO AI sentiment, NO marketplace in
  v1` matches line 30 exactly. Fixture citation ("customer intelligence
  platform… marketplace… buy/sell audience insights") matches
  `founder-brief.md` lines 14, 16, 17. Title and every Done-when line stay
  narrow — PASS holds.

- **C4 (PASS, 3/3).** Quote matches `GOAL.md` line 43 verbatim. No number is
  asserted as fact anywhere in Done-when; the only figure in the whole goal
  is the Aug-31 date (Constraint 1), which is sourced. Fixture citation
  ("can we not get bogged down in metrics… ship first, measure later")
  matches `slack-thread.txt` lines 26–28. Correct PASS, and the mandatory
  C4↔C8 consistency rule is honored (both checks agree the metric was
  surfaced, not silently resolved).

- **C5 (PASS, 3/3).** Quotes match `GOAL.md` lines 28 and 47 verbatim.
  Minor citation-fidelity nit: the "source line cited" column splices
  `support-ticket.md` line 28 — actual text is *"Nobody here can actually
  answer Rosa's question about whether we're allowed to"* — into *"Nobody
  here can actually answer whether we're allowed"* by silently dropping
  "Rosa's question about" without an ellipsis marker. This doesn't change
  the meaning or the verdict (the TCPA landmine is genuinely caught and
  tied to the SMS Constraint), but it is a small deviation from the
  rubric's "exact fixture line" citation discipline. Flagged below as a
  non-blocking finding.

- **C6 (PASS, 3/3).** Title and Done-when quotes verified against `GOAL.md`
  lines 10 and 41. `NO Kafka, NO AI sentiment … in v1` verified at line 30.
  Founder-brief citations ("non-negotiable", "the moat") verified at lines
  23 and 29. Tech is demoted to an excluded item, outcome carries the
  Title/Done-when — correct PASS.

- **C7 (PASS, 2/2).** Independently re-traced every Constraint and
  Done-when line to a fixture source (SES/SendGrid → email-01/02; opt-in
  consent → Dana + ticket #4471; TCPA-for-SMS → ticket #4471; one-channel
  → Dana's "can't build both and hit the timeline" at email-02 line 28;
  NO Kafka/AI/marketplace → founder-brief). No load-bearing unsourced
  figure or integration found. The `2026-08-31` year is a defensible
  normalization of the sourced "Aug 31" date, correctly caveated by the
  grader rather than silently treated as sourced. PASS holds.

- **C8 (PASS, 2/2).** All four cited unknowns (channel, success target,
  consent/legal, SMS-path) are genuinely present as Pause-if/TBD lines
  inside the goal fence, not only in `QUESTIONS.md`. Correctly excludes
  `QUESTIONS.md`/`RUN-NOTES.md` as inadmissible (confirmed by reading both
  files — none of their content is required to support this check).

- **C9 (PASS, 2/2).** Deferral language ("OUT = … deferred", Pause-if
  holding the channel decision open) verified in-text. Matches rubric's
  PASS bar — reader can see the deliberate cuts.

- **C10 (PASS, 2/2) — independently recomputed, not trusted.** Extracted
  the fence body (`sed -n '10,49p' GOAL.md`) and ran both `wc -c` and
  `wc -m` plus a Python `len()` cross-check: **2720 characters, 2754
  bytes** — matching the grader's numbers exactly and confirming the
  rubric's `wc -m`-not-`wc -c` counting rule was applied correctly. 2720 <
  3000: PASS confirmed independently.

- **C11 (PASS, 2/2).** Quote verified at `GOAL.md` line 38. Spot-checked
  the other four functional Done-when lines (39–42): each carries an
  inline `verify:` clause. The one unverifiable-looking line (line 43,
  success metric) is the flagged `TBD`/`PROPOSAL`, which the rubric's own
  C11 note explicitly exempts from penalty. PASS holds.

- **C12 (PASS, 1/1) — binary token test re-run independently.** All five
  Constraint lines (26–30) contain at least one of ONLY/NO/MUST; none
  contains a soft hedge (try to/prefer/should/ideally/consider/aim to/where
  possible). Confirmed by direct re-read, not by trusting the grader's
  claim. PASS holds.

- **C13 (PASS, 1/1).** Title `Implementation: Post-purchase survey +
  unhappy-customer alerts (v1)` — token count after the colon is 6
  (`Post-purchase`, `survey`, `+`, `unhappy-customer`, `alerts`, `(v1)`),
  within the ≤10-word cap, and names the outcome, not the tech. PASS holds.

## Cross-checks against admissibility rule

Read `QUESTIONS.md` and `RUN-NOTES.md` in full. Confirmed `GRADE.md` does
not lean on either file for any verdict — every quoted string used to
support a PASS/PARTIAL traces to the fenced `/goal` block in `GOAL.md`.
`RUN-NOTES.md` also confirms the subject ran blind (did not read the
rubric or other runs), consistent with the eval's anti-gaming constraint.

## Overall verdict on GRADE.md

**No fabricated quotes found.** Every "subject-goal quote" cell was located
verbatim (or as an honestly-elided substring) inside the graded `/goal`
fence. **No FAIL was under- or over-called** (there are no FAILs in this
grade to begin with). **No PASS is built on a vague gesture** — each PASS
cites a specific fence line and a specific fixture line, and independent
re-application of the rubric's PASS/PARTIAL/FAIL language to the same
evidence reaches the same verdict in all 13 cases. The one PARTIAL (C2) is
argued correctly and the point arithmetic (3 × ½ → floor 1) is right. The
character-budget claim underlying C10 was independently recomputed and
matches exactly. Total (28/30), category subtotals (16/18, 12/12), and band
assignment (26–30, no trap FAIL / no hard-fail override) all check out.

**One non-blocking citation-fidelity nit:** the C5 "source line cited" cell
splices a support-ticket sentence by dropping a middle clause ("Rosa's
question about") without an ellipsis marker. Meaning is preserved and the
verdict is unaffected; flagged only because the rubric's citation rule asks
for exact quoting.

**Disagreements: none that change a verdict or the total.**
