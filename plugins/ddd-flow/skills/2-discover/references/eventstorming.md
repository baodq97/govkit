# EventStorming

A workshop format for exploring a domain by laying its events on a wall in time order, invented by
Alberto Brandolini — <https://www.eventstorming.com/>. The recommended starting technique for the
Discover step.

Its power is social before it is technical: it puts developers and domain experts at the same wall
using the same vocabulary, and the disagreements it surfaces are the point, not friction to smooth
over.

## The sticky grammar

Colour is convention, not law, but keeping it consistent matters — participants learn to read the
wall at a glance. This skill uses the same names in `model.json` so the browser surface and the
physical wall speak one language.

| Element | Colour | What it is | Form |
|---|---|---|---|
| **Domain event** | orange | something that happened, that a domain expert cares about | past tense — `OrderPlaced` |
| **Command** | blue | an intent that causes an event | imperative — `PlaceOrder` |
| **Actor** | small yellow | the person or role issuing the command | role noun — `Depot Clerk` |
| **Policy** | lilac | a reaction: "whenever X, then Y" | `whenever a unit is reported out of service, cancel its reservations` |
| **Read model** | green | the information someone looks at to decide | `Availability board` |
| **External system** | pink | something outside the boundary that sends or receives | `Payment gateway` |
| **Aggregate** | large yellow | the thing commands are issued against and that enforces rules | noun — `Reservation` |
| **Hotspot** | red | disagreement, uncertainty, "it depends", "we'd have to ask X" | a question, phrased as a question |

## Three levels

Run only the level the question needs; each is a separate session with a different room.

**1. Big Picture** — the whole business on one wall, events only, chronological. The room is wide:
multiple teams, business people, whoever knows a piece. Goal is a shared map and a list of
hotspots. This is where boundaries first become visible, as places where the language changes.

**2. Process Level** — one flow in detail, adding commands, actors, policies, read models and
external systems. The room narrows to the people who own that flow.

**3. Design Level** — aggregates and their invariants, close to code. Only for the areas that
turned out to be core.

For the DDD modeling process, **Big Picture first**. Going straight to Design Level on a domain
nobody has mapped produces a beautiful model of the wrong thing.

## Facilitating

**Start where it matters, not at the beginning.** "User signs up" is chronologically first and
almost always the least interesting thing in the domain. Start from the event that carries the
most money, risk or pain and work outward in both directions — the room's energy is finite and
should be spent where the modelling will be.

**Chaotic exploration is normal.** Events arrive out of order, duplicated, at inconsistent
granularity. Let the wall be messy first and enforce the timeline second; premature tidying
suppresses exactly the contributions from quieter participants that discovery needs.

**Enforce past tense.** "Booking" is a noun and hides whether anything happened. "BookingConfirmed"
forces the room to agree that a specific thing occurs at a specific moment — and that is where
disagreement surfaces.

**Chase the pivotal events.** Some events change everything downstream (`ContractSigned`,
`PaymentCaptured`). They tend to sit on boundaries and are worth extra time.

**Hotspots are the deliverable.** When two people disagree, resist adjudicating. Write the
disagreement as a red sticky, attach both names, move on. A workshop that ends with twelve honest
hotspots has done more for the next step than one that ends with a tidy consensus somebody was
talked into.

**Watch for the same word meaning two things.** Ops says "transfer" is a truck moving equipment;
finance says it is a line item. That is not a vocabulary cleanup task — it is the clearest
boundary signal EventStorming produces, and it should be recorded with both holders named.

## Adapting it to an agent-facilitated session

This skill runs the format with an agent as facilitator and a browser as the wall. Two things
change, and both need saying out loud:

**What is preserved:** the grammar, the timeline, the visual surface, the hotspot discipline, and
the fact that everyone sees the same model update at once.

**What is not:** the room. An agent proposing candidate events from documents is doing preparation,
not discovery. Discovery happens when a domain expert says "no, that's not how it works" — and
that requires a domain expert. A session with no domain expert present has produced a literature
review with orange stickies on it.

Practical consequence: every element carries whether it was **confirmed** by a person or is a
**candidate** derived from an artifact. A run that never converts a candidate into a confirmation
did not discover anything, and the output should say so plainly rather than looking like a finding.

## Discovery is continuous

Successful teams run discovery frequently — there is always more to learn about the domain. Treat
a session's output as the current best understanding with a date on it, not a deliverable that
closes the topic. The unknowns recorded at the end are the agenda for the next round.

For a first attempt, an experienced human facilitator is worth a great deal; recommend one rather
than implying the agent substitutes for that experience.

## Further reading

- <https://www.eventstorming.com/> — Brandolini's site
- *Visual Collaboration Tools* (leanpub) — the ddd-crew recommendation for running visual sessions
