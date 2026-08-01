---
name: 6-organise
description: Propose which team owns which bounded context, at what cognitive load, and how each pair of teams interacts, in the ddd-flow modelling loop. Use whenever a decomposed domain needs team ownership assigned, cognitive load budgeted, or interaction modes derived — invoked by ddd-flow:design or directly when organising a modelled domain. Produces a team shape, not a staffing plan; not for drawing boundaries (that is 3-decompose).
paths: docs/domain/**
---

# Organise — which team owns which context, and at what cognitive load?

You already know Team Topologies, cognitive-load budgeting, and the Independent Service Heuristics.
This skill does **not** re-teach that — it gives only what a strong model gets wrong by default
here, plus the exact output contract the gate parses.

## Step 0 — load the law
Read **`../../references/RULES.md`** (the shared ddd-flow rules). The **Right-size**, **Honesty**,
and **Boundaries** sections govern this step, plus **Grounding**'s *derive, don't invent* (interaction
modes come off the flows). They are the rules, not the method — do not proceed without them.

## Consumes → produces
- **Read:** `docs/domain/*/model.yaml` (contexts, `subdomain_type`, model mass), `core-domain-chart.md`
  (which contexts earn a long-lived team), and `message-flows/` (which pairs actually talk — read
  interaction modes off these). The org's real shape — engineers, existing teams, what each knows —
  is not in the repo: ask before drawing.
- **Write:** `docs/domain/team-topology.md`.

## Output contract (what the gate parses — obey exactly)
`ddd_check` check 9 (`unowned-context`, HIGH) requires **every** context name in `*/model.yaml` to
appear somewhere in `team-topology.md` (matched on letters+digits, so `ParkingGuidance` == "Parking
Guidance"). Budget 150 lines. Full artifact shape: **`../../references/artifact-shapes.md`**.

## The one rule most often broken (echoed for salience; full set in RULES.md)
**Propose no more teams than the org can actually staff.** Count engineers, existing teams, and
contexts *first*, then divide — twelve contexts and eight engineers is two or three teams owning
several contexts each, not twelve teams. If the counts are unknown, say so and mark every ownership
row `proposed — unstaffed`: a topology drawn without headcount is a template for a company that does
not exist, not a proposal.

## Done
Run `ddd_check` (unowned-context + budget gate); resolve blocking gaps; keep `open_questions`
populated honestly. Don't redraw a boundary here — a topology that cannot work with the current
contexts is a finding for `3-decompose`/`4-connect`, with the evidence attached; never edit
`model.yaml`.
