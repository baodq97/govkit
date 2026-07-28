---
id: DOMAIN-0008
title: RevenueReconciliation bounded context
risk: High
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# RevenueReconciliation bounded context

## Purpose

Settles one site's takings for one day — what the machines say they took, against what the bank says
arrived, against what the coin box actually held — and gets a human to decide what does not match.
Serves the **site manager**, who does this by hand every morning today, and the **operator**, whose
money it is.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | **core** — and per the chart, the only one that is core *on sourced evidence*; the other three "core" labels rest on complexity or on an unsourced claim | `core-domain-chart.md`, placement row (x 0.60, y 0.85) and disagreements row 4 |
| Business-model role | revenue generator — one of the two capabilities the operator said they would pay for | `business-model.md`, capability table |
| Evolution | custom built — done by hand across the industry; no competing product was named | `business-model.md`; the chart's kill criterion is Q14 |

Carried, not re-derived. The whole classification rests on one expert's word: **if Q14 comes back
"two vendors already ship this", this drops to parity and the chart is re-run.**

## Domain roles

Two, and they change at different rates. **Analysis** — the three-way match is arithmetic over facts
others emit, and it changes when a leg or a fact source changes. **Execution / workflow** — a
write-off or a claim is a human decision with a consequence, and it changes when authority, audit or
escalation rules change.

`context-map.md` declined "Exceptions" as a context of its own because it holds no workflow state.
This canvas reaches the same seam from the other side: the moment a write-off needs a name, a
timestamp or an authority limit, the second role has state and the declined candidate is promoted.
That trigger is already written in the context map; this is corroboration, not a new proposal.

Brain-Context check: **passes.** All four outbound messages are events, and this context commands
nobody — appropriate for something that reports and asks a human.

## Inbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| Site manager | actor | `ReconcileTakings`, `WriteOffException`, `PursuePlateHolder` | command | direct interaction |
| ParkingVisit | bounded context | `TicketPaid`, `LostTicketCharged`, `AdditionalPaymentCollected`, `VehicleExited` | event | published language, downstream |
| TerminalOperations | bounded context | `OfflineExitLogUploaded` (carrying `OfflineExitLog`), machine takings | event | published language, downstream |
| PaymentCapture | bounded context | what the acquirer/bank says arrived | event | ACL — **no named message exists** (H9) |
| VehicleIdentification | bounded context | `VehicleClassMismatchDetected` | event | downstream |
| Coin box | external | the physical count | — | **no emitter anywhere in the model** (flow 4.3) |

## Outbound communication

| Collaborator | Type | Message | Msg type | Relationship |
|---|---|---|---|---|
| Site manager | actor (read model) | `TakingsReconciled`, `UnmatchedExitFlagged`, `ExceptionWrittenOff`, the daily exceptions list | event / query | direct interaction |
| The plate holder | external actor | `ClaimSentToPlateHolder` | event | — |

## Swimlanes — what this context actually decides

| Message in | Decision made here | Message(s) out |
|---|---|---|
| `ReconcileTakings` | do the three legs agree for this site and date? | `TakingsReconciled` — **and nothing at all if they do not** |
| `OfflineExitLogUploaded` | is there a payment against this exit? | `UnmatchedExitFlagged`, or silence |
| `VehicleClassMismatchDetected` | none — it lists it | an exceptions-list entry |
| `WriteOffException` / `PursuePlateHolder` | none — the site manager already decided | `ExceptionWrittenOff` / `ClaimSentToPlateHolder` |

Only the first two lanes decide anything, and the first has no output for its interesting case. The
last lane is a recorder for a decision made outside the system — which is exactly what the expert
described ("the site manager decides"), so it is honest, not a defect.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Reconciliation | machines vs bank vs coin box, per site, every morning | — |
| Unmatched exit | an uploaded exit with no payment against it | — |
| Exceptions list | the daily list: offline exits, plate mismatches, stuck barriers, entitlement-bay users | — |
| Write-off | the site manager's usual decision on an unmatched exit | — |
| Claim | pursue the captured plate — collides with the 7-day deletion (H7) | **yes** — VehicleIdentification holds plates for 7 days only, and never for billing |

## Business decisions

| Rule | Source |
|---|---|
| Reconciliation is per site, every morning, and three-way: machines vs bank vs coin box | EXPERT 2026-07-27 |
| An exit uploaded with no payment against it is flagged as an unmatched exit and goes on the daily exceptions list | EXPERT 2026-07-27 |
| A plate/declared-class mismatch goes on the same list; the higher rate was already charged | EXPERT 2026-07-27 |
| The site manager decides an unmatched exit — usually a write-off, occasionally a claim | EXPERT 2026-07-27 |
| **Stated absence:** no threshold, no authority limit, no approval step was described for a write-off | EXPERT 2026-07-27 |

## Quality attributes

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Correctness | the match needs three legs | **2 of 3 have no emitter** (flow 4.3) | absence recorded | **yes** — the capability cannot be built until PC-4 assigns an owner for bank and coin box |
| Completeness under late arrival | offline exits arrive with no deadline, after their business day may already be settled | unbounded (flow 4.5) | absence recorded | **yes** — either a settled day can reopen, or late facts land on a later day. Nobody stated which, and the two give different books |
| Timeliness | the run happens every morning, per site | "every morning"; the 09:00 in flow 0004 is the flow author's, not the expert's | EXPERT | no |
| Auditability | a write-off is a financial decision — who made it, when, on what evidence | **unstated** | absence recorded | **yes if required** — it turns `ExceptionItem` from a row into an audited decision, and promotes the declined Exceptions context |
| Privacy | a claim carries a plate into a context that is not a plate holder | plates die at 7 days, "not negotiable" | EXPERT | **yes** — see interface critique 5 |
| Retention | how long a reconciliation is kept | **unknown** — the fiscal period may or may not apply | absence recorded | no, until stated |
| Volume | exceptions per site per day; the expert gave 4h/week/site of effort but never a count | **unknown** | EXPERT gave effort, not volume | no, until known |

