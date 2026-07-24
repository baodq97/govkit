---
id: DOMAIN-0007
title: Accounts bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Accounts bounded context

## Purpose
Hold the customer master — sales accounts imported from the CRM, each owned by the sales rep who
owns the commercial relationship.

## Strategic classification
- Sub-domain type: **supporting**
- Why: the customer master is needed to run the business, not a differentiator. It is a **Conformist**
  mirror of an external CRM we have no leverage over.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| SalesAccount | A customer account imported from the CRM — id, name, segment, owning rep. |
| SalesRep | The rep who owns the commercial relationship on an account; the only person allowed to change its terms. |
| Customer | An account type counted as a customer — renter / prospect / partner-account (definition currently in `SharedDomainRules`; belongs here). |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| External CRM | nightly account import (`CrmAccountRow`) | event (batch) |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Rentals | customer identity | query |

## Aggregates
- None — a conformist CRUD mirror; no domain model we own. `SalesAccount` has an id (an entity), but
  we mirror the CRM's shape rather than modelling it.

## Business rules (draft)
- An account is **owned by a SalesRep**, and only that rep may change its terms (a real domain
  ownership relationship — modelled, not audit metadata).
- The "what counts as a customer" definition (renter / prospect / partner-account) belongs here,
  not in a shared-rules god class.
- **Relationship note:** we take the CRM's record shape (field names, segment codes, id format)
  **exactly as it arrives** and do not reshape it — **Conformist**.
