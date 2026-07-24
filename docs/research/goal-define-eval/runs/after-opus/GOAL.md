# Goal — Loopback post-purchase feedback v1

Produced by the `goal-define` skill from `fixture/` intake (founder brief, two emails, Slack excerpt, support ticket). Task type detected: **Implementation** ("we build", "start building", "ship something merchants can feel this quarter").

The goal text below is the deliverable — paste into `/goal`. It is **2754 characters** (budget: < 3000).

---

```
/goal Implementation: Post-purchase survey + unhappy-customer alerts (v1)

  Scope IN: survey after order ships → capture responses → surface unhappy customers → one weekly-trend screen (founder-brief "what merchants literally ask us for"). OUT = Priya's "north star" platform (see Constraints), deferred (QUESTIONS Q1).

  Context (read first):
  - founder-brief.md (vision + the 3 day-one merchant asks)
  - emails/email-01-marcus-sales.md (SMS-first case; SendGrid lapse)
  - emails/email-02-dana-product.md (email + multi-question + opt-in case)
  - slack-thread.txt (Priya delegates channel pick; "ship first, measure later")
  - support-ticket.md (Zendesk #4471 — TCPA/consent risk in live pilot)

  Method:
  - Read intake first; produce a 1-page SMS-vs-email + opt-in tradeoff for Priya BEFORE coding any send path (she asked for exactly this).
  - Downstream: swe-flow domain-decompose → data-model → api-designer for the consent ledger + response store.

  Constraints:
  - ONLY SES for outbound; NO new code on SendGrid (contract lapses 2026-08-31, unrenewed — email-01/02).
  - MUST record confirmed opt-in consent before any send; NO sends to non-consented recipients (Dana; TCPA ticket #4471).
  - MUST meet TCPA (consent + opt-out) for any SMS channel (ticket #4471 — recipient threatened complaint).
  - Build ONLY one channel for v1 (cannot build both and hit timeline — Dana).
  - NO Kafka, NO AI sentiment, NO marketplace in v1.

  Operating rules:
  - One change → verify → next; save artifacts immediately.
  - STOP and put channel + opt-in tradeoff to Priya BEFORE the channel-specific send.
  - Stop and ask if scope drifts toward platform/streaming/AI.

  Done when:
  - Survey delivers to a test order via SES only (verify: send log shows SES message-id; grep code = 0 SendGrid refs).
  - Non-consented recipient is blocked (verify: send attempt without consent flag → rejected in log).
  - Response captured + stored (verify: submit test response → row appears in store).
  - Unhappy response surfaces to merchant view (verify: low-score response appears in alert/list).
  - Weekly-trend screen renders aggregate (verify: screen shows this-week score).
  - Success metric: TBD — Priya deferred ("ship first, measure later", slack). PROPOSAL: survey response-rate as primary KPI; target awaiting Priya. NO number invented (QUESTIONS Q4).

  Pause if:
  - Priya has not picked SMS-vs-email → do not build send path (QUESTIONS Q2).
  - No legal/TCPA sign-off before enabling live SMS sends (ticket #4471).
  - SES sending domain/credentials not provisioned → cannot deliver.
  - Chosen channel is SMS but no sanctioned SMS path exists (SES is email-only; SNS/Pinpoint unconfirmed — QUESTIONS Q3).
```

---

## Quality checks (skill §"Quality Checks")

1. Under 3000 chars? — **Pass**, 2754.
2. Control core complete? — **Pass**: Constraints + Operating rules + Done when + Pause if all present.
3. No soft constraints? — **Pass**: every constraint uses NO / ONLY / MUST.
4. Done-when verifiable? — **Pass**: each functional criterion carries an inline `verify:`. Success-metric criterion carries a `TBD`/`PROPOSAL` per the mandatory-success rule (§Phase 7).
5. Context paths exist? — **Pass**: `founder-brief.md`, `emails/email-01-marcus-sales.md`, `emails/email-02-dana-product.md`, `slack-thread.txt`, `support-ticket.md` all present in the project root (fixture). Verified by directory listing.
6. No vague criteria? — **Pass**: no "works correctly"/"looks good".
7. Pause-if testable? — **Pass**: each condition is programmatically detectable (decision recorded? sign-off obtained? credentials present? SMS provider sanctioned?).
8. No redundancy? — **Pass**: scope-OUT folded into the NO-Kafka/AI/marketplace constraint rather than repeated.
9. Measurable success present? — **Pass via required deferral**: intake explicitly said "ship first, measure later" (Priya). Per §Phase 7 the deferral is NOT accepted as the answer; recorded as `TBD` + a `PROPOSAL` candidate KPI, escalated as QUESTIONS Q4. No number invented.
10. Numbers sourced in place? — **Pass**: the only literal (`2026-08-31`) is sourced inline to email-01/02. No quantitative Done-when threshold is stated; the deferred KPI target is explicitly `awaiting Priya`, not fabricated.

## Notes on scoping decisions (why this goal, not the founder's full ask)

- Priya's brief pushes a **customer-intelligence platform** — Kafka event-streaming backbone ("non-negotiable"), AI sentiment engine ("the moat"), and a marketplace. Cross-referenced against her own "what merchants literally ask us for" and "that's kind of it, honestly, for what they'll pay for on day one", the paid day-one value is the three concrete asks (survey → score, unhappy alert, weekly screen). v1 is scoped to those; the platform is deferred, not dropped (QUESTIONS Q1). Flagged because Priya called streaming "non-negotiable" — this is an owner call, surfaced not silently discarded.
- The **SMS-vs-email** dispute (Marcus vs Dana) is a decision Priya explicitly reserved for herself ("put the tradeoff in front of me and I'll pick"). The goal does not pick for her; it gates the channel-specific send behind her decision and asks for the tradeoff one-pager as Method + Operating-rule.
- **Consent/opt-in** is treated as a HARD legal constraint (TCPA), not a product-style preference — driven by support ticket #4471 (a live pilot recipient already threatened a TCPA complaint), which is independent of Dana's taste argument. This resolves the Marcus-vs-Dana consent split on legal grounds while still flagging the response-rate impact to Priya (QUESTIONS Q4).
- **Cross-doc catch**: Marcus wants SMS but also mandates SES as the only sanctioned outbound path post-Aug-31. SES is email-only; SMS would need SNS/Pinpoint, which nobody has confirmed is sanctioned. That interaction is captured as a Pause-if and QUESTIONS Q3, because it can make "SMS" and "SES-only" mutually exclusive.
