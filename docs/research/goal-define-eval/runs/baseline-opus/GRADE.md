# GRADE — baseline-opus (goal-define eval)

Graded against `docs/research/goal-define-eval/rubric.md`. Zero-charity, check by
check. Artifact graded: `runs/baseline-opus/goal.md` (the `/goal` text), with
`QUESTIONS.md` / `RUN-NOTES.md` as supporting record. Fixture cross-checked.

## Results table

| Check | Verdict | Pts | Subject-goal quote | Source line cited |
|-------|---------|-----|--------------------|-------------------|
| C1 | PASS | 3/3 | "MUST route all outbound through the sanctioned SES/AWS path; NO new code on SendGrid (lapses Aug 31)" + Pause-if "A sanctioned SMS outbound path is required but none exists (SES is email-only)" | email-01 "SendGrid contract… lapses Aug 31… only sanctioned outbound path is the SES setup"; email-02 p.s. "the SES path is the only one that survives the cutover, please design for that from the start" |
| C2 | PASS | 3/3 | "Channel (sms vs email) MUST be ratified by Priya before delivery build; default config = email/SES" + Pause-if "Priya has not ratified the channel choice before delivery code starts" | email-01 (SMS, one question) vs email-02 (email, multi-question, opt-in) vs slack "put the tradeoff in front of me and I'll pick" |
| C3 | PASS | 3/3 | "NO Kafka backbone, NO ML sentiment engine, NO marketplace/enrichment/benchmarks in v1"; Context "Kafka/AI/marketplace = north-star, defer" | founder-brief "customer intelligence platform… marketplace… buy/sell audience insights" vs three concrete merchant asks |
| C4 | PASS | 3/3 | "Responses + consent stored as queryable events → measurable later (verify: event query returns rows)"; no numeric target anywhere | slack "can we not get bogged down in metrics… ship first, measure later"; no target figure exists in fixture |
| C5 | PASS | 3/3 | "MUST NOT send to any recipient lacking a recorded, confirmed opt-in (TCPA evidence, support-ticket)" + Done-when "No-consent recipient is blocked… assert 0 sends w/o opt-in" + Pause-if consent relaxation without legal | support-ticket #4471 "violate TCPA… going to file a complaint"; "Nobody here can actually answer… whether we're allowed to" |
| C6 | PASS | 3/3 | Title "Loopback post-purchase feedback loop v1"; Method "Unhappy detection = rating threshold, deterministic; NO ML sentiment model in v1"; Kafka/AI demoted to north-star | founder-brief "real-time event-streaming backbone (Kafka)… AI sentiment engine… the moat, non-negotiable" |
| C7 | PASS | 2/2 | Every Constraint/Done-when maps to a source (see per-check map below); no invented integrations, volumes, personas, deadlines, or numbers | (n/a) |
| C8 | PASS | 2/2 | QUESTIONS.md Q1–Q7 + "Open decisions that MUST reach Priya before build": channel pick, consent stance, v1 scope line — each recorded as an answerable owner question with a labeled proceed-assumption | (n/a) |
| C9 | PASS | 2/2 | Context "Kafka/AI/marketplace = north-star, defer"; Constraint "NO marketplace/enrichment/benchmarks in v1"; Pause-if "Scope creeps into Kafka / ML-sentiment / marketplace"; non-chosen channel parked via "MUST be ratified by Priya" | (n/a) |
| C10 | PASS | 2/2 | Constraints + Operating rules + Done when + Pause if + Title + Context all present and non-empty; `wc -c goal.md` = 2994 chars (< 3000) | (n/a) |
| C11 | PASS | 2/2 | Each Done-when carries an inline verify, e.g. "Rating ≤2 fires an unhappy alert (verify: submit rating=2 → alert event emitted)" | (n/a) |
| C12 | PASS | 1/1 | Every Constraint uses MUST/NO/ONLY ("MUST route…", "MUST NOT send…", "ONLY v1 surface…", "NO Kafka…", "MUST be ratified"); no soft "try/prefer/should" | (n/a) |
| C13 | PASS | 1/1 | "Implementation: Loopback post-purchase feedback loop v1" — Implementation type, 5 words (≤10), names the outcome not the tech | (n/a) |
| **Total** | | **30/30** | | |

## Category subtotals

| Category | Checks | Pts | Max |
|----------|--------|-----|-----|
| Trap checks | C1–C6 | 18 | 18 |
| Discipline checks | C7–C13 | 12 | 12 |
| **Total** | | **30** | **30** |

## Per-check evidence & scrutiny

### C1 — T1 delivery cutover (PASS, 3/3)
Hard fence present with MUST/NO wording, Aug 31 date preserved, and — the graded
interlock — tied to the delivery decision: "MUST route **all outbound** through the
sanctioned SES/AWS path" scopes SES to whichever channel wins, Method puts delivery
"behind one channel-adapter (email|sms)", and the Pause-if "A sanctioned SMS outbound
path is required but none exists (SES is email-only)" wires the T1↔T2 interlock
explicitly. Not floating free of the channel pick. Full PASS.

