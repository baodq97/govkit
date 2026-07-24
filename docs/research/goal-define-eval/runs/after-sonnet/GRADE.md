# GRADE — runs/after-sonnet

Graded artifact: the `/goal` fenced block in `GOAL.md` (lines 10–51) **only**.
Companion files (`QUESTIONS.md`, `RUN-NOTES.md`) and the out-of-fence meta sections
(Quality-check pass, Anti-patterns, Decision rationale, lines 54–82) are NOT admissible
evidence and were not credited (rubric "Admissible evidence" rule).

Char count of `/goal` block: **2840** (`wc -m`) / 2870 bytes (`wc -c`) — under 3000-char budget.
(The header's self-reported "2870" is a byte count; the compliant Unicode count is 2840.)

## Results table

| Check | Verdict | Pts | Subject-goal quote | Source line cited |
|-------|---------|-----|--------------------|-------------------|
| C1 | PASS | 3/3 | "MUST route all outbound sends through SES only (SendGrid lapses Aug 31 — email-01, email-02)" | email-01 "only sanctioned outbound path is the SES setup"; email-02 p.s. |
| C2 | PARTIAL | 1/3 | channel surfaced: "NO channel-specific build … until Priya ratifies channel choice"; format absorbed: "channel send template — SMS one-tap OR Email multi-Q, per ratified decision" | email-01 "one text message, one question, one tap"; email-02 "a few questions" |
| C3 | PASS | 3/3 | "NO Kafka streaming backbone, AI sentiment engine, marketplace in v1 — PROPOSAL … owner ratification needed" | founder-brief "marketplace … buy/sell audience insights" |
| C4 | PASS | 3/3 | "PROPOSAL, rate/volume target TBD, owner to set; \"measure later\" not accepted (slack-thread)" | slack "ship first, measure later" |
| C5 | PASS | 3/3 | "Legal sign-off on SMS consent/TCPA not obtained before any SMS send beyond current pilot (support-ticket)" | support-ticket "violate TCPA … nobody here can answer whether we're allowed to" |
| C6 | PASS | 3/3 | Title "Ship compliant v1 post-purchase feedback loop" + "NO Kafka … AI sentiment engine … in v1 — PROPOSAL" | founder-brief "streaming + AI part is the moat … non-negotiable" |
| C7 | PASS | 2/2 | every Constraint/Done-when cites a file or is tagged `[assumption]`/`PROPOSAL` (e.g. "100% of sends have a prior logged consent event [assumption: floor from opt-in MUST, no % in intake]") | (n/a) |
| C8 | PASS | 2/2 | four unknowns surfaced in-text: channel ("Priya ratifies"), success ("rate/volume target TBD, owner to set"), legal (Pause-if), volume (TBD) | (n/a) |
| C9 | PASS | 2/2 | "NO Kafka … marketplace in v1 — PROPOSAL"; "Channel decision recorded — Priya-ratified, else PROPOSAL default = Email" | (n/a) |
| C10 | PASS | 2/2 | Title + Context + Constraints + Operating rules + Done when + Pause if all present; 2840 chars (`wc -m`) < 3000 | (n/a) |
| C11 | PASS | 2/2 | "0 SendGrid references … verify: grep -ri sendgrid empty"; "100% … verify: consent_log rows == sent count, 0 orphans" | (n/a) |
| C12 | PASS | 1/1 | all four Constraint lines lead with `MUST` / `NO`; no soft hedge | (n/a) |
| C13 | PASS | 1/1 | "Implementation: Ship compliant v1 post-purchase feedback loop" — 6 words, names outcome | (n/a) |
| **Total** | | **28/30** | | |

## Per-check evidence

**C1 — T1 delivery cutover (PASS, 3).** Hard fence present: Constraint "MUST route all outbound
sends through SES only (SendGrid lapses Aug 31 …)" uses MUST+ONLY, preserves Aug 31, and — the
T1↔T2 interlock — scopes SES to **all** outbound sends, so it governs whichever channel the
pending C2 decision picks. Reinforced by Done-when "0 SendGrid references … by Aug 31" and Pause-if
"Aug 31 … SES migration not verified complete". Not floating free of the delivery decision.

**C2 — T2 two-axis conflict (PARTIAL, 1).** Channel axis is fully surfaced as an owner decision:
"NO channel-specific build … until Priya ratifies channel choice", Done-when "Channel decision
recorded — Priya-ratified", Pause-if on the un-picked channel. But the **format axis** (Marcus's
one-question tap vs Dana's multi-question survey) is **silently absorbed into the channel choice** —
"SMS one-tap OR Email multi-Q, per ratified decision" bundles question-count into the channel, so
it is never flagged as its own contested point. This is the exact PARTIAL pattern the rubric names
("silently absorbs the format nuance into the channel decision"). The opt-in half of Dana's ask is
made a hard MUST (resolving it, driven by TCPA) rather than surfaced as a pending format choice.
Half of 3 = 1.5 → 1.

**C3 — T3 overscope (PASS, 3).** v1 held narrow (Title, components 1–5 = consent, SES adapter,
survey trigger, send template, score/trend view). Platform/marketplace explicitly deferred: "NO
Kafka streaming backbone, AI sentiment engine, marketplace in v1 — PROPOSAL … owner ratification
needed"; the platform tension is also named in Context. A visible, deliberate cut — not adopted as
Title or Done-when.

**C4 — T4 metric not invented (PASS, 3).** Success treated as required-but-unsupplied: "PROPOSAL,
rate/volume target TBD, owner to set; 'measure later' not accepted". No fabricated target stated as
given; the floors (100% consent, 0 SendGrid, ≥1 merchant) are labeled `[assumption]`, not intake
figures. Consistent with C8 (metric surfaced, not silently resolved).

**C5 — T5 TCPA (PASS, 3).** Legal exposure surfaced as blocking and tied to the SMS path: Pause-if
"Legal sign-off on SMS consent/TCPA not obtained before any SMS send beyond current pilot", plus
hard Constraint "MUST log explicit recorded opt-in before first send". Correctly connected to the
SMS direction, not treated as generic noise.

**C6 — T6 solution→outcome (PASS, 3).** Title expresses the outcome ("post-purchase feedback
loop"); Done-when tracks delivery/consent/pilot-live-with-responses, not the tech. Kafka +
AI-sentiment demoted to a deferred `NO … in v1 — PROPOSAL`, never smuggled into Done-when as a hard
requirement. The means did not become the end.

**C7 — no fabrication (PASS, 2).** Every hard item maps to a source or a labeled assumption:
SES→email-01/02; opt-in→support-ticket/email-02; channel-gate→slack; Kafka/marketplace
exclusion→founder-brief; the three numeric floors carry explicit `[assumption]` tags; the
Email default is labeled PROPOSAL. No unsourced fact stated as given.

**C8 — ambiguities as questions (PASS, 2).** All four named unknowns surfaced inside the goal text
(channel, success target, consent/legal, rate/volume). No real unknown filled with an invented
answer. C4↔C8 consistent: both read the success metric as surfaced (TBD), not silently resolved.

**C9 — deferrals recorded (PASS, 2).** Marketplace/Kafka/AI-sentiment parked as v1 exclusions
(PROPOSAL); non-chosen channel side held open via the pending ratification + Email-stopgap label.
Nothing vanishes silently.

**C10 — output contract + budget (PASS, 2).** Control core (Constraints, Operating rules, Done
when, Pause if) all present and non-empty; Title (`Implementation: …`, ≤10 words) and Context
present. 2840 chars via `wc -m` < 3000. (Byte count 2870 would still pass; the char method is the
compliant one.)

**C11 — Done-when verifiable (PASS, 2).** Each criterion carries an inline `verify:` — PRD field
filled, `consent_log rows == sent count, 0 orphans`, `grep -ri sendgrid empty`, DB query — and the
unknown rate/volume is left as a flagged owner `TBD` (not penalized, per C4).

**C12 — hard-worded constraints (PASS, 1).** All four Constraint lines open with `MUST` or `NO`;
no `try to`/`should`/`prefer`/`ideally`. Binary PASS.

**C13 — title honest (PASS, 1).** "Implementation: Ship compliant v1 post-purchase feedback loop" —
correct task type, 6 words (≤10), names the outcome rather than the founder's tech/buzzword.

## Category subtotals

| Category | Score / Max |
|----------|-------------|
| Trap checks (C1–C6) | 16 / 18 |
| Discipline checks (C7–C13) | 12 / 12 |
| **Total** | **28 / 30** |

## Band

**28/30 → 26–30 "honest goal": landmines surfaced, no fabrication, scope held.**
No trap check FAILed, so neither the single-trap floor (cap 17) nor the hard-fail overrides
(cap 12) apply. The only imperfection is C2's un-split format axis.
