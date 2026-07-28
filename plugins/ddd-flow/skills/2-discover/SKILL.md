---
name: 2-discover
description: >
  DDD loop 1 — discover: EventStorming timeline, ubiquitous language, hotspots and attendance, tracking confirmed vs candidate and as-is vs to-be vs could-be. Writes docs/domain/discovery/.
disable-model-invocation: true
---

# Domain Discover

> *"This is the most crucial aspect of DDD. You cannot skip discovery. If your whole team doesn't
> build up a good understanding of the domain, all software decisions will be misguided."*
> — ddd-crew, Discover

Discovery is where a team stops guessing. The output is not a document — it is **shared
understanding**, made durable enough that the next step can build on it.

**What this skill is, honestly:** a facilitator's harness. It prepares the surface, proposes
candidates from whatever is written down, asks the questions that surface behaviour, and records
what people say with attribution. It **cannot** replace the people in the room. A run with no
domain expert present has discovered nothing; it has only restated the documents.

## Mode detection — do this first

| Signal | Mode |
|---|---|
| No repo, or no domain artifacts | **INTERVIEW** — elicit the timeline from scratch |
| Repo has PRDs, ADRs, schemas, specs, a domain layer | **DISCOVER** — mine candidates first, then interview only the gaps |
| `docs/domain/discovery/` exists | **UPDATE** — discovery is continuous; merge a delta |

The distinction matters because the two modes fail differently. INTERVIEW risks an unbounded
conversation, so it needs the stop rule. DISCOVER risks the opposite — mistaking *documented* for
*discovered*, and shipping a timeline that merely paraphrases a schema. Guard against that by
tracking, per event, whether a human confirmed it or an artifact implied it.

## Reference files (read as needed)

- `references/eventstorming.md` — the sticky grammar (event, command, actor, policy, read model,
  external system, hotspot), the three levels (big picture → process → design), and how to run
  each. Read before facilitating.
- `references/other-techniques.md` — Domain Storytelling, Example Mapping, User Journey Mapping,
  and which question each answers better than EventStorming.
- `references/interview-guide.md` — the question sets that surface events, rules and vocabulary,
  and the stop rule.
- `references/output-template.md` — the exact output contract.

## Who to involve

Say this out loud before starting. The skill's value is capped by who is present:

- people who design, build and test software
- people who have domain knowledge
- people who understand product and business strategy
- people who understand the customers' needs and problems
- **real end users**

Record who actually attended. When a group is missing, the areas that depended on them stay
hotspots rather than becoming confident findings.

## The visual surface

