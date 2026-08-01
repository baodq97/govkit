---
name: 4-connect
description: >
  Trace real business use cases as message flows across the bounded contexts to surface hidden
  coupling, in the ddd-flow modelling loop. Use whenever a domain has an initial cut (contexts +
  events) and you need to test whether concrete scenarios cross those boundaries cleanly, or to
  re-check flows after a boundary moved — invoked by ddd-flow:design or directly. Also use when one
  rule or invariant appears to span two contexts and the flow must be traced before anyone decides
  where it belongs — a distributed invariant is this step's finding to produce. Needs a cut to
  refute; not a discovery technique (that is 2-discover), and it never redraws a boundary itself
  (it hands 3-decompose the evidence).
paths: docs/domain/**
---

# Connect — do real use cases flow across these boundaries without hidden coupling?

You already know message-flow notation, message typing, and the coupling smell catalogue. This
skill does **not** re-teach that — it gives only what a strong model gets wrong by default here,
plus the exact output contract the gate parses.

## Step 0 — load the law
Read **`../../references/RULES.md`** (the shared ddd-flow rules). The **Grounding**, **Boundaries**,
and **Honesty** sections govern this step. They are the rules, not the method — do not proceed
without them.

## Consumes → produces
- **Read:** `docs/domain/` (the contexts and the events each emits — the design under test) and
  `docs/domain/discovery/` (the confirmed timeline; a flow built from context names alone is
  speculation). No `docs/domain/`? Say so — there is no cut to refute, `3-decompose` runs first.
- **Write:** one `docs/domain/message-flows/<scenario>.md` per traced use case, plus a `README.md`
  index that collects every finding in one place.

## Output contract (what the gate parses — obey exactly)
Author every flow file to the shape in **`../../references/artifact-shapes.md`**: ≤9 numbered
message rows (`flow-overflow`), a message table carrying a `Message` and a `To` column, and — when
the scenario prose states a `within/after/every` rule — a `When` column with that rule on the row it
belongs to (`temporal-rule-in-prose`). `status: draft`, `owner: TBD`.

## Which flows to trace
Trace **three**, not the backlog, and pick them by role rather than by taste: the **happy path**
(the design's own story — if this one is ugly nothing else will be better), the **path with money on
it** (what the business is actually paid for, so coupling here has a price), and the **failure path**
(rejection, cancellation, refusal — models are built happy-path-first, so this is where the missing
messages live). A fourth only for a known hotspot: something discovery flagged, or that the team
already argues about.

## The one rule most often broken (echoed for salience; full set in RULES.md)
**Type every message** — event, command, or query. An undifferentiated arrow hides exactly the
coupling this step exists to surface: a synchronous query chain and a broadcast fact read identical
until they are typed, and a flow of generic arrows passes the structural gate while proving nothing.

## Done
Run `ddd_check` (flow-overflow + temporal-rule gate); resolve blocking gaps; keep `open_questions`
honest and record a clean flow as the real result it is. Where a flow refutes the cut (>9 messages,
or one context at every step), hand a **proposed** change with its message-number evidence to
`3-decompose` — never redraw the boundary here.
