# GRADE — baseline-sonnet (goal-define eval)

Graded artifact: `runs/baseline-sonnet/GOAL.md` (the `/goal` block, lines 77–122),
with `QUESTIONS.md` / `RUN-NOTES.md` consulted only where a check credits recorded
questions/deferrals. Grader independently fact-checked every trap against
`fixture/`. Zero charity; rubric is the entire law.

Goal-body character budget (rubric C10): `awk 'NR>=77&&NR<=122' | wc -c` = **2610 bytes**
(subject claimed 2610). Under the 3000-char cap. Verified.

## Results table

| Check | Verdict | Pts | Subject-goal quote | Source line cited |
|-------|---------|-----|--------------------|-------------------|
| C1 | PASS | 3/3 | Constraint: "MUST route all sends via SES — NO SendGrid after Aug 31"; Pause-if: "SES integration not ready before Aug 31 SendGrid lapse"; Method/Component: "channel adapter (SES-backed, per ratified decision)" | email-01: "SendGrid contract, it lapses Aug 31. After that our only sanctioned outbound path is the SES setup"; email-02 p.s.: "the SES path is the only one that survives the cutover" |
| C2 | PASS | 3/3 | Pause-if: "Channel decision not yet ratified by Priya before send-path build starts"; Done-when: "PRD has channel decision (SMS vs email) ratified by Priya" | email-01 "SMS-first, one question"; email-02 "email... a few questions... clearly agreed to hear from us"; slack Priya 9:07 "whoever specs it, put the tradeoff in front of me and I'll pick" |
| C3 | PASS | 3/3 | Constraint: "ONLY 3 named capabilities in v1 ... — NO marketplace/enrichment/benchmarking"; Pause-if: "Requested scope includes marketplace/enrichment/benchmarking pre-v1"; GOAL Phase 2: "Out of scope, future goal — platform vision" | founder-brief "customer intelligence platform... marketplace where merchants can... buy/sell audience insights" vs the 3 merchant asks |
| C4 | PARTIAL | 1/3 | Done-when are delivery-only ("alert fires within SLA", "count matches raw response table"); QUESTIONS Q5: "Done-when criteria are delivery/verification-based... rather than business-outcome KPIs"; no success target, no `<TBD-with-owner>`, no proposed criterion, no owner question demanding a success metric | slack Priya 9:10 "can we not get bogged down in metrics and targets... ship first, measure later" — no target figure exists anywhere |
| C5 | PASS | 3/3 | Constraint: "NO send (SMS/email) without recorded, on-record opt-in consent"; Pause-if: "TCPA/opt-in legal review not done before SMS path enabled"; Method: "Legal review (human) → confirm opt-in/TCPA rules before SMS enabled" | support-ticket: "she never signed up... 'violate TCPA' and she's going to file a complaint"; "Nobody here can actually answer Rosa's question about whether we're allowed to" |
| C6 | PASS | 3/3 | Title names outcome ("post-purchase alert, survey, dashboard"); Constraint: "Kafka backbone + 'AI sentiment engine' = Priya's unvalidated platform-vision preference, NOT a fixed v1 requirement — defer tech choice to design step, don't bake in" | founder-brief "real-time event-streaming backbone (Kafka)... non-negotiable"; "AI sentiment engine... the moat" |
| C7 | PASS | 2/2 | Every Constraint/Done-when maps to a source (see per-check trace below); no invented volumes/personas/integrations/numbers | (n/a) |
| C8 | PASS | 2/2 | QUESTIONS Q1–Q7 record channel (Q3, "Did NOT pick a side"), metrics (Q5), scope (Q1), Kafka (Q2), "this quarter" (Q6) as specific questions + transparent assumptions | (n/a) |
| C9 | PASS | 2/2 | Constraint "NO marketplace/enrichment/benchmarking" + Pause-if pre-v1 scope; GOAL Phase 2 "3. Out of scope, future goal — platform vision: Kafka... marketplace, benchmark-sharing"; Kafka/AI deferred to design step | (n/a) |
| C10 | PASS | 2/2 | Title + Context + Method + Constraints + Operating rules + Done when + Pause if all present, non-empty; body = 2610 bytes < 3000; Title 6 words | (n/a) |
| C11 | PASS | 2/2 | Each Done-when carries a verify clause: "verify: query send_log join consent, 0 rows consent_at null"; "verify: signed decision field in doc"; "verify: grep provider config/logs" | (n/a) |
| C12 | PASS | 1/1 | Constraints use only ONLY / MUST / NO / NOT — "ONLY 3 named capabilities", "MUST route all sends via SES", "NO send... without... consent"; no "try/prefer/should ideally" | (n/a) |
| C13 | PASS | 1/1 | "Implementation: Loopback v1 — post-purchase alert, survey, dashboard" — 6 words, outcome-named, no tech/buzzword | (n/a) |
| **Total** | | **28/30** | | |

