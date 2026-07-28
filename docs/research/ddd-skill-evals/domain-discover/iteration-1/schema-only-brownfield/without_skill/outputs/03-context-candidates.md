# 03 — Context Candidates and Dependency Map

> **Scope warning.** The "contexts" below are, on the evidence, *Dataverse solutions* — packaging
> units. ADR-0002 asserts one solution per bounded context (ADR-0004 L12), but ADR-0002 is not in
> this repo, so that equivalence is asserted and not verified here. Treat each candidate as a
> hypothesis to test in decomposition, not as a settled boundary.

## A. Candidate contexts

### 1. `acme_foundation` — shared kernel *(no ADR in repo)*

- **Status:** referenced by both documented contexts; schema undocumented here.
- **Known members:** `acme_currency`, `acme_company`, `acme_country` (3 named incidentally).
- **Actual size:** unknown.
- **Role (inferred, high confidence):** shared kernel / reference data. Both other contexts
  depend on it; it depends on nothing.
- **Risk:** a shared kernel of reference data is low-risk. A shared kernel that has absorbed
  `acme_company` as a full customer master is high-risk — it would make every context depend
  on the most volatile table in the system. Which of the two it is cannot be determined here
  and should be the first question asked of the missing ADR.

### 2. Unknown context — the second of the four *(no ADR in repo)*

ADR-0004 L12 calls `acme_billing` the **third** BC to materialise; ADR-0005 L11 calls
`acme_contracts` the **fourth**. So contexts #1 and #2 exist. One is almost certainly
`acme_foundation`. The other is entirely unidentified.

The negative-space analysis in `02-ubiquitous-language.md` §D suggests the most likely
candidates for the unknown context are **Payments**, **Customer/Party master**, or
**Product/Catalogue** — all three are required by the documented tables and absent from them.

### 3. `acme_billing` — third BC (ADR-0004)

- **6 tables, 110 legacy attributes.**
- **Depends on:** `acme_foundation`, `acme_contracts`.
- **Depended on by:** nothing evidenced. Appears to be a leaf/downstream context.
- **Deferred:** all lookups, plus picklists for *invoice status* and *dunning stage*.
- **Internal shape (inferred):** the six tables do not read as one cohesive aggregate cluster.
  They split along at least two lines:
  - *Billing document* — `acme_invoice` (34), `acme_invoiceline` (19), `acme_creditnote` (22)
  - *Receivables / collections* — `acme_paymentallocation` (16), `acme_dunningrun` (11), `acme_writeoff` (8)

  The first cluster issues demands; the second settles or chases them. Different actors,
  different cadence, different lifecycle. **Sub-context split is a live option** and should be
  tested during decomposition rather than assumed away by the one-solution-per-context rule.

### 4. `acme_contracts` — fourth BC (ADR-0005)

- **5 tables, 99 legacy attributes.**
- **Depends on:** `acme_foundation`.
- **Depended on by:** `acme_billing`.
- **Absorbed:** the renewal slice that DMOEntities previously shipped separately (ADR-0005 L12).
- **Excluded:** `leg_ContractDraftV2` (0 attrs, placeholder) — ADR-0005 L26.
- **Deferred:** all lookups; picklists for *contract status* and *renewal type*; **legacy
  workflow definitions to Phase 4** (ADR-0005 L37).
- **Open by the ADR's own admission:** renewal-as-entity vs renewal-as-state (ADR-0005 L45–46).
- **Internal shape (inferred):** more cohesive than billing. `acme_contract` +
  `acme_contractline` are an obvious aggregate candidate. `acme_servicelevel` and
  `acme_contractparty` may be part of that aggregate or separate; `acme_renewaloption` cannot
  be placed until C1/Q1 is resolved.

## B. Dependency map

