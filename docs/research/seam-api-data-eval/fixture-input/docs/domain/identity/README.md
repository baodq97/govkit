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
Log users in and resolve their identity.

## Strategic classification
- Sub-domain type: **generic**
- Why: a commodity — bought behind a thin adapter (Auth0).

## Aggregates
- **None.** Generic bought capability; no domain model.

## Business rules (draft)
None.

> Integrated behind `Auth0IdentityClient`. This is the **authentication** side. The related
> **authorization** capability (who may touch what) is where the declined "Ownership/Permissions"
> context (see context-map) sends its per-context ownership projections — `account:sales-rep-owner`,
> `document:uploader-owner`, `reservation:custodian-depot` — rather than a single global `Owner`.
