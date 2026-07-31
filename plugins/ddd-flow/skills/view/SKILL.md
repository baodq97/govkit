---
name: view
disable-model-invocation: true
paths: docs/domain/**
description: >
  DDD — renders docs/domain as a live browsable workspace in the browser.
---

# Domain Visualize

## Hard rules

- **Never draw anything that is not in the model.** The renderer is deterministic and the layout
  is fixed; if a context is missing from the picture it is missing from `model.json`. Do not
  hand-edit the generated view to make a diagram nicer.
- **Phase-1 previews stay out of the doc tree.** `.ddd-flow/preview/` is ephemeral and gitignored.
  A draft that lands in `docs/` looks governed when it is not.
- **Do not change `shell.html` to fix one model.** It is the frozen shell for every consumer; a
  per-project tweak there is how the "one payload, no contradictions" guarantee dies. Change the
  data instead.
- The picture inherits the model's honesty, nothing more. If the model has zero confirmed events,
  say so alongside the picture rather than letting a clean diagram imply confidence.

A model nobody looks at gets approved by default. This skill puts the current model on a screen —
live, interactive, and honest about what it does not know — so the people who can spot a wrong
boundary actually spot it.

**The shell is frozen; the data moves.** Every lens renders from one `model.json`, so two views
cannot contradict each other. Changing what is shown means changing the model, not the renderer.
That is the whole reason the pictures can be trusted: hand-drawn diagram sets drift apart from
each other and from the model, and nothing catches it.

## Two phases

| | **Phase 1 — Preview** | **Phase 2 — Published** |
|---|---|---|
| When | before docs are written; the model is still a draft | the model is committed under `docs/domain/` |
| Purpose | the user **looks and decides** | living documentation, review, presentation |
| Output | `.ddd-flow/preview/` — ephemeral, gitignored | `docs/domain/_views/` |
| What changes | the **model** — contexts, boundaries, relationships | only styling and which lens is shown |

Phase 1 is where this skill earns its keep. Correcting a boundary by looking at it costs a glance;
finding the same error by reading eleven `model.yaml` files usually does not happen at all.

## Starting the surface

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_view.py --root . --out .ddd-flow/preview/model.json
node ${CLAUDE_SKILL_DIR}/scripts/preview-server.cjs --dir .ddd-flow/preview
```

`ddd_view.py` reads the artifact tree and emits **one workspace payload holding every artifact** —
context map, business model, discovery wall, core domain chart, each message flow, each bounded
context canvas, each aggregate canvas, team topology, event-model slices, and the state-and-findings
review. The browser gets a rail listing them grouped by loop; every renderer stays a single-artifact
renderer.

It is an extractor, not an emitter: the steps write markdown for people, and this reads that back.
So a run does not have to be repeated to get a view, and eight skills cannot drift from eight
schemas. **What it cannot parse it prints as a gap** and shows in the rail — an unparsed section and
an empty section look identical on screen, and only one of them is a modelling problem.

It prints (and writes to `<dir>/server-info.json`) a URL carrying a session key:

```json
{"type":"server-started","port":52377,"url":"http://localhost:52377/?key=ab12…","modelPath":"…/model.json"}
```

Give the user the **complete** URL — the key gates every route, so a bare `host:port` is refused.
Launch it with `run_in_background: true` so it survives across turns; read `server-info.json` on a
later turn if you did not capture stdout. It exits after 4 hours idle (`--idle-timeout-minutes`).

Remind the user to add `.ddd-flow/` to `.gitignore` if it is not there.

## The loop

1. **Write `<dir>/model.json`.** The page re-renders itself within a second — no reload, no new
   URL. Say briefly what changed and what you want them to look at.
2. **End your turn.** They look, click, and reply.
3. **Next turn: read `<dir>/events.jsonl`** and merge it with what they said in the terminal. The
   terminal message is the primary feedback; the events file is the structured record of what they
   clicked.
4. **Rewrite `model.json`.** Repeat until they are satisfied, then hand off.

Be honest about the boundary of "live": the page updates instantly, but you only act on feedback
when your next turn runs. Do not promise the model will change while they watch.

## The four lenses

Which lenses appear is decided by `model.kind` — a business-model payload gets the Canvas, a
domain payload gets the other three.

| Lens | `?view=` | Answers | Reach for it when |
|---|---|---|---|
| **Map** | `map` | where are the boundaries, and how do contexts talk | the default; reviewing a decomposition |
| **Mass** | `mass` | where does the weight actually sit | the map draws a 3-table context the same size as a 30-table one |
| **Matrix** | `matrix` | who depends on whom, and are there cycles | a two-way dependency is invisible among crossing lines |
| **Canvas** | `canvas` | the nine-block Business Model Canvas | reviewing or presenting `1-understand` output |
| **Review** | `review` | what has been done, and what is wrong across artifacts | before any decision that rests on the model — it is the only lens whose content is produced by scripts, so it does not depend on anyone remembering to check |

`?static=1` renders once and skips the live channel. Use it for screenshots, print-to-PDF, or a CI
artifact — an open event-stream keeps the page permanently "loading" and stalls headless capture.

## The data contract

`model.json` is the single payload every lens reads. Two shapes:

**Domain model** (`3-decompose` output, or a draft in progress):

```json
{
  "schemaVersion": 1,
  "source": { "mode": "draft", "generatedAt": "…" },
  "contexts": [{
    "id": "DOMAIN-0001", "name": "Allocation", "subdomainType": "core",
    "tacticalPattern": "full-domain-model", "purpose": "…",
    "tableCount": 30, "attrCount": 141, "densestAttrs": 112, "layer": 2,
    "tables": ["…"], "aggregates": [{"name": "…"}],
    "ubiquitousLanguage": [{"term": "…", "definition": "…"}],
    "assumptions": ["…"], "openQuestions": ["…"]
  }],
  "relationships": [{ "from": "Allocation", "to": "Logistics", "type": "shared-kernel" }],
  "external": [{ "name": "…", "kind": "…" }]
}
```

`subdomainType`: `core` · `supporting` · `generic` · `master-data`.
`type`: `upstream` · `downstream` · `shared-kernel` · `conformist` · `acl` · `open-host` ·
`published-language` · `partnership` · `customer-supplier`.

**Review** (`kind: "review"`): built automatically by `ddd_view.py` as one document inside the
workspace payload — no separate command. (Do NOT redirect `ddd_state.py --review` over
`model.json`: that replaces the whole workspace with a review-only payload and collapses the
doc rail. The `--review` stdout report remains available for terminal use via the design skill.)

It merges step state (`ddd_state.py`) with cross-artifact findings (`ddd_check.py`): `steps[]` with
status / evidence / `stale_against`, `candidates[]`, and `findings[]` each carrying `severity`,
`title`, `evidence[]` and `fix_owner` — the step skill that owns the fix. Regenerate it after every
step; it is derived, never edited.

**Business model** (`1-understand` output): `kind: "business-model"` plus `canvas` (the nine
blocks), `classification`, `goals`, `attendance`. Read `scripts/shell.html` — `BMC_BLOCKS` names
each block key, and every block takes `status` (`sourced` · `partial` · `proxy` · `empty`),
`items[]`, `source`, and for empty blocks `question` and `who`.

## Showing what is not known

This is the part that matters most and is easiest to skip.

- **Empty canvas blocks render hatched, in warning colour, carrying their question and who could
  answer it** — not as a tidy blank. A blank box reads as "nothing to say here"; a hatched box with
  a question reads as "nobody has answered this", which is the truth.
- **`openQuestions` become a badge** on the context node, so uncertainty is visible before anyone
  clicks.
- **`proxy` and `partial` tags** mark claims that came from someone speaking for a user rather
  than a user.
- **The attendance line sits with the canvas**, not in a footnote. A model nobody was interviewed
  for is a different artifact from one a room produced.

Populate these fields even when — especially when — the model is thin. A picture that looks
complete because the gaps were rendered as whitespace is worse than no picture, because it wins
arguments it should lose.

## Files

- `scripts/preview-server.cjs` — zero-dependency server (Node built-ins only): serves the shell,
  watches `model.json`, pushes changes over SSE, records feedback. Architecture adapted from the
  `superpowers` brainstorm companion (MIT, Jesse Vincent).
- `scripts/shell.html` — the frozen shell: all four lenses, layout, and styling.
