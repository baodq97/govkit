---
id: DOMAIN-CS-0001
title: Euro Parking — code structure contract
status: draft
owner: TBD
date: 2026-07-27
mode: code
---

# Code structure — what has to be true of the code for this model to survive

Design, not implementation: the structural contract handed to `data-model`, `api-designer` and the
implementer. Rules, not a framework — **no persistence technology has been chosen** and nothing here
should depend on that choice.

## 1. Layering — dependencies point inward

| Layer | Holds | May depend on | Never depends on |
|---|---|---|---|
| Domain | `ParkingVisit`, `Terminal`, `OfflineExitLog`, `DailyReconciliation`, their value objects and events, ports | nothing outside itself | ORM, HTTP, message bus, card reader, barrier driver, clock |
| Application | command handlers, transaction boundaries, the policies in `event-model/README.md` | domain | transport specifics |
| Adapters | repositories, terminal hardware drivers, the GuidanceIntegration and PaymentCapture ACLs, the Tariff client | domain + application | — |

Test: **the domain layer must be unit-testable with no database, no HTTP, no terminal and no
network.** Here that has teeth — the offline exit rule (`Terminal` I1) is a pure decision over
`{connectivityState, stripe.paidFlag}` and must be provable without a barrier.

**Time is a domain concept here, not a utility.** The 15-minute window, the business date, the 7-day
plate deletion and the per-country retention period are stated rules, so `now()` inside an aggregate
makes every one untestable: **inject the clock**, and treat the business date's cut-over as a domain
value nobody has specified (`RevenueReconciliation` assumptions).

## 2. Aggregate rules that must show up in the code

- **Reference other aggregates by id only.** `DailyReconciliation` holds an `exitReference`, not an
  `OfflineExitEntry`; `ParkingVisit` holds a `siteId`, never a `Site` object.
- **One transaction per aggregate.** Between them: an event and eventual consistency **with a named
  corrective policy**. Where no policy is named — `ParkingVisit` C4/C5, `Terminal` C2/C3,
  `OfflineExitLog` C2/C3/C4, `DailyReconciliation` C2/C3 — **the code must not invent one.** Nine
  open repair paths is the model's real state; hiding them in a retry loop makes them undiscoverable.
- **The one atomicity decision is open** (F8): the barrier and the offline journal.
  `OfflineExitLog.md` §1 records options A and B and the business input still missing — do not settle
  it in a transaction annotation.
- **The root guards the boundary**; `ExceptionItem` and `OfflineExitEntry` are never loaded directly.
  **Repository per aggregate root** — four, not one per entity, and none for the six contexts in §4.
- **Invariants live inside the aggregate.** Of twelve across four canvases, exactly **two** are
  expressible in a schema (§3); a constraint the domain layer does not know about will be violated
  by the domain layer.
- **Commands return the outcome, including rejection.** `EntryRefused` and `ExitRefused` are domain
  results, not transport exceptions. `ExitRefused` carries two different refusals under one name
  (D-2) — keep the reason a domain value, not a string.

## 3. What `data-model` can enforce, and what it cannot

| Invariant | Where it is enforced |
|---|---|
| Spot identifier unique within a site (`INPUT.md` §3) | **schema** — unique index; SiteConfiguration, no aggregate |
| One reconciliation per (siteId, businessDate) | **schema** — unique key |
| The five `ParkingVisit` rules (window · per started 15 min · higher-of-two-rates · truck never in a car bay · paid-is-the-truth) and the three `Terminal` barrier rules (open offline on a paid stripe · return an unpaid card · keep the card) | **aggregate only** — every one is read-then-decide or spans rows |
| Offline exit logged and uploaded | **aggregate + edge storage**; not a constraint |
| Unmatched exit flagged; mismatch listed | **aggregate only** — joins over late-arriving facts from other contexts |

Two of twelve. `data-model` must not assume the others are handled elsewhere: an invariant each layer
believes the other holds is held by neither.

