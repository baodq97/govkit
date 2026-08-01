---
name: 2-discover
description: Surface a domain's EventStorming timeline, ubiquitous language, and hotspots from what the people who do the work actually say — the discovery step of the ddd-flow modelling loop. Use whenever a domain needs its behaviour discovered before any boundary is drawn: mining PRDs/specs/schemas for candidate events, interviewing for the gaps, or merging a discovery delta — invoked by ddd-flow:design or directly. This is initial event discovery; drawing bounded-context boundaries is 3-decompose.
paths: docs/domain/**
---

# Discover — what actually happens here, in the words of the people who do it?

You already know EventStorming, ubiquitous-language elicitation, and hotspot capture. This skill
does **not** re-teach them — it gives only what a strong model gets wrong by default here, plus the
exact output contract the gate parses.

## Step 0 — load the law
Read **`../../references/RULES.md`** (the shared ddd-flow rules). The **Grounding**, **Honesty**,
and **Right-size** sections govern this step. They are the rules, not the method — do not proceed
without them.

## Consumes → produces
- **Read:** everything already written about the domain — `business-model.md`, PRDs, ADRs, specs,
  schemas, the domain layer — plus any prior `docs/domain/discovery/` (UPDATE mode: merge a delta,
  never overwrite). With no artifacts, INTERVIEW mode elicits from people.
- **Write:** `docs/domain/discovery/` — the event timeline, ubiquitous language, hotspots (stable
  `H1..` ids), and the session/attendance record; drive the live surface via `model.json`.

## Output contract (what the gate parses — obey exactly)
Author every `discovery/*.md` to the shape in **`references/output-template.md`** (this skill's own
template — the exact output contract, including `model.json`). Budget and gate markers:
**`../../references/artifact-shapes.md`** (check 12 caps each `discovery/*.md` at 120 lines; any
`Hnn` cited must be defined here). No `model.yaml` here — boundaries and their schema are `3-decompose`.

## The one rule most often broken (echoed for salience; full set in RULES.md)
**Documented is not discovered.** Every event, term, and rule carries whether a *human* confirmed it
or an *artifact* only implied it: mark everything mined from documents `candidate`, and only a person
flips it to `confirmed`. A run that merely re-read the schemas must not look identical to one that
talked to the business — a timeline that paraphrases a DDL has discovered nothing, however complete
it looks.

## Done
Run `ddd_check` (budget + grounding gate); resolve blocking gaps; keep hotspots (`H1..`, never
renumbered) and `open_questions` populated honestly. Don't resolve a hotspot to keep the wall tidy,
and don't draw boundaries — hand the clustered events to `3-decompose`, which will be only as good
as this discovery was.
