# Scaffolded with govkit

This repo was bootstrapped with the [govkit](https://github.com/baodq97/govkit) governance
template: **governance you can run, not just read.** Your docs-as-code SDLC
(PRD → RFC → ADR → US → Code) is enforced by a deterministic engine — in your editor and in CI.

## What you got

| Path | What it does |
|---|---|
| `govkit.yml` | the governance schema — your doc dirs, required front-matter, status lifecycle, eval rubric, and the `ratification:` tiers that say who may flip what (edit to taste) |
| `.claude/settings.json` | the three plugins + **three hooks** — see [Hooks](#the-three-hooks) below, because one of them can stop the agent |
| `.claude/workflows/sdlc.js` | the `sdlc` workflow: PRD → … → Code, reviewer-gated (needs the swe-flow plugin) |
| `.claude/workflows/gate-loop.js` | the five-station gate loop run before a governed doc's status advances (needs the swe-flow plugin) |
| `.claude/hooks/session-freshness.mjs` | the freshness hook itself — advisory-only, offline-safe |
| `.github/workflows/ci.yml` | runs the govkit gate on every push/PR — the same checks, no Claude, no key |
| `docs/{product,rfc,adr,issues,domain,releases}/` | your governed artifacts; each dir has an `INDEX.md` |
| `.gitignore` | ignores the gate's journal and the plugins' preview scratch — but **not** `.govkit/` itself, since that is where your docs live under `--docs-root .govkit` |

### The three hooks

Worth knowing before one surprises you:

| Hook | Runs | Blocks? |
|---|---|---|
| `PreToolUse` on Write/Edit | `npx govkit audit-write` | **yes** — rejects a governed-doc write with bad front-matter, in-editor, no API key |
| `Stop` | `npx govkit check --hook` | **yes** — a failing gate stops the agent and returns the report, so a session cannot end on a red gate |
| `SessionStart` | the freshness script | no — advisory only, warns when your branch is behind upstream |

The `Stop` hook is the one people are surprised by. It is what makes the gate hard to ignore;
delete that block from `settings.json` if you would rather run the gate only in CI.

## Use it

```bash
npx govkit verify            # check front-matter + INDEX sync (what CI runs)
npx govkit init              # re-scaffold any missing pieces (idempotent)
```

**→ [The flow: one feature, start to finish](https://github.com/baodq97/govkit/blob/main/docs/the-flow.md)**
— which skill to invoke at which step, and what lands on disk. Start there; `AGENTS.md` in this
repo is the contract, that page is the walkthrough.

Three Claude Code plugins ride along in `.claude/settings.json` (`enabledPlugins`): **swe-flow**
(author governed PRD/RFC/ADR/US, run the `sdlc` + gate-loop workflows), **ddd-flow**
(domain modelling — the `docs/domain` artifacts swe-flow consumes), and **design-flow**
(the experience-design loop — `docs/ui` artifacts plus a live co-design view). On first open,
Claude Code asks you to trust the repo, then installs them from the govkit marketplace
automatically — no manual `plugin install` needed. Decline the prompt and everything no-key (hooks, CI, the
engine) still works; the plugins are the authoring layer, never the gate.

> This is a starting point — edit `govkit.yml` and `AGENTS.md` for your project. The engine
> reads them; nothing is hardcoded.
