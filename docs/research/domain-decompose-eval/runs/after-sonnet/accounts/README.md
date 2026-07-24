---
id: DOMAIN-0008
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
Hold customer sales-account records mirrored nightly from the third-party CRM, and record which
sales rep owns each account.

## Strategic classification
- Sub-domain type: **supporting**
- Why: necessary customer-record keeping; not called out as a differentiator in README.md.

## Ubiquitous language
| Term | Meaning in THIS context |
|---|---|
| SalesAccount | A customer account: id, name, segment, and the sales rep who owns it. |
| SalesRepId | The rep who owns the commercial relationship — the only one allowed to change terms on it. |

## Inbound communication
| From context | Message | Type |
|---|---|---|
| External CRM (3rd party) | `CrmAccountRow` (nightly import) | data feed — **Conformist**: fields mirrored verbatim, no translation |

## Outbound communication
None captured in the given source.

## Aggregates
None — mirrors the CRM's shape directly; see notes.

## Business rules (draft)
- `SalesRepId` is the sales rep who owns the account's commercial relationship and is the only one
  allowed to change its terms.

## Notes
- The CRM import (`ImportFromCrm`) takes the third-party CRM's row shape exactly as it arrives —
  a textbook **Conformist** relationship (no anti-corruption layer, by explicit choice: "we have
  no leverage to change [the CRM's] shapes").
- The ownership rule above is stated in the code's own comment but no `UpdateTerms`/similar method
  is shown enforcing "only the owning rep may change terms" — recorded as-stated per the hard rule
  against inventing rules, with the enforcement gap flagged rather than silently assumed closed.
- `config/teams.yaml` lists `crm-import` as owned by the `platform` squad, but the import method
  lives inside this context's own module (`RentField.Accounts`) — flagged in context-map.md
  Conflicts; no squad is listed as owning `Accounts` as a whole.
