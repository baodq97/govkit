# Strategic lenses

Three more Understand-stage tools. Each answers a question the Business Model Canvas and the User
Story Map cannot. Reach for one when its question is live — running all three by default burns the
stakeholders' patience before discovery has started.

| Lens | The question it answers | Reach for it when |
|---|---|---|
| Impact Mapping | *Why* does this goal matter, and who has to change behaviour for it to happen? | a goal exists but nobody can say how software achieves it |
| Product Strategy Canvas | What is the strategy connecting vision to today's work? | the roadmap is a feature list with no through-line |
| Wardley Mapping | How **evolved** is each capability — build, buy, or outsource? | deciding what is genuinely core versus commodity |

## Impact Mapping

<https://www.impactmapping.org/> — Gojko Adzic.

A mind map with four levels:

```
WHY      the goal, measurable        "cut depot-transfer turnaround to under 4h"
 ↓
WHO      actors who can help or hinder   depot clerk · driver · finance
 ↓
HOW      behaviour changes that would move the goal   "clerk sees live unit location"
 ↓
WHAT     deliverables that might cause the change     "live location on the availability board"
```

The discipline is reading it **downward as assumptions**: a deliverable is a bet that a behaviour
will change, which is a bet that the goal will move. Written this way, features become falsifiable
rather than mandatory.

**For DDD:** the WHO level names actors that should appear in discovery. A deliverable whose actor
nobody can name is usually a feature in search of a user.

## Product Strategy Canvas

<https://melissaperri.com/blog/2016/07/14/what-is-good-product-strategy> — Melissa Perri.

Connects the levels that usually float apart: **vision** (where the company is going) → **strategic
intent** (the business goal for this period) → **product initiatives** (the problems worth solving
to reach it) → **options/experiments** (how they might be solved).

Perri's point is that most "strategy" is a feature roadmap with no theory linking it to the vision.

**For DDD:** strategic intent is the cleanest source for the *medium-horizon* goal in the canvas,
and initiatives frequently map to capabilities that will need contexts.

## Wardley Mapping

<https://learnwardleymapping.com/> — Simon Wardley.

Positions every component on two axes: **value-chain depth** (how close to the user) and
**evolution** (how mature the component is as a practice):

| Stage | Meaning |
|---|---|
| **Genesis** | new, unexplored, uncertain |
| **Custom built** | companies build their own versions |
| **Product** | off-the-shelf versions exist, with differentiation |
| **Commodity** | highly standardised, utility-like |

The insight worth the effort: **evolution stage should determine treatment**. Genesis components
deserve exploration and tolerance of waste; commodity components should be bought and never
lovingly hand-built. Getting this backwards — hand-crafting a commodity while treating a genesis
capability as a known quantity — is a common and expensive failure.

**For DDD:** evolution stage is one of the three classification inputs this skill produces, and it
is what makes the generic classification defensible. A capability at commodity stage is generic
almost by definition; the organisation is not going to out-innovate the market on it.

Also note it is one of the two Bounded Context Canvas strategic-classification dimensions that a
purely structural decomposition otherwise has no way to fill.

## Choosing

Feeling obliged to run all five Understand tools is a good way to exhaust a room before the
important work starts. The canvas and the story map are the default pair — one for the business,
one for the user. Add a third lens only when a specific decision is stuck on the question that lens
answers, and say which decision it is.