```
                    ┌──────────────────────┐
                    │   acme_foundation    │   shared kernel — NO ADR IN REPO
                    │  currency, company,  │   (members known only incidentally)
                    │       country        │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │  (company, country)        │  (currency, company)
                 ▼                            ▼
      ┌─────────────────────┐      ┌─────────────────────┐
      │   acme_contracts    │◄─────│    acme_billing     │
      │   5 tables / 99a    │      │    6 tables / 110a  │
      │   4th BC            │      │    3rd BC           │
      └─────────────────────┘      └─────────────────────┘
              "invoices are raised against a contract"
                      (ADR-0004 L39, ADR-0005 L31)

      ┌─────────────────────┐
      │  UNKNOWN BC #1/#2   │  existence implied by "third"/"fourth" ordinals
      │  ??? tables         │  candidates: Payments / Customer / Catalogue
      └─────────────────────┘
```

**Edges: 3 evidenced. Cycles: none evidenced. Direction: consistent across both ADRs.**

All three edges are declarations of *intent*. Not one is backed by a defined foreign key —
both ADRs defer every lookup column to the relationship pass.

## C. Relationship pattern (inferred, to confirm)

| Edge | Likely DDD pattern | Reasoning |
|---|---|---|
| billing → foundation | Conformist / Shared Kernel | Reference data; billing has no leverage to change currency or company |
| contracts → foundation | Conformist / Shared Kernel | Same |
| billing → contracts | Customer/Supplier | Billing is downstream and both ADRs agree on the direction; contracts is upstream and can dictate |

The billing→contracts edge is the only one where an anti-corruption layer is worth arguing
about, because it is the only edge between two *behavioural* contexts rather than to reference
data. Whether it needs one depends on how tightly invoice lines derive from contract lines
(collision C3), which is unknown.

## D. Sizing signals

| Table | Context | Attrs | Signal |
|---|---|---|---|
| `acme_contract` | contracts | **41** | Largest in corpus. Prime over-loading suspect (C8). Likely hides several concepts — status, dates, parties, commercial terms, renewal state |
| `acme_invoice` | billing | **34** | Second largest. Likely hides tax, addressing, and payment-status fields |
| `acme_contractline` | contracts | 23 | Substantial — a real entity, not a join table |
| `acme_creditnote` | billing | 22 | Nearly as heavy as an invoice; suggests it is a full document, not an adjustment row |
| `acme_invoiceline` | billing | 19 | Real entity |
| `acme_paymentallocation` | billing | 16 | Too heavy to be a pure link table (C7) — probably carries payment data itself |
| `acme_servicelevel` | contracts | 14 | Substantial; supports the "template" reading (C5) |
| `acme_contractparty` | contracts | 12 | Too heavy for a pure role link (C2) |
| `acme_dunningrun` | billing | 11 | Process record (C6) |
| `acme_renewaloption` | contracts | 9 | Smallest real table — consistent with a value object |
| `acme_writeoff` | billing | 8 | Small — consistent with a simple event record |

**Distribution:** 209 attributes across 11 tables, mean 19. The two anchors (`acme_contract`
41, `acme_invoice` 34) hold 36% of all attributes between them. That concentration is the
usual shape of legacy tables that accumulated several concepts, and it is where decomposition
will find most of its value — and where it currently has zero attribute-level evidence to work
with.

## E. What can and cannot be produced downstream

| Decomposition output | Feasible now? | Note |
|---|---|---|
| Coarse context map (4+ contexts, 3 edges) | **Yes** | Section B, with the shared kernel marked unknown |
| Context relationship patterns | **Tentatively** | Section C — inferred, needs confirmation |
| Entity inventory per context | **Yes** | 11 tables, `01-evidence-inventory.md` §B |
| Aggregate boundaries | **No** | Needs cardinality; 0 relationships defined |
| Aggregate roots | **Partially** | `acme_contract` and `acme_invoice` are safe root candidates by dependency direction and size; the other 9 tables cannot be placed |
| Value objects | **No** | Needs attribute names; 0 of 209 available |
| Domain events | **No** | Needs behaviour; the only cited behavioural source (legacy workflows) is deferred to Phase 4 |
| Invariants | **No** | None documented anywhere |
| Ubiquitous language glossary | **Partially** | 14 terms named; 0 defined — see `02-ubiquitous-language.md` |
| Service/deployment boundary map | **Yes, trivially** | One solution per context by ADR-0002 — but that is packaging, not domain |
