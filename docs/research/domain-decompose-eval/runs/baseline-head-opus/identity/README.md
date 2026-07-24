---
id: DOMAIN-0012
title: Identity bounded context
status: draft
owner: TBD
date: 2026-07-24
related_prds: []
related_rfcs: []
related_adrs: []
---

# Identity bounded context

## Purpose
Resolve user identity / login via Auth0.

## Strategic classification
- Sub-domain type: **generic**
- Why: off-the-shelf commodity. Thin adapter over the Auth0 SDK, no domain model, swappable.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| Principal | The verified user identity (subject) resolved from a bearer token. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| (caller) | ResolveUserId(bearer) | query |

## Outbound communication
| To context | Message | Type |
|---|---|---|
| Auth0 (external) | Verify(bearer) | query (conformist adapter) |

## Aggregates
- None — thin adapter, no business rules. Candidate to keep bought, not built.

## Business rules (draft)
None — no domain policy lives here.
