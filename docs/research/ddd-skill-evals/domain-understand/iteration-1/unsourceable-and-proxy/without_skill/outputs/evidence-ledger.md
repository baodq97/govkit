# RentCo — Evidence Ledger

Provenance for every claim in `business-model.md` and `user-needs.md`, plus the open questions that
must be answered before the decomposition hardens.

## 1. Source inventory

| Path | Type | Status |
|---|---|---|
| `README.md` | Prose, 33 lines | **The only source in the repo** |
| `docs/product/` | Directory | **Empty** |
| `docs/adr/` | Directory | **Empty** |
| Application code | Django, Postgres, React, Go scheduler | **Named in the README; not present in the repo** |
| Git history | — | Not available in this snapshot |

Nothing else exists. No schema, no migrations, no tests, no analytics export, no tickets, no
customer research. The understand stage is being run on one self-authored marketing-toned page.

The stack line ("Django + Postgres, React front end, a scheduling service in Go") is the only hint
of existing structure. A Go service split out for scheduling is mildly corroborating that
scheduling/transfer is treated as the hard part — someone paid the cost of a second language and a
service boundary for it. Weak signal, worth one sentence, not worth a conclusion.

## 2. Claim provenance

**S** Stated · **D** Derived · **P** Proxy · **A** Assumed · **U** Unknown

| # | Claim | Grade | Source | Confidence |
|---|---|---|---|---|
| C1 | Equipment rental to construction contractors, 14 depots | S | README L3 | High |
| C2 | Product is a rental window on a physical unit, collect/return at depot | S | README L7–9 | High |
| C3 | RentCo's stated job is positioning — right unit, right depot, right time | S | README L8–9 | High |
| C4 | Four revenue lines and their prices | S | README L13–18 | High |
| C5 | Priority transfer is the fastest-growing line | S | README L20 | Medium — self-reported, unsized |
| C6 | No regional competitor guarantees next-day cross-depot availability | S | README L20–21 | **Low** — self-asserted, no competitor analysis |
| C7 | Live unit-level location visibility exists; took four years | S | README L21–22 | Medium — no artefact confirms it |
| C8 | Contractors care about tomorrow, not price | **P** | README L26–27, via sales team | **Low** — see `user-needs.md` §4 Claim 1 |
| C9 | Self-service portal is "fine" | **P** | README L27–28, via account managers | **Very low** — conflicted source, non-measurement |
| C10 | Most bookings arrive by phone | **P** | README L28 | **Low** — same source; used circularly |
| C11 | Stack is Django/Postgres/React/Go | S | README L32 | Medium — unverifiable here |
| C12 | Transfer cannibalises local availability | **D** | Logic of a shared fleet | High as reasoning, untested against ops |
| C13 | £180 flat absorbs variable haulage cost | **D** | Flat fee over a 14-depot network | High as reasoning |
| C14 | Late-return fee may mask an unmet extension need | **D** | Existence of the fee | Medium |
| C15 | A transfer planner role exists | **D** | The guarantee requires a decision-maker | Medium-high |
| C16 | Statutory inspection makes "located" ≠ "rentable" | **A** | Domain knowledge of plant hire | **Assumption — verify before modelling** |
| C17 | Depot network density may be the durable moat, not the software | **A** | Analyst inference | **Assumption — decision D-1** |
| C18 | Utilisation is the central economic metric | **A** | Standard rental economics | High as domain knowledge, absent from repo |

Claims C8, C9 and C10 are the only statements in the repo about users, and all three are grade P.
None of the three is safe to carry into the decomposition unqualified.

## 3. Open questions

| # | Question | Why it matters | How to answer | Owner |
|---|---|---|---|---|
| Q-1 | Revenue and gross margin **by line** | Decides whether priority transfer really is core (`business-model.md` §7) | Finance export, 12 months | Finance |
| Q-2 | Fleet utilisation, by depot and equipment class | The missing centre of the model; also sizes the transfer/cannibalisation trade-off | Ops reporting | Ops |
| Q-3 | Actual day rates by class | Makes £180 interpretable as a premium; needed to assess C8 | Rate card | Commercial |
| Q-4 | Who consumes the fleet-visibility data, and how? Human planner, algorithm, or AM on a call? | Determines the interface and consumers of the core context | 30-min walkthrough with a transfer planner | Eng + Ops |
| Q-5 | Transfer request volume, fulfilment rate, and failure rate | "Guarantee" is only meaningful with a miss rate attached | Scheduling service data | Eng |
| Q-6 | Win/loss reasons on lost quotes | The only way to settle C8 (price sensitivity) | Sales CRM, or 10 lost-deal calls | Sales ops |
| Q-7 | Portal funnel: sessions → started → completed booking | Settles C9/C10 and whether phone dominance is cause or effect | Web analytics | Product |
| Q-8 | Is fleet location owned by RentCo or read from a telematics vendor? | Decides whether the moat is an asset or a subscription (D-1) | Ask engineering | Eng |
| Q-9 | Do inspection/maintenance states exist in the system? | If not, "available" is wrong wherever it is modelled | Schema inspection | Eng |
| Q-10 | Contract rates, credit terms, account structure | Determines whether pricing is simple (as README implies) or per-account | Commercial | Commercial |

Q-1 through Q-5 block the core/supporting classification. Q-6 and Q-7 block any user-facing
prioritisation. All ten are answerable from data RentCo already holds — none requires new research.

## 4. Decisions to escalate

**D-1 — Is the moat the software or the depot network?**
The README says visibility. The economics suggest density (`business-model.md` §4). If it is the
network, fleet visibility is an enabler and the core context is transfer *planning*; if it is the
data, fleet-state ownership is the core context and everything else orbits it. Answered by Q-8 plus
Q-5. Human decision, not an inference to make on the team's behalf.

**D-2 — Is late return a penalty or a product gap?**
Determines whether the rental lifecycle models an overdue penalty state or a first-class extension
flow. Answered by Q-5-adjacent data plus asking whether customers request extensions before running
over.

## 5. Kill criteria

State these now so the decomposition can be reversed cheaply rather than defended:

- **If Q-1 shows priority transfer is under ~5% of gross margin**, the "guaranteed cross-depot
  availability" framing is a story the company tells about itself, not its business. The core moves
  to standard rental throughput and utilisation, and the boundary map should be redrawn.
- **If Q-8 shows fleet location is a vendor telematics feed**, C7's four-year moat is mostly
  integration work. Fleet visibility drops from Core to Supporting.
- **If Q-7 shows meaningful portal abandonment**, C9/C10 are refuted, the self-service booking path
  becomes a first-class context, and account-manager phone volume is reclassified as cost absorbed
  rather than a chosen channel.
- **If Q-6 shows price is a top-two loss reason**, C8 is dead and pricing/rating is competitive
  surface, not plumbing.

## 6. Honest statement of limits

This understand-stage output was produced from 33 lines of self-authored prose. It contains no
verified user evidence, no financial data, and no operational measurement. Its most confident
outputs are the *questions*, not the answers.

Two things are safe to build on: the shape of the offering (C1–C4, directly stated) and the
revealed preference behind priority transfer (`user-needs.md` §3). Everything else is either an
internal opinion with a documented bias, or my own inference, and both categories are labelled as
such throughout rather than blended into the prose.

Answering Q-1 through Q-5 is roughly a day of pulling existing reports. That is a materially better
investment than decomposing on this basis and discovering in month three that the boundaries were
drawn around the company's self-description.
