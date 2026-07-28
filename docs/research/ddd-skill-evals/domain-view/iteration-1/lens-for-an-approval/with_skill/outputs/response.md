The model is on screen. Open this and stay on the **Review** lens for the first five minutes:

**http://localhost:45629/?key=0aa491c9e5f70468**

(Local session, key-gated — a bare `host:port` returns 403. If it has expired by meeting time, two commands bring it back:
`python3 <ddd-flow>/skills/view/scripts/ddd_view.py --root . --out .ddd-flow/preview/model.json`
then `node <ddd-flow>/skills/view/scripts/preview-server.cjs --dir .ddd-flow/preview`.)

## The short answer

**Do not sign this off as safe to build on.** The boundaries are mostly reasonable; the *investment
split* is wrong, and one revenue-critical rule has nowhere to live in the model as drawn.

Concretely: 3 of the 8 modelling steps have run. 8 findings, 7 of them high, and they all say the
same thing from different angles — the money is being spent on the parts that do not differentiate.

## The three things to put on screen

### 1. Review lens — 7 high findings, one theme

| Finding | Evidence |
|---|---|
| Consolidation carries the differentiation, labelled `supporting` | `consolidation/model.yaml: supporting` vs `business-model.md: container fill optimisation → differentiation: yes` |
| Invoicing holds 51% of the mass and differentiates on nothing | 311 of 608 attributes; `business-model.md: Invoicing → differentiation: no` |
| Customs labelled `core`, differentiates on nothing | two vendors already cover all nine ports; `customs/model.yaml: notes: we integrate with neither` |
| 4 of 7 contexts labelled `core` | Booking, Customs, Invoicing, Quoting — differentiation was assumed, not assessed |
| Consolidation is under-invested for a core | 41 attributes vs median 54 |

Cross-check against the business model, which is unusually blunt for a document written in-house:
the premium the company actually sells is *Guaranteed Consolidation* (+18% of the forwarding fee),
and the commercial director's line on Invoicing is *"nobody has ever chosen us because of our
invoices."* The model has that backwards. `5-strategize` — the step that owns this decision — has
never run, which is why nothing pushed back.

### 2. Mass lens — the picture the context map cannot draw

The context map draws Invoicing and Consolidation as equal-sized boxes. They are not:

| Context | Label | Tables | Attributes | Share |
|---|---|---|---|---|
| Invoicing | core | 34 | 311 | **51%** |
| Customs | core | 12 | 96 | 16% |
| Quoting | core | 11 | 78 | 13% |
| Booking | core | 9 | 54 | 9% |
| Consolidation | **supporting** | 5 | 41 | 7% |
| Routing | supporting | 3 | 17 | 3% |
| Notifications | generic | 2 | 11 | 2% |

89% of the modelled system sits behind the `core` label, and half of it is an eleven-year-old
invoicing system whose own notes say three of its five aggregates exist to model VAT variations.
That is a maintenance estate, not a core domain. The thing the customer pays a premium for is 7%.

### 3. The double-booking hole — the actual blocker

This one is **not visible in any lens**; I read it out of the source files, and I would put it on a
slide rather than the screen:

- `consolidation/model.yaml` invariant — *"A container's committed volume must never exceed its capacity."*
- `booking/model.yaml` invariant — *"A booking may only be confirmed once its capacity has been reserved."*
- `booking/model.yaml` relationship — `{to: Consolidation, type: downstream, note: "synchronous remaining-capacity check before reserving"}`

So the rule that protects the +18% premium is enforced by Booking reading remaining capacity across
a context boundary, then acting on it. Two bookings can read the same free space. This is not
theoretical — `discovery/timeline.md` hotspot #1: *"Two shipments were committed to the same
container slot in March; nobody agrees where the check should have happened."* It already happened,
and the model still does not say where the check belongs.

The fix and the classification fix are the same fix: capacity is a `ContainerLoad` invariant,
Booking sends a reserve command and gets accepted or rejected — it never reads-then-decides. That
makes Consolidation core, which is what the business model said all along.

`4-connect` ("do real use cases flow across these boundaries without hidden coupling?") has never
run. It is the step that would have caught this by tracing one booking end to end.

## Two more worth a minute each

- **`Consignment` means two different things.** `booking/model.yaml`: *"the goods a customer hands
  over as one unit."* `invoicing/model.yaml`: *"a billable line on an invoice."* Hotspot #2 says
  finance and operations already collide over it. Neither file flags the collision, and no automated
  check catches term collisions — I found this by reading both files. One word, two meanings, in a
  ubiquitous language: rename one before code is written, not after.
- **Nobody owns the carrier-refusal path.** Routing is a `transaction-script` that "owns no rule of
  its own", yet hotspot #3 is *"nobody knows who is responsible when a partner carrier refuses a
  sealed container."* An unowned failure path in the middle of the shipment flow.

## What I would not let the meeting waste time on

Two honest caveats about the tooling, so nobody is misled by the screen:

- The Review lens reports **decompose is stale against discover**. It is a false positive here —
  computed from file mtimes, and every file in this checkout was written within one millisecond of
  the next. By document dates the context map (2026-06-02) is *newer* than the timeline
  (2026-05-25). Ignore it.
- The Discovery lens shows the 11 events and **nothing else**. The extractor's markdown fallback
  reads only the first table, so the 3 hotspots, the 3 stated business rules, and the
  confirmed/candidate split were dropped silently — no gap was printed. That means the single most
  important item (hotspot #1 above) is *not* on screen. An unparsed section and an empty section
  look identical here; do not read the Discovery lens as "we found nothing else."

One thing the screen does report honestly: the extractor flagged **no `core-domain-chart.md` —
`5-strategize` has not run**, and `cost structure` renders as a hatched, empty canvas block with its
question attached — *nobody in the room owns the P&L.*

## What to ask the group for

1. **Decide where the capacity check lives.** One decision, blocks everything downstream. My
   recommendation: inside `ContainerLoad`, with Booking issuing a command.
2. **Re-run the core/supporting classification against the business model.** The current labels have
   not been revisited since March — the context map says so in its own notes.
3. **Get a customer in the room, or stop calling the differentiation confirmed.** Neither session
   had one. The whole "consolidation is what we differentiate on" claim comes from the commercial
   director speaking for customers, tagged `proxy` in the business model. The strongest claim in
   this model is the least sourced one.
4. **Rule on `Consignment`.** Two owners, two definitions, one word.

If you want a verdict sentence for the room: *the boundaries are close enough to build on, the
investment split is not, and one rule the revenue depends on has no home — we can sign off on the
shape once the capacity check has an owner.*

Housekeeping: `.ddd-flow/` is already in `.gitignore`, so the preview stays out of the doc tree.
