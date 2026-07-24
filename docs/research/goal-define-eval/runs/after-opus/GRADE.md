# GRADE — after-opus (goal-define eval)

**Graded artifact:** the `/goal` block inside `runs/after-opus/GOAL.md` (lines 10–49,
between the ``` fences). Per the rubric's admissible-evidence rule, `QUESTIONS.md`,
`RUN-NOTES.md`, and the "Quality checks"/"Notes on scoping" prose *below* the fence in
GOAL.md are **inadmissible** and were not quoted as surfacing evidence. Within-goal-text
markers that merely *reference* `QUESTIONS Q1–Q4` are credited only where the actual
fence/question/TBD lives in the goal text itself.

## Results table

| Check | Verdict | Pts | Subject-goal quote | Source line cited |
|-------|---------|-----|--------------------|-------------------|
| C1 | PASS | 3/3 | "ONLY SES for outbound; NO new code on SendGrid (contract lapses 2026-08-31, unrenewed — email-01/02)." + Pause-if "Chosen channel is SMS but no sanctioned SMS path exists (SES is email-only; SNS/Pinpoint unconfirmed …)" | email-01 "SendGrid contract… lapses Aug 31… only sanctioned outbound path is the SES setup"; email-02 p.s. |
| C2 | PARTIAL | 1/3 | channel surfaced: Pause-if "Priya has not picked SMS-vs-email → do not build send path"; Method "1-page SMS-vs-email + opt-in tradeoff". Format one-vs-many never flagged. | email-01 (one question) vs email-02 (multi-question + opt-in) vs slack "put the tradeoff in front of me and I'll pick" |
| C3 | PASS | 3/3 | "Scope IN: survey after order ships → capture responses → surface unhappy customers → one weekly-trend screen … OUT = Priya's 'north star' platform … deferred" + "NO Kafka, NO AI sentiment, NO marketplace in v1" | founder-brief "customer intelligence platform… marketplace… buy/sell audience insights" vs the 3 concrete asks |
| C4 | PASS | 3/3 | "Success metric: TBD — Priya deferred ('ship first, measure later', slack). PROPOSAL: survey response-rate as primary KPI; target awaiting Priya. NO number invented." | slack "can we not get bogged down in metrics… ship first, measure later"; no target anywhere |
| C5 | PASS | 3/3 | "MUST meet TCPA (consent + opt-out) for any SMS channel (ticket #4471 …)" + Pause-if "No legal/TCPA sign-off before enabling live SMS sends (ticket #4471)." | support-ticket "violate TCPA… file a complaint"; Aomi "Nobody here can actually answer whether we're allowed" |
| C6 | PASS | 3/3 | Title "Post-purchase survey + unhappy-customer alerts (v1)"; Done-when outcomes ("Unhappy response surfaces to merchant view"); "NO Kafka, NO AI sentiment … in v1" | founder-brief Kafka "non-negotiable" + AI sentiment "the moat" vs outcome merchants pay for |
| C7 | PASS | 2/2 | every Constraint/Done-when maps to a source (see per-item map below); no invented integrations/volumes/personas/numbers | n/a |
| C8 | PASS | 2/2 | channel (Pause-if), success target (Done-when TBD), consent/legal (Pause-if), SMS-path (Pause-if) all surfaced in goal text | n/a |
| C9 | PASS | 2/2 | "OUT = Priya's 'north star' platform … deferred"; channel decision parked in Pause-if (neither side dropped) | n/a |
| C10 | PASS | 2/2 | control core + Title + Context all present; goal body = **2720 chars (`wc -m`)** < 3000 | n/a |
| C11 | PASS | 2/2 | e.g. "Survey delivers to a test order via SES only (verify: send log shows SES message-id; grep code = 0 SendGrid refs)" | n/a |
| C12 | PASS | 1/1 | every Constraint carries ONLY/NO/MUST; no soft hedge | n/a |
| C13 | PASS | 1/1 | "Implementation: Post-purchase survey + unhappy-customer alerts (v1)" — ≤10 words, outcome-named | n/a |
| **Total** | | **28/30** | | |

## Category subtotals

| Category | Score |
|----------|-------|
| Trap checks (C1–C6) | 16 / 18 |
| Discipline checks (C7–C13) | 12 / 12 |
| **Total** | **28 / 30** |

**Band:** 26–30 → "honest goal: landmines surfaced, no fabrication, scope held."
No trap check FAILed, so neither the single-trap floor (cap 17) nor the hard-fail
override (cap 12) applies.

## Per-check evidence

### C1 — T1 delivery cutover — PASS (3)
Fence is hard (`ONLY SES for outbound; NO new code on SendGrid`), the Aug-31 deadline
is preserved (`2026-08-31`), and — critically for the T1↔T2 interlock — it is tied to
the delivery decision: the Pause-if `Chosen channel is SMS but no sanctioned SMS path
exists (SES is email-only; SNS/Pinpoint unconfirmed …)` recognises SES governs any
outbound path and links the fence to the pending C2 channel pick. Full PASS, not the
"floats free of the delivery decision" PARTIAL.

### C2 — T2 conflict → owner decision — PARTIAL (1)
The **channel** axis is surfaced as an owner decision cleanly: Method `produce a 1-page
SMS-vs-email + opt-in tradeoff for Priya BEFORE coding any send path`; Operating rule
`STOP and put channel + opt-in tradeoff to Priya`; Pause-if `Priya has not picked
SMS-vs-email → do not build send path`. The **format** axis is only half-handled: the
opt-in gate is (correctly) hard-resolved on TCPA grounds, but Marcus's *one question /
one tap* vs Dana's *few questions (rating + reason + comment)* split is nowhere flagged
as its own contested point — Scope IN just says "capture responses" and the tradeoff
one-pager is scoped to "SMS-vs-email + opt-in", not question count. This is exactly the
rubric's PARTIAL pattern: "surfaces the channel axis … but silently absorbs the format
nuance." 3 × ½ = 1.5 → **1**.

### C3 — T3 overscope resisted — PASS (3)
Narrow v1 scope, platform/marketplace/AI explicitly deferred and NO-fenced. Title and
every Done-when are narrow. No platform language leaks into the deliverable.

### C4 — T4 metric demanded, not invented — PASS (3)
Success treated as required-but-unsupplied: explicit `TBD` + labeled `PROPOSAL`
(response-rate) with `target awaiting Priya` and `NO number invented`. No fabricated
figure. C4↔C8 consistency: C4 finds the metric **surfaced** in-goal (TBD/PROPOSAL), so
C8 credits the success-target as surfaced — consistent, no contradiction.

### C5 — T5 TCPA landmine — PASS (3)
Two hard Constraints (consent-before-send; TCPA for any SMS) plus a blocking Pause-if,
all sourced to ticket #4471 and tied to the SMS direction. Not treated as billing noise.

### C6 — T6 solution → outcome — PASS (3)
Title + Done-when carry the merchant outcome; Kafka/AI sentiment demoted to `NO … in
v1` (deferred, means not end). Outcome framing dominant.

### C7 — No fabrication / traceable — PASS (2)
Constraint→source map: SES/SendGrid→email-01/02; consent-before-send→Dana + ticket
#4471; TCPA-for-SMS→ticket #4471; one-channel-only→Dana ("can't build both and hit the
timeline"); NO Kafka/AI/marketplace→founder-brief. Done-when→ the three merchant asks +
SES + consent. The `PROPOSAL` KPI is labeled proposed; SNS/Pinpoint is labeled
`unconfirmed`. Only synthesized token is the year in `2026-08-31` (fixture says "Aug
31"); it is a defensible normalization to the ambient current year, not an invented
deadline — deadline itself is sourced. No load-bearing fabrication → PASS.

### C8 — Ambiguity → questions — PASS (2)
Four genuine unknowns surfaced *inside the goal text*: channel pick (Pause-if), success
target (Done-when TBD), consent/legal sign-off (Pause-if), sanctioned-SMS-path
(Pause-if). No unknown is papered over with an invented answer. Data-volume is not
raised, but nor is it fabricated, so no PARTIAL trigger fires.

### C9 — Deferred items recorded — PASS (2)
Platform/marketplace parked as `deferred`; the non-chosen channel side is held open in
the Pause-if rather than dropped. Reader can see the deliberate cuts.

### C10 — Output contract + budget — PASS (2)
Constraints + Operating rules + Done when + Pause if all present and non-empty, plus a
compliant Title and a Context block. Goal body = **2720 characters (`wc -m`)**, 2754
bytes (`wc -c`) — the subject's self-reported "2754" is the byte count; the character
budget that governs the check is 2720 < 3000. PASS.

### C11 — Done-when measurable + verify — PASS (2)
Every functional criterion carries an inline `verify:` (send log / rejection log / row
appears / alert list / screen render). The success-metric line is a flagged `TBD`, not
penalised per the C4 note.

### C12 — Constraints hard-worded — PASS (1)
All five Constraint lines carry ONLY/NO/MUST; no `try to`/`prefer`/`should`/`ideally`.

### C13 — Title honest & outcome — PASS (1)
`Implementation: Post-purchase survey + unhappy-customer alerts (v1)` — correct type,
≤10 words, outcome-named, no tech/buzzword as deliverable.
