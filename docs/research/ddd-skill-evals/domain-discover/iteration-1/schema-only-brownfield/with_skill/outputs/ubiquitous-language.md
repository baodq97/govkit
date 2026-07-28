# Ubiquitous language — Acme platform rebuild (ground pass, 2026-07-27)

**Status: 0 confirmed, 0 human holders.** A ubiquitous language is what people say. What follows is
what two schema ADRs spell — table identifiers with the prefix removed. The `Held by` column names
a document rather than a person on every row, and that is the finding: no one has yet said any of
these words out loud in a recorded session, so no definition can be challenged.

**No artifact in this repo defines any term.** Not one of the 11 tables in ADR-0004/0005 carries a
description. The `Definition` column below therefore says what can be honestly said — the name — and
labels any reading beyond that as inference.

## Contract vocabulary

| Term | Definition | Held by | Status |
|---|---|---|---|
| Contract | Name only. Largest table in the estate (41 legacy attrs) — likely a core concept, but "likely" is inference | ADR-0005 §Decision (document; no human holder) | candidate |
| Contract Line | Name only. Inferred: a line item within a contract, by analogy with Invoice/InvoiceLine | ADR-0005 §Decision (document) | candidate |
| Renewal Option | Name only. Inferred: something attached to a contract that governs how it renews | ADR-0005 §Decision (document) | candidate |
| Service Level | Name only. Whether this is a committed obligation, a pricing tier, or both is unknown | ADR-0005 §Decision (document) | candidate |
| Contract Party | Name only. Inferred: a participant in a contract — relationship to `acme_company` unresolved (hotspot #8) | ADR-0005 §Decision (document) | candidate |
| Contract Draft | Referenced only as a skipped legacy table (`leg_ContractDraftV2`, 0 attrs, "placeholder slice"). Whether the business has a draft concept at all is open (hotspot #6) | ADR-0005 §Decision (document) | candidate |

## Billing vocabulary

| Term | Definition | Held by | Status |
|---|---|---|---|
| Invoice | Name only. The one behavioural fact recorded anywhere: an invoice is *raised against a contract* | ADR-0004 §Cross-BC dependencies (document) | candidate |
| Invoice Line | Name only. Inferred: a line item within an invoice | ADR-0004 §Decision (document) | candidate |
| Credit Note | Name only. Distinction from Write-Off undefined (hotspot #5) | ADR-0004 §Decision (document) | candidate |
| Write-Off | Name only. Distinction from Credit Note undefined (hotspot #5) | ADR-0004 §Decision (document) | candidate |
| Dunning Run | Name only. "Run" hints at a batch, so a Dunning Stage picklist exists (deferred). Who or what triggers a run is unknown (hotspot #9) | ADR-0004 §Decision + §Deferred (document) | candidate |
| Payment Allocation | Name only. The sole trace of payment in the schema — no Payment or Receipt table exists anywhere (hotspot #10) | ADR-0004 §Decision (document) | candidate |

## Foundation vocabulary

Referenced by both ADRs as cross-BC dependencies; the ADR that owns them (`acme_foundation`) is not
in this repo, so these are names glimpsed from outside.

| Term | Definition | Held by | Status |
|---|---|---|---|
| Company | Name only. Overlaps Contract Party in an unresolved way (hotspot #8) | ADR-0004 §Cross-BC, ADR-0005 §Cross-BC (document) | candidate |
| Currency | Name only | ADR-0004 §Cross-BC (document) | candidate |
| Country | Name only | ADR-0005 §Cross-BC (document) | candidate |

## Collisions — the highest-value rows here

A word that means two things is the strongest boundary signal discovery produces. Both rows stay.
Do not reconcile them; the collision is the finding.

| Term | Definition | Held by | Status |
|---|---|---|---|
| Renewal | a **new contract** that succeeds the old one | legacy schema, as characterised by ADR-0005 §Consequences (document; no human holder for this reading) | candidate |
| Renewal | a **state of the existing contract** | legacy schema, as characterised by ADR-0005 §Consequences (document; no human holder for this reading) | candidate |

ADR-0005 is unusually honest about this: *"Whether a renewal is a new contract or a state of the
existing one is not settled by this ADR; the legacy schema models it both ways in different
tables."* Two implementations of one word coexisted in production, which means two groups of people
have been using it differently for years. Find out who holds each reading — that answer decides the
Contract aggregate boundary and possibly a context boundary (hotspot #1).

**One collision found by a ground pass is not the same as none existing.** Collisions live in
speech, not in schemas; the workshop should expect several more.

## Delivery-process vocabulary — explicitly not domain language

Recorded separately so it never leaks into the model. These words describe how the rebuild is being
executed, not what the business does. They are, notably, the only vocabulary either ADR defines
with any care — which is itself a measure of how little domain language the repo contains.

| Term | Definition | Held by | Status |
|---|---|---|---|
| Relationship pass | The later stage where all cross-BC lookup columns are added | ADR-0004/0005 §Deferred (document) | candidate — delivery, not domain |
| Optionset pass | The later stage where picklist values are migrated (invoice status, dunning stage, contract status, renewal type) | ADR-0004/0005 §Deferred (document) | candidate — delivery, not domain |
| Cutover | The moment legacy `leg_*` tables stop being the system of record | ADR-0004 §Consequences (document) | candidate — delivery, not domain |
| Solution / BC | One deployable solution per bounded context, per ADR-0002 (that ADR is absent from the repo) | ADR-0004 §Context (document) | candidate — delivery, not domain |
| Phase 2 / Phase 4 | Rebuild stages; Phase 2 is schema migration, Phase 4 holds the legacy workflows | ADR-0004 §Context, ADR-0005 §Deferred (document) | candidate — delivery, not domain |
| Legacy / `leg_` | The system being migrated from, and its table prefix | both ADRs (document) | candidate — delivery, not domain |

## How to use this in the workshop

Do not read this list out. Ask people to name things themselves, then compare — a list read aloud
gets agreed with, and false agreement is worse than an open question. The questions worth asking on
every recurring term:

- *"You said '___' — what exactly counts as one of those?"*
- *"Does everyone here use that word the same way?"*

Ask the second one about **Renewal**, **Service Level**, **Contract Party** and **Write-Off** in
particular. Each is a name with no definition, and three of the four already have a hotspot
attached.
