# RentCo — Business Model (understand stage)

**Source base:** one file, `README.md` (33 lines). `docs/product/` and `docs/adr/` exist but are empty. No code, no schema, no analytics, no tickets.
**Read this with `evidence-ledger.md` open.** Every claim below carries a grade; the ungraded parts of this business are larger than the graded parts.

Grades used throughout:

| Grade | Meaning |
|---|---|
| **S** Stated | Written in the README |
| **D** Derived | Follows necessarily from something stated |
| **P** Proxy | An internal party reporting what customers think — not the customer |
| **A** Assumed | Analyst inference, no repo support |
| **U** Unknown | Needed for this stage, absent from the repo |

---

## 1. What the business is

RentCo rents construction plant and machinery — excavators, lifts, compactors — to construction
contractors, out of a network of 14 depots. [S]

The unit of sale is a **rental window on a specific physical unit, collected from and returned to a
depot.** [S] The thing RentCo actually sells on top of the machine is *positioning*: getting the
right unit to the right depot at the right time. [S — the README says this in its own words.]

That distinction matters for decomposition. A rental business that sells "access to a machine" and
a rental business that sells "a machine at your depot tomorrow" have different cores. The README
claims the second.

## 2. Customer and segment

| Attribute | Value | Grade |
|---|---|---|
| Buyer | Construction contractors | S |
| Geography | Regional, single currency £ (UK implied) | S / D |
| Network | 14 depots | S |
| Segments within "contractors" | — | **U** |
| Customer count, concentration, churn | — | **U** |
| Account vs. one-off / walk-up mix | — | **U** |

"Construction contractors" is one word doing the work of a segmentation. A national civils firm
running a 40-machine programme and a two-van groundworker both fit that label and buy nothing
alike. The README never separates them, and the pricing table has no tiering, volume discount, or
contract rate — which is either evidence that RentCo genuinely runs one flat price book, or
evidence that the README is a summary and the real price book lives elsewhere. Unresolved. [U]

## 3. Revenue lines

| Line | Price | Strategic role | Grade |
|---|---|---|---|
| Standard rental | Per-day rate by equipment class | Base volume; the commodity | S |
| **Priority depot transfer** | **£180 flat**, guarantees a unit at the chosen depot next morning | **Fastest-growing line; the claimed differentiator** | S |
| Damage waiver | 8% of rental value | Attach-rate revenue, scales with rental value | S |
| Late return | 1.5× day rate | Penalty / recovery | S |
| Margin per line | — | — | **U** |
| Revenue mix per line | — | — | **U** |

Four observations that the decomposition should not lose:

**a) "Fastest-growing" is a growth rate, not a size.** [D] Fastest-growing is compatible with
priority transfer being 2% of revenue. Nothing in the repo sizes it. Building the boundary map
around this line is defensible on *strategic* grounds (it is the stated differentiator) but is
currently unsupported on *financial* grounds. [U — need revenue and margin by line.]

**b) £180 is flat, and the thing it buys is not.** [D] A cross-depot transfer's real cost varies
with distance, vehicle availability, and how far the unit has to move. A flat fee across a
14-depot network means RentCo is absorbing that variance. Whether that is deliberate (simple
promise, easy to sell) or accidental (nobody has costed it) is unknown, but it is a live margin
risk on the line the business says is growing fastest. [U — need cost-to-serve per transfer.]

**c) Priority transfer cannibalises local availability.** [D] Moving a unit to depot B to satisfy a
priority request removes it from depot A, where it might have rented at full day rate. The £180 is
therefore priced against an opportunity cost that the README never mentions. This is a genuine
allocation problem inside the business, and it means "promise a transfer" and "manage local
availability" are two sides of one decision, not two independent features. **A decomposition that
puts transfer promising and fleet availability in different bounded contexts will split a single
invariant.** Flag this to the decomposition stage.

**d) Late return fees are ambiguous income.** [D] 1.5× day rate reads as revenue, but a late return
also breaks the next customer's booking — and in a business whose whole promise is *the unit is
where you were told it would be*, a late return is a direct attack on the core product. Whether
RentCo treats late returns as a revenue line or a defect to be driven to zero is not stated, and
the answer changes how the return/overdue logic should be modelled. [U]

## 4. The claimed moat

The README makes one explicit competitive claim:

> "Nobody else in the region guarantees next-day cross-depot availability — it needs live
> visibility of where every unit physically is, which took us four years to build."

Decomposed:

| Component | Claim | Grade |
|---|---|---|
| Capability | Live, unit-level knowledge of the physical location of every unit | S |
| Barrier | Four years to build | S |
| Market position | No regional competitor offers the guarantee | S — but self-asserted, no competitor analysis in repo |
| Causation | The guarantee *requires* the visibility | S (asserted) / **A** (untested) |

