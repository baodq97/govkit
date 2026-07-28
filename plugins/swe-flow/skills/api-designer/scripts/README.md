# `derive_cel.py` — the derivation half of API design

Stepwise Service Design (Design Practice Repository) puts three steps in this order, and the order
is the point:

| Step | Output |
|---|---|
| 4 | a **Candidate Endpoint List** — potential endpoints and their roles |
| 5 | a **Refined Endpoint List** — operation responsibilities and data formats |
| 6 | integration technology chosen, *then* the service contract specified |

The CEL is a TABLE reviewed before any YAML exists. Open the spec editor first and REST resources
end up defining the bounded contexts instead of the other way round.

Almost every column of that table is already on disk. `docs/domain/message-flows/*.md` says who
sends what to whom and of which kind; `docs/domain/<ctx>/model.yaml` says which aggregate roots
exist, which invariants they protect, how each relationship is governed, and what is published. A
model that re-reads that markdown to produce a table is doing arithmetic — slowly, and differently
each run. This script does the arithmetic. The model does the judgement.

```bash
python3 scripts/derive_cel.py --root <repo>              # markdown table (default)
python3 scripts/derive_cel.py --root <repo> --json       # for a downstream step
python3 scripts/derive_cel.py --docs <dir>               # when docs/domain lives elsewhere
```

Stdlib only, no network, no LLM. PyYAML is used when installed and the run says so loudly when it
is not (the fallback parser cannot see nested fields, so both filters below go blind — that is
reported as *unknown*, never as *empty*). Exit 0 when the tree was read, 2 when it holds no
bounded context.

## What is derived

| Column | From | Rule |
|---|---|---|
| Endpoint candidate | `aggregates[].root` | aggregate root → collection resource (`ParkingVisit` → `/parking-visits`). No aggregate: the message name, flagged as such in `basis`. |
| Owning context | `model.yaml` | a **command** or **query** is served by its receiver; an **event** is published by its emitter |
| Roles | `relationships[].our_roles` / `their_roles` | the edge to the context at the other end of that message; `*` marks a fallback to the context's roles overall, when the other end is an actor or a device |
| Method hint | message `Type` | `command`→`POST`, `query`→`GET`, `event`→`webhook` |
| Operation responsibility | type + invariants | creating command → **State Creation**; other command → **State Transition** (matched invariants ride along in `--json`); query → **Retrieval**, or **Computation** when the answering context keeps no state to retrieve |
| Source | flow id + message number | **required** — a row without one is not written |
| Public? | — | left blank; this is the human's decision |

A row is one distinct `(context, endpoint, method, message)`; the same message traced in three
flows is one candidate carrying three sources.

## The two filters, which are why this is a script

**A context only gets a contract if it holds a provider role** — `open-host`, `published-language`,
`supplier`, `partnership` in its own `our_roles`. Everything else is listed under *Not eligible*
**with its reason**: a Conformist accepts the upstream's model and designs nothing, a Shared Kernel
is shared code rather than an API, Separate Ways has no API at all, an ACL is a translation its
owner keeps private, and the customer of a Customer/Supplier pair negotiates someone else's
contract rather than publishing its own.

Nothing is dropped. Messages owned by an ineligible context are **parked** — printed in full, with
sources — because a silent cap reads as coverage. On euro-parking the filter cuts 10 contexts to 5.

**Only elements marked `exposed_to_api: true` become schema components.** EuroPLoP'21 §5.2 names
the failure this closes: an API facade whose exposed subset was never designated, only implied.
Choosing what to publish is a Published Language decision made in the domain artifact, so this
script reads that flag and never widens it.

## Reading the coverage block

```
- 38 message rows parsed → 21 distinct (from, type, to) triples → 32 candidate endpoints
- eligible table covers 15/21 triples (71.4%); with parked rows, 21/21 (100.0%)
- rows with an empty source: 0
```

The gap between the two percentages is a finding, not an error: it is exactly the traffic the
domain model says nobody publishes. On euro-parking the six uncovered triples include a Site
Manager driving `RevenueReconciliation` — a context that receives commands while declaring no
provider role toward anyone. Either the model is missing an `open-host` role, or that traffic is a
UI and not an API. The table asks; it does not decide.

`aggregate roots with no traced message` is the mirror finding: an aggregate that no flow reaches
gets no row, because a row needs a source. That is a gap in the flows, to be fixed by tracing one —
not by inventing an endpoint here.
