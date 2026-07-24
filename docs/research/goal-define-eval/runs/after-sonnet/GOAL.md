# Goal (from swe-flow:goal-define, run over fixture/)

Task type: **Implementation** — signal phrases "build", "ship", "roll out wider" recur across
founder-brief.md, both emails, and slack-thread.txt; not ambiguous, so Phase 1 question was
skipped per the skill's own rule ("if the user's input already makes the type obvious, skip").

Char count of the `/goal` block below: 2870 (budget: <3000).

```
/goal Implementation: Ship compliant v1 post-purchase feedback loop

Context:
- founder-brief.md (vision + scope tension: platform ask vs "ship this quarter")
- emails/email-01-marcus-sales.md (SMS-first ask, SendGrid lapses Aug 31)
- emails/email-02-dana-product.md (Email+multi-Q+opt-in ask, confirms SES-only)
- slack-thread.txt (Priya defers channel pick to spec'er, "measure later")
- support-ticket.md (Brightwear TCPA complaint — opt-in legal risk, pilot merchant)

Method:
- swe-flow:domain-decompose — model Merchant/Order/Consent/SurveySend/Response before coding
- swe-flow:spec-author — draft PRD once channel ratified, lock scope in governed doc
- Grep — confirm zero SendGrid references before Aug 31 cutover (email-01)

Constraints:
- MUST route all outbound sends through SES only (SendGrid lapses Aug 31 — email-01, email-02)
- MUST log explicit recorded opt-in before first send to any recipient (support-ticket #4471 legal risk; email-02)
- NO channel-specific build (SMS copy or Email templates) starts until Priya ratifies channel choice (slack 9:07am)
- NO Kafka streaming backbone, AI sentiment engine, marketplace in v1 — PROPOSAL, contradicts founder-brief's "non-negotiable" list, owner ratification needed

Operating rules:
- One component → verify → next; stop and ask if scope expands past single-channel send + consent capture + score view
- Save channel trade-off memo + PRD as first artifacts, before code

Done when:
- Channel decision recorded — Priya-ratified, else PROPOSAL default = Email (only option meeting opt-in constraint without new consent UX) — verify: PRD owner-decision field filled
- 100% of sends have a prior logged consent event [assumption: floor from opt-in MUST, no % in intake] — verify: consent_log rows == sent count, 0 orphans
- 0 SendGrid references [assumption: floor from SES-only MUST] — verify: grep -ri sendgrid empty, by Aug 31 (email-01)
- >=1 pilot merchant (Brightwear, support-ticket) live, response count > 0 in DB [assumption: min-viable floor] — verify: DB query — PROPOSAL, rate/volume target TBD, owner to set; "measure later" not accepted (slack-thread)

Pause if:
- Legal sign-off on SMS consent/TCPA not obtained before any SMS send beyond current pilot (support-ticket)
- Aug 31 (email-01) reached, SES migration not verified complete (grep sendgrid still nonzero)
- Channel-specific components about to start and Priya hasn't picked SMS/Email
- Any live send found without a matching consent_log row

Components to build:
1. consent/opt-in capture + storage (email-02, support-ticket)
2. SES send adapter, replaces SendGrid (email-01, email-02)
3. survey trigger on order-shipped event (founder-brief merchant ask)
4. channel send template — SMS one-tap OR Email multi-Q, per ratified decision
5. minimal score + weekly-trend view (founder-brief merchant ask)
```

## Quality-check pass (SKILL.md § Quality Checks)

1. Under 3000 chars — 2870, yes.
2. Control core complete — Constraints, Operating rules, Done when, Pause if all present.
3. No soft constraints — every Constraints line uses MUST or NO.
4. Done-when verifiable — every criterion has an inline `verify:`.
5. Context paths exist — all 5 confirmed present in fixture/ via `find` before writing.
6. No vague criteria — no unverifiable "works correctly"/"is complete" language.
7. Pause-if testable — each condition names a checkable artifact/state (sign-off record, date+grep, PRD field, consent_log row).
8. No redundancy — validation folded into Done-when, no separate section duplicating it.
9. Measurable success present — Priya's "measure later" (slack-thread) is explicitly NOT accepted; the goal carries a PROPOSAL criterion + an owner-facing TBD for the actual rate/volume target, per the skill's hard rule.
10. Numbers sourced in place — every number in Done when/Pause if either cites an intake file inline or is tagged `[assumption]`/`PROPOSAL` on its own line (100%, 0, >=1 all labeled as floors, not intake-supplied targets; Aug 31 cited to email-01 everywhere it recurs).

## Anti-patterns caught and fixed (SKILL.md § Anti-Patterns to Flag)

- **"We'll measure later"** (Priya, slack-thread, 9:10–9:13am) — flagged, not accepted. Dana's on-record objection in the same thread is treated as evidence the deferral is contested, not settled. Resolved as PROPOSAL + TBD, per the skill's explicit rule.
- **Two stakeholders in unresolved conflict, decision owner named but hasn't decided** (Marcus vs. Dana on SMS/Email; Priya explicitly says "whoever specs it, put the tradeoff in front of me and I'll pick," slack 9:07am) — not silently resolved by picking a side. Goal gates channel-specific build behind Priya's ratification, defaults to Email only as a stopgap (justified below), and surfaces the trade-off as a Pause-if.
- **Founder's own brief contradicts itself on scope** ("non-negotiable" Kafka streaming + AI sentiment engine moat vs. "let's not overthink this... ship something merchants can feel this quarter" + a literal merchant-ask list that needs none of that infrastructure) — flagged as a scope PROPOSAL, not silently resolved either way.
- **Unsourced numbers** — no percentage/count anywhere in the intake for response rate, volume, or opt-in coverage. Every number that appears in Done-when is a derived floor (100% consent, 0 SendGrid refs, ≥1 merchant), explicitly labeled `[assumption]`, not invented as if the intake supplied it.
- **Real external risk hiding in a "forwarded as context" ticket** — support-ticket.md documents an actual customer TCPA complaint on the live SMS pilot, with support explicitly saying nobody internally can answer the compliance question. This is escalated to a Pause-if (legal sign-off), not softened into "try to get consent."

## Decision rationale — why Email is the stopgap default, not a vote for Dana

This is a judgment call, recorded transparently:
- The support ticket is not an opinion, it's evidence: a named merchant (Brightwear) already got a legal threat over unconsented SMS on the current pilot, and internal support explicitly could not answer whether the company is compliant.
- Given that, "MUST log opt-in before first send" is adopted as a hard constraint independent of which stakeholder is right about SMS vs. email — it is a safety response to a documented incident, not a side-pick in the Marcus/Dana disagreement.
- Once opt-in is mandatory, Email is the only channel of the two that doesn't require inventing new consent-collection UX to satisfy it (Dana's proposal already assumes confirmed opt-in as part of the flow; Marcus's one-tap SMS proposal does not yet have one). That is why Email is the stopgap default — not because Dana's product judgment outranks Marcus's sales judgment.
- This is explicitly marked PROPOSAL in the goal text and gated behind Priya's ratification (per her own stated process in slack-thread.txt), because she is the one who said she wants the trade-off in front of her before it's decided, and she is the correct authority to flip it.
