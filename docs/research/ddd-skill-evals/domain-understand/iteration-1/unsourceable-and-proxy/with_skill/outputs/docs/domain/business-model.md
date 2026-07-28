---
id: DOMAIN-BM-0001
title: RentCo — business model & user needs
status: draft
owner: TBD
date: 2026-07-27
mode: discover
---

# RentCo — business model & user needs

UNDERSTAND-stage output, produced before any bounded context is drawn. It supplies
`domain-decompose` with the three classification inputs (`business_role`, `evolution_stage`,
`differentiation`) and records, per block, whether a claim is evidence or a hole.

**Read the coverage warning before using this.** Roughly half the canvas is unsourced. The
decomposition can safely act on the transfer/visibility side of this document; it cannot yet act on
cost, partners, goals, or anything about how users actually work.

## Sources

| Source | What it gave | Limits |
|---|---|---|
| `README.md` (whole file, 32 lines) | Customer segment, service description, full price list, the differentiation claim behind priority transfer, two channels, the stack | Single document, single author, undated, no revision history. Nothing corroborates it. |
| `docs/product/` | — | **Directory exists and is empty.** No PRD, no product overview, no OKRs, no roadmap. |
| `docs/adr/` | — | **Directory exists and is empty.** No recorded architecture decisions. |

That is the entire corpus: one README. Every block below that says "not sourced" means *no document
in this repo speaks to it* — not that the answer is unimportant.

## Who was in the room

**Nobody.** No interview was held for this document. It is a desk exercise over one README.

| Voice | Present? | Note |
|---|---|---|
| People who build/test the software | No | Stack named in the README; nobody spoken to |
| Domain experts (depot, scheduling, fleet) | No | — |
| Product / business strategy owners | No | No strategy document exists in the repo either |
| **Real end users (contractors)** | **No** | See below |

The README's "Who uses it" section is the only material about users, and it is **proxy evidence at
two removes**: the sales team and account managers are quoted, and they are quoted by the README's
author rather than interviewed here. Two named claims come from that section —

1. *"contractors mainly care about getting the machine on site tomorrow, not about price"* — sales
   team's characterisation of contractors. No contractor said this in any artifact available.
2. *"the self-service portal is 'fine'"* — account managers' assessment of a channel that competes
   with the phone bookings they handle. Worth weighing accordingly.

Neither is user evidence and neither is used below as if it were. Nothing in the repo indicates
when anyone last watched a contractor complete a booking.

## Business Model Canvas

Filled right-to-left (segments and value propositions first). Blocks nobody could source are left
empty on purpose and appear again under Open questions.

| Block | Content | Source |
|---|---|---|
| **Customer segments** | Construction contractors. One segment named; no size, trade, or region breakdown, and no statement that different contractor groups want different things. | README.md — "Equipment rental for construction contractors across 14 depots" |
| **Value propositions** | (a) Access to plant and machinery — excavators, lifts, compactors — for a rental window without owning it. (b) **Guaranteed next-morning availability of a unit at the contractor's chosen depot**, stated as unmatched in the region. | README.md — "What we do", "Pricing" |
| **Channels** | Two exist: a self-service portal, and phone through account managers. The README asserts most bookings come by phone; no volume, share, or trend is given, and the claim comes from the account managers themselves. | README.md — "Who uses it" (proxy, unquantified) |
| **Customer relationships** | Mixed: self-service (portal) alongside dedicated personal assistance (account managers). Which relationship each segment expects, and what it costs to serve, is not stated. | README.md — "Who uses it" (partial) |
| **Revenue streams** | Four priced lines: standard rental (usage fee, per-day rate by equipment class); priority depot transfer (£180 flat, next-morning guarantee); damage waiver (8% of rental value); late return (1.5× day rate). Priority depot transfer is described as the fastest-growing line. | README.md — "Pricing" |
| **Key resources** | Physical: the rental fleet; 14 depots. Intellectual: **live visibility of the physical location of every unit**, stated to have taken four years to build. Human: account managers, sales team. | README.md — "What we do", "Pricing" |
| **Key activities** | Cross-depot logistics — moving the right unit to the right depot at the right time; reservation for a rental window; collection and return handling. | README.md — "What we do" |
| **Key partners** | *(empty — not sourced)* | — |
| **Cost structure** | *(empty — not sourced)* | — |

### Notes on individual blocks

**Value propositions.** The differentiation claim is specific and falsifiable as written: *"Nobody
else in the region guarantees next-day cross-depot availability — it needs live visibility of where
every unit physically is, which took us four years to build."* It names the capability, the barrier
(four years), and the competitive gap. It is still one company describing itself; no competitor scan
or customer quote backs it. Treated here as the strongest single claim in the corpus, and still
worth a check.

