Short answer: do about a third of DDD, and make it the third that stops the two of you inventing an invoicing model out of assumptions.

## State first — I read it rather than asked

```
loop step        status    evidence
1    understand  done      docs/domain/business-model.md
1    discover    done      docs/domain/discovery/timeline.md
2    decompose   done      docs/domain/context-map.md (+7 model.yaml)
2    connect     -         —
2    strategize  -         —
2    organise    -         —
3    define      -         —
3    code        -         —
journal: 0 entries
```

Those files describe a freight-forwarding business (Nordic Freight), not your product. For your project the honest state is: nothing done, nothing recorded. Treating that freight model as a head start would be the most expensive mistake available here, so I'm ignoring it.

## What I'd actually run — four steps of eight

| Step | Form at your size | Time | Skill |
|---|---|---|---|
| understand | one page, not a canvas set | 30 min | `domain-understand` |
| discover | timeline of one flow, on paper | 90 min + 3 calls | `domain-discover` |
| decompose | expect 2–3 contexts, not 7 | 60 min | `domain-decompose` |
| define | the chasing context only; stub the rest | 60 min | `domain-define` |

Roughly two evenings before you write code.

## What I'd skip, and what the skip costs

- **organise** — there are two of you. There is no organisation to align, no cognitive-load budget to balance, no ownership to assign. Lost today: nothing. Conway's law starts billing when a third person joins or one of you drops to part-time; run it then.
- **connect** — tracing message flows pays at three or more contexts. With two contexts and one obvious interaction ("invoice goes overdue → chase begins") you'd be tracing a straight line. Lost: coupling that only shows up in motion. Two triggers bring it back: decompose returning three or more contexts, or the chase needing to read something Invoicing owns *while deciding*.
- **strategize** — no build/buy or hiring decision is pending, so a core domain chart is ceremony. Lost: the investment-mismatch check. But see the last section — you may have exactly one such decision, and it's the biggest one in the project.
- **code depth beyond one aggregate** — supporting and generic contexts get a stub, and a stub is the correct output there.

## Discovery stays — time-boxed, not a workshop

This is the one step the process says cannot be skipped, and it's the one that would stop you inventing dunning rules. There's no room to fill and no domain experts to summon, so run it small:

90 minutes, the two of you, sticky notes or a text file. Write every event in past tense from "freelancer finished the work" to "money landed". Then mark each one **seen** or **assumed**. Then call three freelancers who aren't you and walk the same timeline. The gap between your version and theirs is the entire value of this step.

Skip it and every invariant downstream is a guess — and guessed dunning rules surface as a customer replying "you chased me twice after I paid you".

## Model one capability end to end, not the whole domain

Take **chasing an overdue invoice** through understand → discover → decompose → define, build it, then widen.

Not "send an invoice" — that's a form, a PDF and a mail send. CRUD doesn't need DDD. The chase is where the rules actually live: when the first reminder goes out, at what cadence, and what stops the sequence — paid in full, paid partially, disputed, client promised a date, you decided to write it off, payment arrived mid-sequence and the reminder is already queued. That's a real invariant, and probably the only one in your system worth the word.

Breadth-first modelling of invoices, clients, payments, taxes and reminders would take a week and produce documents you'd rewrite the moment you shipped. One flow end to end produces something buildable in days, and it exposes process problems while they're still cheap.

## Where the design effort exceeds what the decision is worth

Two things, plainly:

1. **At two people, most DDD artifacts are insurance you don't need.** Context map, core domain chart, team topology, a bounded-context canvas per context — skip all of them. The cost of a wrong boundary at this size is a weekend refactor, not a re-platform. The model can live in your heads and one page per context, and the page exists so you two stop disagreeing, not to satisfy a process.

2. **Your real risk isn't a weak domain model.** Stripe Invoicing, Wave, FreshBooks and a dozen others already send invoices and chase payments. If you can't finish the sentence "we do X here that they don't" in one line, no amount of modelling saves the project — and that question costs an evening, not a design process. If you *can* finish it, that sentence is also what discovery should be aimed at, because it tells you which flow is worth modelling properly. That's the strategize question compressed into one line instead of a chart, which is the right size for it right now.

## Next step — one, then we re-read

Run `domain-understand`, time-boxed to a single page: who pays, for what, what you do that the incumbents don't, and how you'd know in three months whether that was true. Then I re-read the state and we go into discovery.

I'd also record the skips as deviations in the journal — *organise skipped: two people; connect deferred: revisit at 3+ contexts; strategize collapsed to one question* — so when a third person joins, the reasons are visible instead of folklore.

Say go and I'll start there. I won't write the model myself in this thread: each step has its own skill and its own rules, and half the input has to come from you and from three freelancers on the phone.
