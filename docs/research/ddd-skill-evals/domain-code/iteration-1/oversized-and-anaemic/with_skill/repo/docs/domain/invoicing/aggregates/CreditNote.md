---
id: DOMAIN-AGG-INV-0002
title: Invoicing — Aggregate Design Canvas — CreditNote
status: draft
owner: TBD
date: 2026-07-27
context: Invoicing
---

### Aggregate: CreditNote   (root: `CreditNote`)

> **This canvas rests on one unconfirmed rule.** Everything below assumes *"an issued invoice is
> immutable; corrections are new documents."* Nobody in the repo stated that. Confirm it with the
> finance analyst before building — the answer either creates this aggregate or deletes it.

**1. Description**

A document that credits part or all of an already-issued `Invoice`, referenced **by `invoiceId`
only**. Kept separate from `Invoice` because the two have different reasons to change: an invoice is
produced by the billing run from shipment facts; a credit note is produced by a human decision about
an invoice that already left the building.

*The decision this canvas turns on:*

| If the finance analyst says… | Then |
|---|---|
| an issued invoice may not be edited (expected) | `CreditNote` stays a separate aggregate — this canvas holds |
| an issued invoice may be edited until the VAT return is filed | **this aggregate disappears**; corrections become a command on `Invoice` and the tables behind `CreditNote` collapse into it |

One question, two very different schemas. Asking it costs a message; discovering the answer after
the refactor costs a migration. It is recorded here rather than resolved by assumption.

*Alternative rejected:* modelling the credit note as a negative `InvoiceLine` on the original
invoice. It re-opens a document the tax authority has already seen and makes the original
irreproducible — but note this rejection is *also* conditional on the immutability rule above.

**2. State transitions**

`unknown.` No lifecycle for credit notes is recorded anywhere in the repo — no status attribute, no
event, no state. Candidate, to confirm: `draft → issued → applied`.

The fact that this cannot be filled in from an eleven-year-old production system carrying 34 tables
is itself evidence for the anaemia diagnosis in the README.

**3. Enforced invariants**

**None stated.** No business rule about credit notes appears in `invoicing/model.yaml`, the discovery
timeline, or the business model. This canvas therefore claims zero invariants rather than
manufacturing plausible ones.

*Candidates that must be confirmed before they become code:*

| Candidate rule | Who must confirm |
|---|---|
| A credit note may not exceed the outstanding value of the invoice it credits | finance analyst |
| A credit note may only be issued against an invoice that has been issued | finance analyst |
| An invoice may be credited more than once, up to its total | finance analyst |

Until at least one of these comes back confirmed, `CreditNote` is an aggregate with a boundary and
no rule to defend — which is a legitimate outcome for a document type, and a reason to keep the
implementation thin rather than build ceremony around it.

**4. Corrective policies**

None, because no invariant has been relaxed. There is nothing to repair until §3 has content.

The one cross-aggregate consistency question is real, though: crediting an invoice must not update
`Invoice` in the same transaction (one transaction per aggregate). `CreditNoteIssued` is consumed by
`Invoice`, which moves to `corrected`. If that consumption fails, the credit note exists and the
invoice does not know — **corrective policy required, PENDING, owner: finance analyst.** The
likely shape (retry then flag for credit control) is not written here because the business has not
chosen it.

**5. Handled commands → 6. created events**

| Command | Event(s) | Evidence |
|---|---|---|
| `IssueCreditNote` | `CreditNoteIssued` | candidate — **neither appears anywhere in the repo** |

The gap this exposes: `invoicing/model.yaml` declares exactly one domain event, `InvoiceIssued`.
So a credit note — a document the customer receives and the tax return reflects — is currently
invisible to Notifications and to every downstream consumer. Either credit notes are sent outside
the domain model, or customers are not being told. → question for the finance analyst; gap for
`domain-connect`.

**7. Throughput**

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate (per instance) | `unknown` — owner: finance analyst | `unknown` |
| Total number of clients (per instance) | **1 expected** — one credit-control user acting on one document | `unknown` |

→ concurrency conflict chance: **low, provisionally.** Same reasoning as `Invoice`: one instance,
one human, no competition. No boundary pressure from this section.

**8. Size**

| Metric | Value |
|---|---|
| Event growth rate (per instance) | expected 1–2 |
| Lifetime of an instance | bounded by the invoice it credits, then statutory retention (`unknown`, owner: finance analyst) |

→ size: **small.** No snapshotting, nothing unbounded, archival follows the parent invoice.
