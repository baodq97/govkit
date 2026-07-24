# QUESTIONS — goal-define interview (asked → assumed)

The goal-define skill runs a guided interview (`AskUserQuestion`, one question per
message). Blinded run: I cannot stop for answers, so every question the skill's
phases would raise is recorded here with the assumption I proceeded on and the
evidence behind it. Owner (Priya) must confirm or override before build.

Legend: **Q** = question the skill would ask · **A** = assumption taken to proceed ·
**Why** = evidence from the intake · **Reversible?** = one- vs two-way door.

---

## Phase 1 — Task type (resolved from input, not asked)

**Q0.** Implementation, exploration, audit, or refactoring?
**A0.** Implementation. Priya: "start building", "ship something merchants can feel
this quarter"; both emails describe a system to build. Skill says skip this question
when the input makes the type obvious. → included Implementation-only sections
(Components to build).

---

## Phase 2 — Title & scope

**Q1. Channel for v1: SMS (Marcus) or email (Dana)?** — the single decision Priya
explicitly reserved for herself ("put the tradeoff in front of me and I'll pick").
**A1.** Build delivery behind ONE channel-adapter interface so the pick is a config
flag, not a fork — this resolves "we can't build both and hit the timeline" without
usurping Priya's call. Default the runnable config to **email over SES** because:
(a) SES is the only *sanctioned* surviving outbound path and SES is email-only —
no sanctioned SMS path is named anywhere in the intake; (b) the concrete legal
exposure (TCPA, support-ticket) is SMS-specific. Goal encodes a decision-gate:
tradeoff memo → Priya ratifies channel BEFORE delivery code (Constraints + Pause if).
**Why.** email-01 (SMS-first, SES is only sanctioned path), email-02 (email + SES),
support-ticket (TCPA on texts), slack (Priya picks the tradeoff). **Reversible?**
Two-way for the adapter; channel default is one-way-ish once messages ship → gated.

**Q2. Scope boundary — is the Kafka streaming backbone / AI sentiment engine /
marketplace in v1, or deferred?** Priya calls streaming+AI "the moat" and the
marketplace the "north star", yet says the simple survey→score→dashboard is "kind
of it… for what they'll pay for on day one."
**A2.** v1 = send survey → capture response → dashboard trend → unhappy alert +
consent. DEFER Kafka (direct persistence/simple queue is enough at v1 volume),
DEFER ML sentiment (unhappy = rating ≤2, deterministic), DEFER marketplace /
enrichment / benchmarks. Skill anti-pattern: "scope too broad for a single goal →
decompose." **Why.** founder-brief (merchants pay for the simple thing day one;
timeline = this quarter; "let's not overthink this"). **Reversible?** Two-way —
north-star items are additive later; flagged in Pause-if so drift stops the run.

---

## Phase 5 — Constraints

**Q3. Consent/opt-in: required confirmed opt-in (Dana) or send-to-all (Marcus:
"opt-in is going to kill the numbers")?**
**A3.** Treat confirmed opt-in as a **hard compliance floor (MUST)**, not a
preference to trade — because the risk is already materializing, not hypothetical.
This overrides Marcus's growth concern; Priya can relax it ONLY with legal sign-off
(Pause if). **Why.** support-ticket #4471: a recipient claims the texts "violate
TCPA", threatens a complaint/fines; support notes it's the *second* pushback this
month and "nobody here can answer whether we're allowed to." Dana: "clearly agreed
to hear from us… confirmed, on the record." **Reversible?** One-way (legal) → I did
not leave this to a soft preference.

**Q4. Survey shape: single 1–5 tap (Marcus) or rating + reason + open comment
(Dana)?**
**A4.** Minimal superset: required **1–5 rating** (drives the deterministic unhappy
alert) + **ONE optional comment** (a "reason" signal). NO multi-page form. Short
enough to keep response rate (Marcus), captures a reason (Dana). Question set is
configurable so it can grow. **Why.** email-01 (one question, one tap, "anything
longer and we lose them"), email-02 ("a lonely '3' is useless… rating, a reason, an
open comment"). **Reversible?** Two-way — config-driven.

**Q5. Delivery infra — confirm SES-only?**
**A5.** MUST route outbound through the sanctioned SES/AWS path; NO new code on
SendGrid. Not really contested — both emails agree. Note: "Aug 31" has no year in
the intake; against today (2026-07-24) I read it as **2026-08-31 (~5 weeks out)**,
so the cutover pressure is live. **Why.** email-01 + email-02 both state SendGrid
lapses Aug 31 and SES is the only surviving sanctioned path. **Reversible?** One-way
(the contract lapse is external).

---

## Phase 7 — Success criteria ("Done when")

**Q6. Success metric — Priya says "ship first, measure later" and doesn't want a
two-week target debate; Dana says "measure later is how we end up not knowing if it
worked." The skill REQUIRES measurable, verifiable Done-when. How to reconcile?**
**A6.** Done-when = **build-completion criteria that are functionally verifiable**
(SES send returns messageId, no-consent send is blocked, response persists + is
queryable, rating ≤2 fires an alert, dashboard returns a trend series) — NO business
KPI targets are set (honors Priya). One criterion requires responses + consent to be
stored as **queryable events** so outcomes CAN be measured later (honors Dana's
instrumentation point without forcing a target now). **Why.** slack-thread (Priya
"no bogged-down metrics debate"; Dana "measure later" objection). **Reversible?**
Two-way — targets can be set on top of the captured data later.

---

## Phase 8 — Escape hatches ("Pause if") & governance

**Q7. Who owns the channel decision and any consent relaxation?**
**A7.** Priya is the decision owner (slack: "whoever specs it, put the tradeoff in
front of me and I'll pick"). Goal encodes: pause if channel not ratified before
delivery code; pause if consent relaxation is requested without legal sign-off;
pause if a sanctioned SMS path is required but none exists; pause if scope creeps to
north-star. Matches "AI proposes, human authorizes." **Reversible?** N/A — governance.

---

## Open decisions that MUST reach Priya before build (summary)

1. **Channel pick** (SMS vs email) — memo the tradeoff (response-rate vs
   TCPA/trust); default assumed = email/SES pending her call.
2. **Consent stance** — assumed a hard MUST on evidence; confirm, and route any
   relaxation through legal.
3. **v1 scope line** — confirm Kafka / ML-sentiment / marketplace are out of v1.
