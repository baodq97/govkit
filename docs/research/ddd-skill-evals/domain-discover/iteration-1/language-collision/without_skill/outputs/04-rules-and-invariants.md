# Rules and Invariants

Separated by strength of evidence. Only the first is a candidate invariant; the rest are policies, and one is contested.

---

## INV-1 — No overlapping commitments on a unit, globally

> *"A unit can never be committed twice for overlapping windows — that's the one rule we absolutely cannot break, even across depots. We got burned on that in 2023."* — HA

**Statement:** For any unit, no two commitments may cover overlapping time windows. The rule is scoped to the **unit across the whole estate**, not to a depot.

**Confidence:** `CONFIRMED` as an intent. `ASSERTED` as a description of current reality — see below.

**Why it matters structurally:** the "even across depots" clause is the important half. It means the consistency boundary is the **unit**, not the depot. Any design that shards or scopes booking state by depot violates this rule by construction. If this system is ever split by depot, the unit's commitment timeline has to stay a single authority.

**What is not defined:**
- `committed` — is it the same as `reserved`/`booked`? (**Q4**)
- Overlap boundaries — inclusive/exclusive endpoints, back-to-back same-day, whether transit time consumes the window. (**Q3**)
- Whether a relocation itself is a commitment. If a unit is being driven overnight, is that window blocked? Intuitively it must be, but nobody said so. (**Q2**)

**The caveat that should stop anyone from treating this as settled:** HA stated it in the present tense as a fact — *"It can't be."* But the mechanism protecting related guarantees (Flow B) is a whiteboard. A rule enforced by human memory is a policy that usually holds, not an invariant. The 2023 incident is direct evidence it has been broken at least once. Before building to it, check booking history for violations since 2023 (**Q6**). Two outcomes, both useful: zero violations means the human process genuinely works and can be automated with confidence; any violations means the system must reconcile existing bad data before enforcing.

---

## POL-1 — Availability is asserted on physical arrival

> *"Once it's physically at the receiving depot we mark it available."* — HA

A unit becomes available at the receiving depot only after a human confirms physical presence. Not inferred from dispatch, ETA, or elapsed time.

**Confidence:** `CONFIRMED`
**Implication:** arrival is an observed event with a human actor, not a scheduled transition. Do not auto-advance it.

---

## POL-2 — Out-of-service is a depot-manager decision

> MINH: *"Not me."* / HA: *"Depot manager."*

**Confidence:** `CONFIRMED` on the holder. `UNKNOWN` on criteria — nobody described what makes a unit out of service, only who decides.

---

## POL-3 — Out-of-service requires cancelling reservations

> *"Once it's out of service we have to cancel any reservations on it."* — HA

**Confidence:** `CONFIRMED` as an obligation.
**Current enforcement:** none. Manual, memory-based, whiteboard-tracked (*"someone has to remember"*).

This is a rule the business believes it follows and has no means to guarantee. It is the highest-value automation candidate in the transcript, and the cheapest — the trigger, the obligation, and the affected set are all already well-defined.

---

## CONTESTED-1 — When is the Relocation Charge triggered?

Two incompatible rules stated in the same session.

**Finance (MINH) — authoritative on billing:**
> *"We charge on request, not on completion. If they cancel after we've dispatched, we still bill it."*

**Ops (HA) — was operating on the opposite belief:**
> *"the charge only exists if the drive actually happened"*
> *"...that's news to me. I thought a cancelled transfer meant no charge."*

**Confidence:** `CONTESTED`. Unresolved — the facilitator parked it.

**Assessment:** Finance owns billing policy, so MINH's version is more likely correct as *policy*. But HA's reaction shows Ops has been telling contractors something else, which means the *practice* may differ from the policy, and there may be a history of waived or disputed charges. Do not resolve this by picking the more senior-sounding voice; get it in writing. Blocks **Q1**.

**Note on MINH's phrasing:** "charge on request" and "if they cancel after we've dispatched, we still bill it" are not the same rule. The first says the charge exists from request onward; the second only defends billing *post-dispatch*. There may be an unstated third case — cancellation *before* dispatch — where the answer differs. Ask explicitly.

---

## Rules that should exist but were never stated

Flagged as negative space, not invented:

- What makes a unit out of service (criteria, not authority).
- What happens to a contractor whose reservation is cancelled under POL-3.
- Whether a unit in transit can hold or accept commitments.
- Whether the £180 varies, and by what.
- Whether a failed relocation (breakdown, damage in transit) is billable.
- Whether there is any approval on a relocation, or Ops raises it unilaterally.
