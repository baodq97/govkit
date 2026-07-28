# Quoting bounded context

*Canvas v5, `7-define`, 2026-07-28. New file — `3-decompose` left no README; `model.yaml` unchanged.*

> **Depth: supporting-level** — no quality storming, no full interface critique: `business-model.md`
> rates quoting's differentiation *partial* ("competitors quote in seconds too; we are no faster"),
> which does not earn a core-depth canvas. **Provenance:** `4-connect` has not run; rows come from
> `discovery/timeline.md` and `model.yaml`, and *inferred* means guessed, not observed.

## Purpose

Tell an exporter, before they commit, what moving this consignment on this lane costs and how long
that price stands. Actors: exporters shopping a part-load price; the commercial director, who owns
the rates behind it.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested — core vs supporting** | `context-map.md` + `model.yaml` say `core` ("first thing the customer sees"); `business-model.md` rates differentiation *partial* and evolution *product*, which reads supporting |
| Business-model role | engagement-creator | `business-model.md` |
| Evolution | product | `business-model.md` |

"First thing the customer sees" is a visibility argument, not a differentiation one. Not resolved
here — a finding for `5-strategize` (see Open questions).

## Domain roles

**Analysis context** — computes a number from rates and lane data, holds no workflow. One aggregate, four attributes, one invariant, nothing enforcing a process: consistent with a context a product could later replace.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Source |
|---|---|---|---|---|---|
| Customer / frontend | direct user interaction | quote request (customerId, laneId, volumeM3) | command (*inferred*) | — | `QuoteRequested`, timeline #1, planner |
| Booking | bounded context | retrieve quote for a booking | query (*inferred*) | conformist (*inferred*) | `booking/model.yaml` `{to: Quoting, downstream}` — no message named on disk |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Source |
|---|---|---|---|---|---|
| Customer / frontend | direct user interaction | `QuoteIssued` (quoteId, price, validUntil) | event | — | `model.yaml`; timeline #2, planner |
| Tariff Data | external system | retrieve lane tariff | query (*inferred*) | conformist (*inferred*) | `context-map.md` `Quoting --> TariffData`; **no message, owner or refresh rule is on disk** |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Quote | A price for a lane and a volume, valid until a stated moment | own term |
| Lane | An origin–destination pair the partner network serves | used by Routing too; nobody has confirmed the two definitions match |
| Price | The forwarding fee before any surcharge | **yes** — Invoicing adds surcharges and VAT under `Surcharge` |

## Business decisions

- A quote cannot be accepted after its validity window. — `model.yaml` invariant

**Stated absence:** nobody said how a price is computed, who may override it, whether the premium is
quoted here, or what happens when tariffs change mid-window. One rule for the context that produces
every price is thin — no commercial owner attended the 2026-05-25 session (`discovery/timeline.md`).

## Assumptions

- *(inferred, domain)* A quote is for one lane and one volume — one `laneId`, so multi-leg or split quotes are inexpressible.
- *(inferred, domain)* The price is fixed at issue and does not move inside the validity window.
- *(inferred, behaviour)* Tariff data is fresh enough to quote from directly; no staleness rule exists on disk.
- *(inferred, domain)* The premium (+18% of the forwarding fee) is applied somewhere in the quote→invoice path. No context on this map models it.

## Open questions

1. Core or supporting? Visibility vs differentiation — for `5-strategize`.
2. Who owns Tariff Data, and how stale may it be before a quote is wrong?
3. Is the Guaranteed Consolidation premium quoted here, chosen at booking, or added at invoicing?
   It is the only premium in the business model and it appears in no context's model.
4. What happens when a tariff changes while a quote is still valid — honour or void?
5. Does `Lane` mean the same thing here and in Routing?
6. Who may override a quoted price, and is that recorded?

## Verification metrics

| Metric | Prediction, checkable 2027-01-28 | Where it comes from |
|---|---|---|
| Quote-to-booking conversion | if quoting is core, improving it should move conversion; if it does not, the *partial* differentiation rating is right | production |
| Tariff-driven changes | share of `quoting/` PRs caused by tariff/rate changes rather than product decisions — a high share means a product could replace this | VCS + tracker labels |

## Delta from `3-decompose`

New file; `model.yaml` unchanged. Proposed: resolve `subdomain_type: core` against the *partial*
differentiation rating; make Tariff Data an explicit external collaborator with ownership and
freshness; decide where the premium is modelled.