Discovery is visual and collaborative or it is not discovery. Start the shared surface first:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/view/scripts/preview-server.cjs --dir .ddd-flow/discovery
```

Write the model to `<dir>/model.json`; the page updates itself, so participants watch the timeline
form instead of waiting for a document. Their clicks land in `events.jsonl`, which you read on your
next turn and merge with what they say in conversation.

If a browser is genuinely unavailable, fall back to a markdown timeline and say that a text
timeline loses the thing that makes EventStorming work — everyone seeing the same wall at once.

## Process

### 1. Ground (DISCOVER mode)

Read what exists — PRDs, specs, ADRs, schemas, domain layers, prior `docs/domain/`. Extract
**candidate** events, commands, actors and terms, each tagged with its source. These are proposals
to be confirmed or corrected by people, never findings. Mark every one `status: candidate`.

Skip to step 2 in INTERVIEW mode.

### 2. Big-picture EventStorming — the timeline

Lay out **domain events** in past tense, in rough time order. Start with the event that matters
most commercially and work outward; a chronological start from "user signs up" wastes the room's
best energy on the least interesting part.

For each event, elicit the surrounding grammar (see the reference): what **command** caused it,
which **actor** issued it, which **policy** reacts to it, what **read model** someone looks at to
decide, which **external system** is involved.

**Hotspots** — disagreement, "it depends", "ask X", visible discomfort — are the most valuable
output of the session. Capture them as hotspots; do not resolve them in the room by picking a side.

### 3. Interview the gaps

Ask only where the timeline has a hole. The question sets in `references/interview-guide.md`
follow four rules that matter more than the questions themselves:

- **Ground first, ask second.** Never ask what the documents already answer.
- **One question at a time.** A wall of questions gets a wall of shallow answers.
- **Concrete scenarios over abstractions.** *"Tell me about the last time a transfer was
  rejected"* surfaces rules that *"how does the transfer process work"* never will. This is the
  DDD doctrine "focus on concrete scenarios" applied to elicitation.
- **Ask what goes wrong.** Business rules hide behind incident stories. *"What would happen if two
  people booked the same unit?"* is how an invariant gets stated out loud for the first time.

### 4. Ubiquitous language

Record every term people actually use, with the definition **they** gave. When the same word means
two things to two people, that is not a naming problem to tidy up — it is the strongest boundary
signal discovery produces. Record both meanings and who holds each.

### 5. Stop

Stop when the next question would not change the model. Discovery is continuous, not infinite: the
session ends, the practice does not. Record what is still unknown so the next round starts there
rather than repeating this one.

### 6. Emit

Write `docs/domain/discovery/` per `references/output-template.md`: the event timeline, the
ubiquitous language, the hotspots, and the attendance record. `status: draft`, `owner: TBD`.

Then say plainly what the next step is: `3-decompose` consumes this as its step-2 input, and
it will be as good as this discovery was.

## Hard rules

- **Give every hotspot a stable id `H1`, `H2`, … and never renumber them.** Hotspots are the one
  thing every downstream artifact points back at; a boundary justified by "blocked on H1" is
  only checkable while H1 keeps meaning the same question. Re-running this step adds ids, it
  does not renumber the existing ones.
- **Length budget: ≤ 120 lines per file in `discovery/`.** A budget caps prose, not findings:
  over it, cut rationale a reader can infer and anything restated from an upstream artifact —
  never open questions, provenance, or a stated absence.
- **Never invent an event, rule, or actor.** Naming `TransferRequested` from "people request
  transfers" is the job. Inventing `TransferCancelled` when nothing in the domain ever cancels is
  fabrication, and it is undetectable downstream. If the timeline has a gap, the gap is a hotspot.
- **Distinguish confirmed from candidate.** Every item carries whether a human confirmed it or an
  artifact implied it. Without this, a run that merely re-read the schemas looks identical to one
  that talked to the business — and only one of those is discovery.
- **Distinguish as-is from to-be from could-be**, in a column of its own. What the business does
  today, what it has decided to change, and what someone floated in the room are three different
  claims, and a wall records them in the same handwriting. This is a second axis, not a rename of
  the first: an element can be `confirmed` (a person said it) and `could-be` (what they confirmed is
  that it is only an idea). Default `as-is`, change it on evidence, and make an unplaceable element
  a hotspot rather than a guess.
- **Attribute.** Who said it, when. Terms especially: a definition without a holder cannot be
  challenged later.
- **Don't draw boundaries.** Clustering events into candidate contexts is `3-decompose`'s
  job. Doing it here collapses discovery and design into one step and loses the disagreement that
  discovery exists to surface.
- **Don't resolve hotspots to keep things tidy.** An open hotspot is a finding. A quietly closed
  one is a decision nobody made.

## Worked example

**Input (DISCOVER mode):** an equipment-rental repo whose only domain writing is a set of schema
migration ADRs.

**Ground pass** produced candidates from table names: `ReservationCreated`, `InvoiceIssued` —
both marked `candidate`, sourced to ADR-0012.

**Interview, one question at a time:**

> *"Tell me about the last time a booking went wrong."*
> — "A unit got double-booked across two depots. It's the thing that hurts most."

That answer produced, in one exchange: a **confirmed** event (`EquipmentAllocated`), an
**invariant** stated for the first time (*"the same physical unit can never be committed twice for
overlapping windows, even from a different depot"*), and a **hotspot** (nobody agreed who releases
a unit when the depot changes mid-rental).

**Ubiquitous-language conflict found:** *"Transfer"* meant a physical depot-to-depot move to
operations, and a billing line item to finance. Both recorded, with holders. That single conflict
is worth more to the next step than the whole candidate list from the ground pass.

Note what the example does **not** do: it doesn't promote the two candidate events to confirmed
just because they came from an accepted ADR, and it doesn't settle who releases the unit — that
stays a hotspot with a name attached.
