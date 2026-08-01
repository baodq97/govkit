---
name: 7-define
description: Deepen each bounded context into a canvas — purpose, inbound/outbound messages, business decisions, quality attributes, assumptions and open questions — in the ddd-flow modelling loop. Use whenever a domain has drawn contexts (3-decompose ran) and each needs its responsibility, interface, and assumptions made explicit, or an existing canvas needs revising — invoked by ddd-flow:design or directly. This deepens canvases; it does NOT draw or move a boundary (that is 3-decompose).
paths: docs/domain/**
---

# Define — what is each context responsible for, and what is it assuming?

You already know the Bounded Context Canvas, quality storming, and context-mapping relationships.
This skill does **not** re-teach them — it gives only what a strong model gets wrong by default
here, plus the exact output contract the gate parses.

## Step 0 — load the law
Read **`../../references/RULES.md`** (the shared ddd-flow rules). The **Right-size**, **Honesty**,
**Boundaries**, and **Grounding** sections carry this step's `[7]` rules. They are the rules, not
the method — do not proceed without them.

## Consumes → produces
- **Read:** `docs/domain/<context>/` (the first-pass canvas `3-decompose` wrote + `model.yaml` for
  `subdomain_type`), `message-flows/` (the real inbound/outbound messages), `discovery/` (ubiquitous
  language + stated rules, with attribution), and `core-domain-chart.md` (classification — cite it,
  never re-derive).
- **Write:** update each `docs/domain/<context>/README.md` **in place** (delta-merge: preserve human
  edits, keep the id, add the missing sections) — never a parallel document.

## Output contract (what the gate parses — obey exactly)
Fill each canvas to the shape in **`../../references/artifact-shapes.md`**. Check 8 skips a canvas as
a not-yet-deepened sketch below 2 of its three markers — `assumption`, `verification metric`, `open
question` — so include all three to pass clean at define depth. The line budget is per
`subdomain_type` from `model.yaml` (core 180 · supporting 90 · generic/master-data 35).

## The one rule most often broken (echoed for salience; full set in RULES.md)
**Don't canvas every context to the same depth.** Match canvas depth to `subdomain_type` — core
gets the full canvas, generic a bought-adapter stub; core-to-generic depth should be nearer 10:1
than 2:1. Nine identical canvases signal ceremony; two deep + five stubs signal judgement. Say which
you deepened and why the rest got less. A budget caps prose, never findings.

## Done
Run `ddd_check` (canvas-marker + budget gate); resolve blocking gaps; keep `assumptions` and
`open_questions` populated honestly — **beside** the decisions, not instead of them: a core canvas an
engineer cannot build from has failed even with all three markers present. A canvas whose purpose
needs an "and also", or that contradicts `model.yaml`, is a delta for `3-decompose` — write the
finding, never redraw the line yourself.
