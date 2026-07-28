# Customs bounded context

> Bounded Context Canvas v5, right-sized **full** because Customs is classified **core** — see the
> classification conflict below, this canvas's main finding. Sources: `customs/model.yaml`,
> `context-map.md`, `business-model.md`, `discovery/timeline.md` (DOMAIN-DISC-0001).

## Purpose

Get every shipment legally across a border: prepare and submit its customs declaration at the port
of departure, and hold the shipment until the authority clears it. Key actors — the customs clerk,
who prepares and chases declarations, and the exporter, whose goods do not move until clearance.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core — "regulated, and mistakes are expensive" | `context-map.md` (`subdomain_type: core` in `customs/model.yaml` agrees) |
| Business-model role | compliance enforcer | `business-model.md`, capability "Customs declaration" |
| Evolution | product | `business-model.md`, same row |
| Differentiating | **no** | `business-model.md`, same row |

**Conflict, not resolved here.** Three upstream facts point away from `core`:

1. `business-model.md` — the capability does not differentiate and sits at **product** evolution.
2. `customs/model.yaml` notes: *"Two commercial customs platforms cover all nine ports; we integrate
   with neither."* Off-the-shelf products covering 100% of the footprint is the shape of
   supporting-or-generic.
3. `context-map.md`: *"The classification above has not been revisited since the first modelling
   session in March"* — and there is **no `core-domain-chart.md` in this repo**, so `5-strategize`
   has not run and `core` has no strategic provenance beyond that session.

"Regulated and expensive to get wrong" argues for *rigour*, not for *core*. Not re-classified here;
filed as a proposal below.

## Domain roles

- **Gateway** — translates Nordic Freight's shipment model into what nine national port authorities
  accept, and their verdict back. Both `portCode` and the two-platform note point here.
- **Execution** — also enforces a workflow gate: nothing reaches a carrier before submission.

Two roles, two rhythms: the gateway half holds the 96 declared attributes and changes per port
authority; the execution half owns an invariant it cannot enforce (see *Business decisions*).

## Inbound communication

_Nothing traced._ `docs/domain/message-flows/` does not exist and `customs/model.yaml` declares no
inbound messages. Two collaborations are visibly missing rather than absent:

| Collaborator | Collaborator type | Message | Type | Relationship | Status |
|---|---|---|---|---|---|
| Consolidation | bounded context | _unnamed_ — what tells Customs a shipment needs a declaration | command or event | downstream of Consolidation (`customs/model.yaml`, `context-map.md`) | **not on disk** |
| Port authority (×9) | external system | _unnamed_ — the clearance verdict behind `DeclarationCleared` | event or response | not stated | **not on disk** |

Trace with `6-flows` before trusting this section.

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Invoicing | bounded context | `DeclarationSubmitted` (`declarationId`, `portCode`) | event | upstream of Invoicing (`customs/model.yaml`); `context-map.md`: Customs → Invoicing |
| Invoicing | bounded context | `DeclarationCleared` (`declarationId`, `clearedAt`) | event | as above |

Both confirmed by the customs clerk, 2026-05-25 (timeline rows 8, 9). The relationship *pattern* is
stated nowhere — `context-map.md` records only direction. All events, no commands: no Brain Context.

### Swimlane

| Message in | Decision made | Message(s) out |
|---|---|---|
| _(untraced trigger from Consolidation)_ | is the shipment declarable at this `portCode` | `DeclarationSubmitted` |
| _(untraced verdict from the port authority)_ | none visible — the authority decides | `DeclarationCleared` |

The second lane has no decision between in and out — a pass-through: Customs may be recording
someone else's decision rather than making one.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Declaration | the filing lodged with one port authority for one shipment; the aggregate root | not used elsewhere in the model |
| `status` | where the filing sits between submitted and cleared; the value set is **not stated on disk** | — |
| `portCode` | which of the nine national authorities this filing goes to | — |
| `ShipmentRef` | the shipment being declared | **shared** — a Building Block across Booking, Consolidation, Customs, Invoicing (`context-map.md`) |
| Clearance | the authority's verdict; the only thing that releases the shipment | — |
| Consignment | **not stated for this context.** Finance and operations already disagree (billable line vs pallet stack — finance analyst, hotspot 2); whether a declaration is per-shipment or per-consignment was never asked | contested upstream |

## Business decisions

Stated, with attribution:

- **A shipment cannot be handed to a carrier before its declaration is submitted** — customs clerk,
  DOMAIN-DISC-0001. Declared as this context's sole invariant in `customs/model.yaml`.

That is the only rule anyone stated for Customs. Everything else below is an assumption.

