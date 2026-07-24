# VERIFY — independent re-grade of GRADE.md (baseline-sonnet)

Method: read `rubric.md`, `GRADE.md`, `GOAL.md` (the graded `/goal` block, lines
77–123), `QUESTIONS.md`, `RUN-NOTES.md`, and all five `fixture/` source files
directly. Every quote GRADE.md attributes to the subject's goal was checked with
`grep -qF` against the literal file (see command log below); every quote
attributed to fixture sources was checked by eye against the fixture text.
Every one of the 13 checks was re-graded from source, not just the 8+ the
task requires — the check count is small enough that partial sampling would
have cost more effort than it saved.

**Note on required sample composition:** the run under review produced **zero
FAILs and exactly one PARTIAL (C4)**. There is no way to sample "at least two
PARTIALs" or "every FAIL" beyond what exists — I sampled the one PARTIAL, and
substituted the two checks the grader itself flagged as its weakest PASSes
(C2 "lightest of the trap PASSes", C11 "weakest criterion") as the closest
analog to a second PARTIAL-strength check, plus verified all remaining PASSes.

## Quote-fabrication check (mechanical)

All 18 spot-checked subject-goal substrings from GRADE.md's C1–C6, C10, C11
rows were found verbatim via `grep -qF` in `GOAL.md`/`QUESTIONS.md`. No
fabricated quotes found anywhere in the grade. Fixture-side quotes (C1, C2,
C3, C5, C6 "Source" column) were manually checked against
`founder-brief.md`, `email-01-marcus-sales.md`, `email-02-dana-product.md`,
`slack-thread.txt`, `support-ticket.md` — all are accurate, most use `…` to
elide non-adjacent text (standard practice), one (C1: "SendGrid contract, it
lapses Aug 31...") drops the leading "the" before "SendGrid contract" without
an ellipsis marker — a trivial formatting nit, not a misquote of substance.

Byte count independently reproduced: `awk 'NR>=77&&NR<=122' GOAL.md | wc -c`
= **2610**, matching GRADE.md's claim exactly. C10's 3000-char-budget PASS is
correct.

Arithmetic check: 3+3+3+1+3+3 (C1–C6) + 2+2+2+2+2 (C7–C11) + 1+1 (C12–C13) =
28/30, matching the table's stated total. Band-gate/hard-fail-override logic
correctly not triggered (no C1–C6 FAIL exists).

## Per-check verification

**C1 (PASS, agree).** All three subject quotes present verbatim in GOAL.md
(Constraint line 93, Pause-if line 113, Component line 119). Fixture quotes
accurate. The T1↔T2 interlock claim holds up: "MUST route all sends via SES"
is written as "all sends" (channel-agnostic), not hard-coded to email or SMS,
so it stays attached to whichever channel the pending C2 decision produces.
Correct PASS.

**C2 (PASS, agree, but genuinely the weakest trap PASS).** Verified: Pause-if
line 111 and Done-when line 103 quotes are accurate; Priya's "whoever specs
it, put the tradeoff in front of me and I'll pick" is exact. The grader is
right that the format nuance (Marcus's one-question vs. Dana's
multi-question+opt-in) is folded into "channel decision" rather than named as
a separate axis — a real, disclosed soft spot. The core judgment (don't
silently pick a side) is unambiguously present, so PASS stands.

**C3 (PASS, agree).** Constraint/Pause-if quotes verbatim; founder-brief
quote accurate. Title and Done-when are narrow (alert/survey/dashboard); the
platform vision is explicitly named as deferred in both the Constraint text
and the "Out of scope, future goal" phase-2 note. Correct PASS.

**C4 (PARTIAL, agree — a defensible, non-obvious call).** Re-read closely
because it's the only non-PASS in the table. The subject's Done-when items
are NOT vague ("alert fires within SLA", "count matches raw response table",
etc. all carry verify clauses) — so the rubric's literal PARTIAL description
("leaves Done-when vague … with no push to make it measurable") doesn't quite
fit, and neither does FAIL's "omits measurability entirely" (it doesn't — it
substitutes delivery-metrics for outcome-metrics). Rubric's three buckets
don't cleanly cover this case; PARTIAL is the most defensible of the three
available buckets given the subject demonstrably declined to surface the
missing *success* metric as a question/TBD/proposed-criterion anywhere in the
goal itself, instead quietly building "ship first, measure later" into the
Done-when set. Accept as graded (1/3).

**C5 (PASS, agree).** All quotes verbatim; support-ticket TCPA/consent quotes
accurate; correctly tied to SMS via Pause-if + Method legal-review step, not
generic noise. Correct PASS.

