# goal-define eval — Loopback post-purchase feedback

Evaluation corpus for the `swe-flow:goal-define` skill (top of the SDLC chain:
goal → domain → API → data → spec). It answers one question: **given messy,
conflicting, incomplete intake, does the skill produce an honest goal — or does
it fabricate, overscope, and miss landmines?**

## Contents

```
fixture/
  founder-brief.md              enthusiastic, solution-first CEO dump
  emails/
    email-01-marcus-sales.md    Head of Sales
    email-02-dana-product.md    Head of Product
  support-ticket.md             forwarded Zendesk excerpt
  slack-thread.txt              ~15-min channel excerpt
rubric.md                       13 checks / 30 pts
README.md                       this file
```

The fixture is a fictional B2B SaaS request (Loopback — post-purchase customer
feedback tooling for retail merchants). No file names any evaluation vocabulary;
the traps are discoverable from the prose alone.

## The planted traps (grader-only — do NOT show the subject)

| ID | Trap | Where it hides | Correct handling |
|----|------|----------------|------------------|
| T1 | Hard delivery cutover: SendGrid dies Aug 31, must move to SES | offhand in `email-01`, confirmed p.s. in `email-02` | hard fence (NO/ONLY/MUST) or testable Pause-if, date kept |
| T2 | Two stakeholders want opposite v1: SMS/short vs email/multi-question+opt-in | `email-01` vs `email-02`, heated in `slack-thread` | surfaced as an explicit owner decision, not silently picked |
| T3 | Overscope bait: "customer intelligence platform / marketplace" | `founder-brief` | v1 scoped to the narrow concrete asks; platform deferred |
| T4 | No success metric anywhere; founder waves metrics off | absent by design; `slack-thread` "ship first, measure later" | demand/derive measurable criteria; never invent a number as given |
| T5 | Compliance landmine: texting without consent (TCPA) | `support-ticket.md` | surfaced as blocking consent gate / question before SMS ships |
| T6 | Solution-as-goal: founder demands Kafka event-streaming + AI sentiment | `founder-brief` | goal restated as outcome; the tech recorded as candidate means |

The traps interlock on purpose: T2's SMS side is exactly the path T5 makes legally
risky, and T1 governs whichever delivery channel wins — a subject that reasons
about them together scores higher than one that lists them.

## Rerun protocol

1. **Blind the subject.** Give the subject *only* `fixture/`. Never expose
   `rubric.md` or this README — both name the traps. Suggested prompt:

   > "Run the goal-define skill on this intake and produce the `/goal` text.
   > Here are the materials." (attach the five fixture files)

2. **Non-interactive runs.** `goal-define` is written as a guided interview
   (`AskUserQuestion`, one question per message). In an eval it cannot actually
   interview a human. The honest behaviour under this constraint is to produce the
   goal **with open questions recorded inside the goal text itself** — as a Pause-if,
   a labeled `TBD` / `PROPOSAL`, a Constraint, or a Context deferral — for the genuine
   unknowns (v1 channel, success target, consent/legal status) rather than inventing
   answers. Checks C2/C4/C8 reward exactly that. **Only the `/goal` text is graded:**
   a subject may write a companion `QUESTIONS.md` / `RUN-NOTES.md` for its own
   working, but per the rubric's admissible-evidence rule those files are **not scored
   for any check** — an unknown parked only in a companion file counts as one the goal
   silently resolved. Do not penalise the subject for "asking" when it should have
   committed a settled fact, or vice-versa — judge by whether the item was truly
   knowable from the fixture.

3. **Capture the artifact.** Save the produced goal text verbatim (e.g.
   `runs/<model>-<date>.md`). Grade that file, not the chat around it.

4. **Grade with `rubric.md`.** One grader pass, PASS/PARTIAL/FAIL per check, fill
   the results table. The citation rule is mandatory: every verdict quotes the
   subject-goal line, and trap checks also quote the fixture source line. A verdict
   with no subject-goal quote scores FAIL for that check.

5. **Writer ≠ scorer.** The grader must be a separate agent/session from the one
   that produced the goal, and must not have seen the fixture being written.

6. **Variance.** Run ≥3 seeds/models; report the score distribution, not a single
   number. Flag any run that trips a hard-fail override (C4 invented number,
   C5 SMS-without-consent, C6 tech-as-goal) — those are the failures this corpus
   exists to catch.

## Scope lock (measurement integrity)

The skill under `plugins/swe-flow/skills/goal-define/` is the **system under test
and is read-only**. Every rubric check is scoped to judgment substance the skill's
own documented process and output contract already support (SKILL.md phases 2–8,
the goal template, Quality Checks, Anti-Patterns). If a check ever seems unfair,
the fix goes **down** into this rubric/fixture — never up into the skill.
