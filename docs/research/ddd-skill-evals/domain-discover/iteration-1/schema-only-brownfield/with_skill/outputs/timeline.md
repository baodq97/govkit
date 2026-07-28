# Timeline — Acme platform rebuild (ground pass, 2026-07-27)

**Status of this file: 0 confirmed, 22 candidates.** Nothing below was confirmed by a person. Every
row was derived from `docs/adr/ADR-0004-billing-schema.md` or `docs/adr/ADR-0005-contracts-schema.md`.

**This is not yet a timeline.** Schemas encode structure, not sequence, so the `#` column is a list
position, not time order. The only ordering fact any artifact states is that a contract exists
before an invoice is raised against it (ADR-0004 §Cross-BC dependencies). Establishing real time
order is the first job of the workshop.

## Candidate domain events

Six rows. Only the first is grounded in a verb someone wrote down; the rest are **noun→event
inferences** from table names, flagged as such in the source cell. Take them to the expert as
prompts, not as findings.

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 1 | InvoiceRaised | event | — / — | candidate | ADR-0004 §Cross-BC dependencies — *"invoices are raised against a contract"* (only behavioural sentence in the repo) |
| 2 | CreditNoteIssued | event | — / — | candidate | ADR-0004 §Decision, `acme_creditnote` (noun→event inference; no verb in any artifact) |
| 3 | PaymentAllocated | event | — / — | candidate | ADR-0004 §Decision, `acme_paymentallocation` (noun→event inference) |
| 4 | DunningRunExecuted | event | — / — | candidate | ADR-0004 §Decision, `acme_dunningrun` (noun→event inference; whether a "run" is one event or many is unknown) |
| 5 | DebtWrittenOff | event | — / — | candidate | ADR-0004 §Decision, `acme_writeoff` (noun→event inference) |
| 6 | ContractRenewed | event | — / — | candidate | ADR-0005 §Decision, `acme_renewaloption` + §Deferred "renewal type" picklist (noun→event inference; ADR-0005 §Consequences leaves the meaning open — hotspot #1) |

## Candidate aggregates

Table names are the strongest signal a schema ADR gives. Read them as nouns the business may use,
not as confirmed aggregate roots — the ADRs assign no invariant to any of them, and an aggregate
without an invariant is just a table.

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 7 | Contract | aggregate | — / — | candidate | ADR-0005 §Decision, `acme_contract` (41 legacy attrs — the largest table in either ADR) |
| 8 | ContractLine | aggregate | — / — | candidate | ADR-0005 §Decision, `acme_contractline` (23 attrs) |
| 9 | RenewalOption | aggregate | — / — | candidate | ADR-0005 §Decision, `acme_renewaloption` (9 attrs) |
| 10 | ServiceLevel | aggregate | — / — | candidate | ADR-0005 §Decision, `acme_servicelevel` (14 attrs) |
| 11 | ContractParty | aggregate | — / — | candidate | ADR-0005 §Decision, `acme_contractparty` (12 attrs) |
| 12 | Invoice | aggregate | — / — | candidate | ADR-0004 §Decision, `acme_invoice` (34 attrs) |
| 13 | InvoiceLine | aggregate | — / — | candidate | ADR-0004 §Decision, `acme_invoiceline` (19 attrs) |
| 14 | CreditNote | aggregate | — / — | candidate | ADR-0004 §Decision, `acme_creditnote` (22 attrs) |
| 15 | DunningRun | aggregate | — / — | candidate | ADR-0004 §Decision, `acme_dunningrun` (11 attrs) |
| 16 | PaymentAllocation | aggregate | — / — | candidate | ADR-0004 §Decision, `acme_paymentallocation` (16 attrs) |
| 17 | WriteOff | aggregate | — / — | candidate | ADR-0004 §Decision, `acme_writeoff` (8 attrs) |
| 18 | Company | aggregate | — / — | candidate | ADR-0004 + ADR-0005 §Cross-BC (`acme_company`, owned by `acme_foundation`; that ADR is not in the repo) |
| 19 | Currency | aggregate | — / — | candidate | ADR-0004 §Cross-BC (`acme_currency`, owned by `acme_foundation`; ADR absent) |
| 20 | Country | aggregate | — / — | candidate | ADR-0005 §Cross-BC (`acme_country`, owned by `acme_foundation`; ADR absent) |

## Candidate external systems

| # | Element | Type | Actor / command | Status | Source |
|---|---|---|---|---|---|
| 21 | Legacy environment (`leg_*` tables) | external-system | — / — | candidate | ADR-0004 §Consequences — *"legacy `leg_*` tables stay in the legacy environment until cutover"*; both systems hold billing data until then |
| 22 | Legacy workflow engine (`solutions/legacy/Contracts/src/Workflows/`) | external-system | — / — | candidate | ADR-0005 §Deferred — deferred to Phase 4. Almost certainly where the policies are encoded; nobody has read it |

## What the ground pass could not produce

These are empty because the artifacts contain nothing to derive them from — not because the domain
lacks them. Leaving them blank is the finding; filling them in would be fabrication.

| Element type | Found | Why |
|---|---|---|
| **Actor** | **0** | No artifact names a single human role. `@platform` is the ADRs' engineering owner, not a domain actor. Every command below therefore has no issuer. |
| **Command** | **0** | Commands are imperatives someone issues. With no actors and no verbs written down, nothing can be derived without inventing it. |
| **Policy** | **0** | Zero "whenever X, then Y" rules anywhere in the repo. ADR-0005 defers `src/Workflows/` to Phase 4 — that deferral is why this row is empty. |
| **Invariant / business rule** | **0** | No ADR states a single rule about what must never happen. Nothing in a schema ADR can supply one. |
| **Read model** | **0** | No artifact mentions anything anyone looks at before deciding. Ask about the spreadsheets. |

Every picklist that would reveal a state machine — invoice status, dunning stage (ADR-0004
§Deferred), contract status, renewal type (ADR-0005 §Deferred) — was pushed to the "optionset
pass". Those transitions are the domain events. They exist, enumerated, somewhere outside this
repo. Get that list before the workshop (hotspot #3).