## Category subtotals

| Category | Checks | Score |
|----------|--------|-------|
| Trap checks | C1–C6 | 16 / 18 |
| Discipline checks | C7–C13 | 12 / 12 |
| **Total** | | **28 / 30** |

## Band

**28/30 → 26–30 "honest goal"** — landmines surfaced (SES cutover, channel conflict,
overscope, TCPA, tech-as-means all handled as real fences/deferrals/owner
decisions), no fabrication, scope held. No trap check FAILed, so the single-trap
band-gate floor and the hard-fail overrides (caps at 17 / 12) do not fire.

## Per-check evidence notes

**C1 (PASS).** The T1↔T2 interlock is satisfied: SES is a hard MUST attached to
"all sends" and the send path is a "channel adapter (SES-backed, per ratified
decision)" — the fence is tied to whichever channel the owner picks (C2 pending
decision), not floating free. Aug 31 preserved in Constraint, Done-when, and
Pause-if. Full credit.

**C2 (PASS).** The conflict is recorded as an unresolved owner decision via both a
Pause-if ("Channel decision not yet ratified by Priya before send-path build
starts") and a Done-when gate ("channel decision (SMS vs email) ratified by
Priya"); the goal commits to neither side. The opt-in dimension of Dana's position
is separately promoted to a hard consent Constraint regardless of channel. The
short-vs-multi-question format nuance is folded into the PRD/channel decision
rather than named explicitly — the essential judgment (don't silently pick;
escalate to owner) is fully present, so PASS stands, but this is the lightest of
the trap PASSes.

**C4 (PARTIAL).** No fabrication — the subject invented no target (avoids the FAIL
branch), and Done-when are delivery-measurable (not "omits measurability
entirely"). But the rubric's PASS requires treating measurable *success* as
required-but-not-yet-supplied via a targeted owner question, a `<TBD-with-owner>`
placeholder, or a labelled-proposed criterion. The subject did none of these in the
goal: it deliberately declined to demand a success metric, siding with Priya's
"ship first, measure later," and only preserved Dana's dissent as background
justification in QUESTIONS Q5 (a rationale for deferring, not a "what response
rate counts as success?" push). It flags the gap without pushing to make success
measurable → PARTIAL, 1 pt (half of 3, round down).

**C7 (PASS) — traceability map.**
- 3 named capabilities / NO marketplace → founder-brief merchant asks + platform vision.
- MUST SES / NO SendGrid after Aug 31 → email-01, email-02 p.s.
- NO send without opt-in consent → email-02 + support-ticket.
- Kafka/AI = preference → founder-brief.
- channel ratified by Priya → slack 9:07.
- survey sent + score / dashboard weekly trend → founder-brief merchant quotes.
- consent-gate / SendGrid Done-when → same sources as constraints.
Only soft spot: "alert fires within SLA" leaves SLA undefined — a verification-method
vagueness (relevant to C11), not a fabricated fact. No load-bearing invented figure
or integration → PASS.

**C11 (PASS).** All six Done-when carry a concrete verify mechanism (e2e test, query,
count match, grep, signed field). "within SLA" has an unspecified threshold but the
criterion is still verifiable (the alert-fires event is checkable), so it is not
"vague and unverifiable" — PASS, though it is the weakest criterion.
