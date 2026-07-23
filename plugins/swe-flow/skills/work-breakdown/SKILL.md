---
name: work-breakdown
description: >-
  Use to split a large piece of work into small, independently shippable slices before writing
  any doc or code. Trigger when a task feels too big to finish in one sitting, when a user story
  is really several, when the title contains "and", or when you are about to open one giant
  issue. It teaches vertical slicing (a thin end-to-end cut, not a horizontal layer), an XS-to-XL
  sizing ladder where XL means "break it down further", four break triggers, and how to record
  the order work must happen in when one slice depends on another. Atomic and dependency-free —
  it calls no other skill.
---

# Work Breakdown

Big work fails at integration, not at the keyboard. Break it into slices that each ship
something real and can be verified on their own.

## Vertical slices over horizontal layers

Cut top-to-bottom through the stack, not layer-by-layer. Each slice delivers a thin but complete
behaviour a user or a gate can observe.

**Bad (horizontal — nothing works until the last slice):**
- Slice 1: all the database tables
- Slice 2: all the API endpoints
- Slice 3: all the UI

Nothing is demonstrable until slice 3; the first two cannot be verified end to end.

**Good (vertical — every slice is demonstrable):**
- Slice 1: create-one-record — its table column, its endpoint, its form, its test
- Slice 2: list records — the query, the endpoint, the list view, its test
- Slice 3: delete a record — the same thin cut

Each good slice can be shipped, reviewed, and closed on its own evidence.

## Sizing ladder

| Size | Rule of thumb | Action |
|---|---|---|
| XS | one function / one field, minutes | fold into a larger slice |
| S | one behaviour, < half a day | ship as one slice |
| M | a few behaviours, ~a day | ship as one slice; name the ACs |
| L | multiple behaviours, multi-day | prefer to split; split if any break trigger fires |
| XL | can't hold it all in your head | **must break down** — never start an XL as one unit |

## Four break triggers

Split the moment any of these is true:

1. **The task title contains "and".** "Import and validate and notify" is three slices wearing
   one title.
2. **Two acceptance criteria need different verification.** Different proofs mean different
   slices.
3. **It crosses more than one boundary** (two services, two packages, schema + UI) — each side
   is its own cut.
4. **You cannot demo it in one sitting.** If there is no point where you can show it working, it
   is too big.

## Ordering and blocking edges

When one slice must land before another, say so and order the backlog accordingly — "US-B cannot
start until US-A ships its migration". govkit has no `blockedBy` reference field today (the schema
resolves `parent` only), so do NOT invent a front-matter key: model the dependency in the
user-story body text, as a `Blocked by: US-A (needs its schema change)` line the reader and the
sequencer can act on. Keep the edges few — a slice blocked by three others is usually mis-cut;
re-slice so each stands on a single upstream dependency at most.
