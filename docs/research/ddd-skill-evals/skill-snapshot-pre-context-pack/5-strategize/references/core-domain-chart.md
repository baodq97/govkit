# Core Domain Chart — the two axes

Adapted from ddd-crew/core-domain-charts (CC BY 4.0). This file covers *how to place a context*;
`strategic-moves.md` covers *what to do about where it landed*.

## Why a chart and not a label

`core / supporting / generic` is a classification. A chart is a **relative ordering**, and it makes
three things visible that a label cannot:

- **Distance.** Two contexts both called "core" are rarely equally core. The gap between them is
  where the staffing decision lives.
- **The fourth quadrant.** High complexity, low differentiation has no name in the three-way scheme,
  so it stays invisible — and it is where most legacy money burns.
- **Disagreement.** People argue about a dot's position in a way they never argue about a label,
  because a position is a claim. ddd-crew is explicit that the conversation is the point of the
  technique, especially across disciplines: engineers can gauge complexity, product and business
  stakeholders supply differentiation.

## Axis 1 — model complexity (x)

Three kinds of complexity get confused. Separate them, because they lead to opposite decisions.

| Kind | Question | If this is what's high |
|---|---|---|
| **Essential domain complexity** | How difficult is it to design a conceptual model for this domain, and build and maintain it as software? | genuine — it justifies investment if differentiation is also high |
| **Accidental technical complexity** | Is the current solution more complex than it needs to be for the functionality it provides? | not the domain's complexity — it is a debt finding, and it argues for simplification, never for more investment |
| **Operational complexity** | Are there complex processes, calculations, or decisions happening *outside* the software — on spreadsheets, whiteboards, in someone's head? | often the largest untapped opportunity: the complexity is real, but the software has not absorbed it yet |

Further clues from ddd-crew, worth walking through per context:

- How difficult is **discovering** potential new value here?
- How difficult is designing the rules, logic and workflows that create value?
- What **scale** must it operate at? Simple rules at extreme scale are still complex.
- Does it need **specialist expertise** that is difficult and expensive to acquire?
- How long does a **newcomer** take to ramp up and become efficient?
- Which [Cynefin](https://cynefin.io/wiki/Cynefin_Domains) domain does it fall in — clear,
  complicated, complex, chaotic? A complex domain needs probes and experiments, not a specification.

**Measure first, judge second.** Aggregate count, invariant count, entity/VO count, event count,
table and attribute mass, and boundary-crossing queries are all sitting in the existing artifacts.
They are proxies, not truth — but they anchor the conversation, and they make the judged adjustment
visible as an adjustment rather than smuggling it in as fact.

The trap to name explicitly: **accidental complexity inflates the same proxies as essential
complexity.** Thirty tables can mean a rich domain or a schema nobody dared to refactor. Ask which,
and record the answer — otherwise the chart rewards the messiest code with the most investment.

## Axis 2 — business differentiation (y)

Not "is this important" — almost everything in a running business is important. The question is
whether *doing it better than competitors* wins anything:

- How hard would it be for a **new entrant** to match or exceed this capability?
- How hard would it be for an **existing competitor** to?
- How much advantage does it currently produce — revenue, brand, engagement?
- How much could it *potentially* produce?
- What **damage to the brand** would major or recurring failures here cause?

A capability that is essential to operate but that no customer would ever choose you for is low
differentiation and high necessity at once. Payroll, invoicing, notifications: mission-critical,
zero differentiation. That combination is normal and is not a criticism of the context — it is the
whole reason the chart exists.

This axis is not the engineering team's to place alone. If nobody from product or business is in the
room, place x, leave y `unknown`, and record who is needed.

## Reading the quadrants

The axes are ddd-crew's; the quadrant readings below are this skill's summary of what each position
implies. Treat them as a starting interpretation to argue with, not a taxonomy to file things under.

| Position | Reading | What it implies |
|---|---|---|
| **High complexity, high differentiation** — *Core* | You win here, and it is hard to copy | Build in-house. Deepest domain model. Best people. Longest-lived team. Never outsource. |
| **Low complexity, high differentiation** — *Exposed advantage* | You win here, but it is easy to copy | Exploit it now and expect parity. Do not over-architect it. Start looking for the next core — the advantage has a clock on it. |
| **Low complexity, low differentiation** — *Generic* | Everyone has it, nobody chooses you for it | Buy or adopt. Building it is pure cost. Integrate behind a thin adapter so replacing it stays cheap. |
| **High complexity, low differentiation** — *Cost sink* | Expensive, and it wins nothing | The hardest quadrant to admit to. Buy, outsource, or aggressively simplify. Check first whether the complexity is accidental — if so, the answer is simplification, not procurement. |

The *exposed advantage* quadrant is the one teams misread most often. Early music-streaming services
differentiated on catalogue breadth — a real advantage, and a low-complexity one. Competitors reached
parity within a few years, and the core moved to discovery and recommendation. The lesson ddd-crew
draws from it: while you are enjoying a low-complexity advantage, be thinking ahead to the next core
domain rather than pouring architecture into the current one.

## The third dimension worth recording — evolution

Position is a snapshot; **evolution** says where the snapshot is heading. `1-understand`
records `evolution_stage` per capability (genesis · custom-built · product · commodity, from Wardley
Mapping). Carry it onto the chart as an annotation.

The combination that matters: a capability drifting toward *product* or *commodity* is on its way to
the bottom-left, whether or not you act. When a vendor productises what you built, your
custom-built context becomes a cost sink overnight. Recording evolution is what turns that from a
surprise into a planned migration.

## Variant — architecture migration

ddd-crew notes that with a small tweak to the y-axis label, the same chart plans the **order of a
migration** from the current architecture to the target one: keep complexity on x, and swap
differentiation for *value of migrating this context now*. The ordering that falls out is the
migration sequence. Useful directly after `3-decompose` names the load-bearing extraction seam
— the seam tells you *where* to cut, this tells you *when*.

## Pitfalls

- **Everything in the top-right.** The most common failure. If every context is core, differentiation
  was never assessed — it was assumed. Force the relative ordering: which of these two is *more*
  core?
- **Confusing "hard" with "valuable".** Engineers place interesting problems high on both axes.
  Interesting is x, not y.
- **Confusing "big" with "complex".** A 40-table CRUD schema is large and simple. Aggregate and
  invariant counts discriminate better than table counts alone.
- **Placing dots with no evidence column.** A dot with no reason next to it cannot be challenged,
  which defeats the purpose of the technique.
- **One-time exercise.** A chart from eighteen months ago describes the market of eighteen months
  ago. Re-run it when the trajectory triggers fire.

## Sources

- ddd-crew, *Core Domain Charts* (CC BY 4.0) — the two axes, the assessment clues, relative-ordering
  guidance, the architecture-migration variant, and the first-to-market example.
- Simon Wardley, *Wardley Mapping* — evolution stages.
- Dave Snowden, *Cynefin* — matching approach to the kind of complexity.
- Further reading: Nick Tune, *Core Domain Patterns* — named patterns for chart regions.