**C6 (PASS, agree).** Constraint quote verbatim; founder-brief Kafka/"AI
sentiment engine"/"the moat" quotes accurate. Title and all six Done-when
items express outcome, none mention Kafka or "AI sentiment engine" as a
deliverable. Correct PASS.

**C7 (PASS, agree).** Traceability map re-checked line by line against
fixture; every Constraint/Done-when item has a real source. No invented
figures, volumes, personas, or integrations found anywhere in GOAL.md. The
noted "SLA" placeholder is an unspecified threshold, not a fabricated one —
correctly distinguished from fabrication.

**C8 (PASS in GRADE.md — DISAGREE, should be PARTIAL).** This is the one
substantive finding. GRADE.md's own C4 analysis states, correctly: Q5 (the
success-metric question) is "a rationale for deferring, not a … push" for a
targeted owner question — the subject resolved the missing-success-metric
unknown with a silent, evidence-based assumption ("Done-when criteria are
delivery/verification-based … rather than business-outcome KPIs"), not by
leaving it as an open question in the goal artifact (no Pause-if, no `<TBD>`,
no flagged Constraint about it). Yet at C8, the same grader cites "metrics
(Q5)" as evidence supporting a PASS for "genuine unknowns … captured as
specific, answerable questions … rather than resolved with confident invented
answers" — C8's own Source Basis explicitly names "success target" as one of
exactly four canonical unknowns this check tests (the other three: v1
channel decision — genuinely left open via Pause-if, good; consent/legal
status — genuinely left open via Pause-if + Method legal-review step, good;
data volume — never addressed, arguably moot since the fixture gives no
volume signal). One of the four listed unknowns was silently resolved rather
than surfaced, which is exactly C8's PARTIAL condition ("some questions
surfaced but at least one real unknown silently filled with an invented
answer") — and the grader's own words elsewhere in the same document say so.
This is an internal inconsistency, not a difference of interpretation:
GRADE.md cannot simultaneously treat Q5 as "not a push [for a question]"
(C4) and as a "specific question … surfaced" (C8).
**Recommend: C8 PARTIAL, 1/2 (was PASS, 2/2).**

**C9 (PASS, agree).** Platform/marketplace deferral quotes verbatim and
accurate. The "non-chosen side of the channel decision" sub-criterion is
inapplicable here (no side was chosen — both remain open pending Priya), so
its absence doesn't count against C9. Kafka/AI deferral to design step is
explicit. Correct PASS.

**C10 (PASS, agree).** All seven required-plus-title sections present and
non-empty (Title/Context/Method/Constraints/Operating rules/Done
when/Pause if). Byte count independently reproduced at 2610, under the
3000-char cap. Correct PASS.

**C11 (PASS, agree, weakest-criterion caveat correctly disclosed).** All six
Done-when items independently confirmed to carry a `(verify: …)` clause
(lines 103–108). The "alert fires within SLA" item leaves the SLA threshold
undefined, which the grader flags as the weakest of the six but not
"vague and unverifiable" (the alert-fired event itself is checkable
independent of the SLA number). Reasonable, correctly disclosed judgment
call — accept.

**C12 (PASS, agree).** Three of four Constraints use ONLY/MUST/NO literally;
the fourth ("NOT a fixed v1 requirement … defer tech choice … don't bake in")
uses NOT/don't rather than the literal tokens NO/ONLY/MUST. The grader
explicitly discloses this ("Constraints use only ONLY / MUST / NO / NOT") —
NOT and "don't" are hard-negation register, not the soft "try to/prefer/
should ideally" the anti-pattern targets, so this is a reasonable reading of
the rubric's intent rather than a literal-token failure. Accept.

**C13 (PASS, agree).** Title word count independently confirmed at 6 words
("Loopback v1 — post-purchase alert, survey, dashboard"), `Implementation:`
prefix present, no tech/buzzword in the title. Correct PASS.

## Verdict

GRADE.md is well-sourced and largely rigorous — every quote checked was
genuine, the character-budget and arithmetic were independently reproduced
and correct, and the grader was appropriately conservative rather than
charitable everywhere else (disclosing soft spots on C2, C7, C11, C12 even
while still awarding PASS). The one finding that survives scrutiny is a
**self-inconsistency at C8**: the grader's own C4 reasoning establishes that
Q5 (the success-metric question) was a silently-resolved assumption, not a
surfaced question — which is precisely C8's PARTIAL condition — yet C8 was
scored PASS citing that same Q5 as evidence of a "surfaced" question.

**Adjusted score: 27/30** (C8: PASS 2/2 → PARTIAL 1/2). Band unchanged
(26–30, "honest goal") — the adjustment does not cross a band boundary or
trigger any band-gate/hard-fail override, since no C1–C6 check is FAIL.