**Revenue streams.** "Fastest-growing line" is a rate claim with no baseline. Priority transfer may
be the fastest-growing line and still be a small fraction of revenue. The share of revenue per line
is unknown, which matters: revenue mix is what separates "the differentiator" from "an add-on that
grows fast off a small base".

**Key partners — empty, and consequentially so.** Cross-depot transfer requires someone to move
units between depots. The README never says whether RentCo runs its own drivers and vehicles or
buys haulage. The answer changes the classification directly: an activity performed by a partner is
generic almost by definition, so if haulage is bought in, the transfer *scheduling* is core while
the transfer *execution* is not. Do not let the decomposition guess this.

**Cost structure — empty.** Nothing in the repo names a cost. The £180 flat premium plus the
sales-team claim that contractors do not shop on price would suggest a value-driven cost structure,
but that is an inference from a proxy quote and a price point, so it is not recorded as a canvas
entry. Whoever owns the P&L can answer it in a sentence.

## User Story Map

**Status: not a user story map yet.** A map requires observed user work. The backbone below is
RentCo's own description of its service flow (README, "What we do") — the sequence *the company
says* it operates, not work anyone watched a contractor do. Activities and tasks beneath each step
are almost entirely unknown, which is the honest shape of the evidence.

```
BACKBONE   Reserve unit  →  [transfer arranged]  →  Collect from depot  →  Use on site  →  Return  →  Get billed
             (README)          (README, priced)         (README)            (unknown)     (README)   (inferred)

ACTIVITIES  by phone via AM    priority transfer        ?                   ?             ?          ?
  ↓         or self-service    £180, next morning       ?                   ?             ?          ?
TASKS       ?                  ?                        ?                   ?             ?          ?
```

- **"Get billed"** is inferred from the existence of a price list. No document in the repo describes
  an invoicing, payment, or dispute step. It is drawn dashed here and listed as an open question.
- **"Use on site"** — nothing is known. Whether contractors extend rentals, report faults, or swap
  units mid-hire is unrecorded, and each would be a distinct capability.
- No slices are cut. Slicing a map this sparse would encode guesses as a release plan.

### Candidate pain point (one, unverified)

RentCo built a self-service portal, and by its own account most bookings still arrive by phone. A
channel that exists and goes unused is the classic signal of a workaround — users routing around the
system to get the job done. The README does not treat it as a problem; the assessment that the
portal is "fine" comes from account managers, who are the phone channel.

This is a hypothesis, not a finding. Two readings fit the same fact equally well:

- the portal fails at something contractors need (so the pain is real and unmodelled), or
- contractors prefer a relationship, and the phone channel is the product working as intended.

Distinguishing them requires talking to contractors, and it changes the decomposition: under the
first reading, self-service booking is a neglected capability; under the second, it is a channel the
business could stop investing in. **Do not resolve this from the repo.** It is the highest-value
question on the list below.

## Goals

| Horizon | Goal | Source |
|---|---|---|
| Short (this quarter) | **unknown** | — |
| Medium (this year) | **unknown** | — |
| Long (1–3 years) | **unknown** | — |

No goal of any horizon is stated anywhere in the repo, and `docs/product/` — where a roadmap or OKRs
would live — is empty.

"Priority depot transfer is our fastest-growing line" is a statement about the present, not a plan.
Reading it as "grow the transfer line" would be the easiest fabrication in this document to commit
and the hardest to detect later, so it is not recorded as a goal.

The horizon question matters here for a specific reason: the classifications below are all
present-tense. A capability that is commodity today and strategic in an 18-month plan should not be
outsourced this quarter, and with all three horizons unknown, the decomposition has no way to see
that coming.

## Capability classification inputs

Present tense, sourced from the README only. `unknown` appears wherever the repo is silent — it is a
real answer here, not a gap to be filled by judgement.

