# Nordic Freight domain model: read before you sign

**Verdict: do not sign off as safe to build on. 7 blockers, 4 majors, 1 minor.**

The model is well organised and honest about its own gaps, so it reads as more finished than it is. All 11 events from the discovery timeline appear in a `model.yaml`, and every context relationship has a matching reciprocal. That surface tidiness is what will get it approved if nobody looks underneath.

Underneath, the three hotspots the discovery session recorded as unresolved are all still unresolved, and the model encodes the design that caused two of them.

I cross-checked the seven `model.yaml` files against `context-map.md`, `business-model.md` and `discovery/timeline.md` with a script, so the numbers below are derived, not estimated. Full payload in `model.json`.

---

## Raise these four. Skip the rest.

### 1. The sub-domain classification inverts your own business model (STRAT-1)

`business-model.md` rates load consolidation as the one differentiating capability: revenue-generator, custom-built, "a new entrant would need both the depot network and the planning know-how". `context-map.md` classifies Consolidation as **supporting**.

The same document rates Invoicing as a commodity, quoting the commercial director: *"nobody has ever chosen us because of our invoices."* `context-map.md` classifies Invoicing as **core**, calling it "the largest and most business-critical system we run". Size got mistaken for importance.

Where the build effort actually sits:

| Context | Tables | % of tables | % of attributes | Classified | Business says differentiating? |
|---|---|---|---|---|---|
| Invoicing | 34 | 44.7% | 51.2% | core | **no** |
| Customs | 12 | 15.8% | 15.8% | core | no (two vendors already do it well) |
| Quoting | 11 | 14.5% | 12.8% | core | partial ("we are no faster") |
| Booking | 9 | 11.8% | 8.9% | core | not rated |
| **Consolidation** | **5** | **6.6%** | **6.7%** | **supporting** | **yes** |
| Routing | 3 | 3.9% | 2.8% | supporting | no |
| Notifications | 2 | 2.6% | 1.8% | generic | no |

Half the attribute mass goes to a capability the business says nobody buys them for. The capability they charge an 18% premium on gets 6.7%.

Two footnotes that make this worse. Customs carries 12 tables of hand-built domain model, and its own note says "two commercial customs platforms cover all nine ports; we integrate with neither." Invoicing's note says three of its five aggregates exist to model VAT variations. Neither file records a build-versus-buy decision.

**Ask the group:** does anyone disagree that Consolidation is the core domain? If nobody does, the classification is wrong and the investment plan built on it is wrong too.

### 2. The March incident is still in the design (INV-1)

Hotspot 1 in `discovery/timeline.md`: "Two shipments were committed to the same container slot in March; nobody agrees where the check should have happened."

The model still does not say where it happens. Consolidation owns the invariant "a container's committed volume must never exceed its capacity". Booking's relationship note says it performs a "synchronous remaining-capacity check before reserving", then commits in its own transaction.

Check in one context, commit in another. Two concurrent bookings both read free space and both commit. That reproduces March exactly.

The planner already stated the cost: an overbooked container bumps a shipment, which breaks the Guaranteed Consolidation promise, which is the +18% premium.

### 3. Two rules are written where nobody can enforce them (INV-2, DATA-2)

**The customs rule.** The customs clerk stated it: no handover to a carrier before the declaration is submitted. The model files it as a **Customs** invariant. But Routing emits `ShipmentHandedToCarrier`, and Routing has no aggregates, no invariants, and no declared relationship to Customs. It cannot check anything.

Worse, the confirmed timeline in the same document contradicts the confirmed rule. `ShipmentHandedToCarrier` is event 6. `DeclarationSubmitted` is event 8. Two groups each confirmed their half and nobody compared them. Build the timeline as written and you ship a compliance breach on the happy path.

**The invoicing rule.** "An invoice line must reference a cleared declaration." `InvoiceLine` has four attributes: `lineId`, `description`, `amount`, `vatCode`. No `declarationId`, no `shipmentRef`, no link to Customs of any kind. The one rule standing between you and invoicing for uncleared goods cannot be implemented against the entity as modelled.

### 4. Nothing can be traced end to end (DATA-1, LANG-1)

`context-map.md` lists `ShipmentRef` as a shared value object across Booking, Consolidation, Customs and Invoicing. It appears in Booking and Customs. Consolidation and Invoicing never mention it. Zero event payloads carry it.

