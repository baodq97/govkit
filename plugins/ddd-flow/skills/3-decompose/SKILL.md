---
name: 3-decompose
description: Draw or move bounded-context boundaries and author each context's model.yaml in the ddd-flow modelling loop. Use whenever a domain has confirmed discovery (events/rules) and needs cutting into bounded contexts, deciding what each context owns, or revising an existing context-map — invoked by ddd-flow:design or directly when decomposing a modelled domain. This is the ONLY step that draws a boundary; not for initial event discovery (that is 2-discover).
paths: docs/domain/**
---

# Decompose — where are the boundaries, and what does each context own?

You already know DDD boundary-finding, aggregate discovery, and context mapping. This skill does
**not** re-teach that — it gives only what a strong model gets wrong by default here, plus the exact
output contract the gate parses.

## Step 0 — load the law
Read **`../../references/RULES.md`** (the shared ddd-flow rules). The **Grounding**, **Boundaries**,
and **Right-size** sections govern this step. They are the rules, not the method — do not proceed
without them.

## Consumes → produces
- **Read:** `docs/domain/discovery/` (`model.json` = the confirmed/candidate event store — your
  grounding source) and `business-model.md`.
- **Write:** `docs/domain/context-map.md` and one `docs/domain/<context>/model.yaml` per grounded context.

## Output contract (what the gate parses — obey exactly)
Author every `model.yaml` to the schema in **`../../references/model.template.yaml`**. It is
single-sourced with `ddd_check`, so match it field-for-field (`aggregates[].invariants`; a `notes:`
line on an empty `aggregates: []`; valid YAML — no bare `: ` inside a multi-line scalar). Artifact
shapes and line budgets: **`../../references/artifact-shapes.md`**.

## The one rule most often broken (echoed for salience; full set in RULES.md)
**Boundaries come only from confirmed events.** A noun cluster with 0 confirmed events and no
business invariant (ownership, audit, permissions) is a *capability* of another context — decline
it and record the escalation condition, never manufacture a context to fill the map. If the slice
has 0 confirmed events/rules or is below the grounding ratio, STOP and go back to `2-discover`.

## Done
Run `ddd_check` (grounding + structure gate); resolve blocking gaps; keep `open_questions`
populated honestly. Never promote your own inference to a confirmed event — hand it to `2-discover`;
only a human flips candidate → confirmed.
