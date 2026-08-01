---
name: design
description: >
  Orchestrate the DDD modelling loop — read repo state with a deterministic script, decide the next
  step against the user's goal instead of following a fixed pipeline, and hand it to the step skill
  that owns it. Use for "let's do DDD", "model this domain properly", "design the domain end to
  end", "what's next in our domain modelling", "resume the domain modelling", "we're adding a new
  business line — how does that fit", "làm DDD cho hệ thống này", "thiết kế domain từ đầu", "tiếp
  theo làm gì". Also trigger when a change lands in an already-modelled domain, or when a model
  exists and nobody knows how much of the process was really done — restarting finished work is the
  failure this prevents.
allowed-tools: Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/*.py *), Skill
---

# DDD Design — control flow for the modelling loop

You already know DDD and how to run a modelling process. This skill does **not** re-teach that — it
gives the repo's state scripts, the one gate that must stop a bad advance, and the routing calls a
strong model gets wrong by default.

## Hard rules

- **Never do a step's work inline.** Each step skill loads `../../references/RULES.md` — grounding,
  provenance, confirmed-vs-candidate, propose-don't-apply. None of it survives paraphrase, so
  summarising a step *instead of invoking it* silently drops every rule the step exists to enforce.
- **Read state before planning.** Every claim about what has been done cites the script's output;
  asking a team which steps they ran gets an optimistic answer.
- **Decide, don't sequence.** Name the step you chose, why, and what you are *not* doing. If the
  goal makes the whole process wrong, say that too.
- **One step per turn, then re-read state.** Three chained unattended produce three artifacts
  resting on assumptions nobody checked — and half these steps are conversations with people a
  skill cannot summon.
- **Never skip discovery silently.** Time-box it; do not replace it with reading documents. With no
  domain expert available, say the model will only be as good as the documents.
- **Record deviations, not just progress.** A log showing only completed steps hides the two
  heuristics that failed and the workshop that had no domain expert in it.
- **Never flip a governed doc's status.** Artifacts land `status: draft`, `owner: TBD`.

## 1. Read state

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_state.py --root . [--json]  # per step: done/partial/missing/STALE, evidence, journal open items, candidate actions
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_check.py --root . [--json]  # cross-artifact findings  (--strict blocks on high; --strict-grounding, --strict-symmetry opt in)
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_state.py --root . --review  # both, printed to stdout as the review payload
```

`ddd_state` answers *what ran*. `ddd_check` answers *what disagrees between files* — a context
labelled `core` whose capability the business model rates non-differentiating, an entity modelled
in two contexts, a flow over the nine-message limit, a canvas missing its falsifiable sections.
Reading files one at a time cannot find those, which is why both run before you propose anything.
Candidate actions are **a list with reasons, not a next step**: which one is right depends on the
goal, and treating the first as an instruction is how the loop turns back into a pipeline.

What counts as evidence is **configuration, not code**: `references/steps.yml` declares each step's
artifact globs, the markers that separate a defined context from a sketched one, the line budgets,
the grounding floor, and the `invalidated_by` back-edges that make a step STALE. `ddd_state.py
--config` points at another file for a repo with different conventions (`ddd_check.py` has no
`--config` — it reads `steps.yml` directly).

Offer the review before any approval: a markdown tree gets skimmed, and skimming is exactly how a
contradiction between two files survives. `--review` **prints to stdout** — never redirect it over
a `model.json`, which would replace the whole workspace payload with a review-only one and collapse
the view's document rail.

## 2. The gate — grounding readiness

Before `3-decompose`, `7-define` or `8-code` on a slice, read the grounding line from
`ddd_check.py` (check 16, `grounding-under-ratified`, severity `info`): reading
`docs/domain/discovery/model.json`, it counts how much of the sliced timeline a **person
confirmed** versus how much a mining run merely **proposed**. Zero confirmed events, zero confirmed
rules, or confirmed:candidate under the floor (`steps.yml` `grounding:`) →

```
under-grounded: N confirmed / M candidate on slice X — ratify or mine before deepening
```

and go back to `2-discover`. **Not forward with a caveat.** Warning-only by design — this is the
judgement `govkit verify` and `govkit eval` cannot make; both were green on btm-systems while its
author stalled two days over a context map cut from 0 confirmed events, then rolled it back. A
green line is **necessary, not sufficient**: only a person flips candidate → confirmed.

> **Silence is not a pass, and this is the trap.** Check 16 fires only once a decompose artifact
> already exists (`ctx` non-empty or `context-map.md` present). On a fresh domain — discovery
> written, nothing decomposed — it prints **nothing**, which is exactly the moment the gate is for.
> Ask the first row below by hand; the script cannot answer it for you yet.

Six asks, each a measurement rather than a vibe. When one fails, going back beats a caveat.

| About to run | Ask | If the answer is bad |
|---|---|---|
| decompose | at least one human-confirmed event and one stated rule? | it would paraphrase a schema — back to discover |
| connect | does every context own a real invariant? | one with none is a capability — back to decompose |
| strategize | is differentiation sourced from business evidence? | the y axis is a guess — back to understand |
| organise | is real headcount known? | it is a template, not a proposal — ask |
| define | were connect's findings triaged? | you would define a context that is about to move |
| code | invariants traceable to stated rules, none spanning two contexts? | a distributed invariant belongs in connect |

These gate *advancing through* the loop. They do **not** gate deliberately coding early to settle a
contested domain — that is a recognised way to run the process, and refusing it turns a design
disagreement into a scheduling one. What the gate buys there is honesty about the price: name the
unverified invariants and assumed boundaries, record the deviation, and treat the resulting
aggregate as evidence for `connect` rather than as a decision.

Two failed attempts to leave discovery usually means the people who know the domain were never in
the room — a scheduling problem, not a modelling one. Say so.

## 3. Decide and route

Three inputs: **the goal** (what decision is the user trying to make — "do DDD properly" and
"settle invoicing build-vs-buy this week" want different work), **the state**, and **the cost**
(most steps need domain experts in a room, the scarcest input here).

Entry is a prior, not a rule, and where the ordinary answer is obvious it *is* the answer — nothing
written → `1-understand`; a **`STALE` step → that step, in update mode**, because its input changed
underneath it; the **user names one artifact → that step directly**, because the process serves the
artifact. Four cases are not obvious. Half-finished docs start at the **cheapest step that could
still invalidate the rest** (finding the boundaries wrong beats deepening them). Code exists but
nothing is modelled → `2-discover`, mining the artifacts and then interviewing the gaps —
**never reverse a model out of a schema**, which reproduces the legacy's table clusters as if they
were boundaries. And two entries join the loop away from step 1 entirely:

- **A system landscape already exists and boundaries are the question → `connect`,** on the flows
  that already run. What today's systems say to each other constrains every boundary you could
  propose; modelling them as wished-for first produces a map nobody can act on.
- **The domain is contested and the argument circles → `code`, on one slice.** Some boundaries only
  settle once someone builds one; a canvas cannot referee a disagreement about behaviour.

Both are entry points, not shortcuts — both still owe discovery, the second also owes `connect` and
`define`. Record what the deviation left unvalidated so the debt resurfaces instead of setting.

Then invoke the step **via the Skill tool**, passing the goal and the sources it should read, having
first said which you chose and why — routing silently is how a step runs against the wrong goal.
The ids are numbered and do not resolve without the number; the user can type the same names as
slash commands when they want to run the workshop themselves:

`ddd-flow:1-understand` · `2-discover` · `3-decompose` · `4-connect` · `5-strategize` ·
`6-organise` · `7-define` · `8-code` — and `/ddd-flow:view`, which is not a step.

**Offer the view when the markdown hides the finding**, naming the question first. A document is
addressed `?doc=<id>`, and the map document additionally carries lenses as `&view=map|mass|matrix`
(plus `relations` when any relationship exists):

| Just finished | Offer | Because the document cannot show it |
|---|---|---|
| understand | `?doc=bmc` | nine blocks read as a list, and a list makes absence look like brevity — the empty ones are the finding |
| discover | `?doc=timeline` | confirmed-vs-candidate is a count across dozens of rows; nobody sums it by reading |
| decompose | `?doc=map`, then `&view=mass` | the map draws a 3-table context the same size as a 30-table one |
| decompose or connect | `?doc=map&view=matrix` | a mutual dependency is invisible among crossing lines, and cycles are what move a boundary |
| connect | `?doc=flow:<file-stem>` | a table of numbered steps is a flow nobody can picture |
| strategize | `?doc=chart` | placement is two coordinates — a paragraph claiming "core" cannot be disagreed with the way a dot can |
| organise | `?doc=chart&view=chart-teams` | team colour over the portfolio is where Conway's law stops being a slogan — **not** `?doc=map`, which renders no team colour |
| define / code | `?doc=bc:<context-dir>` · `?doc=agg:<file-stem>` | one canvas at a time, so a missing section reads as a hole rather than as a shorter file |
| **before any approval** | `?doc=review` | the only lens whose content comes from scripts, so it does not depend on anyone remembering to check |

The view writes nothing, so it is never progress in the journal; and offering it when the markdown
already answers the question trains people to close it unread, costing you the one moment it
mattered.

## 4. A change arrives mid-loop

Do not restart, and do not bolt it on. Classify the change — new capability inside a context · new
capability that may be its own context · a rule change · a change in what the business competes on
· a change in who does the work — then re-enter at the **narrowest step that is honest**, in update
mode, for the affected contexts only (the step skills delta-merge and preserve human edits), and
re-read state to see what went stale downstream.

Naming what a change *leaves alone* is half the decision:

| Change | Re-enters at | Leaves alone |
|---|---|---|
| New business line | understand → discover for its events → decompose, update mode | untouched contexts |
| New capability in a known context | discover as a delta → define for that context | the context map, unless it brings its own invariants |
| Competitor reaches parity with your core | strategize | the model — the bet changed, not the boundaries |
| Production race condition | connect to trace it → code for the aggregate boundary | everything upstream |
| Team splits in two | organise | the domain model, unless the split cannot work with these contexts |

`steps.yml` `invalidated_by` declares the mechanical dependencies and the script flags files older
than their inputs; judgement covers the rest — a new revenue stream invalidates the core domain
chart though no file changed. Re-running everything is safe and wasteful; patching one file leaves
three documents disagreeing.

## 5. Right-size

Most skips are defensible — `organise` with one team, `strategize` with no build/buy or staffing
decision pending, `connect` at two contexts and one obvious interaction (at **three or more** it
pays, because coupling only shows up in motion), canvas depth on
supporting/generic/master-data (a stub is *correct* there). Name what each costs instead of
pretending it costs nothing: no `strategize` is the investment-mismatch check gone, no `organise`
is Conway's law billing you when a second team appears. **`discover` is never skippable** — a model
sourced only from documents has zero confirmed events and invents invariants.

**Offer the thin slice**: one capability end to end — understand → discover → decompose → define on
the most commercially loaded flow — then widen. Buildable in days, and it exposes process problems
cheaply. Say when the design effort being asked for exceeds what the decision is worth.

## 6. Record — optional, and rarely

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_state.py --root . --record --step connect --skill 4-connect \
  --open "who owns release when the depot changes mid-rental"
# also available, each repeatable except --note/--date:
#   --room "3 devs"  --artifact docs/domain/message-flows/booking.md  --note "…"
#   --deviation "organise deferred — single team"   --date YYYY-MM-DD
```

State is DERIVED from the artifact tree (§1), never from this journal, so resume works with no
journal at all. The narrative it would carry already lives, richer, in session history, `tmem`,
`atuin` and `git log` — hand-copying it here creates a rot-prone second copy. So record **one**
thing, and only when it earns it: an open item you want `ddd_state` to resurface as a candidate
action next run, or a **deviation** whose debt must not quietly set (the one case the hard rule
above is about). Not a per-step chore. Appends to `docs/domain/.ddd-journal.jsonl`; `--render-log`
regenerates `MODELLING-LOG.md`.

Not the gate/learning-loop journal: the R7 distiller reads `.govkit/journal.jsonl`, written by the
govkit gate — never by you.

## 7. Exit

Hand off, naming what each consumer takes: `swe-flow:data-model` (aggregates, entities, value
objects, identity, which invariants a schema can enforce) · `swe-flow:api-designer` (commands,
queries, which events are public contracts) · `swe-flow:spec-author` (the governed PRD/RFC/ADR).
Say what brings the loop back: a new capability, a failed verification metric, a boundary finding
from production, a competitor reaching parity with a core domain.

A full worked run is in `references/worked-example.md` — read it when the shape of the output is
unclear.