Customs keys `Declaration` on `shipmentRef`, but its upstream is Consolidation, whose events carry `containerId`, `bookingId` and `fillRate`. Nothing upstream ever emits a `shipmentRef`. You cannot join a booking to its declaration to its invoice at runtime, and you cannot reconstruct one after an incident.

Then the word problem, which is hotspot 2 verbatim: finance and operations use "consignment" differently. Booking defines it as "the goods a customer hands over as one unit". Invoicing defines it as "a billable line on an invoice". Both definitions went into the model instead of one winning.

`ConsignmentLine` compounds it. `context-map.md` calls it a **Shared Kernel** that both Booking and Consolidation write. The two files declare different shapes:

- Booking: `lineId`, `volumeM3`, `weightKg`, `hazardClass`
- Consolidation: `lineId`, `volumeM3`, `stackable`

Share that type and `hazardClass` gets dropped on one side, `stackable` on the other. Both `model.yaml` files also describe the pair as plain upstream/downstream, contradicting the Shared Kernel label in the context map.

---

## Also true, lower priority

- **No failure paths anywhere (EVT-1).** Zero cancellation, rejection, bump, dispute or credit events across all seven contexts, even though Invoicing declares `CreditNote` and `DunningCase` aggregates. Hotspot 3, a partner carrier refusing a sealed container, has no event and no owner. Each team will invent its own incompatible compensation logic.
- **The premium is absent from the model (REV-1).** No aggregate, event or invariant represents a guaranteed departure slot. The finance analyst's rule, that the premium is charged whether or not the container fills, has no matching invariant. The 71% to 80% fill goal has no metric owner.
- **A 128-attribute entity in Invoicing (AGG-1).** Next densest is Customs at 34.
- **Governance (GOV-1).** All three documents are `status: draft`, `owner: TBD`. The seven `model.yaml` files carry no status, owner or date. `context-map.md` notes the classification "has not been revisited since the first modelling session in March", so what you are being asked to approve predates both May discovery sessions.
- **No customer took part in either session.** Value propositions and every differentiation rating come from the commercial director speaking for customers, marked `proxy`. Cost structure is unknown because nobody in the room owns the P&L, which leaves "revenue-generator" unverified.
- **`CustomerNotified` is a candidate (EVT-2).** The timeline says it was inferred from templates and nobody confirmed when it fires. `notifications/model.yaml` records it with the same confidence as the ten confirmed events.

## What holds up

Say this too, so the session stays useful.

- Event coverage is complete in both directions. No orphans.
- Every internal relationship has a matching reciprocal. No direction clashes.
- Notifications and Routing are right-sized. Notifications is generic with a bought adapter and no aggregates. Routing is a transaction script that states plainly it owns no rule. Both match how the business rates them.
- The discovery documents flag their own weaknesses instead of hiding them: proxy rows, the candidate event, unknown cost structure, three open hotspots. Whoever ran those sessions did honest work. The gap opened between discovery and the model, not inside discovery.

## What to ask for

Do not ask for a rewrite. Ask for four decisions, each of which needs a named owner and roughly a week:

1. **Re-run the strategic classification against `business-model.md`.** Consolidation to core, Invoicing and Customs to supporting, with build-versus-buy recorded for both. Trade-off: this reopens the investment plan, which is the point.
2. **Put the capacity check in one place and name it.** Either Booking reserves through Consolidation in a single transaction, or Consolidation owns the reservation and Booking waits for `CapacityReserved`. Either works. Ambiguity does not.
3. **Pick one meaning for "consignment", and give `ShipmentRef` a source.** One term wins, the other gets renamed. Every event from `BookingRequested` onward carries the correlation key.
4. **Model the reversals.** Bump, carrier refusal, declaration rejection, credit note. Hotspot 3 needs an owner before anyone writes Routing.

Points 2 and 3 are the cheapest to fix and remove three blockers between them. If the meeting only has room for one decision, take point 1, because it decides where the next two quarters of effort go.

**One line for the room:** the model is a good discovery record and not yet a buildable design. Approving it as-is commits half the build budget to invoicing, leaves the March overbooking bug in the architecture, and ships a customs compliance breach on the happy path.
