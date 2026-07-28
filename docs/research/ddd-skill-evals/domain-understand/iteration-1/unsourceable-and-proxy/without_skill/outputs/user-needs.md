# RentCo — User Needs (understand stage)

## 0. Read this first

**The repo contains zero direct user evidence.** No interviews, no support tickets, no session
analytics, no NPS, no win/loss notes, no sales call recordings, no churn reasons. `docs/product/`
is an empty directory.

Everything the README says about users comes from **two sentences, both second-hand**, both from
internal staff describing what customers supposedly think. Neither is a user speaking.

So this document does not state user needs. It states **hypotheses about user needs, ranked by how
much they cost to be wrong about**, and it separates them by evidence grade. Anyone reading this as
a needs list and building boundaries on it will be building on an opinion held by the sales team.

| Grade | Meaning | Present in repo? |
|---|---|---|
| **A** | Primary — the user said or did it, observed directly | **None** |
| **B** | Revealed preference — inferred from what customers pay for | Yes, weakly (pricing table) |
| **C** | Proxy — internal staff reporting customer belief | Yes, both user statements |
| **D** | Analyst inference | Marked where used |

---

## 1. Who the users are

The README names one external user type and, by omission, hides several internal ones. The internal
ones matter more than usual here, because the moat is an *operations* capability.

### External

| Role | What they do | Evidence |
|---|---|---|
| Contractor / site manager | Needs a machine on site to keep work moving; the person feeling the urgency | D — inferred from the domain, never described in the repo |
| Contractor's hire desk / buyer | Places and manages bookings, owns the account relationship | D — implied by "account managers", never named |

The README treats "contractors" as a single actor. In practice the person who *needs* the machine
and the person who *books* it are usually different people with opposing incentives (speed vs.
cost). That split is the sort of thing that decides whether "not about price" is true. Unresolved.

### Internal — undocumented, and probably the primary users of the core system

| Role | What they do | Evidence |
|---|---|---|
| Account manager | Takes bookings by phone; carries most volume | S (mentioned), role never described |
| Depot staff | Hand over, receive, inspect, park units | D — collect/return implies them |
| Transfer / logistics planner | Decides which unit moves, from where, on what vehicle, to keep the next-morning promise | **D — never mentioned at all, but the £180 guarantee cannot exist without this function** |
| Damage assessor | Judges damage against the 8% waiver | D — implied by the waiver line |

**The most important line in this table is the one the README does not contain.** The four-year
"live visibility of where every unit is" system exists to let *someone* make transfer decisions. If
that someone is a human planner, they are the primary user of RentCo's core capability, and their
needs are 100% undocumented. Decomposing the fleet-visibility context without knowing whether its
consumer is an algorithm, a planner's screen, or an account manager on a phone call means guessing
its entire interface. Q-4 in the ledger.

## 2. Jobs to be done — hypotheses

| # | Job | For whom | Grade | Note |
|---|---|---|---|---|
| J1 | "Get a working machine to my site by tomorrow morning" | Site manager | **B/C** | The strongest hypothesis. Backed by both the proxy claim *and* a paid-for product (§3) |
| J2 | "Know *now*, on the call, whether I can actually have it" | Contractor + AM | **D** | A guarantee is only sellable if answerable at booking time. Certainty may be the real product, not speed |
| J3 | "Don't get charged for damage I didn't cause" | Contractor | **D** | An 8% waiver on every rental implies disputes exist. Zero process documented |
| J4 | "Keep the unit until the job actually finishes" | Contractor | **D** | The 1.5× late fee implies overrun is common. Extension may be an unmet need being monetised as a penalty |
| J5 | "Place a repeat/bulk booking without a phone call" | Contractor hire desk | **C, contested** | The portal question. See §4 |
| J6 | "Decide which unit to move without breaking another booking" | Transfer planner | **D** | Internal, undocumented, sits directly on the moat |

Note J4. A late-return fee is revenue, but it is also a signal that customers routinely need
something RentCo does not sell them: a flexible end date. Whether "late return" is a customer
failure or a product gap is unanswered, and the two readings produce different domain models
(penalty state machine vs. extension flow).

## 3. The one piece of non-proxy evidence: revealed preference

The pricing table is better evidence than either quoted opinion, because it records what customers
*pay for*, not what someone thinks they want.

> Priority depot transfer — £180 flat — **fastest-growing line**.

Customers are voluntarily paying a premium for guaranteed next-morning availability at a chosen
depot, and doing so at an increasing rate. That is a behavioural signal, and it supports J1 and J2
with grade **B**.

Two limits on how far that carries:

**Limit 1 — the premium is unmeasured.** No day rates appear in the repo, so £180 could be a 15%
uplift or a 150% one. "Contractors don't care about price" means something very different in those
two worlds. Q-3.

**Limit 2 — a growing premium line does not make the base price-insensitive.** The customers buying
priority transfer are, by definition, the ones in a hurry — a self-selecting subset. Their
behaviour says nothing about the contractor comparing day rates across three hire firms for next
month's job. Generalising from the premium line to the whole customer base is exactly the error the
README makes in §"Who uses it". Held separately below.

## 4. The two proxy claims, dissected

