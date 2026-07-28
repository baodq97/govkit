<!-- id: DOMAIN-BC-0004 · status: draft · owner: TBD · 2026-07-28 -->

# Quoting bounded context

Canvas tier: **light** — purpose, language, interface, decisions. Deep sections skipped; nothing here
is contested beyond the classification fork.

## Purpose

Give a customer a price for moving a given volume on a given lane, valid for a stated window, so
they can decide whether to book. Actors: prospective exporting customers, and the sales side that
quotes them.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | **contested** — `core` as declared, *partial* differentiation upstream | `context-map.md` + `model.yaml` (`core`, "first thing the customer sees") vs `business-model.md` (differentiates: partial) |
| Business-model role | engagement creator | `business-model.md` — "Quoting" |
| Evolution | product | `business-model.md` |

Carried, not re-derived. "First thing the customer sees" is a visibility argument; the business model
says the capability only partly differentiates and is available as a product. Light canvas follows
the business-model reading; `5-strategize` owns the fork.

## Domain roles

**Draft context** — a quote is a non-binding offer held until it is accepted or expires. It computes
a price but does not commit anything, which is what keeps it separate from Booking.

## Inbound communication

> **Not traced** — no message flows on disk (`4-connect` not run). Rows derive from `model.yaml`
> relationships and the discovery timeline; direction only, no stated context-mapping pattern.

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Customer | direct user interaction | *unnamed* — request a quote | command (inferred from `QuoteRequested`) | not stated |
| Booking | bounded context | *unnamed* — retrieve/accept a quote | query | Quoting upstream of Booking |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| Tariff Data | external system | *unnamed* — retrieve lane tariffs | query | Quoting downstream of Tariff Data (`context-map.md`); pattern not stated |
| Booking | bounded context | `QuoteIssued` (quoteId, price, validUntil) | event | Quoting upstream of Booking |
| — | — | `QuoteRequested` (customerId, laneId, volumeM3) | event | no consumer named on disk |

The dependency on Tariff Data appears only in `context-map.md`; `quoting/model.yaml` does not list it
as a relationship. One of the two is out of date.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Quote | A priced, time-limited offer for a lane and volume | no |
| Lane | An origin–destination pair that is priced as a unit | Routing selects a carrier "by the standing contract for that lane" — same word, and nobody has confirmed it is the same set |
| Validity window | The period during which the quoted price can be accepted | not used elsewhere |

## Business decisions

- **A quote cannot be accepted after its validity window.** Carried from `model.yaml` as this
  context's invariant. **Nobody stated this in discovery** — no attributed business rule from the
  2026-05-25 session concerns quoting, so this is a modelling claim, not an elicited rule.

No stated rule covers how the price is formed, whether it is honoured if tariffs change inside the
window, or who may override it.

## Assumptions and open questions

Assumptions:

- *(inferred)* A quote is priced once at issue and not re-priced inside its validity window.
- *(inferred)* Volume alone drives the price — the aggregate carries `laneId` and volume, with no
  weight, hazard or surcharge attribute, although Invoicing models surcharges.

Open questions:

1. Where does the Guaranteed Consolidation premium get priced? Finance stated "the premium is
   charged whether or not the container ends up full", but no premium concept exists here or in
   Invoicing's model.
2. Is Tariff Data a real dependency? The context map and the model disagree.
3. Who enforces acceptance-after-expiry — this context, or Booking?
4. Is Quoting's "lane" the same lane Routing contracts on?
5. Is `core` right for a capability the business model stages as *product* with partial
   differentiation?
