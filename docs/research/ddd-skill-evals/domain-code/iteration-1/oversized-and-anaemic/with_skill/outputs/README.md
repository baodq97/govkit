---
id: DOMAIN-CTX-INV-0001
title: Invoicing — aggregate design summary
status: draft
owner: TBD
date: 2026-07-27
context: Invoicing
---

# Invoicing — aggregate design (CODE step)

Aggregate Design Canvases for the Invoicing context, produced from `invoicing/model.yaml`, the
discovery timeline, the context map and the business model. Design only — no implementation.

## Missing inputs, and what they cost

This step has four inputs. Two are absent, and pretending otherwise would mean inventing the parts
they supply.

| Input | State | Consequence |
|---|---|---|
| `invoicing/model.yaml` | present | first-pass aggregates, the one recorded invariant, mass figures |
| `docs/domain/invoicing/README.md` — **Bounded Context Canvas** | **absent before this file** | no recorded business decisions, so every invariant had to come from the discovery timeline instead. Only **two** stated rules exist for the whole context. Run `domain-define` before implementation. |
| `docs/domain/message-flows/` | **absent** | throughput and client counts cannot be derived. They are recorded as `unknown` with named owners rather than estimated. |
| Quality attributes | **absent** | the concurrency and auditability demands that would normally decide these boundaries are unavailable. |

This file supplies the aggregate summary that step 10 requires. It is **not** a Bounded Context
Canvas and should not be mistaken for one.

## The measurement first