Both README statements about users are reported speech from internal staff. Both are currently
functioning as strategy inputs. Neither is verified, and both have a structural reason to be wrong
in a specific direction.

### Claim 1

> "Our sales team reports that contractors mainly care about getting the machine on site tomorrow,
> not about price."

| | |
|---|---|
| **Who is speaking** | Sales team — not contractors |
| **Grade** | **C (proxy)** |
| **Selection bias** | Sales hears from customers who *called them*, usually in urgency. Contractors who quietly compared rates and booked elsewhere never enter this sample. The population that generates this claim is pre-filtered for exactly the trait the claim asserts |
| **Incentive bias** | "Customers don't care about price" is a comfortable finding for a sales organisation — it argues against discounting and against being measured on rate competitiveness |
| **Partly corroborated** | Yes, by §3. The urgency half (J1) has independent behavioural support |
| **Not corroborated** | The "not about price" half. Nothing in the repo measures price sensitivity. Zero |
| **Cost if wrong** | High. This claim is doing load-bearing work: it justifies premium lines, and it implicitly de-prioritises rate competitiveness and transparent pricing across the whole product |
| **How to settle it** | Win/loss reasons on lost quotes (why did they not book?); price-elasticity read from historical rate changes vs. volume; quote-to-booking conversion split by rate percentile. All are existing-data questions, not research projects |

**Verdict:** accept "speed and certainty matter" (grade B, corroborated). **Reject "not about
price" as unsupported** and stop citing it until win/loss data exists.

### Claim 2

> "Account managers say the self-service portal is 'fine' and most bookings come through them by
> phone anyway."

| | |
|---|---|
| **Who is speaking** | Account managers — assessing a channel that competes with their own function |
| **Grade** | **C (proxy), and the weakest evidence in the repo** |
| **Conflict of interest** | Direct. A successful self-service portal reduces the volume routed through account managers. They are not neutral assessors of it |
| **"Fine"** | Not a measurement. No task-completion rate, no error rate, no drop-off funnel, no user quote. In practice "fine" from a non-user is closer to "I have no evidence" than to "it works" |
| **The circular part** | "Most bookings come by phone **anyway**" is offered as a reason the portal does not matter. But phone dominance is equally well explained *by* a weak portal. The README presents an outcome as a justification for the cause. This is the clearest reasoning defect in the document |
| **Cost if wrong** | High and compounding. If contractors are routed to phone because self-service fails, RentCo is paying account-manager salaries to absorb a product defect, and capping its own throughput per head |
| **How to settle it** | Portal funnel analytics: sessions → started booking → completed. Abandonment rate. How many phone bookings come from a customer who was in the portal that day. Ask *contractors* — never account managers — why they phone. One week of work |

**Verdict:** treat both halves as **unknown**. Do not let "the portal is fine" survive into the
decomposition as a reason to leave the self-service path unmodelled.

## 5. Needs implied by the price list but documented nowhere

Each pricing line encodes a customer behaviour and an operational process. Three of the four have
no supporting description anywhere in the repo:

| Price line | Implied behaviour | Implied process | Documented? |
|---|---|---|---|
| Damage waiver, 8% | Damage happens often enough to insure routinely | Condition capture at collect and return; assessment; dispute handling | **No** |
| Late return, 1.5× | Jobs overrun; units come back late | Overdue detection; chasing; knock-on rebooking of the next customer | **No** |
| Priority transfer, £180 | Customers hit the wrong-depot problem regularly | Transfer decision, haulage, next-morning commitment tracking | **No** |
| Per-day rate by class | Equipment is classed | Class taxonomy, rate card maintenance | **No** |

For a decomposition this is significant: four revenue-bearing processes with no described
behaviour. Each will need either a source or an explicit "modelled on assumption" marker.

## 6. Ranked — what to verify before decomposing

Ordered by (cost of being wrong) × (cheapness to check).

| Rank | Hypothesis | Current grade | Cheapest test | If it fails |
|---|---|---|---|---|
| 1 | Contractors are price-insensitive | **C, uncorroborated** | Win/loss reasons on lost quotes | Pricing/rating stops being "supporting" and becomes competitive surface |
| 2 | The self-service portal is adequate | **C, conflicted** | Portal funnel analytics + ask contractors | Booking-channel context becomes core, not an afterthought |
| 3 | Priority transfer is strategically central | **S, unsized** | Revenue and margin by line; transfer volume | The whole "core" classification in `business-model.md` §7 moves |
| 4 | Live fleet visibility is the real moat | **S, asserted** | What does the system actually own vs. read from a vendor? Who consumes it? | Core shifts from the software to the depot network |
| 5 | Late return is a penalty, not an unmet need | **D** | Rate of late returns; how many customers asked to extend first | J4 becomes a product feature, changing the rental lifecycle model |

---

**Bottom line for the decomposition stage.** One user need is supported by behaviour: *contractors
will pay a premium for a guaranteed machine at a chosen depot tomorrow morning* (J1/J2, grade B).
Carve boundaries around that with reasonable confidence. Every other "need" in this repo is either
an internal opinion with a built-in bias, or an inference I drew from the price list. The two
sentences the README offers as customer insight are both proxy statements, one of which is
circular. They are not a substitute for talking to a contractor, and the decomposition should not
inherit them as fact.
