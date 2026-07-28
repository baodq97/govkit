# 02 — Ubiquitous Language

Every term below is drawn from a table name in the two ADRs. Definitions are **not** in the
repo; the "working definition" column is inferred from the name plus context and is offered
for the decomposition to confirm or reject, not to adopt silently.

## A. Evidenced terms

### `acme_billing`

| Term | Table | Attrs | Working definition (inferred) | Confidence |
|---|---|---|---|---|
| Invoice | `acme_invoice` | 34 | A demand for payment raised against a contract (ADR-0004 L39) | High |
| Invoice Line | `acme_invoiceline` | 19 | A charge line within an invoice | High |
| Credit Note | `acme_creditnote` | 22 | A negative adjustment issued against an invoice | Medium |
| Dunning Run | `acme_dunningrun` | 11 | A batch execution of collections chasing on overdue invoices | Medium |
| Payment Allocation | `acme_paymentallocation` | 16 | The application of received money to one or more invoices | Medium |
| Write-Off | `acme_writeoff` | 8 | Recognition that a receivable will not be collected | Medium |

### `acme_contracts`

| Term | Table | Attrs | Working definition (inferred) | Confidence |
|---|---|---|---|---|
| Contract | `acme_contract` | 41 | The commercial agreement invoices are raised against | High |
| Contract Line | `acme_contractline` | 23 | A committed item or service within a contract | High |
| Renewal Option | `acme_renewaloption` | 9 | A right or term governing extension of a contract | **Low** — see C1 |
| Service Level | `acme_servicelevel` | 14 | A committed level of service | **Low** — see C5 |
| Contract Party | `acme_contractparty` | 12 | A participant in the contract | **Low** — see C2 |

### `acme_foundation` (named only in passing; no ADR present)

| Term | Table | Working definition (inferred) | Confidence |
|---|---|---|---|
| Currency | `acme_currency` | Monetary unit; referenced by billing (ADR-0004 L38) | High |
| Company | `acme_company` | Legal or organisational entity; referenced by **both** contexts (ADR-0004 L38, ADR-0005 L30) | High |
| Country | `acme_country` | Territory; referenced by contracts (ADR-0005 L30) | High |

`acme_company` is the only term referenced by both documented contexts. It is the strongest
shared-kernel candidate in the evidence.

## B. Process and platform vocabulary

| Term | Meaning as used | Source |
|---|---|---|
| Relationship pass | The later stage that will define every lookup column | ADR-0004 L44, ADR-0005 L35 |
| Optionset pass | The later stage that will define every picklist's values | ADR-0004 L45, ADR-0005 L36 |
| Solution | Deployment/packaging unit; one per bounded context per ADR-0002 | ADR-0004 L12 |
| Publisher | Owner of the `acme_` prefix | ADR-0004 L11 |
| `leg_` | Legacy-system prefix being retired | ADR-0004 L11 |
| Cutover | The point legacy tables are retired | ADR-0004 L53 |
| **DMOEntities** | **Undefined.** Shipped the renewal slice separately from the contract tables | ADR-0005 L12 |

`DMOEntities` is the one term in the corpus with no recoverable meaning. It matters because it
is credited with having owned the renewal slice — the very slice whose modelling is unresolved.
See Q6.

## C. Collisions and ambiguities

Eight items. These are the language problems that will become modelling problems.

**C1 — Renewal: entity or state?** *(highest priority)*
ADR-0005 L45–46 states outright that it is unsettled whether a renewal is a new contract or a
state of the existing one, and that the legacy schema models it **both ways in different
tables**. The name `RenewalOption` suggests a third reading: neither the renewal nor the
renewed contract, but the *right* to renew. Three candidate meanings, all live. This decides
whether `Contract` is one aggregate or two.

**C2 — Party vs Company vs the missing customer.**
`acme_contractparty` (contracts) and `acme_company` (foundation) both denote "an organisation
involved". Is a contract party a role played by a company, or an independent record? A
12-attribute table suggests it carries its own data, not just a link. Meanwhile billing has
**no** customer, account, or party table at all — yet an invoice must be addressed to someone.
Either billing reaches into contracts for the payer, or into foundation's `acme_company`, or
there is an undocumented table. All three have different boundary consequences.

**C3 — "Line" means two different things.**
`acme_contractline` (23 attrs) and `acme_invoiceline` (19 attrs). Same word, two contexts,
different lifecycles: a contract line is a commitment, an invoice line is a charge. If invoice
lines derive from contract lines, that derivation is the main functional coupling between the
two contexts and no evidence describes it. If they are independent, the shared word is a trap.

**C4 — Credit Note vs Write-Off overlap.**
Both reduce a receivable. Conventionally a credit note is a commercial correction issued to the
customer and a write-off is an internal accounting recognition of a bad debt — but nothing in
the repo says so, and their attribute counts (22 vs 8) suggest very different weights. The
boundary between them is undefined.

**C5 — Service Level: template or instance?**
`acme_servicelevel` sits inside the contracts solution with 14 attributes. It could be a
catalogue of reusable SLA definitions (which would belong in foundation or a catalogue context)
or a per-contract committed level (which belongs on the Contract aggregate). Placement in the
contracts solution weakly favours instance, but that is packaging evidence, not domain evidence.

**C6 — Dunning Run is a process modelled as a table.**
`acme_dunningrun` is a batch *execution*, not a business object. It is the only process-shaped
entity in the corpus. Options: keep it as a job/process record inside billing, extract a
Collections context, or treat it as a read/reporting model. Its 11 attributes will decide, and
they are unnamed.

**C7 — Payment Allocation without a Payment.**
`acme_paymentallocation` exists; no `acme_payment` exists anywhere in either context. An
allocation presupposes the money it allocates. Either payments live in an undocumented context
(one of ADR-0001/0003), or they live in an external system, or the 16 attributes fold payment
and allocation into one table. This is the clearest signal of a missing upstream context.

**C8 — "Contract" carries no order or subscription sibling.**
ADR-0004 L39 makes Contract the anchor invoices are raised against. There is no order,
subscription, quote, or agreement-version concept. For a platform that bills recurring service
levels, a contract doing all of that work is a strong candidate for over-loading — consistent
with it being the largest table in the corpus at 41 attributes.

## D. Negative space — concepts conspicuously absent

Recording what is *not* there is as load-bearing as recording what is. None of the following
appear in either ADR, and all are standard in a contracts-plus-billing platform:

| Missing concept | Why its absence is notable | Likely explanation |
|---|---|---|
| **Payment** | `PaymentAllocation` cannot stand alone (C7) | Undocumented context, or external system |
| **Customer / Account** | An invoice needs a payer; billing has no party table (C2) | Reached from foundation's `acme_company` |
| **Product / Item / Price List** | Contract lines and invoice lines both need something to reference | Undocumented context (candidate for ADR-0001/0003) |
| **Tax / VAT** | Invoicing with `acme_currency` but no tax concept | Hidden in the 34 unnamed invoice attributes, or external |
| **Ledger / GL posting** | `WriteOff` implies accounting recognition downstream | External finance system |

Each of these is a **question for the decomposition, not a gap to fill by invention.** The
most probable single answer is that ADR-0001 and ADR-0003 — the two missing context ADRs —
cover some of them. Recovering those two documents is the cheapest way to close most of this
section at once.
