---
id: DOMAIN-BC-0001
title: Quoting bounded context — canvas
status: draft
owner: TBD
date: 2026-07-27
canvas: light
---

# Quoting bounded context

> Right-sizing: **light canvas** — purpose, classification, interface, language, business decisions,
> plus a short assumptions / open-questions block. It is labelled core in `context-map.md`, but
> `business-model.md` rates its differentiation *partial* (*"competitors quote in seconds too; we are
> no faster"*) at product evolution, and nothing about it is contested in discovery. Deep sections
> would be ceremony.
>
> Created by `domain-define` on 2026-07-27.

## Purpose

Tell an exporter what a lane will cost and how long that price holds, so they can decide whether to
book.

Key actor: the exporter requesting a price.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | `core` per `context-map.md` (*"first thing the customer sees"*) — **contested**: `business-model.md` gives it partial differentiation | both files |
| Business-model role | engagement creator | `business-model.md` |
| Evolution | product | `business-model.md` |

Carried, not re-derived. *First thing the customer sees* is a UX argument, not a strategic one; the
commercial director's own assessment is that quoting is table stakes. `domain-strategize` owns the
reconciliation.

## Domain roles

**Draft context.** A quote is a non-binding proposal with an expiry; it becomes real only when a
booking references it. Nothing in the model suggests a second role.

## Inbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| Customer / frontend | direct user interaction | `RequestQuote` (customerId, laneId, volumeM3) | command | — | **derived** from `QuoteRequested`, timeline #1 |
| Tariff Data | external system / bought data | tariff lookup | query | conformist (**proposed**) | `context-map.md` only names the relationship; no model detail exists |

## Outbound communication

| Collaborator | Collaborator type | Message | Type | Relationship | Evidence |
|---|---|---|---|---|---|
| — | — | `QuoteRequested` (customerId, laneId, volumeM3) | event | — | `model.yaml`; timeline #1 |
| Booking | bounded context | `QuoteIssued` (quoteId, price, validUntil) | event | published language (**proposed**); Quoting is upstream | `model.yaml`; timeline #2 |

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Quote | A price for a lane, valid until a stated moment | Not used elsewhere |
| Lane | An origin–destination pair being priced | Routing uses "lane" for the standing carrier contract; the two may or may not be the same partition |
| Validity window | The period during which the quoted price stands | Not used elsewhere |

## Business decisions

**None with an attributed source.** No participant in `discovery/timeline.md` stated a pricing or
validity rule. The `model.yaml` invariant appears under assumptions instead.

## Assumptions

1. **(inherited, unattributed)** *"A quote cannot be accepted after its validity window"* — a
   `model.yaml` invariant with no source in discovery. It is plausible and probably right; it is
   still nobody's stated rule.
2. **(domain, inferred)** Quoting does not consult container capacity — it prices a lane, not a
   slot. This is why a quote can be issued for a departure that later has no room.
3. **(domain, inferred)** The Guaranteed Consolidation premium (+18%) is applied here, since the
   customer sees a price before booking. `business-model.md` states the premium exists but no one
   said which context applies it. This is the most load-bearing unknown on this canvas.

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Quotes issued vs bookings placed | Whether the boundary between proposal and commitment is doing useful work | production |
| Bookings placed against expired quotes | Whether the validity rule is real and enforced | production |
| Change coupling with `booking/` | Whether draft and commitment are actually one context | CI / VCS history |

## Open questions

1. Which context applies the Guaranteed Consolidation premium — Quoting, Booking or Invoicing?
   Nobody said, and it is the differentiating revenue stream.
2. Is a "lane" in Quoting the same partition as a "lane" in Routing's standing carrier contracts?
3. Is a quote required before a booking?
4. What is the quoting latency requirement? `business-model.md` says competitors quote *in seconds*;
   no target was set for us.

## Findings for other skills

| # | Finding | Owner |
|---|---|---|
| F13 | No context is identified as the owner of the +18% premium — the repo's only differentiating revenue stream | `domain-discover` / `domain-strategize` |
| F14 | "Lane" is used by both Quoting and Routing with possibly different partitions | `domain-decompose` |
