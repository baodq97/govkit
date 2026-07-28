# Customs bounded context

## Purpose

Get every outbound shipment legally released at the port it leaves from — lodge the declaration, track
it to clearance — so it can be handed to a carrier without the exporter or the carrier carrying the
legal exposure. Actors: the customs clerk; the depot planners who wait on clearance to release.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core | `customs/model.yaml: subdomain_type`. **No `core-domain-chart.md` in this repo** — no `5-strategize` chart to carry, so this is the decompose-time label |
| Business-model role | compliance enforcer | `business-model.md`, capability *Customs declaration* |
| Evolution | product, `differentiates: no` | same row. Disagrees with facet 1 — see Open question 1 |

## Domain roles

**Execution context** — enforces a workflow (submitted → cleared), no analysis. `model.yaml: notes`
records the role it declines: *"Two commercial customs platforms cover all nine ports; we integrate with
neither."* A product-stage capability hand-modelled at 96 attributes is a gateway refusing to be one.

## Inbound communication

_Nothing traced._ `docs/domain/message-flows/` does not exist. `Declaration.shipmentRef` means
something must tell Customs a shipment exists; that message is unrecorded — `6-flows` work, not a
guess for this canvas.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| _untraced_ | — | `DeclarationSubmitted` (declarationId, portCode) | event | untraced |
| _untraced_ | — | `DeclarationCleared` (declarationId, clearedAt) | event | untraced |
| Customs authority (×9 ports) | external system | the filing itself | command | untraced; none on disk |

Both events are confirmed by the customs clerk (`discovery/timeline.md` #8, #9); their **consumers**
are not. `model.yaml: relationships` names Consolidation (downstream) and Invoicing (upstream),
attaches no message to either, and does not say who depends on whom.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Declaration | the lodged legal filing for one shipment at one port; aggregate root | not modelled elsewhere |
| Shipment | only `shipmentRef`, an opaque handle, never owned here | Booking and Routing own the thing |
| Cleared | the authority released the goods — a fact recorded here, never decided here | — |

*Consignment* — contested between finance and ops (hotspot 2) — is absent from this model. If a filing
is ever made per-consignment, that dispute lands here.

## Business decisions

One rule stated, with attribution: **a shipment cannot be handed to a carrier before its declaration
is submitted** — customs clerk, `discovery/timeline.md`; also `customs/model.yaml: invariants`.
**This context cannot enforce it**: `ShipmentHandedToCarrier` is emitted by Routing (`timeline.md`
#6), and Customs declares no relationship with Routing and no outbound command that could block one.
The rule is written where it is understood, not where it is checked — the shape of hotspot 1.
No other rule was stated; everything below is inferred and labelled so.

## Assumptions

- *(inferred, domain)* One declaration per shipment per port — no composite key, no amendment event.
- *(inferred, domain)* Clearance is terminal: no held or refused path, yet hotspot 3 has a carrier
  refusing a sealed container.
- *(inferred, scale)* One `portCode` and one flow assume the nine ports are procedurally identical.
- *(inferred, behaviour)* The clerk absorbs exceptions by hand, which is why none are modelled.

## Verification metrics

| Metric | What it would tell us | Source |
|---|---|---|
| Change coupling Customs ↔ Routing over 3 months; prediction <10% of Customs commits touch Routing | above that, the hand-off invariant sits on the wrong side of the line | CI / VCS history |
| Declarations needing manual clerk intervention per week; prediction <5% | above that, two events are fewer states than the work has | production, or the clerk's log |

## Open questions

1. `model.yaml` says core; the business model says non-differentiating product with two vendors already
   covering all nine ports. Which stands? Build-vs-buy, and nobody in the room owned it. → `5-strategize`.
2. Where is the "not handed to carrier before submitted" check executed? Unowned. → `3-decompose`.
3. What happens on refusal, hold or amendment? No event, no state, no owner. → discovery.
4. Do the nine ports share one procedure? Nobody was asked; no authority or customer was in the room.
5. Who consumes `DeclarationCleared`? → `6-flows`.

## Proposals for other steps — not applied here

- `3-decompose` (`customs/model.yaml`): the invariant names an actor this context cannot reach — add an
  outbound command to Routing, or move the invariant to whoever emits `ShipmentHandedToCarrier`.
- `1-understand` (`business-model.md`): "we integrate with neither" is an implicit build decision on a bought capability; it deserves a row.
- `6-flows`: no message flow exists for the highest-mass context after Invoicing.
