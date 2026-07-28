---
id: DOMAIN-AGG-INV-0004
title: Invoicing — Aggregate Design Canvas — DunningCase (blocked; may not be an aggregate)
status: draft
owner: TBD
date: 2026-07-27
context: Invoicing
canvas_state: blocked-on-input
---

### Aggregate: DunningCase   (root: `DunningCase`)

> **Blocked, and its existence is in question.** This canvas asks one test question before filling
> anything in, because the answer decides whether the aggregate should exist at all.

**1. Description**

Chases an unpaid invoice through escalating reminders.

**The test question — owner: finance analyst / credit control:**

> *Does the business make a decision per case that must be remembered and cannot be recomputed —
> a payment promise, a hold, a dispute, an escalation to legal or to a collections agency?*

| Answer | Verdict |
|---|---|
| **Yes** | It is an aggregate. Those decisions are state, and something must protect the rules around them. Then scope it — see §8. |
| **No** — reminder level is just "days overdue" | **It is not an aggregate.** It is a scheduled transaction script over a query of unpaid invoices. Delete the aggregate, the repository and the tables behind it; keep a reminder log. |

Everything recorded in the repo points at **No**: no invariant, no event, no command, no state, and
a `status`-shaped model. But "no evidence" is not the same as "no rule", and eleven years of
production usually hides at least a dispute flag. Ask; do not assume in either direction.

**Boundary:** the same routing as `PaymentAllocation` — if it survives, it belongs with receivables,
not with invoice production. Evidence in `PaymentAllocation.md` §1. Routed to loop 2.

**2. State transitions**

`unknown.` If the answer above is **No**, the honest transition list is
`created → updated → updated → …` — the naive shape that means the logic lives in a service and the
aggregate is anaemic. If it is **Yes**, the real states are the ones credit control talks about
(*promised to pay*, *disputed*, *with agency*), and none of them is in the model today.

**3. Enforced invariants**

**None stated.** Nothing in `invoicing/model.yaml`, the discovery timeline or the business model
states a dunning rule — not the reminder cadence, not the interest or late-fee treatment, not when a
case stops.

Unstated candidates, for the same conversation: *a case closes when the invoice settles*; *a
disputed invoice is not chased*; *a credited invoice is not chased*. The third one has teeth —
combined with the missing `InvoiceSettled`/`CreditNoteIssued` events (see `Invoice.md` §5–6), a
customer who paid or was credited may still be receiving reminders today. Worth checking against
production before it is designed.

**4. Corrective policies**

None, because no invariant has been relaxed. The failure path that does need a business answer:

| Situation | Corrective policy | Status |
|---|---|---|
| A reminder is sent for an invoice that was settled or credited before the send | undefined | **PENDING — owner: credit control.** Apology, suppression window, or nothing is a business choice. |

**5. Handled commands → 6. created events**

| Command | Event(s) | Evidence |
|---|---|---|
| `OpenDunningCase` / `EscalateDunningCase` | `DunningReminderDue` / `DunningEscalated` | candidate — **none appears in the repo** |

Reminders demonstrably go out — that is what the aggregate is for — yet Invoicing publishes only
`InvoiceIssued`, and Notifications' own `CustomerNotified` is unconfirmed ("nobody confirmed when it
fires", discovery timeline #11). So the reminder path is either outside the domain model or
undocumented. Same finding as the other three canvases, from a different angle.

**7. Throughput**

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate | `unknown` — owner: credit control | `unknown` |
| Total number of clients | `unknown` — expected 1 (a scheduled job) plus occasional human intervention | `unknown` |

→ concurrency conflict chance: **low, provisionally.** No boundary pressure from contention. If this
aggregate is wrong, it is wrong for size and anaemia reasons, not locking reasons.

**8. Size**

| Metric | Value |
|---|---|
| Event growth rate (per instance) | `unknown` |
| Lifetime of an instance | **depends entirely on the key** |

→ This is the section that decides the shape:

- **Keyed by customer** — the instance never ends. A customer who trades for eleven years has an
  eleven-year dunning stream, no natural close, nothing to archive, and every command replays the
  whole history. This is the unbounded-lifetime failure, and it is the most likely explanation for
  part of the 34 tables.
- **Keyed by invoice, or scoped to a billing period** — bounded, closable, archivable. Where the
  domain allows a time period, use it. Deciding this now costs a conversation; deciding it later
  means splitting instances that are already years old.

Recommendation, conditional on the aggregate surviving the §1 test: **key it by invoice.** It has one
subject and it ends when that invoice settles or is written off.
