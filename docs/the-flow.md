# The flow — one feature, start to finish

This is the page to read first. Everything else in govkit is a detail of what happens here.

govkit ships three Claude Code plugins holding **24 skills** between them. That is a lot of
surface, and a list of 24 tools is not a process. This page puts them in order: one feature,
from the sentence someone said in a meeting to the release record, naming exactly what you type
at each step and what appears on disk.

You will not run every step for every change. [The short paths](#you-do-not-always-run-the-whole-chain)
at the bottom cover the common cases — a bugfix runs almost none of this.

## Before you start

```bash
npx govkit init          # scaffolds govkit.yml + the write-time hook + docs/*/INDEX.md
npx govkit verify        # green on an empty scaffold — this is what CI will run
```

Then open the repo in Claude Code and accept the trust prompt. The three plugins
(`swe-flow`, `ddd-flow`, `design-flow`) install themselves from the govkit marketplace.
Decline it and everything deterministic still works — the plugins author artifacts, they are
never the gate.

## The map

```
   an idea
      │
      ▼
 ① PRD ──────────────────── /swe-flow:spec-author        → docs/product/
      │
      ├──────────────┬──────────────┐   (these three run in parallel —
      ▼              ▼              ▼    they all read the PRD, not each other)
 ② domain model  ③ UI design    (nothing, if it is backend-only)
   /ddd-flow:design  /design-flow:ui-designer
   → docs/domain/    → docs/ui/
      │              │
      └──────┬───────┘
             ▼
 ④ technical design ─────── /swe-flow:api-designer  → docs/api/
                            /swe-flow:data-model    → docs/data/
                            architect agent         → docs/rfc/, docs/adr/
             │
             ▼
 ⑤ slices ───────────────── /swe-flow:work-breakdown → docs/issues/
             │
             ▼
 ⑥ code ────────────────── test-author → implementer agents
             │
             ▼
 ⑦ gate ────────────────── npx govkit check
                            reviewer · red-teamer · verifier agents
             │
             ▼
 ⑧ close ───────────────── /swe-flow:gate-close      → docs/releases/
             │
             ▼
 ⑨ learn ───────────────── /swe-flow:distill-learnings ──┐
             └───────────────────────────────────────────┘
                          (proposals feed back into the rules)
```

`/name` is a skill you invoke. An "agent" is something you ask the session to dispatch
("dispatch the reviewer agent on this diff") — agents are separate contexts with their own tool
limits, which is why the reviewer cannot edit the thing it reviews.

## Step by step

### ① Say what the product should do — the PRD

```
/swe-flow:spec-author
```

Describe the problem. It writes `docs/product/PRD-00NN-<slug>.md` with complete front-matter,
`owner: TBD`, status `draft`, and adds the row to `docs/product/INDEX.md`. It then runs
`npx govkit verify` on its own output.

**It will not flip the status to `approved`.** That is a human act, on purpose — a gate a
machine can both fill in and approve is not a gate. You edit the front-matter yourself when
you have actually approved it.

### ② Model the domain — what the business actually is

```
/ddd-flow:design
```

This is an orchestrator, not a single pass. It reads the repo, works out which of the eight
modelling stages you already have, and drives the next one. Over a few sessions it produces
`docs/domain/`: EventStorming output, ubiquitous language, bounded contexts, aggregates,
message flows, a core-domain chart, team topologies.

The numbered skills (`/ddd-flow:1-understand` … `/ddd-flow:8-code`) are the stages it calls.
Invoke them directly only when you want to redo one stage in isolation — otherwise let
`design` decide, because it knows what your repo already has.

```
/ddd-flow:view
```

opens the whole domain tree in a browser: context map, core domain chart, message flows.
Use it to review with people who will not read markdown.

### ③ Design what the user sees — the UI

```
/design-flow:ui-designer
```

Reads the PRD, `docs/domain/` (for vocabulary), and `docs/api/` if it exists. Produces
`docs/ui/`: a design brief, a `tokens.json` whose colour pairs are checked against WCAG AA by
an actual script, a screen inventory, and — the deliverable — a `prototype.html` that anyone
can open and understand without reading a single document.

```
/design-flow:view
```

renders it live and collects feedback by clicking on the design rather than describing it in
chat. You pick a direction by eye, leave notes on specific screens, and the next round of the
skill reads those notes and applies them.

Steps ② and ③ are siblings, not a sequence. The domain model is the business's model of
itself; the UI is the user's model of the same thing. Where they disagree, you have found
something worth a conversation — that is the point of running both.

### ④ Decide the technical shape

Three artifacts, three entry points:

```
/swe-flow:api-designer      → docs/api/   (OpenAPI 3.1, resource modelling, error catalog)
/swe-flow:data-model        → docs/data/  (tables, keys, indexes, migrations)
```

and for the decisions themselves — the ones you will be asked to justify in a year — dispatch
the **architect** agent, which writes a governed RFC or ADR into `docs/rfc/` or `docs/adr/`.
It diagnoses against your actual repository first (a census, a probe, a measured number) before
it proposes anything, and it records what it rejected and why.

**When do you need an RFC at all?** By change class:

| What you are doing | What must exist before the code |
|---|---|
| Bugfix, copy change, refactor under 200 lines | nothing |
| New feature or a public-API change | an RFC at `accepted` |
| Architecture, vendor, or runtime decision | an ADR at `proposed`, `accepted` on consensus |
| Anything touching revenue, legal, or compliance | an approved PRD first |

A small diff at a system boundary — auth, crypto, retries and timeouts, an IO contract, a
public schema — counts one class higher. When unsure, classify up; the cost of an unnecessary
ADR is twenty minutes, and the cost of a missing one is an argument in eighteen months with
nobody able to remember the reasoning.

### ⑤ Cut it into slices

```
/swe-flow:work-breakdown
```

Splits the work into independently shippable vertical slices and writes each as a User Story
in `docs/issues/`, each with a `parent` pointing at the RFC it implements. The gate checks that
parent resolves to a real document, so a story cannot quietly orphan itself.

### ⑥ Build it

Dispatch the **test-author** agent first. It finds your repo's real test command (from
`package.json`, the Makefile, or CI — it does not assume `npm test`), writes a test that pins
the requirement, runs it, and proves it **fails**. The demonstrated failure is its deliverable.

