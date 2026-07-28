Aggregate design for Invoicing is written. The short version: **you don't have 5 aggregates — you have 2, plus a reference-data table set and a Receivables context hiding inside this one.** That, not the table count, is why it's painful to change.

## What the numbers said before I designed anything

| Signal | Invoicing | Rest of the system |
|---|---|---|
| Tables | 34 (45% of all 76) | 42 across six contexts |
| Attributes | 311 (51% of all 607) | 296 |
| Densest entity | 128 attributes | next densest is Customs at 34 — 3.8× |
| Stated invariants | 1 → **0.2 per aggregate** | 1.0 per aggregate everywhere else |
| Declared domain events | 1 → **0.2 per aggregate** | 2.0 per aggregate in Booking, Quoting, Customs, Consolidation |

Two things follow. **Oversized:** half the modelled system's mass sits in the one capability your commercial director rates commodity, no differentiation — *"nobody has ever chosen us because of our invoices."* Consolidation, the capability carrying the +18% premium, is 5 tables. **Anaemic:** four of five aggregates enforce no rule, handle no recorded command, emit no event. `model.yaml` documents no entity above 4 attributes while the real densest one carries 128 — the written model covers about 3% of it. The rules exist; they're in services around wide rows where the model can't protect them.

## The right-sizing

| Declared | Verdict |
|---|---|
| `Invoice` | **Aggregate** — full canvas. Holds both stated rules and the one confirmed event. |
| `CreditNote` | **Aggregate, conditional** — exists only if an issued invoice is immutable. Nobody has ever stated that. One question decides it. |
| `PaymentAllocation` | **Blocked, boundary question** — shares no invariant, no client and no upstream with `Invoice`. Looks like Receivables. Routed back to loop 2. |
| `DunningCase` | **Blocked, may not be an aggregate** — if no per-case decision must be remembered, it's a scheduled script over a query, not an aggregate. |
| `SurchargeSchedule` | **Declined — not an aggregate, no canvas.** |

`SurchargeSchedule` is the one worth dwelling on. Your own notes say three of the five aggregates exist to model VAT variations across nine ports, and two were added when the Finnish rules changed in 2024. VAT rates are reference data — authored by tax authorities, no rule of yours, no lifecycle you control. They get effective-dated lookup CRUD: no aggregate, no repository, no domain events. A tax change needing two new aggregates *is* the "painful to change" symptom.

## What I refused to invent

Only two invariants are stated anywhere in your repo, so the canvases claim exactly two:

- **I1** an invoice line must reference a cleared declaration (`model.yaml`)
- **I2** the Guaranteed Consolidation premium is charged whether or not the container ends up full (finance analyst, 2026-05-25)

**I2 is in your discovery record and never made it into the model** — a rule protecting an 18% revenue stream, unmodelled. Neither invariant is schema-enforceable: I1 crosses into Customs, I2 spans rows. Both stay in the aggregate, and `data-model` is told so explicitly, because an invariant each layer assumes the other handles is handled by neither.

I did *not* write "an invoice must have at least one line" or "total equals sum of lines" as invariants. They're probably true. They're listed as candidates with the person who has to confirm them — a fabricated invariant is enforced by code and discovered by a customer.

Four corrective policies are marked **PENDING with a named owner**, not filled in. The most important: what happens when a declaration is amended *after* you've invoiced against it. Customs publishes only `Submitted` and `Cleared`, so today you couldn't detect it even if the policy existed.

## The finding that shapes the refactor

Throughput on `Invoice` is one client per instance — the billing run. This is the shopping-basket case, not the conference-booking case. **So the 34 tables are not a contention artefact.** Splitting `Invoice` further buys zero concurrency and costs corrective policies. Your problem is attribute breadth, not locking. Extract the reference data, relocate receivables, leave the aggregate whole.

Two caveats I'd rather state than hide: the client count is `unknown` and provisional — if several clerks edit the same draft at month-end, that conclusion flips, and it's the cheapest number to go get. And `PaymentAllocation` is the one place with a plausible contention profile (one bank file, hundreds of invoices), which is a second reason it doesn't belong here.

## Three questions worth more than a week of refactoring

1. **Is an issued invoice immutable?** (finance analyst) — decides whether `CreditNote` exists.
2. **Does credit control remember a per-case decision — a promise, a dispute, a hold?** (credit control) — decides whether `DunningCase` is an aggregate or a deletion.
3. **Bank-file allocation volumes** (AR/treasury) — and note **nobody from AR has attended either modelling session.** That's why two canvases are blocked rather than guessed.

One more, above all of them: `model.yaml` and the context map say Invoicing is `core`; `business-model.md` says commodity with no differentiation; the context map itself admits the classification hasn't been revisited since March. A wrong `core` label is the cheapest available explanation for 34 tables. I didn't resolve it — `domain-strategize` owns that — but it changes how much of this ceremony is warranted at all.

## Artifacts

```
docs/domain/invoicing/
  README.md                          right-sizing, code structure contract, handoff, open questions
  aggregates/Invoice.md              full canvas
  aggregates/CreditNote.md           full canvas, conditional on Q1
  aggregates/PaymentAllocation.md    blocked — boundary + no AR input
  aggregates/DunningCase.md          blocked — existence test question
```

All `status: draft`, `owner: TBD`. I did **not** edit `model.yaml` — `domain-decompose` owns it; six proposed deltas are listed in the README (drop `SurchargeSchedule`, add I2, flag the boundary, rename the `Consignment` term, add candidate events, flag the disputed `core` label).

Last thing, small but structural: Invoicing defines **Consignment** as "a billable line", Booking defines it as "the goods a customer hands over" — your own hotspot #2. Ops owns that word across three contexts. Rename Invoicing's term to `InvoiceLine`, and don't reuse the `ConsignmentLine` shared kernel for billing — it already has two writers and doesn't need a third with an unrelated meaning.
