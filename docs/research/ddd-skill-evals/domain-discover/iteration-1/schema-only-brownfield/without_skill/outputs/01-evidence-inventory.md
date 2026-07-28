# 01 — Evidence Inventory

## A. What was read

Complete recursive listing of the source repo (including hidden entries):

```
docs/adr/ADR-0004-billing-schema.md   (54 lines, status: accepted, owner: @platform, 2026-06-02)
docs/adr/ADR-0005-contracts-schema.md (46 lines, status: accepted, owner: @platform, 2026-06-09)
```

Two files. No `.git`, no source tree, no package manifest, no tests, no README.

Both documents are *schema* ADRs: they record a legacy-to-target table mapping and a column
naming convention. Neither records behaviour, rules, or process.

## B. Entity inventory (evidenced)

### `acme_billing` — 6 tables, 110 legacy attributes (ADR-0004 L21–26)

| Legacy table | Target table | Legacy attrs |
|---|---|---|
| `leg_Invoice` | `acme_invoice` | 34 |
| `leg_InvoiceLine` | `acme_invoiceline` | 19 |
| `leg_CreditNote` | `acme_creditnote` | 22 |
| `leg_DunningRun` | `acme_dunningrun` | 11 |
| `leg_PaymentAllocation` | `acme_paymentallocation` | 16 |
| `leg_WriteOff` | `acme_writeoff` | 8 |

### `acme_contracts` — 5 tables, 99 legacy attributes (ADR-0005 L20–24)

| Legacy table | Target table | Legacy attrs |
|---|---|---|
| `leg_Contract` | `acme_contract` | 41 |
| `leg_ContractLine` | `acme_contractline` | 23 |
| `leg_RenewalOption` | `acme_renewaloption` | 9 |
| `leg_ServiceLevel` | `acme_servicelevel` | 14 |
| `leg_ContractParty` | `acme_contractparty` | 12 |

**Totals: 11 tables, 209 legacy attributes.** Not one of the 209 attribute names is recorded
in the repo.

### Explicitly excluded

- `leg_ContractDraftV2` — skipped, 0 legacy attributes, described as a placeholder slice
  (ADR-0005 L26). Treat as dead legacy, not as a gap.

## C. Column convention (evidenced, ADR-0004 L30–32)

- `acme_name` — text(200), required, primary
- `acme_description` — text(2000), optional
- Legacy custom attributes renamed `leg_` → `acme_`, type-mapped per `phase2_lib.py`

Consequence worth carrying into decomposition: **no natural or business key is documented for
any of the 11 tables.** Identity is a required 200-char display label. Invoice numbers,
contract numbers, and credit-note references — if they exist — are hidden inside the 209
unnamed attributes.

## D. Cross-context dependencies (evidenced)

Three directed edges, all stated as intent rather than as implemented foreign keys:

| From | To | Named targets | Source |
|---|---|---|---|
| `acme_billing` | `acme_foundation` | `acme_currency`, `acme_company` | ADR-0004 L38 |
| `acme_billing` | `acme_contracts` | — ("invoices are raised against a contract") | ADR-0004 L39 |
| `acme_contracts` | `acme_foundation` | `acme_company`, `acme_country` | ADR-0005 L30 |

ADR-0005 L31 restates the billing→contracts edge from the consumer side and correctly points
at ADR-0004 as the declaring document. The two ADRs are **consistent** on direction: billing
depends on contracts, not the reverse. No cycle is evidenced.

## E. Referenced but absent from the repo

This is the load-bearing part of the inventory. Nine artefacts are cited by the ADRs and are
not present:

| Artefact | Cited at | Why it matters |
|---|---|---|
| `ADR-0002` (rule: one solution per bounded context) | ADR-0004 L12 | The governing boundary rule for the whole rebuild is unreadable |
| `ADR-0001`, `ADR-0003` | implied by "third BC" / "fourth BC" (ADR-0004 L12, ADR-0005 L11) | Two more contexts exist and are undocumented here |
| `acme_foundation` schema ADR | ADR-0004 L38, ADR-0005 L30 | The shared kernel both contexts depend on |
| `scripts/phase2_billing.py` | ADR-0004 L17 | Generates the per-attribute mapping — would recover the 110 billing attribute names |
| `phase2_lib.py` | ADR-0004 L32 | Holds the legacy→target type map |
| `solutions/legacy/Contracts/src/Workflows/` | ADR-0005 L37 | The **only** cited source of behaviour anywhere; deferred to Phase 4 |
| "DMOEntities" | ADR-0005 L12 | Undefined term; shipped the renewal slice separately |
| Relationship-pass output | ADR-0004 L44, ADR-0005 L35 | All cardinality |
| Optionset-pass output | ADR-0004 L45, ADR-0005 L36 | All lifecycle states |

## F. Coverage numbers

| Measure | Value | Basis |
|---|---|---|
| Bounded contexts with an ADR in this repo | 2 of ≥4 (**50%**) | ADR-0004 is the 3rd BC, ADR-0005 the 4th |
| Tables inventoried | 11 | ADRs |
| Attribute names recovered | 0 of 209 (**0%**) | counts only |
| Foreign keys / relationships defined | **0** | deferred to relationship pass |
| Enumerations defined | **0** of 4 named | deferred to optionset pass |
| Named picklists without values | 4 — invoice status, dunning stage, contract status, renewal type | ADR-0004 L45, ADR-0005 L36 |
| Behavioural artefacts in repo | **0** | workflow dir referenced, not present |
| Documented invariants / rules | **0** | — |
| Documented domain events | **0** | — |
| Documented actors / use cases | **0** | — |

## G. Platform inference

**Label: `inferred`, confidence: high.**

The vocabulary across both ADRs — *publisher*, *solution*, *custom tables*, *lookup columns*,
*optionsets*, *picklists*, an `acme_` schema prefix, and a required `acme_name` text primary
column on every table — is Microsoft Dataverse / Power Platform terminology, not generic
relational-database terminology.

Two consequences the decomposition must weigh:

1. **`acme_name` is a platform artefact, not a domain attribute.** Dataverse requires a
   primary-name column on every table. Do not model it as a domain concept.

2. **ADR-0002's "one solution per bounded context" makes the context boundary equal to the
   deployment/packaging boundary.** That is convenient, but a Dataverse solution is a shipping
   unit shaped by licensing, ALM, and publisher ownership. It is not automatically a domain
   boundary. Treat the four `acme_*` solutions as *candidate* contexts to be tested against the
   domain, not as contexts already proven. See Q3 in `04-open-questions.md`.

## H. Evidence quality assessment

| Dimension | Rating | Note |
|---|---|---|
| Structural (what tables exist) | **Good** | 11 tables named on both sides of the migration |
| Attribute-level | **None** | 209 counts, 0 names |
| Relational | **None** | deliberately deferred |
| Behavioural | **None** | deliberately deferred to Phase 4 |
| Lifecycle / state | **None** | deliberately deferred |
| Provenance | **Good** | both ADRs accepted, owned, dated, mutually consistent |

The gaps are *deliberate sequencing*, not sloppiness — the ADRs say so plainly. Discovery
should read them as "not yet", not "unknown". That distinction changes the recommendation
from "go investigate the legacy system" to "wait for or pull forward the relationship pass".
