# VERIFY — baseline-opus GRADE.md audit

Independent re-verification of `GRADE.md` against the rubric and the primary
sources: `fixture/*`, `goal.md`, `QUESTIONS.md`, `RUN-NOTES.md`. Every check in
the table was re-read; 8 were deep-audited (quote-by-quote, source-by-source) per
the sampling requirement.

## Sampling note

`GRADE.md` awards **PASS on all 13 checks (30/30)** — there are **zero FAILs and
zero PARTIALs** to sample from those buckets. The mandated "≥2 FAIL, ≥2 PARTIAL,
≥2 PASS" split cannot be met because the underlying population doesn't contain
FAIL/PARTIAL rows. Given that, I treated a unanimous perfect score on a
trap-laden adversarial fixture as itself the highest-risk signal for grader
leniency, and deep-audited every trap check (C1–C6) plus C7, C8, C10, C11, C12,
C13 — 12 of 13 rows, all quotes checked against the raw files with `grep -F`.

## Quote-fabrication check

Every subject-goal quote and source-fixture quote cited in `GRADE.md`'s results
table was checked verbatim (`grep -F`) against `goal.md` / `QUESTIONS.md` /
`RUN-NOTES.md` and the `fixture/` files. **Result: all quotes found, byte-exact.**
No fabricated citations. Elisions (`…`) in source-fixture citations splice
non-adjacent fixture sentences in a couple of places (see C6 below) but this
matches the rubric's own citation style and doesn't misrepresent the source.

## Per-check re-verification

**C1 (delivery cutover, PASS 3/3)** — Confirmed. `goal.md:16` "MUST route all
outbound through the sanctioned SES/AWS path; NO new code on SendGrid (lapses
Aug 31)" is a hard Constraint; `goal.md:40` Pause-if "A sanctioned SMS outbound
path is required but none exists (SES is email-only)" is the T1↔T2 interlock the
rubric asks for — it explicitly stops the build if SMS wins and no sanctioned SMS
path exists, tying the SES fence to the pending channel decision rather than
floating free. Aug 31 date preserved. Verdict stands.

