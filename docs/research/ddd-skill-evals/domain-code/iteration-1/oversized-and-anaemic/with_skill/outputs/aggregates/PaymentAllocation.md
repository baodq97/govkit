---
id: DOMAIN-AGG-INV-0003
title: Invoicing — Aggregate Design Canvas — PaymentAllocation (blocked)
status: draft
owner: TBD
date: 2026-07-27
context: Invoicing
canvas_state: blocked-on-input
---

### Aggregate: PaymentAllocation   (root: `PaymentAllocation`)

> **Canvas deliberately incomplete.** Two blockers, both named rather than filled in:
> 1. **Nobody from accounts receivable or treasury has been in either modelling session.** Attendance
>    for discovery (2026-05-25) was two depot planners, one customs clerk, one finance analyst, three
>    engineers; for the business model (2026-05-18) the commercial director and two depot planners.
>    Every invariant and every volume in this canvas would have to be invented.
> 2. **Its context boundary is in question** (below). Designing the internals before the boundary is
>    settled is work that gets thrown away.

**1. Description**

Matches incoming money to issued invoices — full, partial, and across several invoices from one
receipt.

**Boundary question, routed to loop 2 (`domain-connect` / `domain-decompose`), not decided here.**
`PaymentAllocation` and `DunningCase` look like a *Receivables* concern that has been living inside
Invoicing because both touch invoices. Evidence for the split:

| Dimension | `Invoice` | `PaymentAllocation` |
|---|---|---|
| Trigger | month-end billing run, from shipment facts | bank statement import, from money arriving |
| Clients | 1 (the billing run) | AR clerks + an automated bank file — genuinely many |
| Contention profile | none (see `Invoice.md` §7) | one bank file touching hundreds of invoices — **the only plausible contention in this context** |
| Shared invariant with `Invoice` | — | **none stated** |
| Upstream context | Customs | a bank / payment provider — not on the context map at all |

Two aggregates sharing zero invariants, zero clients and zero upstreams are not one context. This
canvas records that as evidence for loop 2; per the skill's hard rules the boundary move goes back
through loop 2 rather than being made here.

**2. State transitions**

`unknown.` Candidate: `received → allocated | partially-allocated → unapplied-residual`. Not
confirmed; no AR participant exists to confirm it.

**3. Enforced invariants**

**None stated.** The obvious candidates — *allocated amount may not exceed the receipt*, *an invoice
may not be over-allocated*, *a credited invoice may not receive further allocation* — are all
plausible and all unstated. They are questions for AR, not invariants.

**4. Corrective policies**

One is structurally required regardless of which invariants come back, and it is worth naming now
because it drives the schema:

| Situation | Corrective policy | Status |
|---|---|---|
| An allocation must both record the receipt and mark the invoice settled — two aggregates | One transaction per aggregate: `PaymentAllocated` is published, `Invoice` consumes it and settles. Consistency is eventual. Repair for the failure case (money recorded, invoice still shows overdue and enters dunning) is undefined. | **PENDING — owner: AR / credit control.** A customer chased for an invoice they paid is a business incident, not a retry. |

**5. Handled commands → 6. created events**

| Command | Event(s) | Evidence |
|---|---|---|
| `AllocatePayment` | `PaymentAllocated` | candidate — **neither appears in the repo** |

Same gap as `CreditNote`: this aggregate handles no recorded command and emits no recorded event.
Money is being matched to invoices in production today, so the logic exists somewhere the model
cannot see it — services, or a batch job. That is the anaemia, located.

**7. Throughput**

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate | `unknown` — owner: AR / treasury (no such person is recorded anywhere in the repo) | `unknown` |
| Total number of clients | `unknown` — expected many | `unknown` |

→ concurrency conflict chance: **`unknown`, and this is the one place in Invoicing where the answer
could genuinely change a boundary.** A month-end bank file allocating across hundreds of invoices is
the maximum that matters. Guessing it would produce a guessed boundary that then looks measured.

**8. Size**

| Metric | Value |
|---|---|
| Event growth rate (per instance) | `unknown` |
| Lifetime of an instance | `unknown` — depends on whether an instance is one receipt (bounded, days) or one customer's running account (**unbounded**) |

→ **The lifetime question is the design decision.** If an instance is a receipt, size is small and
archival is natural. If it is a customer account, it never ends, never archives, and grows forever.
Where the domain allows, scope it to a period — a receipt or a billing period — rather than a
customer. Decide this before the schema, not after three years of rows.
