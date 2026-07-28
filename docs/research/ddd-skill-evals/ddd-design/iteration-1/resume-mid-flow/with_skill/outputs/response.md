You don't start — you resume. I read the repo state before planning anything, and three steps are already done.

## What's on disk (from `ddd_state.py --root .`)

```
loop step        status    evidence
1    understand  done      docs/domain/business-model.md
1    discover    done      docs/domain/discovery/timeline.md
2    decompose   done      context-map.md + 7 model.yaml
2    connect     -         —
2    strategize  -         —
2    organise    -         —
3    define      -         —
3    code        -         —

journal: 0 entries — nothing recorded yet
```

Loops 1 and 2 are half done and nobody wrote down what happened. The single most expensive thing I could do here is re-run understand or discover: both artifacts carry named sources (commercial director 2026-05-18, two depot planners, a customs clerk, a finance analyst) and re-running would overwrite findings that have people's names on them. Not doing that.

## Start at `connect` — `domain-connect`

Five things could come next. I'd run **connect** first, for three reasons that are in your own files:

1. **It's the cheapest step that can still invalidate the rest.** `define`, `code` and `organise` all list `connect` and `decompose` as invalidators. Finding out the boundaries are wrong now is worth more than deepening them and re-doing it later.
2. **All three of your discovery hotspots are cross-boundary flow questions**, which is exactly what connect traces:
   - Hotspot 1 — "two shipments committed to the same container slot in March; nobody agrees where the check should have happened". `booking/model.yaml` says Booking does a *synchronous remaining-capacity check* on Consolidation and then commands it to reserve, while the no-overbooking invariant lives in `consolidation/model.yaml`. That's a check-then-act across a boundary; the race is structural, not a bug someone can patch.
   - Hotspot 3 — nobody owns the carrier refusing a sealed container. Customs owns "a shipment cannot be handed to a carrier before its declaration is submitted", but **Routing** is the context that hands it over — and Routing owns no invariant at all.
   - Hotspot 2 — "consignment" means a billable line in Invoicing and a physical unit in Booking. Both models still carry both meanings, and `ConsignmentLine` is declared a **Shared Kernel written by both Booking and Consolidation**. That's the highest-risk coupling on your map.
3. **Seven contexts.** The prior is that connect pays from three upward; at seven, skipping it means the coupling only shows up in production.

One readiness heuristic fails going in, and I'd rather say it than have it surface later: *"does every context own a real invariant?"* — Routing doesn't (`aggregates_rationale: "It owns no rule of its own"`). A context with no rule is usually a capability, not a context. I'm not sending you back to decompose on that alone, because tracing one flow gives evidence and re-decomposing on a hunch doesn't. But if connect confirms Routing is a pass-through, decompose re-enters in update mode for that one context.

## Then `strategize` — and this one isn't optional here

Your two documents openly contradict each other, and nobody has reconciled them:

| | `business-model.md` says | `context-map.md` says | mass |
|---|---|---|---|
| Invoicing | differentiation **no** — *"nobody has ever chosen us because of our invoices"* | **core** — "the largest and most business-critical system we run" | 34 tables, 5 aggregates |
| Consolidation | differentiation **yes** — the +18% Guaranteed Consolidation premium, the thing customers pay for | **supporting** — "back-office load planning" | 5 tables, 1 aggregate |

Your biggest model sits on your least differentiated capability, and your differentiator is a fifth its size and still partly run on a whiteboard in Gothenburg. Four of seven contexts are labelled `core`, which means the label has stopped carrying information. The classification note says it hasn't been revisited since March. That's an investment-mismatch check worth an afternoon.

Caveat to carry into it: the differentiation column is **proxy** — the commercial director speaking for customers, no customer in either room. The y axis will be sourced from one person's opinion, and the chart should say so.

## What I'd skip, and what that costs

- **organise — deferred, not skipped.** There is no headcount, team list, or ownership data anywhere in the repo. The readiness question is "is real headcount known?" and the answer is no, so the output would be a template, not a proposal. It's blocked on information, not on modelling. Send me the team list and it takes an hour. Cost of waiting: nothing yet — Conway's law bills you either way, but only once a second team exists.
- **define / code depth for Notifications** (generic, bought adapter, 2 tables) **and Routing** (pending connect). A stub is the correct output there, not a canvas.
- **Nothing else.** Five steps, not eight.

## The cheaper alternative, if you want something buildable in days

Instead of running each step across all seven contexts breadth-first, take **the Guaranteed Consolidation flow end to end**: quote → booking → capacity reservation → seal → declaration → invoice. It's the flow the +18% premium and the 71%→80% fill-rate goal both hang on, and it passes through every context where all three hotspots sit. Connect it, strategize it, define and code just Booking, Consolidation, Customs and Invoicing — then widen. You'd have the aggregate boundary that fixes the March double-booking within a week, instead of a complete model in six.

## Recorded

I appended the state read, the plan and nine open items to `docs/domain/.ddd-journal.jsonl` and regenerated `docs/domain/MODELLING-LOG.md` — including the three deviations (organise deferred for missing headcount; understand/discover deliberately not re-run; define/code waived for Notifications and Routing). The open items now come back as `[resolve]` candidates on every future state read, so the March slot collision and the Consignment naming clash stop quietly disappearing.

Say the word and I'll run `domain-connect` on the Guaranteed Consolidation flow. One step, then I re-read state and tell you what it changed — I'd rather not chain three steps and hand you three artifacts resting on assumptions nobody checked.
