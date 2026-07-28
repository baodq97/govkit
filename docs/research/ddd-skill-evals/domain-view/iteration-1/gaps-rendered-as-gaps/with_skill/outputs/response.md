The model is on a screen. Open this — the key gates every route, so a bare `host:port` is refused:

**http://localhost:46289/?key=52d5dd8b342f585c**

One payload (`.ddd-flow/preview/model.json`) feeds every lens, so two views cannot tell the room
different stories. Four artifacts are in the rail: **Review** (state & findings), **Context map**
(Map / Mass / Matrix), **Business model** (the nine-block canvas), **Discovery timeline**.

## Open the Review lens first, not the map

The map is the pretty one; the Review lens is the one that will change a decision. It found **8
findings, 7 of them high**, and they are not cosmetic — they say the classification in
`context-map.md` contradicts the business model the same repo already contains:

| What the model says | What the business model says |
|---|---|
| Consolidation → `supporting` | container-fill optimisation is the **one** thing that differentiates, and carries an 18% premium |
| Invoicing → `core` | *"nobody has ever chosen us because of our invoices"* |
| Customs → `core` | required, and two vendors already do it well |

4 of 7 contexts are labelled `core`. When four things are core, nothing is. `context-map.md` says
outright that the classification "has not been revisited since the first modelling session in
March", and the strategize step that owns this fix has never run.

## The three things worth ten minutes tomorrow

1. **The investment is pointing away from the differentiator.** Invoicing is 34 tables / 311
   attributes — 51% of the whole schema — and differentiates on nothing. Consolidation, the thing
   customers pay a premium for, is 5 tables / 41 attributes and is modelled thinner than the
   median. On the Mass lens Invoicing draws a *short* bar next to a "34 tables · 311 attrs"
   subtitle: the bar is modelled weight, the subtitle is legacy weight. That gap is the finding —
   a large system nobody has modelled.
2. **`ConsignmentLine` is written by both Booking and Consolidation.** That is a Shared Kernel
   whether or not anyone chose it. `context-map.md` names it; no model.yaml labels it. Two shipments
   landed in the same container slot in March and, per the planner, "nobody agrees where the check
   should have happened" — that hotspot and this shared entity are probably the same bug.
3. **Finance and operations mean different things by "consignment"** — a billable line vs a
   physical stack of pallets. Both definitions are in the ubiquitous language, in different
   contexts, undeclared as a translation. That is a room-full-of-people question, so ask it while
   the room is full.

## What the picture does not know — and shows as not-knowing

Gaps render as gaps here, not as whitespace, because a diagram that looks complete wins arguments
it should lose.

- **Four canvas blocks are hatched and tagged `open`** — Key Partnerships, Key Activities, Customer
  Relationships, Channels. The canvas was captured abridged; these were never asked. Cost Structure
  is hatched too, carrying its question and who could answer it (nobody in the room owns the P&L).
- **Value Propositions is tagged `proxy`.** No customer took part in either session. The commercial
  director spoke for them. The attendance line sits under the canvas, not in a footnote.
- **`CustomerNotified` is the one candidate event** of eleven — inferred from notification
  templates; nobody confirmed when it fires. It renders differently from the ten a person confirmed.
- **The timeline never says which elements happen today.** As-is, to-be and could-be are
  indistinguishable, and the page says so in a banner. A boundary drawn around future behaviour
  looks exactly like one drawn around a running system.
- **Half the flow has never run.** connect, strategize, organise, define, code — 4 of 8 steps are
  `missing`, and decompose is stale against discover (discovery landed 2026-05-25, the model
  2026-06-02 but from the March session). There is no core domain chart, so nothing on screen ranks
  investment; the Review lens lists that as a gap rather than drawing an empty chart.

## Two caveats you should hear before you present it

- The extractor dropped four things the source docs do contain, and I re-keyed them from those docs
  into the payload rather than touch the frozen shell: the timeline hotspots and confirmed/candidate
  counts (the wall was rendering 11 blank cards and a false "nothing was confirmed by a person"
  banner), the declared `mass:` blocks (no context had a weight bar), the two external systems
  (Partner Network, Tariff Data — their edges had nowhere to land), and the truncated open question.
  That normalisation is `.ddd-flow/enrich.py`; re-run it after any `ddd_view.py` run or those
  numbers go back to zero. Every value in it is copied from a file under `docs/domain/` — nothing
  inferred.
- `Quoting → TariffData` exists in `context-map.md` and not in `quoting/model.yaml`. I drew it so
  the drift is visible on the map rather than invisible in a diff.

The page re-renders itself within a second when the payload changes, but I only act on what you say
after your next turn — the model will not change while you watch. Tell me what the room pushes back
on and I will rewrite it. `.ddd-flow/` is already gitignored; the server exits after 4 hours idle.