Take the capability claim seriously — it is specific, it is costly, and it has a revenue line
attached to it. But note what it is *not*: "four years to build" is a statement about RentCo's
build history, not about how hard it is to replicate today. Telematics on plant hire fleets is not
exotic in 2026. The durable part of this moat is more plausibly the **14-depot network density**
(you cannot promise a next-morning transfer without depots close enough to transfer between) than
the tracking software itself. [A — inference, worth testing, would change what "core" means.]

If the moat is the network, the software's job is to *exploit* density, not to *be* the moat. If
the moat is the visibility data, the software is the asset. **These lead to different
decompositions**, and the repo does not settle it. Escalate as decision D-1 in the ledger.

## 5. Channel

| Channel | Status | Grade |
|---|---|---|
| Account managers / phone | Carries most bookings | **P** — account managers said so |
| Self-service portal | Exists; described as "fine" | **P** |
| Walk-up at depot | — | **U** |
| API / EDI to contractor systems | — | **U** |

Both channel facts come from account managers describing a channel that competes with their own
role. See `user-needs.md` §4 — this is the weakest evidence in the repo and it is currently being
used to justify not investing in self-service.

## 6. Cost structure — the hole

Nothing in the repo describes costs. For an asset-heavy rental business this is not a minor gap;
it is most of the business model:

- Fleet capital and depreciation — **U**
- **Utilisation rate** — **U**. This is *the* operating metric of equipment rental. Revenue is
  fleet × utilisation × rate. It appears nowhere.
- Transfer/haulage cost — **U** (and see §3b)
- Depot fixed cost, staffing across 14 sites — **U**
- Maintenance, damage repair, off-hire downtime — **U** (though the 8% waiver implies damage is
  frequent and material enough to insure against)

The understand stage cannot honestly claim to know what is "core" to a rental business without
utilisation. Where a unit sits and how often it earns is the whole game. Requested as Q-2.

## 7. Core / supporting / generic — provisional

For the decomposition, with confidence attached. This is the section most likely to be wrong, so
each row carries what would falsify it.

| Capability | Class | Why | Falsified if |
|---|---|---|---|
| Fleet location truth + availability projection | **Core** | Named differentiator; four-year build; the transfer guarantee depends on it | It turns out to be a vendor telematics feed RentCo merely reads |
| Cross-depot transfer promising & scheduling | **Core** | The growing line; where the guarantee is made or broken; inseparable from availability (§3c) | Transfer volume proves marginal (<5% of bookings) and unprofitable at £180 |
| Rental lifecycle (reserve → collect → return) | **Supporting** | Table stakes; every competitor has it — but it is where the promise is kept or broken | Contractors choose RentCo for booking experience, not availability |
| Pricing & rating (day rate by class, 8% waiver, 1.5× late) | **Supporting** | Mechanically simple as stated; may be hiding contract rates | Real price book turns out to be per-account and complex |
| Depot operations (yard, handover, condition check) | **Supporting** | Undocumented but implied by collect/return and the damage waiver | — |
| Damage assessment & waiver claims | **Supporting** | 8% of rental value is real money; process entirely undocumented | — |
| Identity, billing, payments, notifications, CRM | **Generic** | No evidence of anything RentCo-specific | — |

**Caveat, stated plainly:** this table is reasoning from a README, not from measurement. The
core/supporting split above would normally be argued from revenue mix, margin, and where
engineering time actually goes. None of those exist in the repo. Treat the two Core rows as a
strong hypothesis (the README is internally consistent about them) and every other row as a
placeholder to confirm.

## 8. Negative space — what the README never mentions

Absences that a decomposition will hit within a week:

- **Utilisation and fleet economics** (§6) — the missing centre of the model.
- **Maintenance, servicing, inspection cycles.** Plant has statutory inspection regimes. A unit
  can be physically at a depot and legally unrentable. "Live visibility of where every unit is" is
  not the same as "live visibility of what is rentable" — and it is the second that the transfer
  guarantee actually needs. Likely a real modelling gap.
- **Who drives the transfers.** Haulage, drivers, vehicle capacity, route planning. The promise is
  next-morning delivery; the README describes no logistics resource at all.
- **Contracts, credit, account terms.** B2B contractors on 30-day terms, credit limits, PO numbers
  — none present, all near-certain to exist.
- **Cancellations and no-shows.** A reserved unit held for a customer who never collects is direct
  utilisation loss. No policy stated.
- **Competitors, by name or behaviour.** The "nobody else in the region" claim has no supporting
  analysis.

---

**Verdict for the decomposition stage:** the business model is *legible* but not *evidenced*. The
core hypothesis — RentCo sells guaranteed cross-depot availability, powered by unit-level fleet
visibility — is coherent and worth carving boundaries around. It rests on a single self-authored
paragraph, and the financial facts that would confirm it (revenue mix, margin, utilisation,
transfer volume) are all absent. Proceed on the two Core rows; do not let the Supporting/Generic
rows harden until Q-1 through Q-5 in the ledger are answered.
