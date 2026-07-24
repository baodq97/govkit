---
id: DOMAIN-0005
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
Hold the platform's reference lists: the equipment category tree, the depot/location records, and
the free-form tags used to label units.

## Strategic classification
- Sub-domain type: **master-data / reference**
- Why: README explicit: "Simple lookups." Add, rename, retire — no lifecycle beyond that, no
  invariants stated.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Category | A node in the equipment category tree (optionally parented). |
| Depot | A physical location record (id, city). |
| Tag | A free-form label usable across the platform. |
| Equipment | A tagged category assignment for one unit — `Tag` + `Category`. |

## Inbound communication
None coded in this slice — `Rentals` has its own, TODO-flagged, unwired duplicate of `Equipment`
rather than an actual dependency on Catalog (see context-map.md).

## Outbound communication
None found in the given source.

## Aggregates
- **None, explicitly declined.** Master-data/reference contexts get plain CRUD over lookup
  records — no aggregates, no repositories, no domain events, by the skill's own classification
  rule for this subdomain type.

## Business rules (draft)
None captured yet — no invariant was stated for Catalog in the given sources.