| Signal | Invoicing | Rest of the modelled system |
|---|---|---|
| Tables | **34** (45% of all 76) | 42 across six contexts |
| Attributes | **311** (51% of all 607) | 296 |
| Densest entity | **128 attributes** | next densest is Customs at 34 — **3.8×** |
| Declared aggregates | **5** (56% of the system's 9) | 4 |
| Stated invariants | **1** → 0.2 per aggregate | 1.0 per aggregate in every other modelled context |
| Declared domain events | **1** → 0.2 per aggregate | 2.0 per aggregate in Booking, Quoting, Customs, Consolidation |

Two readings follow directly.

**Oversized.** Invoicing holds half the modelled system's mass. `business-model.md` rates the same
capability `compliance-enforcer` / `commodity` / differentiation **no** — *"nobody has ever chosen us
because of our invoices"* (commercial director, 2026-05-18). Meanwhile Consolidation, the capability
carrying the +18% Guaranteed Consolidation premium and rated the one true differentiator, is 5 tables
and 41 attributes. Mass has been allocated inversely to value.

**Anaemic.** Four of the five aggregates enforce no stated rule, handle no recorded command and emit
no recorded event. `model.yaml` documents no entity with more than 4 attributes while the densest
real entity carries 128 — the written model describes roughly 3% of it. The rules exist (money is
matched, reminders are sent, VAT is applied); they live in services around wide rows, where the model
cannot protect them.

**Note on the `core` label.** `model.yaml` and `context-map.md` both say `subdomain_type: core`;
`business-model.md` says commodity, no differentiation; and the context map itself records that the
classification *"has not been revisited since the first modelling session in March."* That
contradiction changes how much aggregate ceremony this context deserves. It is **not** resolved here
— `domain-strategize` owns it. It is raised because a wrong `core` label is the cheapest available
explanation for 34 tables.

## Right-sizing: 5 declared aggregates → 2 kept, 2 relocated, 1 declined

| Declared | Verdict | Reason | Artifact |
|---|---|---|---|
| `Invoice` | **Aggregate — full canvas** | Holds both stated rules and the one confirmed event. Boundary is the document. | [`aggregates/Invoice.md`](aggregates/Invoice.md) |
| `CreditNote` | **Aggregate — conditional** | Exists only if an issued invoice is immutable. Nobody has stated that. One question decides it. | [`aggregates/CreditNote.md`](aggregates/CreditNote.md) |
| `PaymentAllocation` | **Blocked — boundary question** | Shares no invariant, no client and no upstream with `Invoice`. Looks like a Receivables context. Routed to loop 2. No AR participant has ever attended a session. | [`aggregates/PaymentAllocation.md`](aggregates/PaymentAllocation.md) |
| `DunningCase` | **Blocked — may not be an aggregate** | If no per-case decision must be remembered, it is a scheduled transaction script over a query, not an aggregate. One test question in the canvas. | [`aggregates/DunningCase.md`](aggregates/DunningCase.md) |
| `SurchargeSchedule` | **Declined — not an aggregate** | See below. **No canvas, deliberately.** | — |

### Why `SurchargeSchedule` gets no canvas

`model.yaml` records: *"Three of the five aggregates exist to model VAT variations across the nine
ports; two were added when the Finnish tax rules changed in 2024."*

VAT rates per port are **reference / master data**. They are authored outside the business by tax
authorities, they hold no rule of ours, and they have no lifecycle we control — a rate change is not
something the business *decides*, it is something the business *receives*. Reference data gets plain
effective-dated lookup CRUD: no aggregate, no repository-per-root, no domain events.

An empty aggregate list with a one-line rationale is a complete result here, not a gap. The
alternative — the current one — is that a Finnish tax change in 2024 required two new aggregates,
which is precisely the "painful to change" symptom that prompted this work.

**Design decision (mine, not the business's):** at issue time the selected rate is **copied onto the
invoice line as a value object**, so a historical invoice reproduces regardless of later rate
changes. Labelled as a design decision because no one stated a reproducibility requirement —
confirm it with the finance analyst, since it is also what makes invariant I2 auditable.

## What actually stays consistent in one transaction

The question this step exists to answer, per aggregate:

| Aggregate | Held in one transaction | Eventual, via event | Corrective policy |
|---|---|---|---|
| `Invoice` | I1 declaration cleared (on a local projection), I2 premium not reduced by fill rate | settlement, correction | I1 post-issue revocation — **PENDING, business** |
| `CreditNote` | nothing stated yet | `Invoice` moves to `corrected` on `CreditNoteIssued` | failed consumption — **PENDING, business** |
| `PaymentAllocation` | nothing stated yet | `Invoice` settles on `PaymentAllocated` | money recorded / invoice still chased — **PENDING, business** |
| `DunningCase` | nothing stated yet | reads settlement and credit facts | reminder after settlement — **PENDING, business** |

Four pending corrective policies is not a design; it is the honest state of a context whose rules
were never written down. **Each must be answered by a named person before the corresponding path is
built** — a relaxed rule with no repair path is an unhandled defect with a schedule, not eventual
consistency.

## Ubiquitous language — one term must change

`invoicing/model.yaml` defines **Consignment** as *"a billable line on an invoice"*. `booking/model.yaml`
defines the same word as *"the goods a customer hands over as one unit"*. Discovery hotspot #2 is
exactly this: *"Finance and operations use 'consignment' differently"* (finance analyst).

Ops owns the physical meaning across Booking, Consolidation and Customs; Invoicing is the outlier.
Rename the Invoicing term to **`InvoiceLine`** (the entity is already called that — only the glossary
term is wrong) and remove `Consignment` from the Invoicing language table.

This matters structurally, not stylistically: `context-map.md` records `ConsignmentLine` as a
**Shared Kernel** between Booking and Consolidation. If Invoicing reuses that class for a billing
line, the shared kernel silently grows a third writer with an unrelated meaning. Invoicing takes
`ShipmentRef` (Building Blocks level, fine) and defines its own `InvoiceLine`.

## Code structure contract

For the implementer. These are structural rules, not a framework choice.

1. **Dependencies point inward.** The domain layer holds `Invoice`, `InvoiceLine`, `CreditNote` and
   the value objects, and depends on no ORM, HTTP framework, message bus or clock. Test: the two
   stated invariants must be unit-testable with no database.
2. **No ORM annotations on the aggregates.** Today's 128-attribute entity is what happens when the
   persistence model dictates the domain model. If the language forces a compromise, keep it
   one-directional and record it as a known concession.
3. **No `now()` inside an aggregate.** Due dates, VAT effective dates and dunning cadence are domain
   concepts; inject the clock or pass the effective date in. Invoicing is full of date-sensitive
   rules, so this one is load-bearing here.
4. **Reference other aggregates by id only.** `CreditNote` holds `invoiceId`, never an `Invoice`
   object. `PaymentAllocation` holds `invoiceId`. No traversal.
5. **One transaction per aggregate.** Between aggregates: an event plus a named corrective policy —
   the four rows in the table above.
6. **Repository per aggregate root**, returning the root. No `InvoiceLineRepository`.
7. **Invariants live inside the aggregate.** Neither stated invariant can be expressed as a schema
   constraint (see `Invoice.md` §3) — if `data-model` also assumes the other layer handles them,
   nobody does.
8. **Commands return outcomes, including rejection.** *"Line references an uncleared declaration"* is
   a domain result, not an exception for the transport layer to translate.
9. **The language appears in the code.** Class, method, event and test names match the canvases —
   including `InvoiceLine` rather than `Consignment`.

## Proposed delta to `invoicing/model.yaml`

`domain-decompose` owns that file. **Proposed, not applied:**

| # | Change | Evidence |
|---|---|---|
| 1 | Remove `SurchargeSchedule` from `aggregates`; add a `reference_data:` entry for VAT rates and surcharge rate cards | `model.yaml` notes; right-sizing above |
| 2 | Add invariant *"the Guaranteed Consolidation premium is charged whether or not the container ends up full"* | finance analyst, discovery timeline 2026-05-25 — stated in discovery, never recorded in the model |
| 3 | Mark `PaymentAllocation` and `DunningCase` as boundary-pending (candidate Receivables context) | `PaymentAllocation.md` §1 |
| 4 | Replace the `Consignment` language entry with `InvoiceLine` | discovery hotspot #2; shared-kernel risk |
| 5 | Add candidate events `InvoiceSettled`, `CreditNoteIssued`, `DunningReminderDue` as `candidate: true` | canvases §5–6 — Invoicing publishes 1 event while running 4 processes |
| 6 | Flag `subdomain_type: core` as disputed, pending `domain-strategize` | `business-model.md`: commodity, differentiation `no` |

## Handoff

| Next | Takes | Does not take |
|---|---|---|
| `data-model` | `Invoice`, `InvoiceLine`, `CreditNote`, the identity scheme, the VAT/surcharge reference tables as plain effective-dated lookups, and the `ClearedDeclarations` projection | The two invariants — **neither is schema-enforceable** (I1 crosses a context boundary, I2 spans rows). They stay in the aggregate. Corrective policies are code, not constraints. Do not model `PaymentAllocation` / `DunningCase` yet — boundary pending. |
| `api-designer` | `IssueInvoice`, `CorrectInvoice` (→ `IssueCreditNote`) as the public command surface; `InvoiceIssued` as the published contract Notifications already depends on | Internal drafting events, aggregate internals, and any candidate event until confirmed |
| implementer | The four canvases plus the code structure contract above | Anything not written down — in particular, none of the four pending corrective policies, and none of the unstated candidate invariants. Blocked paths stay blocked. |

## Open questions — with owners

| # | Question | Owner | Blocks |
|---|---|---|---|
| 1 | Is an issued invoice immutable? | finance analyst | Whether `CreditNote` exists at all |
| 2 | What happens when a declaration is amended after the invoice was issued? | finance analyst + customs clerk | `Invoice` corrective policy; also needs an amendment event Customs does not publish |
| 3 | Does credit control remember a per-case decision (promise, dispute, hold)? | credit control | Whether `DunningCase` is an aggregate or a scheduled script |
| 4 | Command rate and client count per invoice at month-end | finance analyst | Confirms or overturns the "no contention" conclusion that justifies not splitting `Invoice` |
| 5 | Bank-file allocation volumes and concurrency | AR / treasury — **no such person appears anywhere in the repo** | The whole `PaymentAllocation` canvas |
| 6 | Statutory retention period for invoices | finance analyst | Archival plan |
| 7 | Is Invoicing really `core`? | `domain-strategize` | How much of this ceremony is warranted at all |

Questions 1, 3 and 5 each cost one conversation and each changes the schema. They are the cheapest
work available before the refactor starts.
