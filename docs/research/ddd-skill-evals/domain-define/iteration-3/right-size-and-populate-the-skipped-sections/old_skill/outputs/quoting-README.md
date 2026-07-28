---
id: DOMAIN-BCC-0005
title: Quoting — bounded context canvas
status: draft
owner: TBD
date: 2026-07-28
---

# Quoting bounded context

> Canvas v5, supporting depth. New file; no `message-flows/` traced, so the interface comes from
> `discovery/timeline.md` + `model.yaml`.

## Purpose

Tell an exporter what it will cost to move a given volume on a given lane, and stand behind that
price for a stated period. Actors: exporters asking for a price, and the commercial team whose
tariffs the answer comes from.

## Strategic classification — carried, not re-derived

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested, not resolved here** — core per `context-map.md` ("first thing the customer sees") vs differentiation *partial* per `business-model.md` ("competitors quote in seconds too; we are no faster") | both, cited |
| Business-model role | engagement creator | `business-model.md`, 2026-05-18 |
| Evolution | product | `business-model.md` |

## Domain roles

**Draft context** — a quote is an offer that is not yet real — with a pricing **analysis** step
behind it. The draft half is the reason a quote can expire without anything else in the system
reacting.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Exporter / front-end | direct user interaction | quote request — no agreed name; `QuoteRequested` is what we emit | command *(unconfirmed)* | — |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Booking | bounded context | `QuoteIssued` (quoteId, price, validUntil) | event | pattern **unstated**; Quoting upstream (`model.yaml`) |
| Tariff Data | external system *(no `model.yaml`, appears only in `context-map.md`)* | rate lookup — no agreed name | query *(unconfirmed)* | **unstated** |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Quote | A price offered for a lane and volume, valid until a date | — |
| Lane | An origin-destination pair we price | not defined in any other context, though Routing selects carriers per lane |

## Business decisions

- A quote cannot be accepted after its validity window — `model.yaml` invariant; **no attribution**
  in discovery, so who owns the window is unrecorded.

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Latency | quoting speed is at parity with competitors, not ahead | no number — commercial director could supply | `business-model.md` | no |
| Consistency | how stale may a tariff be when we quote from it? | unknown — commercial team | inferred from the Tariff Data dependency | **yes** — staleness needs a stated rule, or the price is wrong on purpose |

## Assumptions

- *(inferred)* A quote reserves nothing — no capacity is held, so a quoted price can be honoured on
  a departure that is already full. This is the assumption most worth attacking, given the
  Guaranteed Consolidation promise.
- *(inferred)* The premium is not priced here; nothing in the model says where it is added.
- *(inferred)* Quotes are per lane and volume only — weight, hazard class and stackability, which
  Booking and Consolidation both track, do not affect price.
- *(inferred)* Tariff Data is external and read-only to us.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Quote-to-booking conversion, monthly | whether "first thing the customer sees" is doing commercial work worth a core-sized investment | production |
| Bookings confirmed against an expired quote. Prediction: **0** | whether the validity rule is enforced here or ignored downstream | production |
| Quotes honoured on a departure with no remaining capacity | the cost of quoting without reserving | production + planner reports |

## Open questions

- Does a quote promise anything about capacity, and if not, how does that square with Guaranteed
  Consolidation?
- Where is the premium priced?
- Who owns Tariff Data? It has no `model.yaml`, no owner, and no relationship pattern.
- Who set the validity window, and can it differ by customer or lane?
