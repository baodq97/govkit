---
id: DOMAIN-AGG-INV-0001
title: Invoicing — Aggregate Design Canvas — Invoice
status: draft
owner: TBD
date: 2026-07-27
context: Invoicing
---

### Aggregate: Invoice   (root: `Invoice`)

**1. Description**

One issued billing document for one customer, covering one or more shipments. The boundary is the
document, because the document is what the business hands to a customer, what the tax authority
sees, and what the one recorded invariant attaches to.

*Alternatives considered and rejected:*

| Alternative | Why rejected |
|---|---|
| `CustomerAccount` — all invoices, payments and dunning for one customer in one aggregate | Immortal lifetime, unbounded event growth, nothing to archive (§8). It would also serialise the month-end billing run behind collections activity for the same customer. |
| `InvoiceLine` as its own aggregate | Both stated rules (I1, I2) are evaluated at issue time *across* all lines. Lines cannot be independently consistent, so this split would need corrective policies for a contention problem that §7 says does not exist. |
| Keep the 5 aggregates in `model.yaml` as-is | 3 of them enforce no stated rule and emit no recorded event; per `notes` in `model.yaml` three exist "to model VAT variations across the nine ports", which is reference data, not a consistency boundary. See README §Right-sizing. |

*What was traded away:* the VAT/port variation modelling leaves the aggregate set entirely and
becomes effective-dated reference data read at issue time (see `SurchargeSchedule` decline in the
README). The cost is that a rate change is no longer "a domain event on an aggregate"; the benefit
is that 3 of 5 aggregates and most of the 34 tables stop being consistency boundaries the code has
to defend.

**2. State transitions**

*Confirmed from the repo:* `Invoice` carries a bare `status` attribute (`invoicing/model.yaml`), and
`InvoiceIssued` is the only confirmed event in the whole context (discovery timeline #10, finance
analyst).

Nothing else about the lifecycle is recorded anywhere. **That absence is the finding, not a gap in
this canvas**: 5 aggregates, 1 invariant and 1 event across 34 tables and 311 attributes is the
anaemic signature — the transitions exist, but in services around a 128-attribute row where the
model cannot protect them.

*Candidate transitions — to be read off the existing code and confirmed with the finance analyst
before any refactoring starts:*

```
draft ──issue──▶ issued ──payment applied──▶ settled
                    │
                    ├──due date passed──▶ overdue ──payment applied──▶ settled
                    └──credit note issued──▶ corrected
```

Which of these the current `status` column actually encodes is `unknown`. Owner to confirm: finance
analyst (discovery timeline, 2026-05-25 — the only finance participant recorded in either session).

**3. Enforced invariants**

Only rules someone stated. Nothing here is inferred.