| Capability | business_role | evolution_stage | differentiation | Source |
|---|---|---|---|---|
| Live unit location / fleet visibility | revenue-generator — it is the stated enabler of the priority-transfer line | custom-built — "took us four years to build"; no off-the-shelf equivalent claimed | **yes** — the README names it as the barrier competitors have not crossed | README.md, "Pricing" |
| Priority depot transfer scheduling | revenue-generator — £180 flat, described as the fastest-growing line | custom-built | **yes** — "nobody else in the region guarantees next-day cross-depot availability" | README.md, "Pricing" |
| Reservation / booking for a rental window | revenue-generator — the per-day rate is billed against it | unknown — repo never says whether this was built or bought | unknown — no claim either way | README.md, "What we do" |
| Self-service portal | unknown — no revenue, retention, or cost effect is stated | unknown | unknown — the only assessment is an account manager's "fine", which is proxy and conflicted | README.md, "Who uses it" (proxy) |
| Damage waiver | revenue-generator — 8% of rental value, and risk transfer for the contractor | unknown | unknown — nothing suggests competitors cannot price a waiver, but nothing states it | README.md, "Pricing" |
| Late-return charging | revenue-generator — 1.5× day rate; also enforces return discipline | unknown | unknown | README.md, "Pricing" |
| Depot network operations (14 depots) | cost-reduction / enabler — physical footprint the transfer guarantee depends on | unknown | unknown — 14 depots may be table stakes in the region or may be the moat; the README does not say | README.md, header |

### Capabilities the repo is silent about

These almost certainly exist in the business. None is described in any artifact, so none is
classified. Listing them unclassified is the point — an unclassified capability gets a question; an
invented classification gets built on.

- **Invoicing / payment / dispute** — four priced lines imply billing; no document describes it.
- **Equipment maintenance, servicing, off-hire inspection** — unavoidable for a rental fleet;
  entirely absent from the repo.
- **Transfer execution (haulage, drivers, vehicles)** — see the Key partners note. In-house versus
  bought-in changes the classification.
- **Damage assessment** — the waiver is priced, so something must adjudicate damage. Unrecorded.
- **Fleet acquisition and disposal** — unrecorded.

## Open questions

Each line: the question, then who can answer it.

**Blocking the core/supporting/generic split**

1. Who physically moves units between depots — RentCo drivers or a contracted haulier? *(Operations
   lead / whoever owns depot logistics.)* A partnered activity is generic by default; this one
   question decides whether transfer execution is modelled richly or bought.
2. What share of revenue does each of the four priced lines carry? *(Finance.)* "Fastest-growing"
   without a baseline cannot distinguish the main engine from a promising add-on.
3. Was the reservation/booking engine built in-house or bought? *(Engineering lead.)* Decides
   custom-built versus product for a capability sitting on the main revenue path.
4. Is the region's competitive gap on next-day cross-depot availability still open, and how is that
   known? *(Sales / commercial lead.)* The entire "yes" on differentiation rests on one unverified
   sentence.

**Empty canvas blocks**

5. Cost structure — what are the largest lines, and is the business cost-driven or value-driven?
   *(Whoever owns the P&L.)*
6. Key partners — what does RentCo deliberately not do itself, and why? *(COO / operations lead.)*
7. Do any two groups of contractors want genuinely different things — for example large firms with
   framework agreements versus one-off hirers? *(Sales lead.)* A yes here usually means two models
   rather than one with a customer-type flag.
8. What does an invoice actually show, and who handles disputes? *(Finance.)*

**User evidence — none of which exists yet**

9. When did anyone last watch a contractor book, collect, and return a unit? *(Product / account
   management.)* If the answer is "we haven't", the whole user side of this document stays internal
   belief.
10. Why do bookings go by phone when a portal exists — does the portal fail at something, or do
    contractors prefer the relationship? *(Contractors directly. Not account managers alone —
    they are the phone channel.)*
11. What happens between collection and return: extensions, faults, swaps, early returns? *(Depot
    staff, then contractors.)* This is a blank stretch of the backbone and likely hides capabilities.
12. Do contractors describe the value the way the sales team does — "on site tomorrow, not price"?
    *(Contractors.)* This single relayed claim is currently carrying the argument for what the
    business sells.

**Strategy**

13. What has to be true by the end of this quarter, this year, and in three years? *(Founder /
    exec.)* All three horizons are blank.
14. Is anything boring today going to be strategic later? *(Same.)* Without this, the decomposition
    may outsource something the plan needs as core.

## Coverage

| | Sourced | Proxy-only | Not sourced |
|---|---|---|---|
| Canvas blocks (9) | 5 | 2 (channels, customer relationships) | 2 (key partners, cost structure) |
| Goal horizons (3) | 0 | 0 | 3 |
| Classified capabilities (7) | 2 with full inputs | — | 5 with one or more `unknown` |
| User story map | backbone only, company-stated | 1 candidate pain point | activities and tasks throughout |

The transfer/visibility side of this business is well enough evidenced to decompose against. The
user side is not evidenced at all, and no amount of further reading of this repo will change that —
it needs contractors in a room.
