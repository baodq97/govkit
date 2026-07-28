# Interviewing to surface domain behaviour

Discovery interviews fail in predictable ways: asking what the documents already answer, asking
abstract questions and receiving abstract answers, and never stopping. The rules below address
each.

## Four rules

**1. Ground first, ask second.** Read everything written before opening your mouth. Asking a busy
domain expert something their own ADR states is the fastest way to lose the room's attention, and
attention is the scarce resource in a discovery session.

**2. One question at a time.** A wall of questions produces a wall of one-line answers. A single
question produces a story, and stories contain the rules.

**3. Concrete scenarios, never abstractions.** This is the highest-leverage rule here.

| Instead of | Ask |
|---|---|
| "How does the approval process work?" | "Tell me about the last approval that got rejected." |
| "What are the business rules for booking?" | "When was the last time a booking went wrong? What happened?" |
| "How do you handle exceptions?" | "What's the weirdest thing you've had to do this month?" |

Abstract questions return the process as people believe it is documented. Concrete questions return
the process as it actually runs, including the workaround invented last March that encodes a rule
nobody wrote down.

**4. Ask what goes wrong.** Invariants hide behind incident stories. "What would happen if two
people booked the same unit?" gets a rule stated out loud, usually for the first time, often with
visible feeling — and feeling marks the rules that matter.

## Question sets by target

### Events — what happened

- "Walk me through what happens after ___. Then what?"
- "What's the first thing that happens when a new ___ arrives?"
- "What happened just before that?" *(works backward from a known event)*
- "Is there a moment where you'd say 'right, that's done' — what is it?"
- "What's the event that, once it happens, is expensive to undo?" *(pivotal events)*

### Commands and actors — who caused it

- "Who does that? Is it always the same role?"
- "What do they have to do to make it happen — click something, phone someone, sign something?"
- "Can anyone else do it? Under what circumstances?"

### Policies — what reacts

- "When ___ happens, does anything happen automatically?"
- "Who needs to know when ___ happens?"
- "Is there anything you have to remember to do after ___?" *(a remembered step is an unautomated
  policy, and often a missing domain concept)*

### Rules and invariants — what must never happen

- "What would happen if ___ and ___ at the same time?"
- "Has that ever gone wrong? What did you do?"
- "Is there anything the system lets you do that you know you shouldn't?"
- "What do you check before you approve one of these?"

### Read models — what people look at

- "What do you look at before deciding?"
- "Where do you go to find out whether ___?"
- "Is there a spreadsheet involved?" *(there is almost always a spreadsheet, and it is almost
  always a missing read model or a missing context)*

### Ubiquitous language — what things are called

- "You said '___' — what exactly counts as one of those?"
- "Does everyone here use that word the same way?"
- "Is there a word for that in your team that other teams wouldn't understand?"

That middle question is worth asking every time a term recurs. When two people define the same word
differently, discovery has just found a boundary — and that finding is worth more than the rest of
the session's output.

## The stop rule

**Stop when the next question would not change the model.**

Concretely, stop when:

- the last several answers confirmed what was already recorded rather than adding anything
- remaining unknowns need someone who is not in the room — write them down and route them
- the room is tired; a tired room agrees with whatever is proposed, and false agreement is worse
  than an open question

Discovery is continuous, not infinite. The session ends; the practice does not. Record what is
still unknown so the next round starts there instead of re-treading this one.

## Recording

Every item carries:

- **who said it** and **when** — a definition without a holder cannot be challenged later
- **confirmed** (a person said it) or **candidate** (derived from an artifact, unverified)

That second field is what keeps the skill honest. Without it, a session that only re-read the
schemas is indistinguishable from one that talked to the business — and the difference is the
entire value of discovery.
