# Team Topologies — types, modes, load, and the ISH checklist

Adapted from Team Topologies (Matthew Skelton & Manuel Pais) and TeamTopologies/
Independent-Service-Heuristics (CC BY-SA 4.0). This file is the *how to assign*; the map itself is
in `sociotechnical-context-map.md`.

## 1. The four team types

| Type | Definition | Owns a bounded context? | The test that justifies it |
|---|---|---|---|
| **Stream-aligned** | aligned to a flow of work from (usually) a segment of the business domain; owns end-to-end delivery with no handoffs | **yes — this is the default owner** | Can this team deliver a change to a user without waiting on another team? |
| **Platform** | a grouping of other team types providing a compelling internal product that accelerates stream-aligned teams | no domain contexts — it owns internal products | Are several stream-aligned teams independently solving the same non-domain problem? |
| **Complicated-subsystem** | for parts needing significant mathematics, calculation, or deep technical expertise | at most one, and only where the expertise genuinely cannot be spread | Would a stream-aligned team need a specialist it cannot realistically hire or train? |
| **Enabling** | helps stream-aligned teams overcome obstacles and detects missing capabilities | **no** — temporary by design | Is the gap a *capability* rather than a backlog of work? What is the exit condition? |

**The over-application to guard against is complicated-subsystem.** Every one of them creates a
handoff, and handoffs are the thing the whole model exists to remove. "This is complicated" is not
the test; "no stream-aligned team could realistically hold this expertise" is. Recommendation
engines, pricing optimisers and geospatial routing sometimes pass. CRUD-with-hard-rules does not.

**Platform is a product, not a department.** If stream-aligned teams have to file tickets and wait,
it is not a platform — it is a queue with better branding. The measure is self-service.

## 2. The three interaction modes

| Mode | Definition | Cost | Right use |
|---|---|---|---|
| **Collaboration** | two teams working together for a **defined period** to discover new things — APIs, practices, technologies | high — two teams' attention, blurred responsibility | genuine uncertainty at a boundary, time-boxed |
| **X-as-a-Service** | one team provides, one consumes, with a clear boundary | low, predictable | the steady state for most pairs |
| **Facilitation** | one team helps and mentors another, removing obstacles | medium, temporary | capability gaps; typically an enabling team |

The mode is not a description of how well two teams get along — it is a **design decision with a
cost**, and it should change over time. A new boundary often starts in Collaboration, and the
explicit goal is to graduate it to X-as-a-Service once the contract stabilises.

**A collaboration with no end date is a finding.** It means either the boundary is wrong (the two
contexts belong together) or the interface was never designed. Both are fixable; neither is fixed
by a recurring meeting.

## 3. Cognitive load

The core constraint of the whole model: a team can only hold so much. Load has three parts, and
they call for different remedies:

| Kind | What it is | Remedy |
|---|---|---|
| **Intrinsic** | inherent difficulty of the domain and technology the team must know | training, hiring, narrowing what the team owns |
| **Extrinsic** | accidental overhead — environments, deploy rituals, tooling, ticket queues | this is what a platform removes; it is usually the biggest and the most invisible |
| **Germane** | the useful thinking about the problem itself | this is what you are protecting; everything else is overhead competing with it |

**Estimating intrinsic load without a survey.** The model's own numbers are the best available
proxy, and they have the advantage of already existing:

- aggregates and invariants per owned context — how much rule-holding the team must do
- entities and value objects — how much vocabulary
- domain events and integrations — how much of *other* contexts the team must also understand
- sub-domain type — a core context costs far more attention than a master-data one

Rule of thumb: **one core context plus one or two supporting/generic ones per stream-aligned team.**
Argue with it using the numbers rather than treating it as a limit — but if a team is proposed to
own two core contexts, say out loud which one will get the leftovers, because one of them will.

**Teams break when responsibilities keep getting added and nothing is ever taken away.** The reason
to write the load budget down is not precision; it is to make removal a discussable act rather than
an admission of failure.

## 4. Team-first boundaries

The sequencing that distinguishes this from ordinary org design: **decide the team's maximum
cognitive load first, then choose the boundary that fits it.** Not the reverse. Boundaries chosen
purely from the domain model, and then handed to whichever team has capacity, are how a team ends
up owning four unrelated contexts and being described as "not delivering".

Useful fracture planes when a context must be split or grouped: business domain, regulatory
compliance, change cadence, risk, performance isolation, technology, and user personas. Team size
follows Dunbar-style limits — small, long-lived, stable teams, because domain knowledge is the asset
and it lives in people.

## 5. Conway, and the inverse manoeuvre

Conway's law says the system will resemble the communication structure of the organisation that
built it. It is not advice; it is what happens.

Two practical consequences:

- **A decomposition that contradicts the org chart loses.** If four teams share ownership of the
  context you designed as one, the code will grow four seams whether or not the model has them.
- **The inverse Conway manoeuvre**: change the team structure to the shape you want the architecture
  to take, and let the architecture follow. This is slow, political, and the only reliable lever
  when the current structure actively fights the model.

When the current org would produce a different architecture than the model intends, say so
explicitly with what would have to change. That statement is often the most actionable line in the
whole document — and it is the one an architecture diagram can never contain.

## 6. Independent Service Heuristics — the checklist

Rules of thumb for identifying candidate value streams and domain boundaries by asking whether the
thing **could be run as a separate SaaS/cloud product**. Run them per candidate boundary; the more
*yes* or *probably*, the stronger the case for a stream-aligned team owning it.

1. **Sense-check** — could it make logical sense to offer this "as a service"? Is it independent
   enough? Would consumers understand or value it? Would it simplify execution?
2. **Brand** — could you imagine it branded as a public cloud service? Would it be a viable
   micro-business? Could a marketing campaign be convincing?
3. **Revenue / customers** — viable with a paid offering, recurring revenue, a clearly-defined
   customer segment?
4. **Cost tracking** — could the organisation track its costs separately today (infrastructure,
   storage, transfer, licences)?
5. **Data** — can you clearly define the input data it needs? Are the sources internal, clean, and
   consumable self-service?
6. **User personas** — a small, well-defined set of user types whose needs you can articulate?
7. **Teams** — could a team build and operate it with **bounded cognitive load**, without needing
   significant platform abstractions built first?
8. **Dependencies** — could the team act independently most of the time, self-serving its
   dependencies without blocking?
9. **Impact / value** — is the scope big enough to be an engaging challenge and to produce
   recognised value?
10. **Product decisions** — could the team own its own roadmap, rather than being driven by other
    teams' priorities?

**Further considerations** worth checking alongside:

- **Vocabulary** — if the same word means different things in two areas, that is two services.
- **Phases** — an earlier or later phase of processing is often a good boundary.
- **Wardley** — could this be outsourced to a SaaS or commodity provider soon? If so, split it off
  now in preparation.
- **Risk** — what is the cost of getting the split wrong here?
- **Release coordination (anti-pattern)** — do producers and consumers need a coordinated release?
  Then it is not independent yet, whatever the other answers say.

Report the weak answers, not the total. ISH is designed to *stimulate conversation and provide a
frame for thinking*, not to be a catch-all score — a boundary that scores 9/10 and fails on
"dependencies" is a boundary with one specific problem to solve, and that problem is the finding.

## Sources

- Matthew Skelton & Manuel Pais, *Team Topologies*; teamtopologies.com key concepts — the four team
  types, three interaction modes, cognitive load, team-first boundaries.
- TeamTopologies, *Independent Service Heuristics* (CC BY-SA 4.0) — the checklist and further
  considerations.
- Melvin Conway, *How Do Committees Invent?* — Conway's law.