**Finding — the invariant is declared here and enforced nowhere.** It constrains
`ShipmentHandedToCarrier`, which timeline row 6 attributes to **Routing**; and the confirmed
timeline runs #6 *before* `DeclarationSubmitted` (#8), so as recorded the happy path violates the
stated rule. Consistently, the invariant sits on the context, not on the `Declaration` aggregate
(aggregate invariants: 0) — nothing inside this boundary can hold it.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Correctness (ordering) | a hand-off must never precede its submission | — | customs clerk | **yes** — cross-context ordering: Routing consults Customs, or the gate moves |
| Auditability | prove what was declared, when, and what the authority answered | unknown — clerk can supply the statutory retention | inferred from the regulated role; **not stated** | **yes if non-trivial** — history becomes domain state, not a log |
| Availability | behaviour when a port authority is unreachable — queue, degrade, or block | unknown | nobody asked; clerk | **yes** — decides whether `Declaration` holds pending state |
| Latency | how long a clerk waits on a verdict before chasing it by phone | unknown | clerk | probably no |
| Volume | declarations per day across nine ports | unknown | operations | feeds `8-code` |
| Change cadence | how often a port authority changes its required fields | unknown | clerk | **yes** — high cadence argues for a per-port ACL |

Six attributes, one number: Quality Storming has not been run with the clerk. This is its agenda.

## Assumptions

- *domain, inferred* — one declaration per shipment per port; nothing rules out a shipment crossing
  more than one border.
- *domain, inferred* — a declaration is never amended or withdrawn after submission: the two
  declared events are a one-way path, with no `DeclarationRejected` or `DeclarationAmended`.
- *domain, inferred* — all nine ports accept the same content, differing only by `portCode`. If
  false, `portCode` hides nine models and the per-port ACL question becomes urgent.
- *behaviour, inferred* — clerks keep catching missing declarations by hand, which is how the
  ordering rule survives with nothing enforcing it.
- *scale, inferred* — the two commercial platforms stay unused. If buying one is ever on the table,
  most of this canvas is an integration spec rather than a domain model.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Hand-offs that occurred with no prior `DeclarationSubmitted`, per month | Whether the stated invariant is real or aspirational. Prediction: **> 0 today**, because nothing enforces it. If it is 0, a hidden manual control exists and should be modelled. | production event log |
| Change coupling Customs ↔ Routing, per quarter | If the ordering gate is genuinely shared, the two will keep changing together — evidence the invariant is on the wrong side of the line. Prediction: **≥ 1 shared PR per quarter**. | CI / VCS commit and PR history |
| Share of Customs changes driven by one port authority's format change | Prediction: **> 60% within two quarters**. If it holds, the context is a nine-way gateway and the per-port ACL is the design, which also weakens the `core` claim. | issue tracker, labelled by port |
| Attributes actually modelled vs declared (4 vs 96) | `mass` reports 12 tables, 96 attributes, densest entity 34 — the model declares a single 4-attribute entity. Closing that gap is the measure of whether this canvas describes the real system. | `customs/model.yaml` vs the live schema |

## Open questions

Seven, on a context currently labelled core — that count says this is not ready to build.

1. Is Customs core, or regulated-but-supporting? Unresolved between `context-map.md` and
   `business-model.md`; no `core-domain-chart.md` exists to break the tie.
2. Where does the pre-hand-off gate live — Routing asks Customs, or Customs holds the shipment?
   Nobody has been named as owner.
3. Why does the confirmed timeline put `ShipmentHandedToCarrier` before `DeclarationSubmitted`? Is
   the rule aspirational, is the timeline mis-ordered, or is there a second hand-off?
4. What does a port authority send back, and how? `DeclarationCleared` has no inbound counterpart.
5. What happens on rejection or amendment? No event covers either.
6. Is a declaration per shipment or per consignment — and which "consignment" (hotspot 2)?
7. Hotspot 3 ("who is responsible when a partner carrier refuses a sealed container") was raised for
   Consolidation but lands here: a refusal after `DeclarationSubmitted` needs an undefined response.

## Interface critique

1. **Coherent names?** Yes — one noun, two lifecycle stages.
2. **Right types?** `DeclarationCleared` is our event, but the fact belongs to the port authority:
   we re-publish someone else's decision. The missing piece is an inbound message from the
   authority, not a different type on the outbound one.
3. **Too big?** The opposite — two messages for a core context with 96 declared attributes means
   most of the behaviour is undescribed.
4. **Exposing internals?** No. Payloads are an id plus one field; `status` and the densest
   34-attribute entity stay inside.
5. **Belonging elsewhere?** The *invariant* does, not a message — it constrains a Routing act.

**Perturbation run.** Move the ordering invariant to **Routing**: "do not hand off without a
submitted declaration" becomes Routing's precondition, checked by querying Customs. Gained — the
rule sits where the act happens, enforceable. Cost — Routing takes a synchronous read dependency, so
`ShipmentHandedToCarrier` blocks when Customs is down, which is the unanswered availability
question. Better than today, but a `3-decompose` decision.

## Proposals for other steps

- **`5-strategize`** — run it. No `core-domain-chart.md` exists; `core` rests on one unrevisited
  March session, against the non-differentiating/product row and the two-platforms note.
- **`3-decompose` / `customs/model.yaml`** — decide who owns the hand-off invariant (declared here,
  constrains Routing). Also consider `DeclarationRejected` / `DeclarationAmended`, absent today.
- **`6-flows`** — no message flows exist; both inbound edges above are guesses until traced.
- **`context-map.md`** — relationship *patterns* missing, only direction recorded: the
  Customs→Invoicing edge and the nine port-authority edges each need one.