## Assumptions

*Domain* — a business day is a fixed boundary at a site (**inferred**; no cut-over time was stated,
and sites run through 02:00 offline exits). Reconciliation is per site and never rolls up to an
operator or head-office view (**inferred**; nobody described one, though "per site" was explicit).
Every payment reaches exactly one of the three legs (**inferred**; nobody said what a payment counted
twice or in none would look like). A claim can still be pursued after a write-off decision is
recorded, or cannot — **neither was stated**.

*Scale and behaviour* — exceptions are few enough for one person to work through in a morning
(**inferred** from "4 hours a week per site"). Bank and coin-box totals will be obtainable at all
(**inferred, and the weakest assumption in the model** — flow 4.3).

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Minutes per site per morning spent reconciling. Baseline: **4 hours per week per site, by hand** | whether the pay-for is real. This one number decides the business case, and the baseline already exists | the site manager's own time at the pilot — **collectable today, before any code** |
| Share of reconciliations that close with all three legs present; predicted low until PC-4 lands | whether the capability is shipped or simulated | the product itself, once live |
| Days between a business date and its reconciliation being final | how often late offline uploads reopen a settled day — the completeness question above, as a number | production, once live |
| Exceptions raised per site per day, and the share resolved without leaving the list | whether the exceptions half needs workflow state (and so a context of its own) | pilot; the operator can count today's list by hand now |
| Does any competitor already ship this? (Q14) | the kill criterion for this context's entire classification | a market scan — **nobody has done it** |

## Open questions

- **The process was never described.** The expert gave reconciliation as an outcome, never as steps.
  One morning watching a site manager do it would change this context more than any further analysis.
- **H7** — a claim needs a plate that is deleted at 7 days, non-negotiably. Can pursuit happen at all?
- **H9** — no reversal, refund or chargeback concept exists anywhere in the language.
- **H5** — `BarrierStuckOpen` is on this list with no stated detector.
- **H6** — entitlement-bay users are a fourth item on this list and nothing can identify who parked.
- **PC-4** — who owns the bank and coin-box facts: us, the operator, or the acquirer?
- **New here** — when a settled day receives a late offline exit, does the day reopen or does the fact
  move? *Site manager + whoever signs the books.*
- **New here** — is a write-off recorded against a person, and is there an amount above which someone
  else must approve? *Operator's finance function; nobody in the session could answer it.*

## Interface critique

1. **Names.** `TakingsReconciled` names only the success. **There is no name for a reconciliation that
   does not balance** — which is the entire reason this context exists. The strongest finding here.
2. **Types.** `ReconcileTakings` is a command from the site manager, but the expert describes a thing
   that happens every morning; nobody said whether the run is scheduled and reviewed, or triggered.
3. **Size.** Four events. This interface is not too big — it is **too small for its business value**,
   which is the chart's own investment-mismatch finding restated at the message level.
4. **Internals.** Nothing leaks: `ExceptionItem` and the three totals stay inside. Clean.
5. **Belongs elsewhere.** `ClaimSentToPlateHolder` carries a **plate**, in a context that is not the
   plate holder, past a deletion the works council called non-negotiable. Either the claim is issued
   from VehicleIdentification inside the 7 days, or it needs a lawful basis nobody has stated.

## Perturbation experiments

- **Move exception handling out into its own context.** Improves: the analysis half and the workflow
  half stop sharing a change rhythm, and the audit question above gets a home. Costs: an exception has
  no state today beyond `resolution`, so the new context would be an empty shell. *Not moved — but
  the context map's promotion trigger is now supported by a second, independent observation.*
- **Move the three-way match into PaymentCapture**, which already sits on the money leg. Improves:
  the two missing legs land next to the acquirer adapter that would fetch them. Costs: PaymentCapture
  is bought and knows nothing about exits, offline logs or site managers; it would acquire the whole
  exceptions workflow. *Rejected — but it sharpens PC-4: the missing legs need an owner, and this
  context is not obviously it.*

## Aggregates (`8-code`, 2026-07-27)

| Aggregate | Canvas | Invariants enforced | Corrective policies | Contention |
|---|---|---|---|---|
| `DailyReconciliation` (root `DailyReconciliation`) | [aggregates/DailyReconciliation.md](aggregates/DailyReconciliation.md) | 3 — the three-way match per (site, business date) · flag an unmatched exit · list a mismatch | 1 expert-stated and priced (write off, or claim), 1 stated absence (no threshold, no approval), **2 with none** (a claim past day 7, a late upload into a settled day) | **low between humans; unknown against late uploads** |

The lifespan is in the name deliberately — one site, one business date closes the books and bounds
the instance. Two findings. **The state machine cannot be completed from any source**: there is no
name for a reconciliation that does not balance, and nobody said whether a settled day reopens.
**Invariant 1 is unenforceable today** for a reason that is not a design choice — bank and coin box
have no emitter anywhere in the model, so the aggregate can compare one number with nothing. This
context is where every other aggregate's relaxed invariant is settled, which is why its two unnamed
repair paths cost more here than anywhere else.

## Changed in 7-define

Inbound/outbound re-split by initiator and given relationship types; the coin-box and bank legs marked
as having no emitter; swimlanes, quality attributes, assumptions, verification metrics, interface
critique and perturbations added; two new open questions raised (late arrival into a settled day,
write-off authority). One stated absence promoted into the business-decisions table rather than left
implicit. No `model.yaml` delta is proposed — the missing "did not balance" event is a `2-discover`
question, not a modeller's invention.
