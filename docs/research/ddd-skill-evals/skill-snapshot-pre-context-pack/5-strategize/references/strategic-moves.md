# Strategic moves — turning placement into decisions

A chart nobody acts on is a nice picture. This file is the decision table for step 4, plus the
anti-patterns that show up most often when the decisions get made badly.

## 1. Build / buy / outsource

| Quadrant | Default move | Why | When to deviate |
|---|---|---|---|
| **Core** (high complexity, high differentiation) | **Build**, in-house, with the strongest people | This is what you are paid for. Outsourcing it exports the learning loop along with the code, and the learning loop is the advantage. | Almost never. If capacity forces it, hire in rather than contract out. |
| **Exposed advantage** (low complexity, high differentiation) | **Build**, but deliberately thinly | The advantage is real and short-lived. Speed beats architecture; over-engineering here spends the window you were supposed to be exploiting. | If a vendor already does it well and integration is fast, buy and spend the time on the next core. |
| **Generic** (low complexity, low differentiation) | **Buy** or adopt | Every hour here is an hour not spent on core, and the market solution is better than what you would build. | Regulatory or data-residency constraints; or the integration cost genuinely exceeds the build cost (measure, don't assume). |
| **Cost sink** (high complexity, low differentiation) | **Buy, outsource, or simplify** | Expensive and it wins nothing. | First check whether the complexity is *accidental* — if the domain is simple and the code is not, simplification is the move, and buying will just relocate the mess. |

Two rules worth stating explicitly because organisations get them wrong in opposite directions:

- **Do not outsource the core.** The vendor learns your domain; you learn procurement.
- **Do not build the generic.** "Our needs are special" is almost always accidental complexity
  wearing a business costume. Make it concrete: name the requirement no vendor meets.

## 2. Modelling rigour

Placement decides how much DDD machinery each context earns. This feeds `3-decompose`'s
tactical right-sizing directly — uniform aggregate ceremony across every context is a cargo-cult
smell, and the chart is the evidence for where to stop.

| Quadrant | Tactical pattern | Testing | Documentation |
|---|---|---|---|
| Core | Full domain model — aggregates as real consistency boundaries, invariants named, events modelled | highest — property tests, invariant tests, scenario coverage | Bounded Context Canvas, aggregate canvases, message flows |
| Exposed advantage | Lighter model; ship, measure, revisit | proportionate | enough to hand over |
| Generic | Thin adapter over the bought thing; no domain model | contract tests at the seam | the seam and the vendor contract |
| Cost sink | Contain it. Anti-corruption layer, freeze the model, stop extending | characterization tests before touching it | what it does and what would replace it |

## 3. Team-type implications

Feeds `6-organise`. Placement is a strong signal for what kind of team a context needs, though
the topology decision also has to respect the organisation's actual size.

| Quadrant | Team shape |
|---|---|
| Core | A long-lived **stream-aligned** team that owns it end to end. Stability of membership matters more here than anywhere else — the domain knowledge *is* the asset. |
| Exposed advantage | A small fast team with permission to fail and a fixed budget. In Wardley's terms, **pioneers**: they explore, they fail often, and isolating them protects the core from the churn. |
| Generic | Owned as a **service consumed** by whoever needs it. Nobody's full-time job. |
| Cost sink | Minimum viable ownership while it is contained or replaced. Do not staff it with the people you need on core. |

A note on the pioneer split: separating experimentation from the stable core is a deliberate
structure, not a cultural accident. Pioneers explore uncharted territory and fail a lot; the value of
isolating them is that failure stops being a threat to the running business, which is what makes it
affordable.

## 4. Cross-check — the Purpose Alignment Model

A second lens on the same decision, useful when the room is stuck on the chart. Nickolaisen's model
asks two questions: is this **mission-critical**, and is this **market-differentiating**?

| | Market-differentiating | Not differentiating |
|---|---|---|
| **Mission-critical** | **Differentiating** — invest, do it uniquely, this is where creativity pays | **Parity** — do it as well as everyone else and no better; standardise, simplify, buy |
| **Not mission-critical** | **Partner** — collaborate with someone who does it well | **Who cares** — minimum viable effort, and stop discussing it |

The value of running both models is the disagreements. A context the chart calls generic but that the
purpose model calls mission-critical parity is not "unimportant" — it is *important and not worth
differentiating on*, which is a different instruction to a team. Reliability requirements come from
mission-criticality; investment in uniqueness comes from differentiation.

## 5. Anti-patterns

Check each of these against the chart before emitting. Each one is a finding with a name.

- **Everything is core.** Differentiation was assumed rather than assessed. Force pairwise ordering
  until at most one or two contexts remain on top.
- **The biggest model is in the least differentiating context.** The investment mismatch. Report it
  with the numbers; it usually reframes the whole roadmap discussion.
- **The differentiator has a thin model.** The mirror image, and the more urgent one — the thing you
  compete on is under-invested, and nobody noticed because it was small enough to look healthy.
- **Outsourcing the core to hit a deadline.** Trades a permanent capability for a temporary date.
- **Building generic "because our needs are special".** Name the specific requirement no vendor
  meets. If you cannot name one in a sentence, there isn't one.
- **Refactoring the cost sink instead of containing it.** Effort spent making a non-differentiating
  complex context beautiful is the most expensive kind of waste, because it feels like engineering
  progress.
- **A chart with no dates.** Placement is a bet on the future; an undated bet is indistinguishable
  from an inherited assumption a year later.

## Sources

- ddd-crew, *Core Domain Charts* (CC BY 4.0).
- Niel Nickolaisen, *The Purpose Alignment Model*.
- Simon Wardley — pioneers / settlers / town planners; evolution and outsourcing signals.
- Team Topologies — stream-aligned team ownership of a bounded context.
