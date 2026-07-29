---
id: DOMAIN-DISC-0001
title: Euro Parking — discovery session 2026-07-27
status: draft
owner: TBD
date: 2026-07-27
mode: discover
technique: eventstorming-big-picture
---

## Who was in the room

| Role | Present | Notes |
|---|---|---|
| Domain expert | **transcript only** — 25 years operating sites for a mid-size European operator | present in the recorded session of 2026-07-27, *not* in this run; no follow-up was possible |
| Modeller / facilitator | yes | wrote this; every element name here is the modeller's, not the expert's |
| Real end user (driver) | **no** | the whole driver flow is an operator's belief about drivers (H19) |
| Site manager (the actual user of the paid features) | **no** | reached only through the expert |
| Product / strategy (founder) | **no** | country sequence and pricing are second-hand |
| Developers | **no** | nothing here has been tested against feasibility |
| Finance / tax / legal | **no** | retention periods are the expert's recollection (H8) |
| Hardware and payment suppliers | **no** | guidance, plate lookup and acquirer behaviour are hearsay (H1, H4, H9) |

**What this means for the reader.** This was a documentary session, not a workshop. The expert
answered in one prior sitting; nobody could be asked "and then what?" when the timeline hit a hole.
Every hole therefore became a hotspot instead of a finding — that is why there are 19 of them.

**On the visual surface.** No browser and no participants: the wall was a markdown timeline and
`model.json`. A text timeline loses what makes EventStorming work — everyone seeing the same wall
change at once, and the argument that starts when they do.

## Mode and how status was assigned

Mode **discover**. `docs/domain/business-model.md` and two source documents existed; there is no
code, no schema and no wiki.

- **confirmed** = the domain expert stated the behaviour in the session of 2026-07-27, quoted or
  paraphrased with attribution. It does **not** mean the expert approved the name: `BayAssigned`,
  `UnmatchedExitFlagged` and every other identifier is the modeller's naming of what he described,
  and the naming is unreviewed.
- **candidate** = only `INPUT.md` (the brief) implies it. Nothing was promoted in this run, because
  promotion needs a person and no person was available.
- Two rows are recorded as **stated absences** (no guidance system in a lot; no machine rule for
  disabled/family bays). They are findings, not gaps — the expert was emphatic about both.

## Coverage

**Covered:** site and tariff configuration; entry including refusal and class substitution; ticket
issue and what is written to the stripe; garage sensing, plate reading and class mismatch; payment,
lost ticket and the 15-minute window; exit including the unpaid, offline and remote paths; card
collection and refill; the next-morning work — reconciliation, exceptions, occupancy, the
entitlement report; fiscal retention.

**Not covered, and who would be needed:**

- **Lots, as a product.** Almost everything confirmed about sensing, guidance and occupancy is
  garage-only. How a lot knows it is full, and how it reports occupancy — the paid capability —
  is unknown (H2, H3). *A lot site manager.*
- **Payment beyond the terminal.** Acquirer link, settlement, reversal when a paid driver cannot
  get out (H9). *The terminal/payment supplier.*
- **The guidance integration.** Who assigns the bay, and whether the sensors can be trusted
  (H1, H4). *A guidance supplier plus a field test.*
- **Retention law.** France and anything outside DE/AT/NL; end-of-contract disposal (H8).
  *A tax adviser per country.*
- **The driver's actual experience.** Never observed (H19). *Real drivers at a live site.*
- **Municipal tenders.** Declared outside the expert's experience and not explored at all.

## Confidence

**68 confirmed elements · 1 candidate element · 33 language terms (29 confirmed, 4 candidate,
6 in collision pairs) · 19 open hotspots.**

The confirmed count is high because a domain expert really did answer, at length, about how sites
run. It is not evidence of coverage: it is one person's account of one operator's practice, taken
in one sitting, with no user, no buyer, no supplier and no lawyer to contradict him. Read the
counts as *depth in the garage entry-to-exit flow*, and as thin-to-absent everywhere the money
actually is — reconciliation detail, lot occupancy, and the payment leg.

## The findings that matter most

1. **Garage and lot are two different domains wearing one vocabulary.** Bay vs area, sensed vs
   unknowable, released vs never held. The brief's single "parking spot" hides the split.
2. **The stripe is a second source of truth that is allowed to win.** Offline, a rewritable copy
   opens a barrier, and the business has priced that risk deliberately: 4–5 abuses in 15 years
   against never trapping a driver.
3. **"Vehicle type" in the brief mixes two things** — what the vehicle is (priced, enforceable) and
   what the person is entitled to (disabled, family: reported, never enforced). The expert refused
   the requirement's framing outright.
4. **Nobody named the thing that lives for ten years.** Cards are reused ~100 times; the fiscal
   record outlives all of them; no identity for a single visit was ever stated (H13).
5. **The two capabilities the operator would pay for — reconciliation and occupancy — are the two
   the session covered least.** Both were described as outcomes, not as processes.

## Hand-off

`3-decompose` consumes `timeline.md` and `ubiquitous-language.md` as its step-2 input, in place of
a prose skim, and cites hotspot ids by their stable numbers (H1–H19; ids are never renumbered).
The decomposition will be exactly as good as this discovery was: strong on the garage entry-to-exit
flow, and it must treat lot occupancy, payment settlement and visit identity as open, because they
are.

Before the next round, get a site manager and a real driver in a room for two hours; that buys more
than another pass over these documents. `model.json` exceeds the 120-line file budget by design —
its length is one line per recorded element, not prose.
