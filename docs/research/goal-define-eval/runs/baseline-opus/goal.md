/goal Implementation: Loopback post-purchase feedback loop v1

  Context:
  - founder-brief.md (v1 = survey→score→dashboard; Kafka/AI/marketplace = north-star, defer)
  - emails/email-01-marcus-sales.md (SMS-first case; SendGrid lapses Aug 31 → SES only)
  - emails/email-02-dana-product.md (email + confirmed opt-in case; design for SES)
  - support-ticket.md (TCPA complaints on texts → consent is a compliance floor, not a preference)
  - slack-thread.txt (Priya owns channel pick; "ship first" vs Dana "measure later")

  Method:
  - Delivery behind one channel-adapter (email|sms) — Priya's pick = config, not rebuild
  - Unhappy detection = rating threshold, deterministic; NO ML sentiment model in v1
  - Greenfield: NO codegraph index yet; decompose domain before coding

  Constraints:
  - MUST route all outbound through the sanctioned SES/AWS path; NO new code on SendGrid (lapses Aug 31)
  - MUST NOT send to any recipient lacking a recorded, confirmed opt-in (TCPA evidence, support-ticket)
  - ONLY v1 surface: send survey → capture response → dashboard trend → unhappy alert + consent
  - NO Kafka backbone, NO ML sentiment engine, NO marketplace/enrichment/benchmarks in v1
  - Survey = required 1–5 rating + ONE optional comment; NO multi-page form
  - Channel (sms vs email) MUST be ratified by Priya before delivery build; default config = email/SES

  Operating rules:
  - One vertical slice at a time (send → capture → display); verify each before next
  - Stop and ask if scope drifts toward north-star (streaming/AI/marketplace)
  - Put the channel + opt-in tradeoff memo in front of Priya BEFORE writing delivery code
  - Save schema + adapter contracts as artifacts immediately

  Done when:
  - Survey delivers via SES sandbox (verify: send test returns messageId; NO SendGrid dep in lockfile)
  - No-consent recipient is blocked (verify: send attempt rejected + logged; assert 0 sends w/o opt-in)
  - Response (rating + optional comment) persists + is queryable (verify: submit test → row present in query)
  - Rating ≤2 fires an unhappy alert (verify: submit rating=2 → alert event emitted)
  - Dashboard renders weekly trend (verify: seed responses → trend endpoint returns series per merchant)
  - Responses + consent stored as queryable events → measurable later (verify: event query returns rows)

  Pause if:
  - Priya has not ratified the channel choice before delivery code starts
  - Consent relaxation is requested without legal sign-off
  - A sanctioned SMS outbound path is required but none exists (SES is email-only)
  - Scope creeps into Kafka / ML-sentiment / marketplace

  Components to build:
  - 1. delivery-adapter (SES email; sms behind same interface) — outbound send
  - 2. consent-store + gate — block non-opted-in sends
  - 3. response-capture + schema — persist rating + comment
  - 4. unhappy-alert rule — rating ≤2 → alert event
  - 5. dashboard trend view — weekly score series per merchant
