# Discovery Summary — Depot / Equipment Hire Domain

**Source:** one facilitated session with Ops (HA) and Finance (MINH). Single transcript, ~15 exchanges.
**Prior art:** none. This is the first written record of the domain.
**Status:** raw discovery. Nothing here is ratified; several items are contested between the two participants.

## Confidence legend

Every claim in these documents carries one of:

| Label | Meaning |
|---|---|
| `CONFIRMED` | Stated by the owner of that area and not contradicted by anyone in the room. |
| `ASSERTED` | Stated once, by one person, with no corroboration and no evidence offered. |
| `CONTESTED` | Two participants stated incompatible versions. Unresolved in session. |
| `UNKNOWN` | Question raised or implied by the transcript, no answer given. |

## What this session established

1. There is a **transfer** flow: a contractor requests a machine at a depot other than the one holding it; a unit is physically driven between depots; on arrival it is marked available. `CONFIRMED` (HA)
2. There is **one hard invariant**, named as non-negotiable: a unit is never committed twice over overlapping time windows, and this holds **across depots**, not per depot. `CONFIRMED` (HA), motivated by a 2023 incident.
3. There is an **out-of-service** flow owned by the depot manager, which is supposed to cancel reservations on the affected unit. `CONFIRMED` (HA)
4. That cancellation is **not automated**. It runs on human memory and a whiteboard. `CONFIRMED` (HA) — this is the clearest system-shaped gap in the transcript.

## The single most important finding: "transfer" is two different things

The word `transfer` was used by both participants in the same session to mean two disjoint concepts:

- **HA (Ops):** the physical relocation of a unit from one depot to another — a van, a driver, usually overnight.
- **MINH (Finance):** a £180 line on an invoice. Explicitly disclaimed the physical move: *"The physical move isn't my problem, the charge is."*

This is not a synonym problem, it is a **homonym across two bounded contexts**. They have different lifecycles, different triggers, and — per the disagreement in §5 below — different completion conditions. Modelling them as one entity called `Transfer` will hard-code the disagreement into the schema and make the billing rule unexpressible.

Recommended split in the ubiquitous language (see `01-glossary.md`):

| Concept | Proposed term | Context |
|---|---|---|
| Physical relocation of a unit between depots | **Unit Relocation** | Operations |
| The £180 billable line raised for it | **Relocation Charge** | Finance |

Neither term is the participants' own word. Both need to be taken back to them for ratification — inventing vocabulary the business does not use is its own failure mode. The point is only that **"transfer" cannot survive as a single term**.

## The unresolved conflict, stated plainly

The two participants gave incompatible billing rules and the facilitator parked it:

- MINH: *"We charge on request, not on completion. If they cancel after we've dispatched, we still bill it."*
- HA: *"...that's news to me. I thought a cancelled transfer meant no charge."*

HA's reaction — surprise, not disagreement — indicates this is not a policy debate but an **information gap between two departments running on different assumptions**. Finance is authoritative on billing, so MINH's version is the likelier truth, but "likelier" is not a basis to build on. Treat it as `CONTESTED` and get a written ruling before any charge logic is designed. Tracked as **Q1** in `05-open-questions.md`.

Note the second-order consequence: if the charge is triggered by *request* and the relocation is triggered by *dispatch*, then the Relocation Charge and the Unit Relocation have **different start events and can end in different terminal states** (charge = billed, relocation = cancelled). That is independent confirmation that they are two concepts, not one.

## What was ruled out

- MINH explicitly disclaimed authority over out-of-service decisions (*"Not me."*) and over the physical move. Finance's surface in this domain is narrower than the shared vocabulary suggests.

## Biggest risks carried out of this session

1. **The invariant is asserted, not evidenced.** HA said double-booking *"can't be"* — present tense, as a statement of fact about the current system. But the out-of-service flow that protects it runs on a whiteboard. An invariant enforced by human memory is a convention, not an invariant. Worth measuring against real booking data before designing to it. (**Q6**)
2. **No agreed lifecycle for a unit.** `available`, `booked`/`committed`/`reserved`, `in transit`, `out of service` were all used loosely. Whether these are one status field or several overlapping concerns is unresolved. (**Q4**, **Q5**)
3. **One session, two people.** The depot manager — who holds the out-of-service decision — was not in the room and has not been interviewed.

## Recommended next steps

1. Get a written billing ruling from Finance on **Q1**. It blocks the charge model.
2. Interview a depot manager. They own a decision no one in the room owned.
3. Take the `Unit Relocation` / `Relocation Charge` split back to both participants for naming ratification.
4. Before treating the double-booking rule as an invariant, pull booking history and check whether it has ever actually been violated since 2023.

## Contents

- `01-glossary.md` — ubiquitous language, collisions flagged
- `02-actors-and-roles.md` — who decides what
- `03-workflows.md` — the two flows described, with gaps marked
- `04-rules-and-invariants.md` — rules with confidence and source
- `05-open-questions.md` — ranked, with who answers each
