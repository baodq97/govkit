# Understand step — started, now blocked on you

Mode: **INTERVIEW**. No repo, no PRD, no README, no pricing page — so there is nothing to
mine, and the step is a conversation rather than a document review.

I have written the skeleton and the interview script, but I have not filled the canvas.
One sentence of input exists ("a tool for agencies to manage freelance translator
assignments"), and that names a product category, not a business model. Two of the nine
canvas blocks are intent-only; the other seven are empty. That is deliberate: a
plausible-sounding canvas is worse than a sparse one, because `domain-decompose` will
build on it without ever learning which parts were invented — and the classification it
has to make (core / supporting / generic) is exactly the thing a guessed canvas gets
wrong.

## Files

- `business-model.md` — DOMAIN-BM-0001, `status: draft`, `owner: TBD`. Canvas skeleton
  with sourced blocks marked as intent-only, empty blocks named as questions, 11 open
  questions each routed to a person. Destination once a repo exists:
  `docs/domain/business-model.md`.
- `interview-questions.md` — the running order, ~26 questions in 7 rounds, plus the stop
  rule.

## Who has to be in the room

I cannot substitute for these, and pretending otherwise produces a confident wrong canvas:

- whoever owns product/business strategy — revenue, differentiation, horizons
- whoever owns the P&L — cost structure, partners
- a domain expert who has actually run agency-side vendor management
- **real agency vendor managers and real freelance translators** — not internal proxies

The last one is the one that gets skipped. There is no user story map in the output
because no user has been observed; a backbone invented at my desk would be my guess about
translation-agency workflow, and three downstream skills would then treat it as fact.

## The one question to start with

**Who pays you, and for what exactly?**

Specifically: does the agency buy a subscription, pay per assignment, per word, or do you
take a cut of what the freelancer earns — and do freelance translators pay you anything at
all? That last part decides whether this is a tool an agency buys or a two-sided platform,
and those are different architectures, not a feature flag.

Answer that and I will run the rest of the script in order. If you would rather answer in
bulk, work down `interview-questions.md` — the cost is thinner answers, and I will mark
which blocks came from a bulk reply rather than a conversation.

If some of this is genuinely unknown at this stage, say `unknown` and mean it. `unknown`
is a valid value for evolution stage, differentiation and any horizon, and it is far more
useful downstream than a number someone invented under interview pressure.

Do not run `domain-discover` or `domain-decompose` off the current document.
