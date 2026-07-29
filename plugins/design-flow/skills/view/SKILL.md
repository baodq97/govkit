---
name: view
description: >
  Show the design live and run the co-design loop: docs/ui rendered in the browser (token
  sheet with contrast verdicts, component gallery, screen states, candidate pick), with every
  user click and note landing in events.jsonl for the agent's next round. Use when the user
  says "cùng design", "cho tôi xem design", "preview the UI", "show the design", or when
  publishing the prototype as gate evidence. This skill shows and collects feedback;
  design-flow:ui-designer is the one that writes the artifacts.
---

# Design Visualize

## Hard rules

- **Never render anything that is not in the artifacts.** The shell is frozen and the extractor
  is deterministic; if a screen is missing on the surface it is missing in `docs/ui/`. Fix the
  data, never the shell — a per-project shell tweak is how "one payload, no contradictions"
  dies.
- **Phase-1 previews stay out of the doc tree.** `.design-flow/preview/` is ephemeral and
  gitignored. A draft that lands in `docs/` looks governed when it is not.
- **Wireframe fidelity, said out loud.** The surface proves tokens, hierarchy, states, and
  flow. It is not final pixels, and the shell's header says so — the gate must not believe a
  thing the surface does not check.
- **The picture inherits the artifacts' honesty.** What the extractor cannot parse it records
  as a gap and the shell shows the gap list — an unparsed section and an empty section look
  identical on screen, and only one is a design problem.

A design nobody can see gets approved by politeness. This surface puts the current direction
on a screen — live, clickable, honest about what it does not know — so the person who can say
"primary chói quá" says it by pointing at the thing.

## Starting the surface

```bash
node ${CLAUDE_SKILL_DIR}/scripts/ui_view.mjs --root . --out .design-flow/preview/model.json \
  [--candidates .design-flow/preview/candidates]
node ${CLAUDE_SKILL_DIR}/scripts/preview-server.cjs --dir .design-flow/preview
```

The server prints a URL with a session key — open it for the user. Rewriting `model.json`
(i.e. re-running the extractor after any artifact edit) live-reloads every open tab over SSE.

## The feedback loop — one round, not chat-about-chat

The drawer and every clickable element on the surface POST to the server, which appends one
JSON line per interaction to `.design-flow/preview/events.jsonl`:

| Event | Meaning | Agent's move |
|---|---|---|
| `{type: "candidate-pick", name}` | The user chose a direction by eye | Promote that candidate to `docs/ui/tokens.json`; record the others under Rejected defaults in the brief |
| `{type: "note", lens, target, text}` | A comment aimed at a swatch / component / screen (or general) | Apply it if unambiguous; queue a question only if it conflicts with the brief or another note |
| `{type: "approve", lens}` | The user signs off the current lens | Record it; when the lenses covering the deliverable are approved, move to close-out |

**Protocol, every round** (and immediately whenever the user says "đọc feedback" / "check the
view"):

1. Read `events.jsonl`; process only lines after the count stored in
   `.design-flow/preview/events-processed.json` (write `{count}` back after processing — the
   file is the resume marker, so no event is applied twice or dropped).
2. **Act directly on every unambiguous event** — edit `docs/ui/` artifacts, re-run
   `check_tokens.mjs`, re-run the extractor; the browser re-renders on its own. Do not
   re-ask in chat what the user already said on the surface.
3. Bring back to chat ONLY: conflicts (two notes that cannot both hold, a note that
   contradicts the recorded brief), and a one-line summary of what was applied.
4. An `approve` is a lens sign-off from the user's hand — it may be cited in the close-out
   summary, but it is not a governed status flip; those stay with the owner under the
   ratification policy.

## Choreography (borrowed deliberately)

- **Opening — candidate pick** (theme-factory pattern): before settling `tokens.json`, write
  2–3 candidate token files to `.design-flow/preview/candidates/<name>.json` (each a valid
  tokens shape with its own design read + palette + type), re-extract with `--candidates`, and
  let the user pick on the Candidates lens. The pick event decides; the rejected candidates
  become Rejected-defaults entries — real evidence the direction was chosen, not emitted.
- **Working rounds**: user annotates on the surface → agent applies → live reload. Keep edits
  in the artifacts; the loop's cost per round is one extractor run.
- **Closing — reader test** (doc-coauthoring pattern): before close-out, have a fresh pair of
  eyes (a dispatched agent with no session context) open the published view and answer: what
  is each screen's primary action, and what happens on error? Where it cannot answer, the
  design (not the reader) has the gap.

## Two phases

| | **Phase 1 — Preview** | **Phase 2 — Published** |
|---|---|---|
| When | co-designing; artifacts are draft | `docs/ui/` is settled for this slice |
| Purpose | the user **looks, clicks, decides** | review surface + **gate evidence** |
| Output | `.design-flow/preview/` — ephemeral, gitignored | `docs/ui/_views/` (extractor with `--mode published --out docs/ui/_views/model.json`) |
| What changes | the artifacts — tokens, screens, brief | only which lens a reviewer opens |

Phase 2 is what gate-close cites: the red team and the owner review the rendered prototype —
states, flows, contrast verdicts — instead of imagining them from prose, and the verifier can
open the same payload the review saw.