Then dispatch **implementer** agents, one per file-disjoint work package. They write code and
match the surrounding style; they do not run git, do not run govkit, and do not touch shared
state — integration is the session lead's job, which is what keeps parallel implementers from
fighting over the same files.

### ⑦ Gate it

```bash
npx govkit check     # verify + eval — this is exactly what CI runs, no API key needed
```

Then the judgment layers, which are agents because no script can do them:

- **reviewer** — reads the diff against your governance and returns APPROVE / SHIP-WITH-CAVEATS / BLOCK
- **red-teamer** — attacks a document *before* its status advances; never the document's own author
- **verifier** — builds the real artifact and runs it the way a consumer would, in a clean directory

### ⑧ Close it

```
/swe-flow:gate-close
```

Run this when code has landed and one or more documents are ready to move forward. It gathers
everything into **one** decision packet for the owner — instead of asking you to approve six
things across six messages — and writes a release record into `docs/releases/`.

### ⑨ Learn from it

```
/swe-flow:distill-learnings
```

Reads the gate journal (`.govkit/journal.jsonl`, if you enabled it), the escape log, and the
git delta since the last round, then proposes rule changes: new test fixtures, new `AGENTS.md`
lines, `govkit.yml` tweaks. It **only proposes** — it never edits the rules it would be judged
by. You apply what is worth applying, and the gate gets better at catching the thing that
escaped last month.

## You do not always run the whole chain

| Situation | What you actually run |
|---|---|
| Fixing a bug | code → `npx govkit check`. No documents. |
| A new feature in an existing area | ④ RFC → ⑤ slices → ⑥ code → ⑦ gate → ⑧ close |
| A new product or a new bounded context | the whole chain, ① through ⑨ |
| A backend-only service | skip ③; there is no UI to design |
| A redesign of an existing screen | ③ only, in AUDIT mode (`/design-flow:ui-designer` asks) |
| Adopting govkit into a repo that already has docs | `/swe-flow:govkit-adopt` — it migrates your existing metadata instead of asking you to rewrite it |

There is also a `sdlc` workflow (`.claude/workflows/sdlc.js`) that sequences ① → ⑥ for you,
reviewer-gated at each phase. It is an accelerant, not the source of truth: if workflows are
disabled in your environment, drive the same order by hand and nothing is lost, because the
hook and CI enforce the gates either way.

## The whole surface, grouped

Skills you invoke as `/plugin:skill`; agents you ask the session to dispatch.

**swe-flow — the chain**

| | |
|---|---|
| `spec-author` | write a governed PRD / RFC / ADR / US |
| `api-designer` · `data-model` | the machine contract and the persistence contract |
| `work-breakdown` | split work into shippable slices |
| `gate-close` | one owner-decision packet after code lands |
| `spec-red-team` · `substance-judge` | keyed adversarial and substance passes (opt-in, need an API key) |
| `distill-learnings` | propose rule changes from what the gate actually caught |
| `govkit-adopt` | get govkit into a repo, greenfield or existing |
| `working-discipline` | thinking checkpoints for long autonomous work |
| `workflow-author` | write a new `.claude/workflows/*.js` orchestration |
| *agents* | `analyst` `architect` `drafter` `implementer` `test-author` `reviewer` `red-teamer` `verifier` `judge` `doc-keeper` `distiller` |

**ddd-flow — the domain**

| | |
|---|---|
| `design` | **start here** — orchestrates the eight stages against your repo state |
| `1-understand` … `8-code` | the individual stages, for redoing one in isolation |
| `view` | browse the whole domain tree, for reviewing with people |

**design-flow — the experience**

| | |
|---|---|
| `ui-designer` | build `docs/ui/` and the prototype |
| `view` | show it live and collect click-targeted feedback |

## What actually blocks you

Three tiers, and it is worth knowing which is which so you know when to argue with the tool:

- **`npx govkit verify` blocks.** Front-matter, statuses, index sync, references that resolve.
  If it fails, something is genuinely malformed.
- **`npx govkit eval` has a small blocking floor** (not an empty stub, no leftover template
  filler) **and an advisory 0–100 score** that never blocks. The score is a trend to watch,
  not a target to hit.
- **`report`, `stale`, and `aging` never block.** They tell you what is in flight, what has
  drifted, and what has been sitting in one status too long.

Everything else — whether the prose is any good, whether the design has taste — is judgment,
and lives with the reviewer, the judge agent, and you. govkit is deliberate about not
pretending otherwise; the reasoning is in [`design-rationale.md`](./design-rationale.md).