| # | Invariant | Stated by | Enforceable in schema? |
|---|---|---|---|
| I1 | An invoice line must reference a cleared declaration | `invoicing/model.yaml` → `invariants` | **No.** The clearance fact is owned by Customs. No FK is possible across the boundary. Enforce inside the aggregate at issue time against a local `ClearedDeclarations` projection fed by `DeclarationCleared` (Customs, discovery timeline #9). |
| I2 | The Guaranteed Consolidation premium is charged whether or not the container ends up full | finance analyst, 2026-05-25 (discovery timeline → Business rules stated) | **No.** Spans the premium line and the container fill rate. Enforce in the aggregate. |

Two notes on these:

- **I2 is missing from `invoicing/model.yaml` today.** A stated finance rule that carries an +18%
  revenue stream (`business-model.md` → Revenue streams) exists in the discovery record and never
  reached the model. Proposed delta in the README.
- **I1 as written is a distributed invariant** — the fact it depends on lives in Customs, so it
  cannot be held in one transaction as stated. Per loop 2 the choice is: (a) enforce locally at
  issue time on a projection Invoicing owns, or (b) relax it and define a corrective policy.
  **(a) is chosen** — the projection makes it a genuine local invariant, and §7 shows there is no
  concurrency pressure that would justify relaxing it. The residual risk (clearance revoked *after*
  issue) is handled in §4, not by weakening I1.

**Invariants deliberately NOT claimed.** Each sounds right, none was stated by anyone in the repo,
and a fabricated invariant is enforced by code and discovered by a customer:

| Candidate rule | Who must confirm before it becomes code |
|---|---|
| An invoice must have at least one line | finance analyst |
| Invoice total equals the sum of its lines plus VAT | finance analyst (almost certainly true — still needs one sentence) |
| An issued invoice is immutable | finance analyst — **this one decides whether `CreditNote` is a separate aggregate at all** (see `CreditNote.md`) |
| An invoice may only be issued for a confirmed booking | finance analyst / commercial director |

**4. Corrective policies**

| Relaxed / residual rule | Corrective policy | Status |
|---|---|---|
| I1 after issue — a declaration is amended or revoked *after* the invoice was issued against it | Required. Likely shape: detect the amendment, issue a credit note, reissue. | **PENDING — owner: finance analyst + customs clerk.** What happens to an already-sent invoice is a domain decision, not an error handler. The refactor must not ship this path invented. |

Two things this section exposes:

- **The corrective policy has no trigger today.** `customs/model.yaml` publishes only
  `DeclarationSubmitted` and `DeclarationCleared`. There is no amendment or revocation event, so
  Invoicing cannot detect the condition even if the policy were written. → gap for `domain-connect`.
- **One corrective policy against two enforced invariants** is the right ratio for this aggregate.
  A long list here would mean the business logic had drifted out of the aggregate, which is exactly
  what the current 5-aggregate/1-invariant shape already suffers from.

**5. Handled commands → 6. created events**

| Command | Event(s) | Evidence |
|---|---|---|
| `DraftInvoice` | `InvoiceDrafted` | candidate — no evidence in repo |
| `IssueInvoice` | **`InvoiceIssued`** | ✔ confirmed, finance analyst, discovery timeline #10 |
| `ApplyPayment` (inbound from allocation) | `InvoiceSettled` | candidate — **missing today**; nothing tells Notifications an invoice was paid |
| `CorrectInvoice` | → `CreditNoteIssued` (emitted by the `CreditNote` aggregate, not this one) | candidate |

What the connectors expose:

- **Invoicing publishes exactly one event.** Notifications sits downstream of Invoicing
  (`notifications/model.yaml` → `relationships`) and its single event `CustomerNotified` is marked
  *candidate — "nobody confirmed when it fires"* (discovery timeline #11). Yet `DunningCase` exists,
  so reminders are going out. Either they bypass the domain model entirely, or Invoicing is emitting
  facts nobody modelled. Both are findings.
- **3 of the 5 aggregates in `model.yaml` handle no recorded command and emit no recorded event** —
  `SurchargeSchedule`, `PaymentAllocation`, `DunningCase`. Per the canvas rules that is either
  speculative design or service-driven logic wearing an aggregate's name. Handled per-aggregate in
  the README right-sizing table.

**7. Throughput**

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate (per invoice instance) | `unknown` — owner: finance analyst | `unknown`; the month-end billing run is the expected burst — its shape has never been measured |
| Total number of clients (per instance) | **1 expected** — the billing run writes it; unconfirmed | `unknown` |

→ concurrency conflict chance: **low, provisionally.** One instance is one document, written by one
process. This is the shopping-basket case, not the conference-booking case.

**This is the load-bearing conclusion of the whole canvas.** The 34 tables are not a contention
artefact. Splitting `Invoice` further buys no concurrency headroom and costs corrective policies.
The pain the team feels is *attribute breadth* — 128 attributes on a single entity, 41% of the
context's 311 attributes — which is a modelling problem, not a locking problem. So: do not shard the
aggregate; extract the reference data and relocate the two receivables concerns.

If the finance analyst comes back and says several clerks edit the same draft invoice concurrently,
this conclusion changes and the boundary is re-evaluated. That is the number to get first.

**8. Size**

| Metric | Value |
|---|---|
| Event growth rate (per instance) | `unknown`; expected single digits (drafted, issued, settled/corrected) |
| Lifetime of an instance | issue → settlement (weeks), then statutory retention — **retention period `unknown`, owner: finance analyst** |

→ size: **small.** No snapshotting. Archival is natural once the retention period is stated: an
invoice is closed by settlement, so there is a real point at which the books shut. Contrast with
`DunningCase` and any per-customer balance, which have no such point — see those canvases.
