# Booking bounded context

*Canvas v5, `7-define`, 2026-07-28. New file — `3-decompose` left no README; `model.yaml` unchanged.*

> **Depth: supporting-level** — purpose, language, interface, decisions, plus the assumptions and open
> questions every canvas keeps. No quality storming; the Booking↔Consolidation interface critique is
> worked through once, in `consolidation/README.md`. **Provenance:** `4-connect` has not run, so no
> flow is traced; rows come from `discovery/`, `model.yaml`, `context-map.md`; *inferred* = guessed.

## Purpose

Turn a customer's decision to ship into a commitment: this consignment, on this departure, at the
price quoted. Actors: exporters booking part loads, and the depot planners who live with the result.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core | `context-map.md` ("where the money is committed"), `model.yaml` |
| Business-model role | **unknown** | `business-model.md` has **no capability row for Booking** |
| Evolution | **unknown** | same absence |

A finding, not a gap to fill: `3-decompose` calls Booking `core` on an argument the business model never made, since it lists no Booking capability. Either that table is incomplete or Booking is a workflow over other capabilities — `1-understand` owns it, and this file's depth reflects the doubt.

## Domain roles

**Execution** (quote → request → reserve → confirm, owns the commitment) and **draft** on its first half — `BookingRequested` is work-in-progress until capacity answers. `Booking` has a `status` but no state list, so where draft ends and commitment begins is nowhere written.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Source |
|---|---|---|---|---|---|
| Customer / frontend | direct user interaction | booking request against a quote | command (*inferred*) | — | implied by `BookingRequested` (timeline #3) |
| Consolidation | bounded context | `CapacityReserved` | event | customer/supplier (*inferred*) | `consolidation/model.yaml`; timeline #4 |
| Consolidation | bounded context | `ConsignmentLine` writes | — | **Shared Kernel — both write it** | `context-map.md` |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Source |
|---|---|---|---|---|---|
| Quoting | bounded context | retrieve quote / price for this booking | query (*inferred*) | conformist (*inferred*) | `model.yaml` `{to: Quoting, downstream}` — no message named on disk |
| Consolidation | bounded context | remaining-capacity check, then reserve | query + command (*inferred*) | customer/supplier (*inferred*) | `model.yaml`: "synchronous remaining-capacity check before reserving" |
| Routing | bounded context | `BookingConfirmed` | event | published language (*inferred*) | `model.yaml`; timeline #5 |
| — | — | `BookingRequested` | event | — | `model.yaml`; timeline #3. **No consumer recorded anywhere** |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Booking | A customer's committed request to move a consignment on a given departure | own term |
| Consignment | The goods a customer hands over as one unit | **yes, three ways** — Consolidation: a physical stack of pallets; Invoicing: a billable line (hotspot #2) |

## Business decisions

- A booking may only be confirmed once its capacity has been reserved. — `model.yaml` invariant, consistent with the planner's overbooking rule (2026-05-25)
- A quote cannot be accepted after its validity window. — `quoting/model.yaml`; enforced there, presented here

**Stated absence:** nobody said what happens when a capacity request is refused, or whether a
confirmed booking can be amended.

## Assumptions

- *(inferred, domain)* One booking = one consignment on one departure — a single `departureId` makes split shipments inexpressible.
- *(inferred, domain)* Confirmation is synchronous: the customer waits while Consolidation answers.
- *(inferred, behaviour)* The quoted price is still valid at confirmation; nothing re-checks it.
- *(inferred, domain)* The premium is chosen here, yet nothing records it — sold in a context that does not model it, kept in one that cannot see it.

## Open questions

1. Why is Booking `core` when it has no capability row? — `1-understand` / `5-strategize`.
2. Where does the double-commit check live? Hotspot #1, "nobody agrees where the check should have
   happened" (planner); the query-then-write against Consolidation leaves a window.
3. Who settles conflicting `ConsignmentLine` writes across the Shared Kernel?
4. What happens when capacity is refused — rejected, queued, offered another departure?
5. Can a confirmed booking be amended or cancelled, and what does that do to a sealed container?
6. Who consumes `BookingRequested`? An event with no consumer is dead or an undiscovered collaboration.
7. What are Booking's states, and where is the premium recorded, if not here?

## Verification metrics

| Metric | Prediction, checkable 2027-01-28 | Where it comes from |
|---|---|---|
| Change coupling with Consolidation | under 25% of PRs touching `booking/` also touch `consolidation/`; above that the two are one context | CI / VCS |
| Refused-capacity rate | how often a booking cannot be placed — if it is non-trivial, the unmodelled rejection path is a daily business event, not an edge case | production |

## Delta from `3-decompose`

New file; `model.yaml` unchanged. Proposed: add the `Booking` state list; add a Booking capability
row upstream or drop the `core` claim; replace the query+command pair with one command that
Consolidation accepts or rejects (critique Q2/Q4 in `consolidation/README.md`).
