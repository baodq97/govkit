---
id: DOMAIN-AGG-0004
title: DailyReconciliation — aggregate design canvas
status: draft
owner: TBD
date: 2026-07-27
mode: code
context: RevenueReconciliation
---

# Aggregate: `DailyReconciliation` (root: `DailyReconciliation`)

Aggregate Design Canvas v1.1. Sourced from `../model.yaml`, `../README.md`,
`../../event-model/README.md` slices EM-24–27, `message-flows/DOMAIN-FLOW-0004`, `EXPERT.md`
2026-07-27. This is the only context the core domain chart calls core **on sourced evidence**, and
the aggregate `../model.yaml` calls "thinnest in the model relative to its business value".

## 1. Description

One site's takings for one business date: what the machines say they took, against what the bank
says arrived, against what the coin box actually held — and the exceptions a human has to decide.
Four hours per week per site are spent on this by hand today; that number is the business case.

**Why this boundary.** Site and business date are the two dimensions the expert used every time he
described it ("every morning, per site"), and the lifespan is in the name deliberately — it
pre-empts the unbounded-instance problem before it exists.

**Alternatives rejected:**

| Rejected boundary | Why rejected |
|---|---|
| One `Reconciliation` per site, open-ended | an ever-growing instance with nothing to archive and no point at which the books close — the §8 failure this name exists to avoid |
| An `Exception` aggregate of its own | an exception has no state today beyond `resolution`; `context-map.md` declined the context and `../README.md` reached the same seam independently. **Promotion trigger, already written:** the moment a write-off needs an author, a timestamp or an authority limit |
| Fold the three-way match into PaymentCapture | rejected in `../README.md`: it is bought, and knows nothing about exits, offline logs or site managers |

## 2. State transitions

```
open --ReconcileTakings--> ??? --exceptions worked--> ???
```

**The state machine cannot be completed from any source, and that is the finding.**
`TakingsReconciled` names only the success; **there is no name for a reconciliation that does not
balance** — the entire reason this context exists (`../README.md` critique 1). Two further states
are undescribed: whether a settled day can **reopen** when a late offline exit arrives, and whether
a claim can still be raised after a write-off is recorded. Neither was stated, and the two readings
of the first give different books.

Filling this diagram would be inventing the process. The expert described reconciliation as an
outcome, never as steps; one morning watching a site manager do it would change this canvas more
than any further analysis.

## 3. Enforced invariants

| # | Invariant | Stated by | Enforceable in schema? |
|---|---|---|---|
| I1 | Reconciliation is per site, per business date, and matches machine takings against the bank and against the coin box | EXPERT | key/uniqueness on (siteId, businessDate) **yes**; the match itself **no** |
| I2 | An exit uploaded with no payment against it is flagged as an unmatched exit and raised on the daily exceptions list | EXPERT | **no** — a join across late-arriving facts |
| I3 | A plate/declared-class mismatch is raised on the same list | EXPERT | **no** |

