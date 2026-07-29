---
id: DOMAIN-0007
title: PaymentCapture bounded context
status: draft
owner: TBD
date: 2026-07-27
mode: define
---

# PaymentCapture bounded context

**Stub, and the thinnest in the model on purpose.** `INPUT.md` §7.3 excludes the payment mechanics and the expert declared the acquirer link outside his knowledge (H9), so anything beyond an adapter sketch here would be invention.

## Purpose and supplier

Takes the money at a payment terminal and reports what each machine took. Serves the **driver** paying and the **site manager** reconciling. Bought: the acquirer and the terminal payment stack, neither of them described by anyone. Generic, commodity, differentiation `no` — `core-domain-chart.md` (x 0.15, a floor rather than a measurement: "x here measures our ignorance"), `business-model.md`.

## The adapter's interface

| Dir | Collaborator | Message | Msg type | Relationship |
|---|---|---|---|---|
| in | Driver | the payment itself, at a payment terminal | command | direct interaction |
| in | ParkingVisit | the amount to collect | query | ACL |
| out | ParkingVisit | *(payment captured)* — **no name exists anywhere in the model** | event | ACL |
| out | RevenueReconciliation | machine takings; what the bank says arrived | event | ACL |
| out | FiscalRecord | payment method, the machine paid at | event | ACL |

**No business decisions were captured, and that is the finding, not an omission.** Every rule around a payment — what is owed, whether the visit counts as paid, what the stripe says — belongs to ParkingVisit and TerminalOperations. Quality attributes: none stated; nobody named a settlement window, a failure mode or an availability requirement. Assumption (**inferred**): a captured payment is final, because no refund, reversal or chargeback concept exists anywhere in the ubiquitous language.

## Open questions

- **H9** — how does a terminal reach the acquirer, and what happens to a captured payment when the barrier then fails and the driver is let out remotely? Blocks **PC-3** (this context must publish one named fact or be absorbed) and **PC-4** (somebody must own the bank and coin-box facts — two of the three reconciliation legs).
- **New here** — is "what the bank says arrived" this context's to fetch at all, or the operator's own bank feed? It is asserted in the model and described by nobody. *Founder + an operator's ops lead.*

*7-define:* restated as a stub with the interface typed ACL throughout; the unnamed captured-payment fact, the absent quality attributes and the finality assumption recorded explicitly. No `model.yaml` delta — PC-3 and PC-4 are gated on H9.
