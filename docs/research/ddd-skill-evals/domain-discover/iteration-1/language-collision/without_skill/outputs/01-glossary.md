# Glossary — Ubiquitous Language (draft 1)

Every term below is traced to the transcript. Terms marked **PROPOSED** are not the participants' own words — they are candidate replacements for a collision and must be ratified by the speakers before use.

---

## Collisions — resolve before modelling

### `transfer` — COLLISION, two meanings

The highest-priority finding of the session.

| Speaker | Meaning used | Evidence |
|---|---|---|
| HA (Ops) | Physical relocation of a unit between depots. *"Someone drives it over, usually overnight."* | `CONFIRMED` |
| MINH (Finance) | A £180 invoice line. *"when I say transfer I mean the £180 line on the invoice. The physical move isn't my problem, the charge is."* | `CONFIRMED` |

MINH's line is a rare thing in discovery: a participant **naming their own homonym out loud**. Take it at face value.

The two meanings are not just different views of one thing. They diverge structurally:

- Different trigger: relocation starts at dispatch; the charge starts at request (per MINH, `CONTESTED` — see Q1).
- Different terminal states: a relocation can be **cancelled**; the charge for that same cancelled relocation may still be **billed**.
- Different owners: Ops vs Finance.
- Different failure modes: a relocation fails if the van doesn't arrive; a charge fails if it isn't invoiced.

A single `Transfer` entity would need a status field where `cancelled` and `billed` are simultaneously true. That is the tell.

**Proposed split:**

#### `Unit Relocation` — **PROPOSED** (Operations context)
The physical movement of one unit from an origin depot to a receiving depot. Raised by Ops in response to a contractor request for a machine at a depot that does not hold it. Typically executed overnight by a driver. Completes when the unit is physically present at the receiving depot and marked available.
*Source: HA, "We raise a transfer. Someone drives it over, usually overnight. Once it's physically at the receiving depot we mark it available."*

#### `Relocation Charge` — **PROPOSED** (Finance context)
The £180 billable line raised against a contractor for a requested relocation. Per Finance, triggered by the **request**, not by completion, and survives a post-dispatch cancellation.
*Source: MINH, "the £180 line on the invoice" / "We charge on request, not on completion."*
*Status: the trigger and the cancellation behaviour are `CONTESTED` — see Q1.*

**Do not use the bare word `transfer` in code, schema, docs, or tickets.** If it appears, it is ambiguous by construction and should be rejected in review.

---

### `booked` / `committed` / `reservation` — possible collision, UNRESOLVED

HA used three words in close succession and it is not established whether they are one concept or several:

- *"What happens if the machine is already **booked** at the original depot?"* (facilitator's word, adopted by HA)
- *"A unit can never be **committed** twice for overlapping windows"*
- *"we have to cancel any **reservations** on it"*

`reservation` is the only one HA used unprompted as a noun for the thing that gets cancelled, which makes it the strongest candidate for the canonical term. `committed` may be the broader state (a unit is committed *because* a reservation exists), or it may be a synonym. Not established. Tracked as **Q4**.

Provisional canonical term: **`Reservation`** — a contractor's hold on a unit for a time window. Flag any use of `booking` or `commitment` for confirmation rather than silently normalising them.

---

## Terms with a single agreed meaning

### `Unit` / `machine`
An individual item of hire equipment, identified individually (the invariant is stated per-unit, so units are tracked as instances, not as a fungible pool count). HA used `unit` and `machine` interchangeably; `unit` is the more precise of the two and appears in the invariant statement, so prefer it.
`CONFIRMED`

### `Depot`
A physical location holding units. Two roles appear in the relocation flow: **origin depot** (holds the unit) and **receiving depot** (where the contractor wants it). Whether these are attributes of a relocation or standing properties of a depot is trivially the former.
`CONFIRMED`

### `Contractor`
The customer. Requests a machine at a depot; is billed the Relocation Charge; can cancel.
`CONFIRMED`

### `Depot Manager`
The role holding authority to declare a unit out of service. Explicitly *not* Finance.
*Source: MINH "Not me." / HA "Depot manager."*
`CONFIRMED` — though no depot manager was present in the session.

### `available`
A state a unit is put into at the receiving depot **after** physical arrival is confirmed. Marked by a human, not derived. Whether `available` is a status value, a derived predicate over reservations, or a separate flag is not established. See **Q5**.
*Source: HA, "Once it's physically at the receiving depot we mark it available."*
`CONFIRMED` as a term; `UNKNOWN` as a model element.

### `out of service`
A state declared by a depot manager, removing a unit from hire. Requires that existing reservations on the unit be cancelled.
`CONFIRMED`

### `overlapping windows`
The unit of conflict for the double-booking invariant. A `window` is a time interval attached to a reservation. Precise boundary semantics (inclusive/exclusive, whether transit time counts, whether same-day back-to-back overlaps) were never discussed. See **Q3**.
`CONFIRMED` as a term; boundaries `UNKNOWN`.

### `dispatched`
The moment a relocation's driver departs — used by MINH as the boundary after which a cancellation still bills. The only time-point in the transcript with billing consequences.
*Source: MINH, "If they cancel after we've dispatched, we still bill it."*
`CONFIRMED` as a term; its role in the model depends on Q1.

### `£180`
The stated amount of a Relocation Charge. Whether flat, per-unit, per-mile-banded, or negotiable is not established. See **Q7**.
`ASSERTED` — one speaker, one number, no rate card seen.

---

## Terms notably absent

Worth chasing in the next session, because a domain of this shape usually has them and their absence here is more likely an artefact of a short conversation than genuine:

- No term for the state of a unit **while in transit** — dispatched but not yet arrived. The transcript jumps from "someone drives it over" straight to "mark it available". See **Q2**.
- No term for the contractor's original **request** as an artefact, despite Finance billing off it.
- No term for the **cancellation** of a relocation, despite both participants discussing cancellations.
- No term for whatever the whiteboard is standing in for.
