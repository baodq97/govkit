# Event Modeling — the specification phase, before aggregate internals

This is phase 1 of the CODE step. It answers "what exactly are we building, in slices a developer can
take" — and it comes **before** the Aggregate Design Canvas, not after, because the slices tell you
which aggregates deserve a canvas at all.

## Why it is not EventStorming

Easy to confuse, opposite purposes:

| | EventStorming | Event Modeling |
|---|---|---|
| Purpose | **discovery** | **specifying what will be built** |
| Branching | accepts ambiguity, hotspots, several narratives | **no branching** |
| Output | narrative, candidate boundaries | **a blueprint: wireframes → slices → Given/When/Then** |
| Event colour | **orange** | **yellow** |

The colour clash is real and both notations share blue = command and green = view. Mixing the two on
one wall is a reliable way to lose an afternoon. Pick one per session and say which.

By the time you reach this step, discovery already happened (`2-discover`) and the boundaries were
challenged (`4-connect`). Ambiguity that survives to here is an open question, not raw material.

## The four patterns

Everything on an event model is one of four shapes. Naming the shape is what makes a slice
implementable without further discussion:

| Pattern | Shape | Becomes, in code |
|---|---|---|
| **State change** | UI/actor → **command** → aggregate → **event** | a command handler |
| **State view** | **event(s)** → **read model** → UI | a projection plus a query |
| **Translation** | external system → **event** into our model | an anti-corruption adapter |
| **Automation** | **read model** → a processor issues a **command** | a policy / process manager |

The two that get missed: **translation** (someone assumes external data just appears) and
**automation** (a rule that fires by itself gets modelled as if a human pressed a button).

## A slice

> *"the smallest possible work that can be handed over to a developer"*

One slice = one pattern instance, with everything it needs:

```markdown
### Slice: Reserve capacity for a booking
Pattern: state change
Trigger: Depot planner submits the booking form (wireframe ref: booking-form)
Command: ReserveCapacity { containerId, bookingId, volumeM3 }
Aggregate: ContainerLoad
Event(s): CapacityReserved { containerId, bookingId, volumeM3 }
         | CapacityRejected { containerId, bookingId, reason }
Read models touched: RemainingCapacityByDeparture

Given a container with 40m³ capacity and 35m³ committed
When ReserveCapacity arrives for 8m³
Then CapacityRejected is emitted with reason "insufficient capacity"
And committed volume stays 35m³
```

This is a better unit of work than a user story once a system has events: it names the command
handler, the events, the projection, and the acceptance test in one place, and two slices can be
built by two people without a conversation.

## How to run it

1. **Lay the timeline** of the scenario left to right — the same scenario the flows in `4-connect`
   traced, now at the level of one context.
2. **Put the wireframes on top.** A slice with no UI or API surface is either an automation or a
   translation — say which.
3. **Fill the four patterns underneath**, in order along the timeline.
4. **Cut into slices** and write Given/When/Then for each. A slice you cannot write a Then for is not
   specified yet.
5. **Only then** open the Aggregate Design Canvas — and only for the aggregates the slices actually
   touch. Aggregates nothing points at are speculative.

## What it exposes that the canvases do not

- **A read model nobody owns** — someone must decide before acting, and no context publishes what
  they need to see.
- **An event with no consumer** — either a missing policy, or an event that should not exist.
- **A command issued from a screen with no data to justify it** — the UI implies a decision the model
  cannot support.
- **A missing rejection path.** Slices force a Then, and "what happens when it fails" is where
  happy-path models break. In practice this is the most common find.

## Hard rules

- **No branching.** If a scenario forks, it is two slices. A branching event model is an
  EventStorming session that wandered.
- **Never invent a Then.** The expected outcome is a business statement; if nobody can say what
  should happen, the slice carries an open question and is not ready to hand over.
- **Slices reference, never redefine.** Commands, events and aggregate names come from the model.
  A new name appearing here is either a missing model element (propose the delta) or a synonym
  (fix the language).

## Sources — go and check

| Claim | Source |
|---|---|
| Event Modeling definition, the four patterns, slices, "no branching" | https://eventmodeling.org/posts/what-is-event-modeling/ |
| Slice as the smallest handover unit; Given/When/Then per slice | https://eventmodeling.org/ |
| EventStorming's purpose and colour grammar (for the contrast) | https://www.eventstorming.com/ |
| Design-level EventStorming as the alternative to this step | Alberto Brandolini, *Introducing EventStorming* — https://leanpub.com/introducing_eventstorming |