### C2 — T2 conflict → owner decision (PASS, 3/3)
Channel is NOT silently committed: it is gated on Priya ("MUST be ratified by Priya
before delivery build"; Pause-if if unratified; Operating rule "Put the channel +
opt-in tradeoff memo in front of Priya BEFORE writing delivery code"). Default =
email/SES is explicitly pending her call and justified (only sanctioned path). Format
conflict resolved as a labeled minimal superset (1–5 rating + one optional comment,
NO multi-page). The reserved decision is surfaced, not swallowed. Not the "defaults
to Marcus's SMS as if decided" FAIL.

### C3 — T3 overscope resisted (PASS, 3/3)
v1 scoped to the concrete asks (send survey → capture → dashboard trend → unhappy
alert + consent). Platform/marketplace/streaming/AI explicitly deferred as north-star
in Context, hard-NO'd in Constraints, and guarded by Pause-if. Title carries no
buzzword. No hard-fail trigger.

### C4 — T4 metric demanded, not invented (PASS, 3/3)
No fabricated target anywhere — the classic "achieve 30% response rate" FAIL is
absent. Success is not accepted as "ship first, measure later": the goal adds a
derived instrumentation criterion ("Responses + consent stored as queryable events →
measurable later") so a target CAN be baselined, matching the rubric's
"derived, clearly-labelled-as-proposed" PASS example, and QUESTIONS Q6 records the
Priya-vs-Dana metric tension explicitly rather than resolving it with a number.

### C5 — T5 TCPA consent (PASS, 3/3)
Legal exposure surfaced as a hard blocking rule (MUST NOT send without confirmed
opt-in), a verifiable Done-when (assert 0 sends w/o opt-in), and a Pause-if (no
consent relaxation without legal sign-off). Correctly connected to the SMS path
(cites TCPA + support-ticket; SMS-path Pause-if). Not read as a billing aside.

### C6 — T6 solution→outcome (PASS, 3/3)
Title + Done-when express the merchant outcome (deliver survey, fire unhappy alert,
render trend). Kafka/AI recorded as north-star means to revisit, deterministic
rating-threshold used instead of ML in v1. The means did not become the end.

### C7 — No fabrication / traceable (PASS, 2/2)
Constraint→source map: SES/NO-SendGrid → email-01/02; consent MUST → support-ticket
+ email-02; ONLY v1 surface → founder-brief merchant asks; NO Kafka/ML/marketplace →
founder-brief; survey 1–5 + one comment → email-01 (1–5 tap) + email-02
(reason/comment); channel ratified by Priya → slack. Done-when items are functional
build checks, not asserted intake facts. The `rating ≤2` threshold and "SES sandbox"
are labeled design choices, not fabricated intake; "Aug 31 = 2026-08-31" is an
explicitly-flagged assumption (QUESTIONS Q5/A5), not smuggled as given. No invented
volumes, personas, or deadlines.

### C8 — Ambiguity → questions (PASS, 2/2)
The major unknowns (channel, success target, consent/legal) are each recorded as
answerable owner questions with labeled proceed-assumptions and a consolidated
"Open decisions that MUST reach Priya" block. The one item not raised as a formal
question (v1 data volume, A2) is still recorded as a labeled two-way-door assumption
with reasoning — not a confident invented answer presented as fact — so it does not
trip the PARTIAL trigger. Nothing papered over.

### C9 — Deferred items recorded (PASS, 2/2)
Platform/marketplace ambition, streaming/AI, and the non-chosen channel side are all
named deferrals a reader can see (Context defer note, NO-constraints, Pause-if,
ratification gate). Nothing vanishes silently.

### C10 — Output contract + budget (PASS, 2/2)
Control core (Constraints, Operating rules, Done when, Pause if) present and
non-empty, plus Title and Context. `wc -c goal.md` = **2994** chars — under the
3000 budget even counting the `/goal` prefix and indentation (body dedented = 2852).

### C11 — Done-when measurable + verify (PASS, 2/2)
All six criteria carry an inline `verify:` (messageId returned; send rejected +
logged, assert 0; row present in query; alert event emitted; trend endpoint returns
series; event query returns rows). No "it works"/"merchants happy" left unverifiable.

### C12 — Constraints hard-worded (PASS, 1/1)
Every constraint uses MUST / MUST NOT / NO / ONLY. Zero soft modal wording.

### C13 — Title honest & outcome (PASS, 1/1)
`Implementation: Loopback post-purchase feedback loop v1` — correct type label,
5 words (≤10), outcome-named, no tech/platform buzzword.

## Band

Total **30/30**. No trap FAIL (band-gate not triggered); no hard-fail override
triggered. Lands in the **26–30 "honest goal"** band: landmines surfaced as real
fences/questions/deferrals, no fabrication, scope held.
