---
name: design
description: >
  Orchestrate the DDD modelling process end to end. Reads repo state with a deterministic script,
  then decides what to do next against your goal instead of following a fixed pipeline: which
  step to run, which to skip and at what cost, what a change invalidates, and which of the eight
  step sub-skills (understand · discover · decompose · connect · strategize · organise ·
  define · code, plus a live visual surface) to hand it to. Use for "let's do DDD", "model this
  domain properly", "design the domain end to end", "what's next in our domain modelling",
  "resume the domain modelling", "we're adding a new business line — how does that fit", "làm
  DDD cho hệ thống này", "thiết kế domain từ đầu", "tiếp theo làm gì". Also trigger when a
  change lands in an already-modelled domain, or when a model exists and nobody knows how much
  of the process was really done — restarting finished work is the failure this prevents.
allowed-tools: Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/*.py *), Skill
---

# DDD Design — control flow for the modelling loop

## Hard rules

- **Never do a step's work inline.** Each step skill carries its own rules — provenance,
  confirmed-vs-candidate, propose-don't-apply — and none survive paraphrase. Invoke the skill.
- **Read state before planning.** Every claim about what has been done cites the script's output.
- **Decide, don't sequence.** If the goal makes a different step right, run that and say why. If it
  makes the whole process wrong, say that too.
- **Never skip discovery silently.** Time-box it; do not replace it with reading documents. With no
  domain expert available, say the model will only be as good as the documents.
- **One step per turn, then re-read state.**
- **Record deviations, not just progress.** A log showing only completed steps hides the two
  heuristics that failed and the workshop that had no domain expert in it.
- **Never flip a governed doc's status.** Artifacts land `status: draft`, `owner: TBD`.

```
loop 1  understand → discover                           what the business is, and what happens
loop 2  decompose → connect → strategize → organise     where the boundaries are, and who owns them
loop 3  define    → code                                what each context is, and how it is built
```

A starter shape, not a pipeline. The cases that matter are the ones the arrows do not cover — a new
business line mid-flow, an incident that invalidates a boundary, someone needing a build-vs-buy
answer this week. So: read state, decide against the goal, route, record.

Two failures this prevents: redoing work already done, and running all eight steps on a domain that
needed three.

## 1. Read state

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_state.py --root . [--json]
```

Per step: `done` / `partial` / `missing` / `STALE`, the evidence files, the journal's open items, and
**candidate actions with reasons** — a list, not a next step.

What counts as evidence is configuration, not code: `references/steps.yml` declares each step's
artifact globs, the markers separating a defined context from a sketched one, and which upstream
step invalidates it. Override with `--config` for a repo with different conventions.

Run it before proposing anything. Asking a team which steps they ran gets an optimistic answer.

**Cross-artifact findings** come from a second script, and they catch what reading files one at a
time cannot — a contradiction that lives *between* two files (a context labelled `core` whose
capability the business model rates as non-differentiating), an entity modelled inside two contexts,
a flow over the nine-message limit, a canvas missing its falsifiable sections:

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_check.py --root .          # human-readable
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_state.py --root . --review # both, as a view payload
```

The `--review` form writes the payload `/ddd-flow:view` renders as its **Review** lens. Offer it
whenever someone has to approve a model: a markdown tree gets skimmed, and skimming is exactly how
a contradiction between two files survives.

## 2. Decide

Three inputs: **the goal** — what decision is the user trying to make? "Do DDD properly" and "settle
invoicing build-vs-buy this week" want different work. **The state.** **The cost** — most steps need
domain experts in a room, the scarcest input here.

Then pick, and say why, including what you are not doing.

Priors, not rules:

| Situation | Usually starts at | Because |
|---|---|---|
| Nothing written | understand | boundaries without a business model are guesses |
| Code exists, nothing modelled | discover, DISCOVER mode | mine artifacts, then interview gaps — never reverse a model out of a schema |
| Half-finished docs | the cheapest step that could still invalidate the rest | finding the boundaries wrong beats deepening them |
| A step is `STALE` | that step, update mode | its input changed underneath it |
| User names one artifact | that step, directly | the process serves the artifact |
| A system landscape already exists and boundaries are the question | connect, on the flows that already run | what today's systems say to each other constrains every boundary you could propose; modelling them as wished-for first produces a map nobody can act on |
| The domain is contested and the argument is going in circles | code, on one slice | some boundaries only settle once someone builds one; a canvas cannot referee a disagreement about behaviour |

The last two enter the loop away from step 1, which is deliberate — the process is a loop, and where
you join it depends on what is already true. They are entry points, not shortcuts: both still owe
discovery, and the second owes `connect` and `define` afterwards, because a boundary drawn to get one
slice building is a hypothesis. Record the deviation with what it left unvalidated, so the debt
resurfaces instead of setting.

## 3. Route — invoke the step, having said why

Invoke the step yourself via the Skill tool (`ddd-flow:1-understand`, …), passing the goal and the
sources it should read. Say which step you chose and why **before** invoking — routing silently is
how a step runs against the wrong goal.

The step skills carry their own rules — provenance, confirmed-vs-candidate, propose-don't-apply.
Invoking them is how those rules apply; paraphrasing their work inline is how they are lost.

The user can also drive any step directly by typing its command, which is the right move when they
want to run the workshop themselves:

| Step | Skill / command | Answers |
|---|---|---|
| understand | `/ddd-flow:1-understand` | what the business sells, and what differentiates it |
| discover | `/ddd-flow:2-discover` | what actually happens, in the words of the people who do it |
| decompose | `/ddd-flow:3-decompose` | where the boundaries are, and what each context owns |
| connect | `/ddd-flow:4-connect` | do real use cases cross those boundaries without hidden coupling |
| strategize | `/ddd-flow:5-strategize` | which parts deserve investment, what to buy instead of build |
| organise | `/ddd-flow:6-organise` | which team owns which context, at what cognitive load |
| define | `/ddd-flow:7-define` | what each context is responsible for, and what it assumes |
| code | `/ddd-flow:8-code` | what stays consistent in one transaction, what is repaired after |
| — | `/ddd-flow:view` | put the model on a screen, at any point |

One step per turn. Chaining three unattended produces three artifacts resting on assumptions nobody
checked — and half these steps are conversations with people a skill cannot summon.

### When the screen earns its place

`view` is cross-cutting, which in practice means forgotten. Offer it at the moments below — each is
a point where the artifact **hides** something a lens makes obvious, so this is not "show the pretty
version", it is "the markdown cannot answer the question you are about to decide on".

A document is `?doc=<id>`; the map document additionally carries three lenses as `&view=map|mass|matrix`.

| Just finished | Offer | Because the document cannot show it |
|---|---|---|
| understand | `?doc=bmc` | nine blocks read as a list, and a list makes absence look like brevity — the empty ones are the finding |
| discover | `?doc=timeline` | confirmed-vs-candidate and as-is-vs-to-be are counts across dozens of rows; nobody sums them by reading |
| decompose | `?doc=map`, then `&view=mass` | the map draws a 3-table context the same size as a 30-table one, and mass is the correction |
| decompose or connect | `?doc=map&view=matrix` | a mutual dependency is invisible among crossing lines, and cycles are what move a boundary |
| connect | `?doc=flow:<id>` | a table of numbered steps is a flow nobody can picture; the diagram is what a room argues over |
| strategize | `?doc=chart` | placement is two coordinates — a paragraph claiming "core" cannot be disagreed with the way a dot can |
| organise | `?doc=map` | team colour over the boundaries is where Conway's law stops being a slogan |
| define / code | `?doc=bc:<slug>` · `?doc=agg:<Name>` | one canvas at a time, so a missing section reads as a hole rather than as a shorter file |
| **before any approval** | `?doc=review` | the only lens whose content comes from scripts, so it does not depend on anyone remembering to check |

Two things this is not. It is **not** a step: nothing is written, so it never appears in the journal
as progress. And it is **not** a default closing move — offering the screen when the artifact already
answers the question trains people to close it unread, which costs you the one moment it mattered.
Name the question first; if the markdown answers it, skip the screen.

## 4. When a change arrives mid-loop

Do not restart, and do not bolt it on. Decide the **scope**, and let that decide the re-entry:

1. What kind of change — new capability inside a context · new capability that may be its own
   context · a rule change · a change in what the business competes on · a change in who does the
   work.
2. What it invalidates — `steps.yml` declares the mechanical dependencies, and the script flags files
   older than their inputs. Judgement covers the rest: a new revenue stream invalidates the core
   domain chart though no file changed.
3. Re-enter at the **narrowest step that is honest**, in update mode, for the affected contexts only.
   The step skills delta-merge and preserve human edits.
4. Re-read state to see what the change made stale downstream.

| Change | Re-enters at | Leaves alone |
|---|---|---|
| New business line | understand → discover for its events → decompose, update mode | untouched contexts |
| New capability in a known context | discover as a delta → define for that context | the context map, unless it brings its own invariants |
| Competitor reaches parity with your core | strategize | the model — the bet changed, not the boundaries |
| Production race condition | connect to trace it → code for the aggregate boundary | everything upstream |
| Team splits in two | organise | the domain model, unless the split cannot work with these contexts |

Re-running everything is safe and wasteful; patching one file leaves three documents disagreeing.

## 5. Right-size

| Skip | Defensible when | What you lose |
|---|---|---|
| **organise** | one team, or fewer contexts than it can hold | nothing yet — Conway's law bills you when a second team appears |
| **strategize** | no build/buy or staffing decision pending | the investment-mismatch check |
| **connect** | two contexts, one obvious interaction | coupling only shows up in motion; at three or more contexts it pays |
| **define / code depth** | supporting, generic, master-data contexts | nothing — a stub is correct there |
| **discover** | **never** | a model sourced only from documents has zero confirmed events and invents invariants |

**Offer the thin slice**: one capability end to end — understand → discover → decompose → define on
the most commercially loaded flow — then widen. Buildable in days, and it exposes process problems
cheaply. Say when the design effort being asked for exceeds what the decision is worth.

## 6. Readiness heuristics

Ask before advancing. When one fails, going back beats pushing through with a caveat.

**The decompose row is a measurement, not a vibe — take it from the script.** Before `3-decompose`,
`7-define`, or `8-code` on a slice, the grounding line from `ddd_check.py` (check 16,
`grounding-under-ratified`) reads `docs/domain/discovery/model.json` and counts how much of the
sliced timeline a person *confirmed* vs how much a mining run *proposed*. **0 confirmed events, 0
confirmed rules, or confirmed:candidate below the floor → do not deepen** — print `under-grounded: N
confirmed / M candidate on slice X — ratify or mine before deepening` and go back to `2-discover`,
not forward with a caveat. The check is warning-only (`info`) by design: this is the judgement
`govkit verify` and `govkit eval` cannot make — both were green on btm-systems while its author
stalled two days over a context map cut from 0 confirmed events, then rolled it all back. A green
grounding line is **necessary, not sufficient**; only a person flips candidate→confirmed.

| About to run | Ask | If the answer is bad |
|---|---|---|
| decompose | one human-confirmed event and one stated rule? | it would paraphrase a schema — back to discover |
| connect | does every context own a real invariant? | one with none is a capability — back to decompose |
| strategize | is differentiation sourced from business evidence? | the y axis is a guess — back to understand |
| organise | is real headcount known? | it is a template, not a proposal — ask |
| define | were connect's findings triaged? | you would define a context that is about to move |
| code | invariants traceable to stated rules, none spanning two contexts? | a distributed invariant belongs in connect |

These gate *advancing through* the loop. They do not gate **deliberately coding early to settle a
contested domain** — that is a recognised way to run the process, and refusing it turns a design
disagreement into a scheduling one. What the heuristic buys there is honesty about the price: say
which invariants are unverified and which boundaries the slice is assuming, record it as a
deviation, and treat the resulting aggregate as evidence for `connect` rather than a decision.

Two failed attempts to leave discovery usually means the people who know the domain were never in
the room — a scheduling problem, not a modelling one. Say so.

## 7. Record

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_state.py --root . --record \
  --step connect --skill 4-connect \
  --room "2 planners" --room "3 devs" \
  --artifact docs/domain/message-flows/booking.md \
  --note "traced 3 use cases; check-then-act race found" \
  --open "who owns release when the depot changes mid-rental" \
  --deviation "organise deferred — single team"
```

Appends to `docs/domain/.ddd-journal.jsonl` (and `--render-log` regenerates `MODELLING-LOG.md`).

**This is OPTIONAL — not a per-step chore.** State is DERIVED from the artifact tree on disk (§1,
`ddd_state.py` reads what exists), never from this journal, so resume works with no journal at all.
The *narrative* it would carry — who was in the room, what was decided, what was skipped and why —
already lives, richer, in your session history, `tmem`, `atuin`, and `git log`; do not hand-copy it
here (a hand-written journal is a redundant, rot-prone second copy). Record only **one** thing, and
only when it earns it: an **open item** you want `ddd_state` to resurface as a candidate action next
run (a hotspot that must not disappear). Everything else the artifacts and `git log` already show.

Not to be confused with the gate/learning-loop journal: the R7 distiller reads a *different* file,
`.govkit/journal.jsonl`, written by the govkit gate — never by you.

## 8. Exit

Hand off, naming what each consumer takes: `swe-flow:data-model` (aggregates, entities, value
objects, identity, and which invariants a schema can enforce) · `swe-flow:api-designer` (commands
and queries, and which events are public contracts) · `swe-flow:spec-author` (the governed
PRD/RFC/ADR).

Say what brings the loop back: a new capability, a failed verification metric, a boundary finding
from production, a competitor reaching parity with a core domain.

## Worked example

A full worked run is in `references/worked-example.md` — read it when the shape of the output is unclear.
