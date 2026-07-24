# Goal Definition — Loopback post-purchase feedback build

## Phase 1 — Task type
**Implementation.** Signal phrases from the source material: "build", "ship something
merchants can feel this quarter", "start building". Not ambiguous — skipped the
task-type question.

## Phase 2 — Scope call (the real fork in this fixture)
The founder brief conflates two very different things: (a) a north-star platform
vision (event-streaming backbone, AI sentiment engine as "the moat", eventual
marketplace) and (b) three concrete, merchant-quoted asks (alert on unhappy
customers, post-shipment survey with a score, one weekly trend screen). Priya
herself says the three asks are "kind of it, honestly, for what they'll pay for
on day one" — the platform is explicitly long-term. Building to the platform
vision this quarter directly contradicts her own "let's not overthink this /
ship something this quarter" instruction.

**Anti-pattern flagged: scope too broad for a single goal.** Recommended
decomposition (not built here, just flagged):
1. **This goal** — ship the 3 named v1 capabilities, channel-decision-gated.
2. **A separate decision artifact** (PRD/ADR) — SMS vs. email, owned by Priya,
   a prerequisite gate for this goal's send-path work, not a sub-task of it.
3. **Out of scope, future goal** — platform vision: Kafka/event-streaming
   backbone, general "AI sentiment engine", marketplace, benchmark-sharing.
   None of these are validated against the v1 asks; they're founder preference,
   not merchant-requested, and inflate scope past "ship this quarter."

## Phase 3 — Context discovery
No codebase, CLAUDE.md, or docs/ exist in the fixture — this is a greenfield
build being specified from a requirements dump. The 5 source documents ARE the
requirements; all 5 are included as Context (paths verified to exist by reading
them directly — see RUN-NOTES.md).

## Phase 4 — Method
No existing repo to point CodeGraph at. Recommended method uses the swe-flow
chain to put a paper trail under the two contested decisions (channel, entities)
before code exists, plus an explicit human legal-review step — the support
ticket shows nobody in-house can currently answer the TCPA question.

## Phases 5–8 — Constraints / Operating rules / Done-when / Pause-if
See the assembled `/goal` block below. Key evidence-backed calls:
- **Consent gate is a hard MUST**, not a preference — the support ticket
  documents an actual TCPA complaint threat on the existing SMS pilot, not a
  hypothetical.
- **SES-over-SendGrid is undisputed** — both Marcus and Dana independently
  confirm the same Aug 31 sunset date; encoded as a plain constraint, no
  question needed.
- **Channel choice (SMS vs. email) is deliberately NOT decided here.** Priya
  explicitly reserved that call for herself ("whoever specs it, put the
  tradeoff in front of me and I'll pick") — an agent picking a side would
  override an explicit human decision point. Encoded as a Pause-if instead of
  a silent pick.
- **Done-when avoids business-outcome metrics on purpose** — Priya explicitly
  rejected a metrics/targets debate on record in the Slack thread ("ship first,
  measure later"). Criteria below are delivery-verifiable (feature fires,
  record exists, count matches) rather than churn/NPS-style KPIs, honoring that
  instruction rather than treating it as a skill anti-pattern to override. Dana's
  on-record objection to "measure later" is preserved as a flagged risk in
  QUESTIONS.md rather than silently dropped.

## Quality-check pass (per SKILL.md, before printing)
1. Under 3000 chars — goal text is 2610 bytes. Pass.
2. Control core complete — Constraints + Operating rules + Done when + Pause if
   all present. Pass.
3. No soft constraints — every constraint line uses NO/ONLY/MUST. Pass.
4. Done-when verifiable — every criterion has an inline verify clause. Pass.
5. Context paths exist — all 5 are fixture files read directly this run. Pass.
6. No vague criteria — no bare "works correctly"/"looks good". Pass.
7. Pause-if testable — each condition is a checkable state (ratified? reviewed?
   integrated? scope-request content?). Pass.
8. No redundancy — channel governance lives only in Pause-if, not restated in
   Constraints; consent and SES rules appear once each. Pass.

---

```
/goal Implementation: Loopback v1 — post-purchase alert, survey, dashboard

  Context:
  - founder-brief.md (vision + the 3 asks merchants pay for)
  - emails/email-01-marcus-sales.md (SMS case, SendGrid sunset Aug 31)
  - emails/email-02-dana-product.md (email+consent case)
  - slack-thread.txt (Priya defers channel pick, deprioritizes metrics)
  - support-ticket.md (real TCPA complaint — compliance risk)

  Method:
  - spec-author → PRD locking scope+channel+consent design before code
  - domain-decompose → model Order/Consent/SurveyResponse/Sentiment first
  - Legal review (human) → confirm opt-in/TCPA rules before SMS enabled

  Constraints:
  - ONLY 3 named capabilities in v1 (negative-sentiment alert, post-ship survey+score, weekly trend dashboard) — NO marketplace/enrichment/benchmarking
  - MUST route all sends via SES — NO SendGrid after Aug 31
  - NO send (SMS/email) without recorded, on-record opt-in consent
  - Kafka backbone + "AI sentiment engine" = Priya's unvalidated platform-vision preference, NOT a fixed v1 requirement — defer tech choice to design step, don't bake in (conflicts with "ship this quarter")

  Operating rules:
  - One capability → verify → next: alert, then survey+score, then dashboard
  - Stop+ask if requested scope expands past the 3 named capabilities
  - Save PRD/ADR decisions immediately, don't batch

  Done when:
  - PRD has channel decision (SMS vs email) ratified by Priya (verify: signed decision field in doc)
  - Negative-sentiment response → merchant alert (verify: e2e test posts low score, alert fires within SLA)
  - Post-ship order → survey sent + score recorded on order id (verify: test order → event logged, response linked to order id)
  - Dashboard renders week-over-week trend (verify: ≥1wk aggregated view, count matches raw response table)
  - Zero sends bypass consent gate (verify: query send_log join consent, 0 rows consent_at null)
  - Zero sends via SendGrid post-Aug 31 (verify: grep provider config/logs)

  Pause if:
  - Channel decision not yet ratified by Priya before send-path build starts
  - TCPA/opt-in legal review not done before SMS path enabled
  - SES integration not ready before Aug 31 SendGrid lapse
  - Requested scope includes marketplace/enrichment/benchmarking pre-v1

  Components to build:
  - 1. consent/opt-in store (gates every send)
  - 2. order-event → post-ship survey trigger
  - 3. channel adapter (SES-backed, per ratified decision)
  - 4. sentiment/mood scorer on responses
  - 5. negative-sentiment alert notifier
  - 6. merchant dashboard (weekly score trend)
```
