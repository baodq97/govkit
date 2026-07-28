# Discovery techniques beyond EventStorming

EventStorming is the recommended starting point, not the only tool. Each technique below answers a
question EventStorming answers less well. Pick by question, not by preference.

| Technique | Answers | Reach for it when |
|---|---|---|
| **Domain Storytelling** | who does what with whom, in one concrete story | the process involves several actors handing work between them |
| **Example Mapping** | what exactly is the rule, at the edges | a rule was stated but nobody agrees on its boundaries |
| **User Journey Mapping** | what the user experiences, including feelings | the pain is in the experience, not the process |
| **User Story Mapping** | what the user does, in order, at what priority | scoping a release from the discovered domain |

## Domain Storytelling

<https://domainstorytelling.org/> — Hofer & Schwentner.

A pictographic sentence grammar: **actor → work object → activity → actor**, numbered in sequence,
told as one concrete story.

```
1. Depot Clerk  ──[reservation]──▶  sends to  ──▶  Driver
2. Driver       ──[unit]────────▶  collects from ─▶  Depot
3. Driver       ──[signed docket]▶  returns to  ──▶  Depot Clerk
```

**Where it beats EventStorming:** hand-offs. EventStorming's timeline makes *what happened* vivid
but can blur *who gave what to whom*. When the domain's difficulty lives in the hand-offs — and in
back-office domains it usually does — this makes the flow legible in a way an event wall does not.

**Discipline:** tell one concrete story, not the general case. "Usually the clerk…" is a summary,
and summaries hide the exceptions that matter. Ask for last Tuesday's actual instance.

## Example Mapping

<https://cucumber.io/blog/bdd/example-mapping-introduction/> — Matt Wynne.

Four card colours, twenty-five minutes, one rule at a time:

- **yellow** — the story under discussion
- **blue** — a rule (an acceptance criterion)
- **green** — a concrete example illustrating a rule
- **red** — a question nobody in the room can answer

**Where it beats EventStorming:** precision on a single rule. EventStorming surfaces *that* a rule
exists; Example Mapping finds out what it actually says by forcing concrete examples until the
edges appear.

This is the DDD doctrine *"focus on concrete scenarios"* made into a twenty-five-minute meeting,
and it is the direct antidote to a beautiful model that fails on real cases.

**Reading the output:** lots of red cards means the story is not ready. Lots of blue with few green
means the rules are asserted but untested. A rule with an example that contradicts it is the most
valuable card on the table.

**For DDD:** green examples become the invariants in a model. A rule with no example is a claim; a
rule with three examples is a specification you can implement.

## User Journey Mapping

<https://boagworld.com/audio/customer-journey-mapping/>

Maps the user's experience across touchpoints over time, including what they think and feel at each
step, and where they drop out.

**Where it beats EventStorming:** the emotional and cross-channel dimension. A process can be
flawless in event terms and still be abandoned at step three. Also good at exposing touchpoints
outside the software — the phone call, the paper form, the WhatsApp message — which are frequently
where a missing domain concept is hiding.

## User Story Mapping

<https://www.jpattonassociates.com/user-story-mapping/> — Jeff Patton. Covered in depth under
`1-understand/references/user-story-mapping.md`, since it spans both stages.

In discovery it earns its place at the **end**: once the events are on the wall, the map turns them
into a sequence someone can slice into releases without losing the narrative.

## Combining them

A pattern that works, escalating only as far as the questions require:

1. **EventStorming Big Picture** — map the terrain, collect hotspots
2. **Domain Storytelling** on the flows where hand-offs looked tangled
3. **Example Mapping** on the hotspots that turned out to be rule disputes
4. **User Journey Mapping** where the hotspot was about experience, not process

Each step is triggered by something the previous step found, so the sequence stops on its own when
the questions run out. Running all four regardless is how discovery gets a reputation for being
expensive.