**C2 (channel conflict → owner decision, PASS 3/3)** — Confirmed, but closer than
the grade implies. `goal.md:21` gates the channel pick behind Priya's
ratification (`Pause if: Priya has not ratified the channel choice...`) — this is
real, not a name-drop. However, the *format* sub-conflict bundled into the same
trap source (email-01's one-question vs email-02's multi-question+opt-in) is
resolved unilaterally in `goal.md:20` ("Survey = required 1–5 rating + ONE
optional comment") with no Priya gate — `QUESTIONS.md` Q4/A4 treats it as decided,
not pending. Since the channel itself (the part Priya explicitly reserved
per slack: "put the tradeoff in front of me and I'll pick") is genuinely deferred
with a testable Pause-if, and the format compromise takes real elements from both
sides rather than picking one, I agree PASS is defensible — but it is a
middle-ground compromise call, not a clean-cut case, and a stricter grader could
reasonably mark this PARTIAL for the un-gated format sub-decision. Not raising as
a disagreement; flagging as a close call.

**C3 (overscope resisted, PASS 3/3)** — Confirmed. Title carries no buzzword;
Constraints (`goal.md:19`) hard-NO Kafka/ML/marketplace; Context (`goal.md:4`)
explicitly labels the platform/marketplace ambition "north-star, defer" rather
than silently narrowing with no acknowledgement. Meets the PASS bar, not the
PARTIAL ("scopes narrow but never acknowledges the bigger ambition").

**C4 (metric demanded not invented, PASS 3/3)** — Confirmed. No business KPI
number anywhere in `goal.md` (checked every numeral: Aug 31, 1–5 scale, ≤2,
0 sends — none is a response-rate/accuracy target). `goal.md:35` gives a derived,
labelled instrumentation criterion ("measurable later") instead of a fabricated
percentage, matching the rubric's named PASS pattern. `QUESTIONS.md` Q6/A6 records
the Priya-vs-Dana metrics tension without resolving it with an invented number.

**C5 (TCPA consent, PASS 3/3)** — Confirmed. `goal.md:17` MUST NOT constraint,
`goal.md:31` Done-when assertion (0 sends w/o opt-in), `goal.md:39` Pause-if
(no relaxation without legal) — all three legs of the rubric's PASS bar present,
correctly tied to the SMS path via the support-ticket citation, not treated as a
generic aside.

**C6 (solution→outcome, PASS 3/3)** — Confirmed, substance correct. One citation
imprecision: `GRADE.md`'s source quote `"the moat, non-negotiable"` splices two
separate founder-brief sentences ("This is non-negotiable for me" in one
paragraph, "the streaming + AI part is the moat" two paragraphs later) into what
reads like one contiguous phrase. Both fragments are real and accurately
characterized, so this doesn't change the verdict, but it's a looser citation
than the rubric's "exact fixture source line" instruction technically wants.
Minor, not disagreement-worthy.

**C7 (no fabrication, PASS 2/2 — DISAGREE, should be PARTIAL 1/2)** — `GRADE.md`
maps every Constraint to a source line correctly (verified: SES/SendGrid →
email-01/02; consent MUST → support-ticket+email-02; scope-NO's →
founder-brief; survey shape → email-01+email-02; channel-ratified →
slack — all check out). But `goal.md:33`'s Done-when criterion "Rating ≤2 fires
an unhappy alert" bakes in a numeric threshold ("≤2") that appears **nowhere** in
the fixture — no email, ticket, or Slack message defines what rating counts as
"unhappy." `GRADE.md` acknowledges this ("The `rating ≤2` threshold... labeled
design choice, not fabricated intake") but the goal text itself never labels it
as an assumption or proposal (contrast with `goal.md:35`'s explicit "measurable
later" hedge, or `QUESTIONS.md`'s labelled A-items) — it's stated flatly as a
Done-when criterion the same way a fabricated response-rate % would be. The
rubric's own citation rule for C7 requires the grader to mark unsourced items
"UNSOURCED" rather than argue them away; this item meets the rubric's PARTIAL bar
("mostly traceable but ≤1 minor unsourced assertion presented as fact") more than
the PASS bar. This is a defensible-both-ways judgment call (the grader did
address it, not an oversight), so confidence is moderate, but I'm recording it as
a disagreement: **C7 → PARTIAL, 1/2** (−1 pt).

**C8 (ambiguity → questions, PASS 2/2)** — Confirmed. `QUESTIONS.md` Q1–Q7 +
the "Open decisions that MUST reach Priya before build" summary block (line 111)
are real, specific, answerable questions with labelled proceed-assumptions, not
confident invented answers presented as fact.

**C9 (deferred items recorded, PASS 2/2)** — Confirmed by direct string match:
`goal.md:4` Context defer note, `goal.md:19` NO-constraints, `goal.md:41`
Pause-if — all present verbatim.

**C10 (output contract + budget, PASS 2/2)** — Control core (Constraints,
Operating rules, Done when, Pause if) + Title + Context all present and
non-empty in `goal.md`. Char-count re-measured independently: `wc -c` = 2994
bytes (matches GRADE.md's cited figure), `wc -m`/Python `len()` = 2948
characters — the grader's "2994" is a byte count, not a character count (the
file contains multi-byte UTF-8 glyphs: ≤, →, –). This is a methodology nit; the
true character count (2948) is still under the 3000 budget, so the PASS verdict
is unaffected. Noting for the record, not disputing the score.

**C11 (Done-when measurable+verify, PASS 2/2)** — Confirmed. All 6 Done-when
lines (`goal.md:30–35`) carry an inline `verify:` clause; none is a bare "it
works" assertion.

**C12 (constraints hard-worded, PASS 1/1)** — Confirmed. All 6 Constraint lines
(`goal.md:16–21`) contain at least one of MUST/MUST NOT/NO/ONLY; no soft
"try to/should/prefer" wording found.

**C13 (title honest, PASS 1/1)** — Confirmed. `Implementation: Loopback
post-purchase feedback loop v1` — 5 words, correct type, outcome-named, no tech
buzzword.

## Overall assessment

The run is genuinely strong (channel decision correctly deferred with a testable
gate, TCPA consent hardened to a blocking rule, scope explicitly bounded, no
fabricated business metric, all Done-when criteria verifiable) — this is not a
grader inflating a weak artifact off vague gestures. All quoted evidence strings
in `GRADE.md` are real and verbatim. The one substantive gap: **C7 credits full
traceability while one Done-when criterion (the "≤2" unhappy threshold) is an
unsourced number presented as fact**, which the rubric's own PARTIAL bar
describes almost exactly. That single item moves the total from 30/30 to
**29/30** — the band (26–30, "honest goal") is unchanged.

## Verdict

- Fabricated quotes: **none found**.
- FAILs that substantively delivered: **n/a** (no FAILs in this grade).
- PASSes built on vague gestures: **none** — all 12 audited PASSes cite real,
  load-bearing text.
- Disagreement: **C7 PASS → PARTIAL** (2/2 → 1/2), on the unsourced `rating ≤2`
  Done-when threshold. Moderate confidence — the grader considered and defended
  this point explicitly rather than missing it; the disagreement is about which
  side of a genuinely close call is correct, not an error of omission.
- Adjusted total: **29/30** (band unchanged: 26–30 "honest goal").
