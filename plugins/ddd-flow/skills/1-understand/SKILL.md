---
name: 1-understand
disable-model-invocation: true
paths: docs/domain/**
description: >
  DDD step 1 — business model canvas, story map, differentiation inputs. Writes docs/domain/business-model.md.
---

# Domain Understand

## Hard rules

- **Number the open questions `Q1`, `Q2`, … and never renumber them.** Every later step cites
  them — a context map saying "classification rests on Q10" is how a reader finds out the label
  was argued, not sourced. An unnumbered list is unciteable, so the traceability disappears
  even though the words are still on the page.
- **Length budget: `business-model.md` ≤ 150 lines.** A budget caps prose, not findings: over it,
  cut rationale a reader can infer and anything restated from an upstream artifact — never open
  questions, provenance, or a stated absence.
- **Never invent a business model.** If nobody said what the revenue stream is, the block stays
  empty and becomes an open question. A plausible-sounding canvas is worse than a sparse one,
  because the next three skills will build on it without knowing it was fiction.
- **Record provenance per block** — interview (who, when) or document (which file). Six months
  later, nobody can tell a sourced claim from a generated one unless you wrote it down.
- **`unknown` is a valid answer** for evolution stage, differentiation and any horizon. Forcing a
  value here is how a commodity gets classified as core.
- **Do not classify contexts.** That is `3-decompose`'s job; this skill supplies the inputs.
  Naming bounded contexts here pre-empts a decision that needs the discovery step first.
- Fresh docs start `status: draft`, `owner: TBD`. Setting status is a human act.

> *"Every decision we take regarding the architecture, the code, or the organisation has business
> and user consequences."* — ddd-crew, Understand

Boundaries drawn without a business model are guesses dressed as architecture. This skill produces
the evidence that makes the next steps honest: **who the organisation serves, what it sells, what
differentiates it, and what the users are actually trying to get done**.

The payoff is concrete and downstream. `3-decompose` has to classify every context as
core / supporting / generic. Without this step that classification is intuition — and when it is
wrong, the team spends its best modelling effort on a commodity while the real differentiator
gets CRUD.

## Inputs

Whatever the organisation has already written: a PRD, a product overview, a pitch deck, a README,
an "about us" page, OKRs, a pricing page. Plus, ideally, **people** — see *Who to involve*.

Nothing written and nobody available yet? Say so plainly and run INTERVIEW mode with whoever *is*
available, marking every unanswered area as an open question. A canvas with honest holes beats a
complete one you filled in yourself.

## Mode detection — do this first

| Signal | Mode |
|---|---|
| No repo, or a repo with no product/business docs | **INTERVIEW** — ask from scratch |
| Repo has PRDs, product overview, README, ADRs, pricing, OKRs | **DISCOVER** — mine first, then interview only the gaps |
| `docs/domain/business-model.md` already exists | **UPDATE** — read it, merge a delta, preserve human edits |

In DISCOVER mode, the grounding pass is not optional. Asking a busy stakeholder something their
own README already answers is the fastest way to lose the room, and it is the failure this skill
most needs to avoid.

## Reference files (read as needed)

- `references/business-model-canvas.md` — the nine blocks, what each one asks, how to fill it
  from evidence rather than assumption. Read before writing the canvas.
- `references/user-story-mapping.md` — backbone → activities → tasks → releases; how to build the
  map and what it tells you that a backlog cannot.
- `references/strategic-lenses.md` — Impact Mapping, Product Strategy Canvas, Wardley Mapping.
  Read when the question is *why* a goal matters, or *how evolved* a capability is.
- `references/interview-guide.md` — how to run the conversation: one question at a time, concrete
  scenarios over abstractions, and when to stop.

## Who to involve

State this to the user explicitly at the start — the skill cannot substitute for these people,
and pretending otherwise produces a confident, wrong canvas:

- people who design, build and test the software
- people who have domain knowledge
- people who understand the product and business strategy
- **real end users — not only their representatives inside the organisation**

That last one is the one organisations skip. If only internal proxies are available, record it as
a stated limitation on the canvas rather than letting proxy opinion pass as user evidence.

## Process

### 1. Ground (DISCOVER mode) or frame (INTERVIEW mode)

DISCOVER: read what exists and draft a **provisional** canvas from it, tagging every block with
its source. Blocks you cannot source stay empty — an empty block is a question, and questions are
the output of this step.

INTERVIEW: start from the single most clarifying question — *"Who pays you, and for what?"* —
and let the canvas assemble from the answers.

### 2. Business Model Canvas

Fill the nine blocks (see the reference). The three that most change a decomposition:

- **Value propositions** — what the organisation is actually selling. Contexts that deliver this
  are core candidates.
- **Customer segments** — who it serves. Two segments with genuinely different needs often mean
  two contexts, not one with a flag.
- **Revenue streams** — what people pay for. A capability nobody pays for and nobody stays for is
  a supporting or generic candidate, whatever its table count.

### 3. User Story Map

Build the backbone (the sequence of things a user does), then the activities and tasks beneath it.
The map answers a question the canvas cannot: **what does the user do, in what order, and where
does it hurt today**. Mark pain points — they concentrate where the current boundaries are wrong.

### 4. Goals over three horizons

Record short, medium and long-term goals separately. This matters because it changes what counts
as a good boundary: a context that is generic today but strategic in the 18-month plan should not
be outsourced this quarter. Where a horizon is unknown, say unknown.

### 5. Strategic classification inputs

For each capability the canvas and map surfaced, record what `3-decompose` will need:

| Field | Question | Values |
|---|---|---|
| `business_role` | Why does this exist commercially? | revenue-generator · engagement-creator · compliance-enforcer · cost-reduction |
| `evolution_stage` | How evolved is this capability? | genesis · custom-built · product · commodity |
| `differentiation` | Would a competitor beating us here cost us customers? | yes / no / unknown |

These are the three inputs that turn "core / supporting / generic" from a hunch into a judgement
with evidence behind it. `unknown` is a legitimate value and far more useful than a guess.

### 6. Emit

Write `docs/domain/business-model.md` (see the output shape below), `status: draft`,
`owner: TBD`. Close with the open questions — the blocks nobody could answer, and who would need
to be in the room to answer them.

## Output shape

The exact output contract is in `references/output-template.md` — read it before emitting.

## Worked example

A full worked run is in `references/worked-example.md` — read it when the shape of the output is unclear.