**I1 is unenforceable today, and not for a design reason:** two of its three legs have no emitter
anywhere in the model. Bank (`timeline.md` #67) and coin box (#68) are external systems no context
adapts, and `PaymentCapture` has `aggregates: []` and emits nothing. Until PC-4 assigns an owner,
the aggregate can compare one number with nothing.

## 4. Corrective policies

| # | Relaxed rule | Corrective policy | Who defined it |
|---|---|---|---|
| C1 | Money that left without a payment — the offline exits ParkingVisit and Terminal deliberately allow | **the site manager decides: usually a write-off, occasionally a claim against the captured plate.** "Losing a few euros a year to that beats trapping one customer." | EXPERT, explicitly and with the price |
| C2 | A claim after day 7 | **none** — the plate is deleted, non-negotiably (H7) | **nobody — open** |
| C3 | A late upload into an already-settled day | **none stated** (C3 in `OfflineExitLog.md`, from the other side) | **nobody — open** |
| C4 | A write-off with no authority limit or approval | **none — and the absence is stated, not missing:** the expert described no threshold and no approval step | EXPERT (a stated absence) |

C1 is the textbook case and the reason this context is the compensating control for two other
aggregates' relaxed invariants, rather than a report. **This aggregate is where the whole model's
eventual consistency is settled** — which is why C2 and C3 being open matters more here than
anywhere else.

## 5 & 6. Handled commands → created events

| Command | Event(s) | Note |
|---|---|---|
| `ReconcileTakings{siteId, businessDate}` | `TakingsReconciled` — **and nothing at all when the legs do not agree** | the missing rejection path (F3). Proposed delta 1 |
| `WriteOffException{exceptionRef}` | `ExceptionWrittenOff` | records a decision made outside the system — honest, not a defect |
| `PursuePlateHolder{exceptionRef}` | `ClaimSentToPlateHolder{plate}` | carries a plate into a context that is not the plate holder, past a non-negotiable deletion (`../README.md` critique 5) |
| *(policy, no command)* on `OfflineExitLogUploaded` | `UnmatchedExitFlagged` | EM-25 |
| *(policy, no command)* on `VehicleClassMismatchDetected` | an exceptions-list entry | no event of its own |
| **inbound, unowned** | bank totals, coin-box count | **no emitter anywhere** (PC-4) |
| **inbound, no source** | `BarrierStuckOpen`, entitlement-bay users | two of the four exceptions-list item kinds have no mechanism (H5, H6) |

Four events for the capability with the highest sourced differentiation in the model. The interface
is not too big — **it is too small for its business value**, which is the chart's investment-mismatch
finding restated at the command level.

## 7. Throughput — will one instance collide?

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate, per instance | a handful per morning: one `ReconcileTakings`, then one decision per exception | **unknown** — exceptions per site per day was never counted. The expert gave *effort* (4 h/week/site), never a volume |
| Total number of clients, per instance | **1 human** — the site manager for that site | 1 human **plus late automated writes**: an `OfflineExitLogUploaded` can land on an instance a person is working, or on one already settled |

→ **concurrency conflict chance: low between humans, unknown against late arrivals.** The contention
that matters is not two managers colliding; it is a late fact landing on a closed instance — and its
frequency is unknown because upload delay is unbounded (flow 4.5).

**Stated precisely:** scoping to one site and one date means this instance merges only the command
streams that genuinely belong to one book. A per-site open-ended instance would merge every day's
stream onto one root, which is why §1 rejected it.

**Unknown, and who could supply it:** exceptions per site per day (countable by hand from today's
list, before any code exists), reconciliations per operator per morning, and how many sites one
manager settles. `../README.md` already lists the first as a verification metric.

## 8. Size

**Persistence style: not chosen.** Measured as rows loaded and locked per operation.

| Metric | Value |
|---|---|
| Rows loaded and locked for one operation | one reconciliation row, three totals, plus **N exception items — N unknown** and the only figure that could make this instance large |
| Lifetime of an instance | one business date at one site: **bounded by construction** — the §8 time-scoping heuristic, applied in the name |
| Retention | **unknown** — whether a reconciliation falls under the fiscal period was never stated (H8 is about the fiscal record, not this) |

If N turns out large (a busy site with many mismatches), the exception items are the part to
re-examine — and that is the same evidence that would promote them to a context of their own.

## Handoff

- **`data-model`** takes: `DailyReconciliation` (siteId, businessDate, machineTotal, bankTotal,
  coinBoxTotal, status), the `ExceptionItem` entity (kind, subjectRef, resolution) inside the
  boundary, and `Money` / `ThreeWayMatch` as value objects. Enforceable in schema: uniqueness on
  (siteId, businessDate). **Not** enforceable: the match, I2 and I3 — they join facts that arrive
  late from other contexts and stay in code. Retention for this table is unstated; do not assume the
  fiscal period.
- **`api-designer`** takes: `ReconcileTakings`, `WriteOffException`, `PursuePlateHolder` and the
  reconciliation + exceptions-list queries as the operator surface. `ClaimSentToPlateHolder` should
  **not** be published carrying a plate until H7 has a lawful answer.
- **Implementer** takes: this canvas, and the explicit warning that **the capability cannot be built
  end to end today** — two of three legs have no source (PC-4) and the unbalanced outcome has no
  name. Building the one-leg version and calling it reconciliation would ship a simulation of the
  business case.