**Three storage requirements the domain states before any technology is chosen:** `OfflineExitLog`
and the rate card must be durable **on the terminal** and usable while the centre is unreachable; the
fiscal record is **append-only with a per-country retention parameter** (never a hard-coded ten
years); plate records must be **deleted at seven days** — a deletion capability, not a flag.

## 4. Contexts that get no domain model — and must not grow one

| Context | Pattern | Rule for the code |
|---|---|---|
| Tariff | transaction script | a rate card plus one pricing function. H15 (a stay crossing a rate change) is the only thing that would force a real, effective-dated aggregate |
| SiteConfiguration | CRUD / master data | **no aggregate, no repository per entity, no domain events beyond the change notice.** Publishes topology and the `VehicleClass` vocabulary as a versioned enumeration — not a shared kernel across the five contexts that use it |
| VehicleIdentification | transaction script | a supplier lookup, a comparison, a deletion timer |
| FiscalRecord | append-only store | one writer, fixed content, a retention parameter |
| OccupancyInsight | projection | a read model over other contexts' events. The chart's instruction is explicit: build thin, **do not architect it** |
| GuidanceIntegration · PaymentCapture | bought adapters | ACL only, so three guidance suppliers sit behind one internal contract. No domain types cross the ACL in either direction |

## 5. Language fidelity — the five traps this domain sets

The language must show in class, method, event and test names. Five terms are **polysemic — keep both, qualified, never one shared class:**

| Term | In one context | In another |
|---|---|---|
| `AssignedSpot` | a **bay** in a garage — sensed, assignable, released | an **area** in a lot — nothing held, nothing released |
| Paid | the system's record; the truth (`ParkingVisit`) | the stripe's copy, which wins offline (`Terminal`) |
| Full | no bay at all → no ticket (site) | no bay of that class → admitted and substituted (class) |
| Daily cap | the most a class pays in a day (`Tariff`) | the flat charge for a lost ticket (`ParkingVisit`) |
| `Ticket` | the brief's word: one per stay | `Card` — plastic serving ~100 stays. A class named `Ticket` re-imports the confusion H13 is about |

The words nobody used — *reservation, booking, subscription, season ticket, refund, cancellation,
customer account* — **must not appear in the code**, per `ubiquitous-language.md`. A `refund` method
would create a concept the business does not have (H9 is the question, not the answer).

## 6. Tests as the model's evidence

Right-sized: the four canvassed aggregates get tests stating each rule in the business's own words; §4's six contexts do not.

- The concurrency cases the throughput sections flagged: a late `VehicleClassMismatchDetected`
  arriving during payment (`ParkingVisit`), a `TariffChanged` push arriving with a driver command
  (`Terminal`), a late upload landing on a settled day (`DailyReconciliation`).
- The rejection paths, where the model breaks: *"refuses a truck when the truck bays are full"*,
  *"refuses a card presented more than fifteen minutes after payment"*, *"opens the barrier when the
  system is unreachable and the stripe says paid"*.
- **No test may assert a corrective policy nobody stated** — one for a log that loses an exit would
  invent the business's answer.

## 7. What each consumer takes

| Consumer | Takes | Does not take |
|---|---|---|
| `data-model` | four aggregates, their entities and value objects, the identity scheme **once H13 is answered**, and §3's enforceable/not table | the six named corrective policies (code), the nine unnamed repair paths (open questions) |
| `api-designer` | the handled commands and the two queries as the public surface; `TicketPaid`, `VehicleExited`, `OfflineExitLogUploaded`, `TakingsReconciled` as published events | `SpotWrittenToStripe`, `PaidStatusWrittenToStripe`, `CardCollected` — hardware acknowledgements; `ClaimSentToPlateHolder` while it carries a plate (H7) |
| implementer | the four canvases, §1–§6, and the ⛔ list in `event-model/README.md` | anything not written down — eleven of thirty slices are not specified, and an unwritten decision gets re-made, differently |

**Do not start with `ParkingVisit`** (F7): its commands cannot address their own aggregate until H13
is answered. The buildable spine today is EM-01 → EM-02 → EM-03 → EM-09 → EM-18/19, on a provisional identity.
