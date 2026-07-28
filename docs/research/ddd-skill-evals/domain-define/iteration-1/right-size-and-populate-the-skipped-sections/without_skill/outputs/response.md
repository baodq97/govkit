Bounded contexts defined for Nordic Freight. Eight new files in `docs/domain/`, nothing existing edited.

## Right-sizing: 5 canvases, 2 stubs

Two of the seven contexts do not warrant a canvas, and the repo says so itself:

- **Routing** — `aggregates: []`, `transaction-script`, and its own rationale ends *"It owns no rule of its own."*
- **Notifications** — `aggregates: []`, `bought-adapter`, *"thin adapter over a bought email/SMS provider; no domain model."*

Both get a stub: boundary, typed messages, assumptions, metrics, open questions — no business-decisions or language sections, because there is nothing to put in them. Booking, Consolidation, Quoting, Customs and Invoicing get full canvases.

## The classification is inverted, and Invoicing is where it shows

`context-map.md` and `business-model.md` disagree for four of seven contexts. Both readings are carried into each canvas with sources; I changed no label, because classification is a business call and the contradicting evidence is one interview deep — every differentiation cell in `business-model.md` is marked `proxy`, since no customer was in the room.

The sharpest one:

| | `context-map.md` | `business-model.md` | Mass |
|---|---|---|---|
| Invoicing | `core` — "the largest and most business-critical system we run" | commodity, differentiation **no** — *"nobody has ever chosen us because of our invoices"* | 34 tables, 5 aggregates |
| Consolidation | `supporting` — "back-office load planning" | revenue-generator, custom-built, differentiation **yes** | 5 tables, 1 aggregate |

Those are two different claims and only one is strategic. *Largest* is a measurement, and it's true. *Core* asserts the capability wins customers, and the commercial director is on record saying the opposite. `invoicing/model.yaml` explains the mass without strategy: eleven years of growth, three of five aggregates modelling per-port VAT, two added when Finnish tax rules changed in 2024 — regulatory surface accumulated by external events, not a moat.

Consolidation is the mirror image: the only capability the business model marks differentiated, carrying the only premium revenue stream (+18%) and the only quantified goal (fill 71% → 80%) — labelled `supporting`, and still run partly on a whiteboard in Gothenburg. Left as written, investment follows mass and the differentiated capability stays on the whiteboard.

Also carried: four of seven contexts are labelled `core`, on a classification `context-map.md` says has not been revisited since March. Applied to the business model's own differentiation column, exactly one survives.

## The three sections that usually get skipped

**Assumptions** — every canvas has them, 4–7 each, each with why it's an assumption and what it costs if wrong. They came from gaps in the artifacts, not from a checklist: `DeclarationCleared` carries only `declarationId, clearedAt` yet Invoicing must produce a priced invoice, so a hidden channel is assumed; `PaymentAllocation` is an aggregate with no inbound edge; capacity is committed in m³ only, though Booking's lines carry `weightKg` and containers have weight limits.

**Verification metrics** — each names a source that must be built with the context, since no code exists yet. Container fill rate reads off `ContainerSealed.fillRate` (already in the payload). Reserve-rejections-after-a-successful-query is the near-miss counter for the March incident. Cycle time on `vat`-labelled issues tests whether Invoicing's 34 tables are an asset or a cost. Four metrics are marked **blocked** — the premium-honoured rate can't be measured because nothing represents the premium anywhere.

**Open questions** — 10 cross-cutting plus per-context, each with who can answer it. Including hotspot 3, unresolved: *who is responsible when a partner carrier refuses a sealed container?* The container is sealed (Consolidation's last act), the declaration may be submitted (Customs), the handover is Routing's, the customer promise is Booking's. No context claims it and no `model.yaml` has a rule or event for it. Left unowned, it lands wherever the first on-call engineer puts it.

## Business decisions: eight statements, and no more

Every business-decisions section contains only the three rules in the discovery timeline and the `invariants:` from the `model.yaml` files. Invoicing has two rules for 34 tables — **four of its five aggregates are governed by no recorded rule at all** (`SurchargeSchedule`, `DunningCase`, `CreditNote`, `PaymentAllocation`). Those are open questions for finance, not invented policy. Same for `hazardClass` in Booking, which exists as an attribute with no rule using it.

## Structural gaps found in the edges

Messages are typed command/query/event with the collaborator and relationship pattern named. Three gaps fall straight out of that:

- **Customs owns "no handover before declaration submitted", but Routing performs the handover and there is no edge between them anywhere on the map.** The rule cannot be enforced by the context that owns it.
- **Invoicing must charge the premium "whether or not the container ends up full", but the premium is agreed at booking and Invoicing's only inbound edge is from Customs.** The rule has no path to the data it needs.
- **`ConsignmentLine` is declared a Shared Kernel, and the two `model.yaml` files already give it different attributes** — `hazardClass` in Booking, `stackable` in Consolidation. Diverged on paper, before any code.

Booking's check-then-act against Consolidation is written up as a typed query followed by a command, with the March double-commit as the open question rather than a fix — where that check belongs is a modelling decision for both teams, not one I should settle alone.

## Files

```
docs/domain/bounded-contexts.md      index: right-sizing, classification reconciliation,
                                     language conflicts, 10 cross-cutting open questions
docs/domain/booking/canvas.md        full
docs/domain/consolidation/canvas.md  full
docs/domain/quoting/canvas.md        full
docs/domain/customs/canvas.md        full
docs/domain/invoicing/canvas.md      full
docs/domain/routing/canvas.md        stub
docs/domain/notifications/canvas.md  stub
```

All `status: draft`, `owner: TBD`. I did not touch `context-map.md`, `business-model.md`, `timeline.md` or any `model.yaml` — the conflicts are recorded against them, not edited into them.

**Two things to settle before code:** whether the March classification stands (needs the commercial director *and* a customer — the business model already flags that none has been asked), and who owns a refused sealed container.
