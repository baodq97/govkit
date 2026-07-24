# RUN-NOTES — goal-define blinded run (baseline-opus)

Skill: `swe-flow/skills/goal-define`
Fixture treated as project root: `docs/research/goal-define-eval/fixture/`
Model: Opus 4.8 (1M). Date of run: 2026-07-24.

## Files read (in order)

Directory listings (no file content, for context discovery):
- L0. `plugins/swe-flow/skills/goal-define/` + `…/fixture/` (ls)
- L1. `…/goal-define/references/` + `…/fixture/emails/` (ls)

File-content reads:
1. `plugins/swe-flow/skills/goal-define/SKILL.md` — the skill I executed.
2. `plugins/swe-flow/skills/goal-define/references/goal-template.md` — full template + compression guide + task-type defaults.
3. `docs/research/goal-define-eval/fixture/founder-brief.md` — Priya's vision, v1-vs-north-star scope.
4. `docs/research/goal-define-eval/fixture/slack-thread.txt` — Priya owns the channel pick; "ship first, measure later" vs Dana.
5. `docs/research/goal-define-eval/fixture/support-ticket.md` — Zendesk #4471, TCPA pushback on the SMS pilot (consent evidence).
6. `docs/research/goal-define-eval/fixture/emails/email-01-marcus-sales.md` — SMS-first case; SendGrid→SES cutover (Aug 31).
7. `docs/research/goal-define-eval/fixture/emails/email-02-dana-product.md` — email + confirmed opt-in case; design for SES.

No files outside the skill dir(s), the fixture, and this run's own output dir were read (blinding honored:
rubric.md, README.md, other runs/, other docs/research/, and self-learning were NOT opened).

## Files written (this run's output contract)

- `goal.md` — the structured `/goal` (final deliverable). 2994 chars (< 3000 budget).
- `QUESTIONS.md` — every interview question the skill would ask, the assumption taken to proceed, and evidence.
- `RUN-NOTES.md` — this file.

## How the skill's phases were executed

- **P1 Task type** → Implementation (obvious from "build/ship"; question skipped per skill).
- **P2 Title & scope** → `Implementation: Loopback post-purchase feedback loop v1`; IN = survey→capture→dashboard→alert+consent; OUT = Kafka / ML-sentiment / marketplace (deferred). See Q1–Q2.
- **P3 Context** → greenfield, no codebase/CodeGraph index in fixture; Context = the 5 intake docs (all paths verified to exist via ls).
- **P4 Method** → channel-adapter interface; deterministic unhappy-rule (no ML); decompose before coding (no index yet).
- **P5 Constraints** → SES-only, consent MUST, v1-surface ONLY, no north-star, short survey, channel ratified by Priya. See Q3–Q5.
- **P6 Operating rules** → one vertical slice → verify → next; stop on scope drift; tradeoff memo to Priya before delivery code; save artifacts immediately.
- **P7 Done when** → 6 functionally-verifiable criteria, each with an inline `verify:`; no business KPI targets (reconciles "measure later" with the skill's verifiability rule). See Q6.
- **P8 Pause if** → 4 testable abort conditions (channel not ratified, consent relaxation w/o legal, no sanctioned SMS path, scope creep). See Q7.

## Quality-check results (skill's 8 checks)

1. Under 3000 chars — PASS (2994, `wc -c`).
2. Control core complete — PASS (Constraints + Operating rules + Done when + Pause if all present).
3. No soft constraints — PASS (every constraint uses MUST / NO / ONLY).
4. Done-when verifiable — PASS (each criterion carries an inline verify method).
5. Context paths exist — PASS (all 5 verified via ls of fixture).
6. No vague criteria — PASS (no "works correctly"/"looks good").
7. Pause-if testable — PASS (4 programmatically detectable conditions).
8. No redundancy — PASS (sections do not repeat each other).

## Anti-patterns flagged & fixed (per skill's table)

- "It should work / ship first, measure later" (vague success) → replaced with verifiable build-completion criteria + an instrumentation criterion so outcomes CAN be measured later.
- Scope too broad (Kafka + AI + marketplace in one quarter) → decomposed to a v1 vertical slice; north-star deferred and guarded by Pause-if.
- Soft "people should have opt-in" → hardened to a MUST (TCPA evidence in support-ticket).
- All Context paths verified real; none removed.

## Key judgment calls (see QUESTIONS.md for full evidence)

- SMS-vs-email is NOT decided here — it is Priya's reserved call. The goal abstracts delivery behind one adapter so her pick is a config flag, defaults the runnable config to email/SES (only sanctioned path + lowest TCPA exposure), and gates the build on her ratification.
- Consent/opt-in treated as a hard compliance floor, not a tradeable preference, on the strength of the support-ticket evidence.
- "Aug 31" read as 2026-08-31 (~5 weeks from run date) → SES cutover pressure is live.
