# Interview questions + assumptions proceeded on

The `goal-define` skill runs a guided interview (`AskUserQuestion`, one question per message). Blind-run mode: I do not stop — each question the skill would put to the owner is recorded here with the assumption I proceeded on. None of these is resolved; all are owner calls. Q1–Q4 are surfaced inside the goal text itself.

---

## Q1 — Scope: is the platform in v1, or only the 3 merchant asks?
**Question (to Priya):** Your brief calls the event-streaming backbone "non-negotiable" and the streaming+AI the "moat", but also says the three concrete asks are "kind of it, honestly, for what they'll pay for on day one." Is v1 scoped to those three (survey→score, unhappy alert, weekly screen), with Kafka / AI-sentiment / marketplace deferred to a later phase?
**Assumption proceeded on:** v1 = the three day-one asks. Kafka backbone, AI sentiment engine, and the marketplace/enrichment/benchmark platform are OUT of v1 (constrained `NO` in the goal) and deferred, not dropped.
**Why:** Priya's own words separate paid day-one value from the north star; "ship something merchants can feel this quarter" favors the thin runnable slice. Flagged rather than silently cut because she labeled streaming "non-negotiable" — that reversal is hers to make.
**Source:** founder-brief.md.

## Q2 — Channel: SMS or email for v1?
**Question (to Priya):** Marcus wants SMS-first (one text, one question, "Reply 1–5"); Dana wants email (branded, multi-question: rating + reason + open comment). You said "put the tradeoff in front of me and I'll pick." Which channel — and one question or several — is v1?
**Assumption proceeded on:** Do NOT pick for her. Build the channel-agnostic shared pieces (consent ledger, response capture, unhappy flag, trend screen, SES transport) and STOP before the channel-specific send until Priya decides. The goal gates this via an Operating rule + Pause-if.
**Why:** Priya explicitly reserved this decision; picking it here would violate her stated intent and could burn the timeline on the wrong branch (Dana: "we can't build both and hit the timeline").
**Source:** email-01-marcus-sales.md, email-02-dana-product.md, slack-thread.txt.

## Q3 — Infra vs channel: does "SES-only" rule out SMS?
**Question (to Priya / infra):** Marcus says the only sanctioned outbound path after 2026-08-31 is SES — but SES is email-only; SMS would need SNS/Pinpoint or another provider. If you pick SMS (Q2), is there a sanctioned SMS sending path, or does the SES constraint effectively force email?
**Assumption proceeded on:** SES covers email. If SMS is chosen without a sanctioned SMS provider, that is a blocking gap — captured as a Pause-if, not silently assumed away.
**Why:** Non-obvious cross-doc conflict: Marcus advocates SMS and SES in the same email, but they don't compose. Left unflagged, "SMS-first on SES" is unbuildable.
**Source:** email-01-marcus-sales.md (SES = only sanctioned path); general infra fact that SES is an email service.

## Q4 — Success metric: intake says "measure later" — not acceptable as the answer
**Question (to Priya):** You said "ship first, measure later" and asked not to debate targets. The goal still needs one measurable success criterion. What is the primary KPI (candidate: survey response rate), and what target counts as "working"?
**Assumption proceeded on:** Carry success as `TBD` + a `PROPOSAL` candidate KPI (survey response-rate) in Done-when, target `awaiting Priya`. NO number invented. The deferral is recorded, not accepted as resolved.
**Why:** Skill §Phase 7 hard rule — measurable success is required even when intake omits it; "we'll measure later" is never the answer; never invent a number. Dana independently flagged that "measure later" risks never knowing if it worked.
**Source:** slack-thread.txt (Priya "ship first, measure later"; Dana counter), founder-brief.md.

## Q5 — Consent: hard legal constraint, or product preference?
**Question (to Priya):** Marcus says opt-in "will kill the numbers"; Dana insists on confirmed opt-in; a pilot recipient already threatened a TCPA complaint (ticket #4471). Do you accept confirmed opt-in + opt-out as a hard requirement for v1 (with the response-rate hit that implies)?
**Assumption proceeded on:** Treat confirmed opt-in + TCPA compliance as a HARD legal constraint regardless of channel — this resolves the Marcus/Dana split on legal grounds, not stylistic ones. Still surfaced to Priya because it directly caps Marcus's response-rate expectation.
**Why:** The TCPA exposure is a live, second-in-a-month incident in a real pilot (ticket #4471); it is a compliance/legal risk, not a taste debate, so it is not mine to trade away for response rate.
**Source:** support-ticket.md (Zendesk #4471), email-02-dana-product.md, slack-thread.txt.

## Q6 — Context confirmation (Phase 3)
**Question (to owner):** These five intake docs look relevant as context — include them all? Any code/docs I've missed?
**Assumption proceeded on:** Include all five intake docs. The project root (fixture) is greenfield — no codebase, no `docs/`, no `CLAUDE.md`, no CodeGraph index — so Context lists the intake itself; no source paths to verify beyond those.
**Why:** Phase 3 context-discovery found no repo artifacts to point at; the intake is the only real material.
**Source:** directory listing of the project root.
