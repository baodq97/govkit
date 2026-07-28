# RentCo — Understand Stage Output

Business model and user needs, written up so the bounded-context decomposition knows what is
actually core.

| File | Contents |
|---|---|
| `business-model.md` | Offering, segment, revenue lines, the claimed moat, cost-structure gaps, provisional core/supporting/generic split |
| `user-needs.md` | User roles (external and the undocumented internal ones), jobs-to-be-done as graded hypotheses, dissection of the two proxy claims, ranked verification list |
| `evidence-ledger.md` | Per-claim provenance and confidence, 10 open questions, 2 escalated decisions, kill criteria |

## What the source actually was

One file: `README.md`, 33 lines, self-authored, marketing-toned. `docs/product/` and `docs/adr/`
exist and are **empty**. The code named in the README (Django, Postgres, React, Go scheduler) is not
in the repo. There is no schema, no analytics, no ticket history, no customer research.

Everything below follows from that.

## Three findings that change how you decompose

**1. One user need is evidenced; the rest are opinions.** Contractors demonstrably pay £180 for a
guaranteed machine at a chosen depot next morning, and that line is growing. That is revealed
preference and it is solid. The README's other two statements about users — "contractors don't care
about price" and "the portal is fine" — are both second-hand, from the sales team and from account
managers respectively. The second is worse than weak: account managers are judging a channel that
competes with their own role, and "most bookings come by phone anyway" is offered as a reason the
portal does not matter when it is equally well explained *by* a bad portal. Both are marked
grade **P (proxy)** throughout and neither should enter the decomposition as fact.

**2. Transfer promising and fleet availability are one decision, not two.** Moving a unit to satisfy
a priority transfer removes it from the depot where it might otherwise have rented. The £180 flat
fee is priced against an opportunity cost the README never mentions. Splitting "transfer" and
"availability" into separate bounded contexts will cut through a single invariant.

**3. The moat claim is unsettled between two readings.** The README says the differentiator is
four-years-of-live-fleet-visibility. The economics suggest it may be the 14-depot network density
instead — you cannot promise next-morning transfer without depots close enough to transfer between,
and plant telematics is not hard to buy in 2026. Software-as-moat and network-as-moat produce
different decompositions. Escalated as decision **D-1**; not a call to make by inference.

## Before hardening any boundary

Ten open questions in the ledger, all answerable from data RentCo already holds — roughly a day of
pulling existing reports. The five that block the core/supporting classification:

1. Revenue and margin **by line** — "fastest-growing" is a rate, not a size; priority transfer is
   currently unsized.
2. **Utilisation**, by depot and class — the central metric of any rental business, absent entirely.
3. Day rates — without them, £180 could be a 15% premium or a 150% one.
4. Who actually consumes the fleet-visibility data — planner, algorithm, or account manager?
5. Transfer volume and miss rate — a "guarantee" means little without a failure rate attached.

## How confident this is

Safe to build on: the shape of the offering, and the priority-transfer revealed preference.

Held as hypothesis: the entire core/supporting/generic table, both proxy user claims, and every
inference marked **A** or **D**.

The strongest output of this stage is the question list, not the answer list. That is a property of
the source material, not a hedge.
