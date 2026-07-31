---
id: PRD-XXXX
title: <product / bounded-context name> — Vision
status: draft
owner: TBD
date: <yyyy-mm-dd>
---

# <product / bounded-context name> — Product Vision

> **L1 vision map — keep it coarse.** This is the north star: stable, long-lived, hand-drawn. It
> fixes *what this is and how the parts connect*, not how they are built. Detail flows down to RFCs
> and schema ADRs; sequencing lives in the ungoverned `docs/ROADMAP.md`. Do **not** deepen this into
> aggregates — that is the L3 layer, and it collapses the altitude ladder. A thin dated map beats a
> full stale one. Delete these quote blocks when you fill the section.

## Target

> One sentence: what the product/context is when done, for whom. Cite the source (a research doc, a
> pitch, a prior RFC) — do not invent the thesis.

## Scope

> - **In:** the capabilities below.
> - **Out / upstream:** what is deliberately outside this model boundary (a supplier context, a
>   deferred domain), and why.

## Capability map

> Working hypothesis. Each row is a *candidate* capability with a **stable id** (`C1`, `C2`, …) that
> never gets renumbered. Whether these are the right bounded contexts is validated later by
> `3-decompose` against mined behaviour + language — flag it in Open questions, do not assert it.

| id | Capability | Source | Tier (core / supporting / generic) |
|----|-----------|--------|------------------------------------|
| C1 | <name> | <where it comes from> | <proposed tier — the owner ratifies> |

## How they connect

> The coarse flow between capabilities (the value loop). Two or three sentences — no aggregate
> detail.

## Not in this doc (by altitude)

> - **Roadmap** (volatile): which slice ships next, in what order → lives in `docs/ROADMAP.md`.
> - **Depth**: aggregates / tables → live in per-slice RFCs and schema ADRs, one altitude below.

## Assumptions & open questions

> - **A1 (to validate):** the capability→bounded-context cut above is a working hypothesis, not
>   proven against behaviour/language. `3-decompose` tests and may re-cut it.
> - **First slice to deepen:** <the grounding-ready capability> — chosen by grounding-readiness
>   (≥1 confirmed event + ≥1 stated rule), not by size.
