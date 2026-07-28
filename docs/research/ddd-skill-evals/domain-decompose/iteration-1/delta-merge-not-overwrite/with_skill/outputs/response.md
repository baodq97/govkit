Cold chain is now in the model, merged as a delta into the existing `docs/domain/` — nothing was
regenerated, and every hand-written planner note is still there byte-for-byte.

## The one real modelling decision

**Cold chain is its own bounded context, not an extension of Consolidation.**

Consolidation's language is volume, fill rate, stackability, and its consistency boundary closes at
`ContainerSealed`. The cold-chain rule keeps running *after* that — through carrier custody, all
the way to the destination depot. An invariant that spans two contexts' custody cannot live inside
either one's transaction. It also passes the capability-vs-context test: it owns a real business
invariant of its own, so it is a context, not a capability bolted onto Consolidation.

The alternative — a `temperatureRange` field on `ContainerLoad` plus a breach table — is cheaper
today and wrong the first time a breach happens on the road, because Consolidation has no model of
the journey.

## What was added

`docs/domain/cold-chain/model.yaml` — one aggregate, deliberately small:

| Element | | |
|---|---|---|
| Aggregate | `ColdChainCustody` | the depot-to-depot span |
| Entity | `TemperatureBreach` | has an id and is referenced when the customer is told → entity, not a VO |
| Value object | `TemperatureRange` | `minCelsius`, `maxCelsius` |
| Event | `TemperatureBreachRecorded` | consumed by Notifications |

Classified **supporting**, not core. Nothing in `business-model.md` says temperature control is how
we win — the differentiator on record is container fill. It flips to core if cold chain becomes a
priced premium like Guaranteed Consolidation, or if breach liability turns material. That flip
condition is written into the context map so a reviewer knows what would change the call.

I also broke the skill's default here, on purpose: a supporting context normally gets a transaction
script, not an aggregate. The contract states a genuine invariant with a lifecycle, so it gets one
small aggregate — and the deviation is recorded in the file as `tactical_pattern_rationale` rather
than left for someone to notice.

## One finding worth your attention

`discovery/timeline.md` lists `CustomerNotified` as event #11, *candidate* — "nobody confirmed when
it fires". The cold-chain brief just gave it its first confirmed trigger. Worth checking with the
planners whether that is the same notification path or a second one; it is now in the Conflicts
table of `context-map.md`.

## What I did not do

Seven gaps are recorded as open questions instead of being filled in:

1. Where the required range is agreed — quote, booking, or container. `requiredRange` currently has
   no upstream source, so nothing sets it.
2. What opens and closes custody. "Depot to depot" implies a span but names no event;
   `ContainerSealed` and `ShipmentHandedToCarrier` are candidates, both unconfirmed (drawn as
   dotted edges on the map).
3. Who measures, and how often. Continuous telemetry and a reading at handover are different
   models; neither was stated, so no measurement concept exists in the model.
4. Who is liable for a breach in partner-carrier custody. This sharpens discovery hotspot 3 —
   which was already unowned, and now has money attached.
5. Core vs supporting (above).
6. Whether a breach touches the invoice. No credit-note or claim flow was described, so Invoicing
   is untouched.
7. Whether reefers change load planning — mixed with dry cargo, or separate capacity. Not stated,
   so Consolidation is untouched.

Questions 1 and 2 are the blocking pair: without them the aggregate has a required range nobody
sets and a span nobody opens. Question 4 is the expensive one.

## Delta discipline

- **Preserved verbatim:** Consolidation's Gothenburg whiteboard note, Customs' "we integrate with
  neither", Invoicing's eleven-years note, Booking's synchronous capacity-check note, Routing's
  rationale, and the March classification note on the context map. No status or owner touched —
  everything stays `draft` / `TBD`.
- **Modified:** `context-map.md` (map, classification, shared artifacts, conflicts, open questions,
  changelog) and `notifications/model.yaml` (one relationship line).
- **Created:** `cold-chain/model.yaml`, plus the missing `INDEX.md`.
- **Deleted:** nothing.

Two housekeeping notes. `ColdChain` has no `mass:` block because nothing is built yet to measure.
No per-context `README.md` was created — no context in this repo has one, and adding one only for
the new context would make the tree inconsistent; say the word and all eight get one.

The model is a draft to argue with, not a verdict. Boundaries move.
