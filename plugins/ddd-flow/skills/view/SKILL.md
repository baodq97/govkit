---
name: view
paths: docs/domain/**
description: >
  Render docs/domain as a live, browsable model workspace in the browser — context map, mass and
  matrix lenses, the business-model canvas, message flows, bounded-context and aggregate canvases,
  and a scripted review lens. Use whenever someone needs to LOOK at the domain model rather than
  read it: reviewing a decomposition, presenting it, checking for dependency cycles, or before
  approving anything that rests on the model. Trigger on "show me the model", "open the domain
  view", "visualise the context map", "put this on a screen", "xem model trên browser" — and offer
  it when a step has just written an artifact whose finding the markdown hides.
---

# Domain Visualize — the model on a screen

A model nobody looks at gets approved by default. You already know how to read these artifacts;
this skill is about the surface that makes a wrong boundary *visible* to the people who can spot it.

## Hard rules

- **Never draw anything that is not in the model.** The renderer is deterministic and the layout is
  fixed — a context missing from the picture is missing from `model.json`. Never hand-edit the
  generated view to make a diagram nicer.
- **Never change `shell.html` to fix one model.** It is the frozen shell for every consumer; a
  per-project tweak there is how the "one payload, no contradictions" guarantee dies. Change the
  data instead. Every lens renders from the same `model.json`, so two views cannot disagree.
- **Phase-1 previews stay out of the doc tree.** `.ddd-flow/preview/` is ephemeral and gitignored;
  a draft that lands in `docs/` looks governed when it is not.
- **The picture inherits the model's honesty, nothing more.** If the model has zero confirmed
  events, say so alongside it rather than letting a clean diagram imply confidence.

## Run it

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/ddd_view.py --root . --out .ddd-flow/preview/model.json
node ${CLAUDE_SKILL_DIR}/scripts/preview-server.cjs --dir .ddd-flow/preview
```

`ddd_view.py` is an **extractor, not an emitter**: the steps write markdown for people and this
reads it back, so a run never has to be repeated to get a view and eight skills cannot drift from
eight schemas. It emits ONE workspace payload holding every artifact, and the browser gets a rail
listing them by loop. **What it cannot parse it prints as a gap** and shows in the rail — an
unparsed section and an empty section look identical on screen, and only one of them is a modelling
problem.

Launch the server with `run_in_background: true` so it survives across turns. It prints (and writes
to `<dir>/server-info.json`) a URL carrying a session key that gates every route:

```json
{"type":"server-started","port":52377,"url":"http://localhost:52377/?key=ab12…","modelPath":"…/model.json"}
```

Give the user the **complete** URL — a bare `host:port` is refused. Read `server-info.json` on a
later turn if you did not capture stdout. It exits after 4 hours idle (`--idle-timeout-minutes`).
Remind the user to add `.ddd-flow/` to `.gitignore` if it is not there.

The server binds `127.0.0.1` by default, which is invisible from outside the loopback — under WSL2,
a container, or a remote box, the printed `localhost` URL will not open in the user's browser. Bind
and advertise explicitly there: `--host 0.0.0.0 --url-host <reachable-ip>` (also `--port N`, or the
`DDD_FLOW_PREVIEW_HOST` / `_PORT` / `_DIR` env vars). A URL the user cannot open reads to them as a
broken skill, and they will not tell you which half failed.

## The loop

Rewrite `<dir>/model.json` → the page re-renders within a second, no reload and no new URL → say
briefly what changed and what you want them to look at → **end your turn**. Next turn, read
`<dir>/events.jsonl` (the structured record of what they clicked) and merge it with what they said
in the terminal, which is the primary feedback. Repeat, then hand off.

Be honest about the boundary of "live": the page updates instantly, but you only act on feedback
when your next turn runs. Do not promise the model will change while they watch.

This is a **preview** surface: it renders `.ddd-flow/preview/` before the docs are settled, the user
looks and decides, and what changes is the *model* — correcting a boundary by looking at it costs a
glance, while finding the same error by reading eleven `model.yaml` files usually does not happen at
all. There is no publish mode: `ddd_view.py` takes `--root`, `--docs` and `--out` only, so if
someone asks for living documentation under `docs/`, say it is not built rather than inventing an
`--out` path (the payload would land with no `shell.html` beside it and render nothing).

## Lenses

Which appear is decided by `model.kind`, per document — a business-model payload gets the Canvas, a
`review` payload gets Review, a chart payload gets the portfolio views, a domain payload the rest.

| `?view=` | Answers | Reach for it when |
|---|---|---|
| `map` | where the boundaries are and how contexts talk | the default; reviewing a decomposition |
| `mass` | where the weight actually sits | the map draws a 3-table context the same size as a 30-table one |
| `matrix` | who depends on whom, and are there cycles | a two-way dependency is invisible among crossing lines |
| `relations` | the relationship patterns on each edge | offered whenever the payload carries any relationship |
| `canvas` | the nine-block Business Model Canvas | reviewing or presenting `1-understand` output |
| `chart` · `chart-teams` | core-domain placement, then the same portfolio in team colour | `chart-teams` appears only when the chart payload carries `teams` — it is the Conway's-law overlay, and the map lens does **not** render team colour |
| `review` | what has been done and what is wrong across artifacts | before any decision resting on the model — the only lens whose content is produced by scripts, so it does not depend on anyone remembering to check |

`?static=1` renders once and skips the live channel — use it for screenshots, print-to-PDF or a CI
artifact, because an open event-stream keeps the page permanently "loading" and stalls headless
capture.

## Showing what is not known

The part that matters most and is easiest to skip. Populate these fields even when — **especially**
when — the model is thin: a picture that looks complete because the gaps were rendered as
whitespace wins arguments it should lose.

- **Empty canvas blocks** carry their `question` and `who` could answer it, and render hatched in
  warning colour. A blank box reads as "nothing to say here"; a hatched box with a question reads
  as "nobody has answered this", which is the truth.
- **`openQuestions`** become a badge on the context node, so uncertainty is visible before anyone
  clicks. **`proxy` / `partial`** tags mark claims that came from someone speaking for a user
  rather than a user.
- **The attendance line sits with the canvas**, not in a footnote — a model nobody was interviewed
  for is a different artifact from one a room produced.

## The payload

`model.json` is one **workspace envelope** — `{"schemaVersion": 2, "kind": "workspace", "source":
{…}, "documents": [{id, title, kind, step, payload}], "gaps": [...]}` — holding every artifact as a
document. The shell drops the whole rail without a word if what it loads is not `kind: "workspace"`,
so a bare inner payload looks like a one-document model rather than an error.

**Never redirect `ddd_state.py --review` over `model.json`.** It prints a review-*only* payload, and
that single command is the most likely way to destroy the rail — the review is already built into
the workspace by `ddd_view.py`, so regenerate instead.

Field-by-field shapes — the document payloads, the `subdomainType` and relationship-`type` enums,
the review structure, the business-model block keys — are in **`references/model-json.md`**. Read it
before writing to `model.json` by any means: hand-writing, patching, or redirecting a command over
it. `ddd_view.py` generates every shape, so the normal path never needs it.

Scripts: `preview-server.cjs` is a zero-dependency server (Node built-ins only) that serves the
shell, watches `model.json`, pushes changes over SSE and records feedback — architecture adapted
from the `superpowers` brainstorm companion (MIT, Jesse Vincent). `shell.html` is the frozen shell.
