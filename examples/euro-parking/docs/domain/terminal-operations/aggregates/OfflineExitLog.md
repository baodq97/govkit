---
id: DOMAIN-AGG-0003
title: OfflineExitLog — aggregate design canvas
status: draft
owner: TBD
date: 2026-07-27
mode: code
context: TerminalOperations
---

# Aggregate: `OfflineExitLog` (root: `OfflineExitLog`)

Aggregate Design Canvas v1.1. Sourced from `../model.yaml`, `../README.md`,
`../../event-model/README.md` slices EM-21 and EM-22, `message-flows/DOMAIN-FLOW-0004`, `EXPERT.md`
2026-07-27.

## 1. Description

The record of what one terminal did while nothing else was reachable — *"the exit is logged in the
terminal even offline, and uploaded when the link returns."* It is the only evidence that an offline
exit happened, and therefore the only input that makes the next morning's reconciliation possible.

**Why a boundary of its own.** It must be written when the centre is unreachable, and it is read by
a completely different rhythm (a batch upload, then a human's morning) than the barrier decision that
produces it.

**Alternatives, and the one decision this canvas is forced to take (F8):**

| Option | Consequence |
|---|---|
| **A — one aggregate: fold the log into `Terminal`** | the barrier decision and its journal entry commit together. Attractive: they are always on the same machine, in the same process, and neither is reachable from anywhere else during a partition |
| **B — two aggregates (today's model), eventual between them** | the barrier opens whether or not the entry was written. A lost entry is invisible: the exit looks like a driver who never left |
| Move it to RevenueReconciliation, next to its consumer | **rejected** — it has to be written while the terminal is unreachable, which is the entire point (`../README.md` perturbation 2) |

**The rule leaves no third option**: either they are one aggregate or the consistency is eventual.
The stated business policy decides the direction — *never trap a driver*, degrade **toward** opening
— so the barrier cannot be gated on a successful log write, and B is what the business asked for.
**But B's failure has no corrective policy** (C2 below), and nobody was ever asked what happens to an
exit the log lost. Recorded as proposed delta 4 to `3-decompose`, with A as the cheaper design if
the business says a lost entry is unacceptable.

**Scoping (the §8 heuristic, applied).** Today the model reads as one open-ended log per terminal.
It should be scoped to **one offline episode** — from the moment the link drops to the moment its
entries are uploaded and acknowledged — which gives the instance a natural close, a natural archive
point and a bounded size. Proposed, not applied.

## 2. State transitions

```
open (collecting entries) --link returns--> uploading --acknowledged--> settled
                                                \--upload fails--> open again
```

Three transitions and one retry loop — no split signal, not anaemic. Two states nobody described:
what a **never-uploaded** log becomes (a terminal destroyed, stolen or wiped before the link
returns), and whether `settled` can reopen. `../README.md` raises the first as a new open question;
the second is the same question RevenueReconciliation asks from the other end.

## 3. Enforced invariants

| # | Invariant | Stated by | Enforceable in schema? |
|---|---|---|---|
| I1 | Every offline exit is logged at the terminal, even while offline, and uploaded when the link returns | EXPERT | **no** — durability at the edge plus an upload obligation; neither is a constraint |

One invariant. That is the honest count: this aggregate is a journal with an obligation, and
inventing more would be fabricating rules the business never stated.

**Ordering is not stated.** Whether the entry is written *before* the barrier opens, or after, was
never said — and it is exactly the difference between options A and B in §1.

## 4. Corrective policies

| # | Relaxed rule | Corrective policy | Who defined it |
|---|---|---|---|
| C1 | The exits in this log are unknown to the centre until upload — for an unbounded time (flow 4.5) | the morning reconciliation flags any uploaded exit with no payment against it; the site manager writes it off or pursues the plate | EXPERT |
| C2 | I1 when the log write itself fails, or the terminal never reconnects | **none.** The exit vanishes: no fiscal record, no reconciliation entry, and nothing detects the absence | **nobody — open** |
| C3 | An upload arriving after its business day was already settled | **none stated** — either the day reopens or the fact lands on a later day, and the two give different books | **nobody — open** |
| C4 | An upload arriving after day 7, when the plate it would be claimed against is deleted | **none** — pursuit becomes impossible by construction (H7) | **nobody — open** |

One stated policy, three holes. This is the section that shows the offline story is only half
designed: the business priced the *abuse* case carefully (4–5 in 15 years) and was never asked about
the *loss* case at all.

## 5 & 6. Handled commands → created events

| Command | Event(s) | Note |
|---|---|---|
| *(policy, no command)* on an offline exit decision | `OfflineExitGranted{terminalId, stripeSnapshot, exitTime}` | goes "to nobody, until the upload" (flow 0004 #3) |
| *(internal)* | `OfflineExitLogged{terminalId, exitTime}` | the journal entry |
| *(policy)* on reconnect | `OfflineExitLogUploaded{terminalId, entries}` | to ParkingVisit **and** RevenueReconciliation |

**No command is issued by any actor against this aggregate** — every transition is an automation.
That is correct for a journal, and it is also why `../README.md` critique 1 asks whether
`OfflineExitGranted` and `OfflineExitLogged` are one event with two names. This canvas agrees they
are candidates for merging *only if* option A is taken; under option B they are the two sides of the
eventual seam and must stay distinct.

**And the consumer that does nothing:** `OfflineExitLogUploaded` reaches ParkingVisit and produces
no `VehicleExited` and no exit time (F2, flow 4.2, D-4). The fiscal record for that stay is never
written — the most expensive open question in the model, and it lands on this aggregate's output.

## 7. Throughput — will one instance collide?

| Metric | Average | Maximum |
|---|---|---|
| Command handling rate, per instance | one append per offline exit — expected **rare**; the operator's own baseline is 4–5 abused offline exits in 15 years, but the *rate of outages* was never stated | **unknown** — a long outage at a busy exit could append hundreds; nobody has an outage-duration figure |
| Total number of clients, per instance | **1** — one terminal writes its own log, locally | 1 |

→ **concurrency conflict chance: none.** A single writer on the same machine, by construction.

The number that actually matters here is not contention but **duration**: how long a terminal can be
offline. That decides how large one instance grows and whether an upload deadline is needed. It is
unknown, and the terminal supplier plus the operator's outage records could supply it. Predicted
share of offline exits (< 0.1% of all exits) is already written as a verification metric in
`../README.md`; if it turns out higher, the offline path is the primary path and this aggregate
becomes far more important than its one invariant suggests.

## 8. Size

**Persistence style: not chosen** — and here the choice is unusually constrained: this aggregate must
be durable **at the edge**, on hardware that may be unreachable for an unknown period. That is a
storage requirement stated by the domain, not a technology preference.

| Metric | Value |
|---|---|
| Rows loaded and locked for one operation | one log row plus one appended entry; **small** per operation |
| Lifetime of an instance | **unbounded as modelled today** — one log per terminal, forever. Bounded to hours or days if scoped per offline episode (§1) |

This is the §8 warning case and the reason the scoping proposal is in §1 rather than in a backlog:
splitting a per-terminal log later is far more expensive than closing an episode now.

## Handoff

- **`data-model`** takes: `OfflineExitLog` (terminalId, uploadedAt) and `OfflineExitEntry`
  (stripeSnapshot, exitTime) as an entity inside the boundary — never its own repository. It does
  **not** take I1: durability at the edge and the upload obligation are code and infrastructure, not
  a constraint. It **must** know this store lives on the terminal, not in the centre.
- **`api-designer`** takes: `OfflineExitLogUploaded` as a **published contract** — the one internal
  that must be shared, because it is the only record that an exit happened. Nothing else here is
  public; there is no command surface at all.
- **Implementer** takes: options A and B in §1 as an **open decision, not a choice to make in code**.
  Whichever is chosen must be written back here with the business's answer to "what happens when the
  log loses an exit".
