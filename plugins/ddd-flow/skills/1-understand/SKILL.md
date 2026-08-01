---
name: 1-understand
description: Capture what the business sells, to whom, and what differentiates it — a Business Model Canvas, story map, and strategic-classification inputs — as the grounding step of the ddd-flow modelling loop. Use whenever a domain needs grounding before any boundary is drawn, or when the business model changed and downstream classification must be revisited — invoked by ddd-flow:design or directly. Writes docs/domain/business-model.md and supplies the inputs 3-decompose and 5-strategize need; it does NOT classify contexts itself.
paths: docs/domain/**
---

# Understand — what does the business sell, to whom, and what differentiates it?

You already know the Business Model Canvas, story mapping, and Wardley/strategic lenses. This skill
does **not** re-teach that — it gives only what a strong model gets wrong by default here, plus the
exact output contract the gate parses.

## Step 0 — load the law
Read **`../../references/RULES.md`** (the shared ddd-flow rules). The **Grounding**, **Right-size**,
and **Honesty** sections govern this step. They are the rules, not the method — do not proceed
without them.

## Consumes → produces
- **Read:** whatever the org already wrote — PRD, product overview, README, pricing page, OKRs —
  and the people who know it (ground first, then interview only the gaps). Nothing written and
  nobody available? Say so plainly and run interview mode, marking each unanswered area as a question.
- **Write:** `docs/domain/business-model.md` (`status: draft`, `owner: TBD`).

## Output contract (what the gate parses — obey exactly)
Author `business-model.md` to the shape and **150-line budget** in
**`../../references/artifact-shapes.md`**. Number open questions `Q1`, `Q2`, … and never renumber
them — every later artifact cites them by id, and a `Qnn` cited downstream with no definition here
trips check 11 (`dangling-reference`). Record provenance per block (interview: who/when · document:
which file).

## The one rule most often broken (echoed for salience; full set in RULES.md)
**Never invent a business model.** A revenue stream, value proposition, or differentiation nobody
stated stays *empty* and becomes a numbered open question — a plausible-sounding canvas is worse
than a sparse one, because the next three steps build on it as fact and a commodity gets classified
as core. `unknown` is a valid, informative answer for any block, evolution stage, or horizon;
forcing a value is the failure.

## Done
Run `ddd_check`; resolve blocking gaps; keep `open_questions` honest — the blocks nobody could
answer, and who would need to be in the room to answer them. Do not classify contexts here — that
is `3-decompose`'s job; this step only supplies the inputs. Setting status is a human act.
