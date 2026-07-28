# Quoting bounded context

> Canvas v5. **Right-sizing:** typed **core** (model header; `model.yaml:2`) → full canvas plus
> interface critique. Written fresh: `3-decompose` left no README, so nothing to delta-merge.

## Purpose

Tell a customer what Nordic Freight will charge to move a given volume on a given lane, and how long
that price stands, so the customer can decide before anything is booked.

Key actors: the exporter asking for a price; the depot/commercial staff who answer. **No customer or
customer-facing role took part in discovery** (`discovery/timeline.md:12` — "No customer present") —
for the model's designated engagement-creator, the largest gap on this canvas.

## Strategic classification

| Facet | Value | Source |
|---|---|---|
| Domain type | core | model header, Contexts table; `quoting/model.yaml:2`. **`core-domain-chart.md` does not exist in this repo** — the classification has no `5-strategize` artifact behind it |
| Business-model role | engagement creator | `business-model.md`, capability table (model header) |
| Evolution | product | `business-model.md` (model header) |
| Differentiating | **partial** | `business-model.md` (model header) |

Flagged, not edited: **core** against only *partial* differentiation at *product* evolution is a
tension for `5-strategize`.

## Domain roles

**Draft context** — a Quote is a not-yet-real commitment held until the customer acts on it or it
expires. That is the whole shape of the aggregate (`quoteId, customerId, laneId, validUntil`).

A **pricing/calculation** role is implied by the name and by `QuoteIssued.price`, yet no rate,
tariff, or lane-price element exists anywhere in this context — the role is either real and
undeclared, or it lives elsewhere. No Brain-Context signature: outbound is events only, no commands.

## Inbound communication

_Nothing on disk._ `docs/domain/message-flows/` does not exist, so no inbound collaboration is
traced — including the customer's original ask, the one message this context exists to serve.
Missing step: trace the flows. Candidates sit under **Assumptions**, labelled inferred.

## Outbound communication

Both messages are confirmed as *emitted by Quoting* (`discovery/timeline.md:18-19`, confirmed by a
planner); their **consumers are untraced**, so the collaborator and relationship columns cannot be
filled from evidence.

| Collaborator | Collaborator type | Message | Type | Relationship |
|---|---|---|---|---|
| untraced | — | `QuoteRequested` (customerId, laneId, volumeM3) | event | untraced |
| untraced | — | `QuoteIssued` (quoteId, price, validUntil) | event | untraced |

One declared relationship carries no message: `Quoting → Booking, upstream` (`model.yaml:16`) —
direction declared, pattern (customer/supplier, published language, …) not.

No swimlane is drawn: with no inbound message there is no *in → decision → out* lane, which itself
says this context's decisions are undocumented.

## Ubiquitous language

| Term | Meaning in THIS context | Differs elsewhere? |
|---|---|---|
| Quote | A priced offer for one lane and one volume, carrying its own expiry (`validUntil`) | not modelled elsewhere |
| Validity window | The period during which the offer stands; the term appears only in this context's invariant | unknown — no discovery element defines it |
| Lane | `laneId` is modelled but undefined; Routing is the neighbour that would own the concept | likely — Routing is untraced against it |
| Volume (m³) | The quantity a price is quoted against (`volumeM3`) | Consolidation reasons about container capacity in volume too — same unit, unverified as the same concept |
| Premium (Guaranteed Consolidation) | Named in discovery as something charged; **absent from this context's model** | yes — the charging rule is stated by finance |
| Consignment | **Does not appear here.** Contested model-wide: a billable line (finance) vs a physical stack of pallets (operations) — model header, hotspot 2 | yes, contested |

## Business decisions

**None stated for this context.** No rule in `discovery/timeline.md:30-36` was attributed to Quoting
by anyone in the room. The nearest is adjacent and owned elsewhere:

- *"The premium is charged whether or not the container ends up full"* — finance analyst
  (`discovery/timeline.md:36`). This is a **charging** rule (Invoicing). It presupposes that someone
  set a premium price; nobody said who.

The context's only declared invariant — *"A quote cannot be accepted after its validity window"*
(`model.yaml:14`) — has no speaker in discovery, so it is not a business decision; it moves verbatim
into Assumptions where it can be knocked down.

## Quality attributes

Nothing was elicited here; each row is an unanswered prompt with someone who could answer it.
`unknown` is recorded deliberately in place of an invented SLA.

| Attribute | Requirement | Number | Source | Changes the model? |
|---|---|---|---|---|
| Latency | The customer is waiting for a price — how long before they go elsewhere? | unknown | nobody: no customer was in the room | **yes** if a pre-computed price is needed — that forces a stated staleness rule |
| Auditability | Must Nordic prove what price was offered on a past date, and for how long? | unknown | finance analyst could supply | **yes** — would make quote history first-class, not a log |
| Consistency | Is an issued price frozen if the underlying cost changes inside the validity window? | unknown | finance analyst / planner | **yes** — decides whether Quote is immutable after issue |
| Availability | Can a quote be issued while Consolidation or Invoicing is down? | unknown | planner | **yes** — a "no" forbids a synchronous dependency on either |
| Concurrency | Does issuing a quote hold capacity, so two quotes cannot promise the same slot? | unknown | planner — bears directly on hotspot 1 | **yes** — would be an invariant, and an aggregate boundary |
| Volume / growth | Quotes issued per week today and in two years | unknown | planner | no |

