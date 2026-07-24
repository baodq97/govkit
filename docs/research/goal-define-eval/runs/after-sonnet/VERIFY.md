# VERIFY — audit of GRADE.md (runs/after-sonnet)

Method: re-read rubric.md, GOAL.md (the admissible `/goal` fence, lines 10–51), and all
five fixture source files directly from disk — independent of GRADE.md's own claims.
Every quote GRADE.md attributes to the subject's goal was checked with `grep -n` against
GOAL.md; every source claim was checked against the fixture text. The char-count claim
was independently recomputed with `wc -m`/`wc -c` on the exact fenced block (lines 10–51,
fence markers on 9/52 excluded).

Only 13 checks exist in this run (C1–C13); the grade contains **zero FAILs and exactly one
PARTIAL (C2)** — so "every FAIL" and "≥2 PARTIALs" cannot both be satisfied from this
grade's own distribution. Given that, all 13 checks were sampled (12 PASS + the 1 PARTIAL),
exceeding the ≥8 floor.

## Quote-fabrication check

Every subject-goal quote cited in the results table and per-check evidence was found
verbatim in GOAL.md at the cited (or a locatable) line:

| Check | Quote | Found in GOAL.md |
|-------|-------|-------------------|
| C1 | "MUST route all outbound sends through SES only (SendGrid lapses Aug 31 — email-01, email-02)" | line 25, exact |
| C2 | "NO channel-specific build … until Priya ratifies channel choice"; "SMS one-tap OR Email multi-Q, per ratified decision" | lines 27, 50, exact |
| C3 | "NO Kafka streaming backbone, AI sentiment engine, marketplace in v1 — PROPOSAL …" | line 28, exact |
| C4 | "PROPOSAL, rate/volume target TBD, owner to set; \"measure later\" not accepted" | line 38, exact |
| C5 | "Legal sign-off on SMS consent/TCPA not obtained before any SMS send beyond current pilot" | line 41, exact |
| C6 | Title + same C3 NO-line | lines 10, 28, exact |
| C7 | "100% of sends have a prior logged consent event [assumption: …]" | line 36, exact |
| C9 | "Channel decision recorded — Priya-ratified, else PROPOSAL default = Email …" | line 35, exact |
| C10 | char-count claim | independently recomputed: 2840 (`wc -m`) / 2870 (`wc -c`) — **matches exactly** |
| C11 | "grep -ri sendgrid empty"; "consent_log rows == sent count, 0 orphans" | lines 37, 36, exact |
| C12 | all four Constraint lines lead with MUST/NO | confirmed, no soft-hedge tokens (`try to/prefer/should/ideally/consider/aim to/where possible`) found in Constraints block |
| C13 | Title, 6-word count | confirmed: "Ship compliant v1 post-purchase feedback loop" = 6 words |

**No fabricated quotes found.** Every string GRADE.md puts in quotation marks exists
verbatim in the admissible `/goal` block; source-line citations (email-01/02, founder-brief,
slack-thread, support-ticket #4471) all check out against the fixture files.

## Verdict-by-verdict re-verification

- **C1 (PASS, 3/3).** Fixture confirms both the Aug 31 date and "only sanctioned outbound
  path is the SES setup" (email-01) plus Dana's p.s. confirmation (email-02). The goal's
  constraint is written as a blanket "all outbound sends," which does satisfy the rubric's
  T1↔T2 interlock language ("governs whichever channel wins") on its face. Verdict upheld.
  *Note (not scored):* a stricter reader might flag that AWS SES is an email-sending
  service in reality and a literal "SMS through SES" reading would be technically
  incoherent — which, if true, would mean the constraint quietly forecloses the SMS side
  of C2 rather than remaining channel-neutral. Neither the rubric nor the fixture text
  makes this technical distinction, so it's outside the admissible-evidence scope for this
  check; flagging as a design observation only, not a scoring disagreement.
- **C2 (PARTIAL, 1/3).** Re-checked against both PASS and PARTIAL text. The goal surfaces
  the channel axis explicitly (Pause-if + gated Done-when) but bundles the format axis
  ("SMS one-tap OR Email multi-Q") into the same undifferentiated channel-ratification line
  without flagging question-count as its own contested point — this is verbatim the
  rubric's named PARTIAL pattern. 3 × 0.5 = 1.5 → floor 1 is arithmetically correct. Verdict
  upheld; not inflated, not under-scored.
- **C3–C6, C7–C13 (all PASS).** Each quote traces to the cited fixture source, each
  reflects a genuine effect on the goal text (hard Constraint, gated Done-when, or Pause-if
  — not a passing name-drop), and none of the PASSes rest on a vague or unsupported
  gesture. Category subtotals (Trap 16/18, Discipline 12/12) and grand total (28/30) were
  independently re-added and match.
- **Band placement.** 28/30 sits in 26–30; no trap check FAILed, so neither the single-trap
  floor (cap 17) nor the hard-fail overrides (cap 12) apply. Correct.

## Minor observation (does not change any verdict)

- **C8's "four unknowns" is a soft over-count.** GRADE.md lists channel / success / legal /
  volume as four separately-surfaced unknowns, but "success" and "volume" both cite the
  identical goal phrase "rate/volume target TBD, owner to set" (GOAL.md line 38) — there is
  no separate "data volume" unknown surfaced anywhere else in the admissible text. This is
  double-counting one placeholder as two rubric categories. It doesn't affect the PASS
  verdict (3 genuinely distinct unknowns — channel, success/volume, legal — already clears
  the bar), but the table's phrasing overstates coverage by one item.

## Conclusion

No fabricated quotes, no FAIL mis-scored as delivered (there are no FAILs in this grade),
no PASS built on a vague gesture. The one PARTIAL (C2) is well-reasoned and matches the
rubric's own named pattern almost word-for-word. Arithmetic (subtotals, total, band, gate
checks) all check out. One minor overstatement in C8's evidence narrative (see above) is
noted but does not change the score.

**Sampled:** 13/13 checks (all checks in this grade; only 1 PARTIAL and 0 FAILs exist, so
that ceiling was hit rather than the ≥8 floor).
**Disagreements:** none that change a verdict.
**Adjusted total:** unchanged, 28/30.
