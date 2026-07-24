---
id: DOMAIN-0006
title: Catalog bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Catalog bounded context

## Purpose
Hold the reference data everyone else looks up: the equipment category tree, the depot list, and
the free-form tags.

## Strategic classification
- Sub-domain type: **supporting**
- Why: "Simple lookups… No behaviour beyond storage and retrieval, no rules to enforce."

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Category | A node in the equipment category tree (code + optional parent). |
| Depot | A location record (id + city). *(Reference data; the OWNS-a-unit sense is Allocation's.)* |
| Tag | A free-form label applied across the platform. |
| Equipment | Reference shape (tag + category); Catalog is the source of truth Rentals should conform to. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| — | — | — |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Allocation, Rentals | Category / Depot / Tag / Equipment lookups | query (open-host reference data) |

## Aggregates
- **Category** — the category tree (self-referencing via parent code).
- **Depot** — location reference record.
- **Tag** — label reference record.

## Business rules (draft)
None captured — pure reference data.

> Note: "Depot" is polysemous — here it is a reference record; in Allocation it is the party that
> *owns* a committed unit. Kept in both contexts, qualified by context (that polysemy is the point
> of bounded contexts). Rentals' duplicate `Equipment` should conform to Catalog's.