## Assumptions

Domain assumptions (all **inferred** — none stated by anyone):

- *Inferred:* Quoting itself enforces "a quote cannot be accepted after its validity window"
  (`model.yaml:14`) — despite having no message by which a quote can be accepted.
- *Inferred:* a quote covers exactly one lane and one volume; multi-leg or multi-drop pricing is out
  of scope (from the `QuoteRequested` payload).
- *Inferred:* price is computed inside this boundary, since `QuoteIssued` carries `price` and no
  upstream pricing collaborator is declared.
- *Inferred:* volume in m³, not weight, is what a price is quoted against.
- *Inferred:* the Guaranteed Consolidation premium is priced somewhere other than here, since no
  premium concept exists in this context's model.

Scale / behaviour assumptions:

- *Inferred:* quotes expire silently; nothing chases a customer before `validUntil`, so Notifications
  has no part in this context's lifecycle.
- *Inferred:* the planner's account of how a quote is requested matches what customers actually do —
  the only confirmation on `QuoteRequested` is a planner's (`discovery/timeline.md:18`).

## Verification metrics

| Metric | What it would tell us | Where it comes from |
|---|---|---|
| Fewer than 15% of PRs touching `quoting/` also touch `booking/`, over 3 months from 2026-08-01 | Above it, the quote→booking line is cut in the wrong place and the two are one context | VCS / CI change coupling |
| Count of quotes acted on after `validUntil` = 0 | Above 0, the invariant is not actually enforced here; if the count is 0 *and* no attempt is ever rejected, the invariant is ceremonial and untested | production |
| Re-quotes for the same customer+lane inside an unexpired window, per week | A climbing rate means prices are volatile and the validity window is a fiction the business has not restated | production |
| Lead time for a price-rule change that stays inside `quoting/` | If a price change routinely needs an Invoicing PR too, the premium price lives on the wrong side of the boundary | issue tracker + VCS |

## Open questions

Seven on a core context — this design is not ready to build.

1. Who sets the quote validity window, and how long is it? The rule the model enforces has no speaker.
2. Does Quoting price the Guaranteed Consolidation premium, or does Invoicing? Only the *charging*
   rule was stated (finance analyst).
3. Does issuing a quote reserve capacity in Consolidation? A plausible reading of hotspot 1 — two
   shipments on the same slot, "nobody agrees where the check should have happened" (planner).
4. What is a lane? `laneId` is modelled here; Routing is the likelier owner and no discovery element
   defines the term.
5. If the customer changes the volume, is that the same quote re-priced or a new one?
6. `model.yaml:4` declares 11 tables / 78 attributes / a densest entity of 26 attributes, but the
   modelled aggregate has one entity with four. What are the other ~74 attributes, and are they this
   context's?
7. Who validates the customer-facing half of this context, given no customer attended discovery?

## Interface critique

1. **Coherent names?** `QuoteRequested` / `QuoteIssued` are coherent past-tense facts. But the
   interface has **no message for acceptance or expiry** — the one rule this context claims to
   enforce is about accepting a quote, and no message can carry that. The declared interface and the
   declared invariant do not describe the same context.
2. **Right types?** `QuoteRequested` is modelled as an event emitted *by* Quoting — an announcement
   that someone asked. The customer's ask is a command (`RequestQuote`) and is untraced; a missing
   `AcceptQuote` command is the gap in (1). The event pair is fine; the commands are absent, not wrong.
3. **Too big?** No — the opposite. Two messages is a thin contract for a core context that declares
   11 tables of mass.
4. **Exposing internals?** `QuoteIssued` publishes exactly the two facts the world needs.
   `QuoteRequested` republishes the raw customer ask before any decision exists — a downstream
   consumer of it is acting on intent, not on an outcome.
5. **Belongs elsewhere?** `QuoteRequested` belongs to whoever owns the customer conversation, and no
   such context exists — of seven, the only customer-facing one is Notifications, generic/bought.

**Perturbation 1 — move the validity invariant to Booking**, which would reject an expired quote at
accept time. Gains a pure pricing-and-publishing Quoting with no post-issue lifecycle; costs every
consumer its own expiry check. **Rejected** — but it surfaced finding (1): Quoting cannot enforce the
invariant it declares, because it accepts no message.

**Perturbation 2 — move price computation into Invoicing** (5 aggregates, mass 311, already holds the
money). Gains one home for money; costs the ability to quote a customer while a compliance-enforcer
context is down. **Rejected** — it names the availability constraint the quality table has as unknown.

## Findings for other steps (proposals — not applied here)

- **`3-decompose` / `quoting/model.yaml`:** the sole invariant is unattributed; either source it from
  the business or demote it to an assumption. Add the missing `AcceptQuote` inbound command, or drop
  the invariant. Reconcile the declared mass (78 attributes) against the four modelled.
- **Message-flow tracing:** `docs/domain/message-flows/` is absent for the whole model; both
  interface sections of this canvas are blocked on it.
- **Discovery / `1-understand`:** re-run with a customer or a commercial owner present. The
  engagement-creating capability was described entirely by planners.
- **`5-strategize`:** `core-domain-chart.md` does not exist; the core classification currently rests
  on `model.yaml` alone and sits oddly against *product* evolution and *partial* differentiation.
