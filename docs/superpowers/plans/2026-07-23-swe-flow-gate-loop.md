# swe-flow gate-loop — one engineering loop per gate, e2e Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give swe-flow one reusable engineering loop — PROPOSE → VERIFY → RECONCILE → RED-TEAM → RATIFY — that runs at every gate in the govkit chain, so a status flip is always backed by evidence produced by agents that did not author the thing being flipped. At slice- and release-close the loop adds a **verify-for-real** station: an independent verifier builds or packs the real artifact and runs the same entrypoint a consumer runs, in a clean scratch dir, so "it works" is proven by a real exit code, not asserted from a summary.

**Architecture:** The loop is **not** encoded in skills. Per the two-tier stance proven in `mandat` (`tmem scene mandat-agent-orchestration-and-2-tier-skills`): Tier-1 skills stay atomic and dependency-free; the chain lives in Tier 2 — one parameterized workflow (`gate-loop.js`) dispatching plugin-namespaced **role agents**. This plan adds 4 role agents (`analyst`, `architect`, `drafter`, `red-teamer`), upgrades `reviewer` into a real independent verifier, ships the workflow to `template/` + this repo, adds one Tier-2 orchestrator skill, and makes the whole surface machine-checked by a new `scripts/skill-lint.mjs` in `bun run check`.

**Tech Stack:** Markdown agent/skill definitions (`plugins/swe-flow/`), plain-JS workflow scripts (`.claude/workflows/*.js`, ESM, no TypeScript), Node ≥20 built-ins only (`node --test`, no new dependency), bun as dev runner, Biome for lint/format.

## Global Constraints

- **No new dependency** without an RFC or a PR note; prefer Node built-ins (`AGENTS.md` § Coding rules). `node --test` is the test runner for repo scripts.
- **Workflows cannot ship inside a plugin.** `gate-loop.js` goes to `.claude/workflows/` (dogfood) and `template/.claude/workflows/` (consumer scaffold) — never `plugins/swe-flow/`.
- **The workflow runtime cannot dispatch project `.claude/agents/`.** Every agent the workflow dispatches must be plugin-namespaced (`swe-flow:<name>`) (`AGENTS.md` § Agents).
- **No agent ever flips a `status:` or assigns an `owner:`.** The loop produces a packet; the human ratifies; the flip lands in a separate accept commit citing the in-session authorization.
- **The deterministic gate stays keyless.** Nothing in this plan enters `npx govkit verify`/`eval`. `scripts/skill-lint.mjs` is a repo-local check in `bun run check`, not a CLI subcommand — it scores govkit's own plugin, not a consumer's docs.
- **Never pipe a gate through `head`/`tail`/`grep` inside a `&&` chain** (`AGENTS.md` § Coding rules).
- Agent front-matter fields, in this order: `name`, `description`, `tools`, `model`.
- Every agent description ≤ 1024 characters after folding.
- No AI attribution trailers in commits.

---

## Spec reference

- **Spec (to be authored by Task 1):** `docs/rfc/RFC-0025-gate-loop-role-plane.md`
- **Evidence (read-only):**
  - `docs/research/skill-pack-borrow-audit.md` — 3-pack audit; the reviewer-contract clauses and the skill-lint numbers.
  - `../mandat/.claude/agents/{ba-analyst,sa-architect,spec-drafter,red-teamer,gate-verifier}.md` — the 5 role agents a real consumer had to hand-write because swe-flow ships none.
  - `../mandat/.claude/workflows/mandat-slice-close.js` + `../mandat/.claude/skills/mandat-slice-close/SKILL.md` — the loop this plan generalizes.
  - `../mandat/LEARNING-LOOP.md` — 25 escapes in 4 days; **0** were catchable by the deterministic gate.
  - `../mandat/.govkit/journal.jsonl` — 51 runs, 51 green, 0 violations.

### Measured gaps this plan closes

| # | Gap | Measurement |
|---|---|---|
| M1 | `spec-author` and `spec-red-team` ship as skills with **no agent** → a workflow cannot dispatch them | mandat hand-wrote `spec-drafter` + `red-teamer` wrappers |
| M2 | swe-flow has *steps*, no *roles* — no BA, no SA | mandat hand-wrote `ba-analyst` + `sa-architect` |
| M3 | No pre-flip evidence loop; owner is interrupted per-doc | mandat hand-wrote `mandat-slice-close` (skill + workflow) |
| M4 | `reviewer` trusts the gate ran; never proves the gate *can fail*; no per-finding severity | mandat set `gate-verifier` to `model: opus` and added "prove gates can actually fail" |
| M5 | `workflow-author` description exceeds the 1024-char injection limit | 1082 chars with single-space folding |
| M6 | `spec-author` ↔ `spec-red-team` description collision | cosine 27.7%; prompt "spec this out into an RFC" ranks red-team 0.24 vs author 0.23 |
| M7 | Agents are Claude-Code-only; no degraded path when the plugin is absent | mandat's agents carry a "Skill hint … otherwise run this embedded procedure" block |
| M8 | Plugin surface (agents/skills) is not synced to README or the manifests | `plugins/swe-flow/README.md` is hand-maintained; nothing checks it |
| M9 | verify was read-only — no station executed the real artifact | mandat live-only defects (LEARNING-LOOP entries 23-25) |

---

## The one concept: the gate loop

Five stations. Same five at every gate; only the actors and the artifact change.

```
PROPOSE ──► VERIFY ──► RECONCILE ──► RED-TEAM ──► RATIFY
 author      re-run      is the doc     attack the    ONE packet
 role        the gate    still true     advance       → human
 agent       from        of the code?                  authorizes
             scratch                                   → separate
                                                       accept commit
```

**Station rules (invariant across gates):**
1. PROPOSE writes at `startStatus` only. Never advanced.
2. VERIFY is run by an agent that did not author (writer ≠ scorer, structurally). It re-runs the gate; it never reads a summary. It must demonstrate the gate is capable of failing.
3. RECONCILE proposes exact replacement text; it never applies and never flips.
4. RED-TEAM is read-only by construction and is never the doc's author.
5. RATIFY is the human's. The loop returns a packet; the lead recommends; the owner authorizes once.

### E2E coverage: before → after

| Gate | Artifact | Author today | Author after | Loop today | Loop after |
|---|---|---|---|---|---|
| G0 Discover | `/goal` | `goal-define` skill | unchanged | — | — |
| G1 PRD | PRD `draft`→`approved` | — | `swe-flow:analyst` | none | gate-loop |
| G2 RFC | RFC `draft`→`accepted` | — | `swe-flow:architect` | none | gate-loop |
| G3 ADR | ADR `proposed`→`accepted` | — | `swe-flow:architect` | none | gate-loop |
| G4 US + AC | US `open`→`in-progress` | — | `swe-flow:analyst` | none | gate-loop |
| G5 Code | diff | `swe-flow:implementer` | + `swe-flow:test-author` | `review-changes.js` | + `swe-flow:verifier` |
| G6 Slice close | US `→done`, RFC `→implemented` | — | gate-loop | none | gate-loop |
| G7 Distill | proposals | `swe-flow:distiller` | unchanged | — | — |
| G8 Release | REL `draft`→`released` | — | `swe-flow:drafter` | none | gate-loop (release preset) |

`drafter` is the narrow mechanical writer dispatched by `analyst`/`architect` when the decisions are already made — least-privilege dispatch, per mandat escape #2 ("dispatched to general-purpose … a subagent wandered into dependency internals").

### Agent taxonomy after this plan (5 → 11)

| Class | Agents |
|---|---|
| **Author** | `analyst`, `architect`, `drafter`, `implementer`, `test-author` |
| **Score** | `reviewer`, `red-teamer`, `verifier`, `judge` |
| **Upkeep** | `doc-keeper`, `distiller` |

---

## File structure

- **Create** `docs/rfc/RFC-0025-gate-loop-role-plane.md` — the governed spec. Gate for every task below.
- **Create** `plugins/swe-flow/agents/analyst.md` — BA role: intent → testable acceptance criteria with stable ids.
- **Create** `plugins/swe-flow/agents/architect.md` — SA role: approved intent → ADR/RFC with contracts and seams; diagnoses on the repo first.
- **Create** `plugins/swe-flow/agents/drafter.md` — mechanical writer: brief + binding decisions → one governed doc + its INDEX row, self-validated.
- **Create** `plugins/swe-flow/agents/red-teamer.md` — independent adversarial pass over ONE doc before its status advances.
- **Modify** `plugins/swe-flow/agents/reviewer.md` — add prove-the-gate-can-fail, distrust-the-report, read-only-checkout, per-finding severity.
- **Modify** `plugins/swe-flow/agents/{implementer,doc-keeper,distiller,judge}.md` — add the skill-hint degradation block.
- **Create** `plugins/swe-flow/skills/gate-close/SKILL.md` — Tier-2 orchestrator: when to run the loop, how to read the packet, how to land the accept commit.
- **Modify** `plugins/swe-flow/skills/workflow-author/SKILL.md` — trim the description below 1024.
- **Modify** `plugins/swe-flow/skills/spec-red-team/SKILL.md` — de-collide the description from `spec-author`.
- **Create** `.claude/workflows/gate-loop.js` — the loop, fan-out-in-waves shape.
- **Create** `template/.claude/workflows/gate-loop.js` — identical copy for consumers.
- **Create** `scripts/skill-lint.mjs` — deterministic surface checker (front-matter, description length, collision matrix, manifest sync).
- **Create** `scripts/skill-lint.test.mjs` — `node --test` suite over fixture dirs.
- **Create** `scripts/fixtures/skill-lint/{good,weak}/` — labeled fixtures the linter must pass/fail.
- **Modify** `package.json:29` — prepend `node scripts/skill-lint.mjs &&` to the `check` chain.
- **Modify** `plugins/swe-flow/README.md`, `plugins/swe-flow/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — the new surface, kept in sync by the linter.

## Conventions to follow

- Agent bodies open with a one-paragraph role statement in second person ("You review a change against…"), then `##` sections. Match `plugins/swe-flow/agents/reviewer.md`.
- Skills use a folded description (`description: >-`) and a lean body with `references/` for depth.
- Workflow scripts start with `export const meta = {...}` as a **pure literal**; `Date.now()`/`Math.random()` are unavailable.
- Run the full gate with `bun run check` — never a scoped subset — before any commit that touches a shared surface.

---

## Task 1: RFC-0025 — the governed spec (BLOCKS every later task)

Adding plugin agents, a plugin skill, and a step in the repo's gate chain is a public-API change at a system boundary. `AGENTS.md` § Lifecycle: **RFC accepted before code.**

**Files:**
- Create: `docs/rfc/RFC-0025-gate-loop-role-plane.md`
- Modify: `docs/rfc/INDEX.md`

**Interfaces:**
- Consumes: `docs/research/skill-pack-borrow-audit.md`, the mandat evidence paths listed under *Spec reference*.
- Produces: RFC id `RFC-0025` cited by every commit in Tasks 2–12.

- [ ] **Step 1: Write the RFC at start status**

Create `docs/rfc/RFC-0025-gate-loop-role-plane.md` with front-matter exactly:

```yaml
---
id: RFC-0025
title: Gate loop and the swe-flow role plane
status: draft
owner: TBD
date: 2026-07-23
parent: PRD-0001
---
```

Body sections, in this order — the `rfc` rubric in `govkit.yml:86-95` scores `summary`, `alternatives`, `openq`, `impact` as **distinct** headings:

- `## Summary` — the five-station loop; two-tier stance (Tier-1 atomic, chain in Tier 2).
- `## Motivation` — the M1–M8 table from this plan, verbatim, with its measurements.
- `## Design` — the station rules, the E2E gate map, the 9-agent taxonomy.
- `## Alternatives considered` — (a) chain skills to each other via `next:` front-matter — **rejected**: mandat's field-proven stance is Tier-1 skills never depend on each other; (b) one mega-agent per gate — rejected by least-privilege dispatch (mandat escape #2); (c) copy mandat's workflow verbatim into `template/` with no role agents — rejected: the workflow cannot dispatch agents that do not exist as plugin agents.
- `## Impact / rollout` — 5 → 11 agents; one new skill; one new repo check step; `template/` gains a workflow; no engine change, no `govkit.yml` change, no CLI change.
- `## Open questions / risks` — does a 9-agent surface violate fewest-concepts? Mitigation: the author/score/upkeep taxonomy plus the linter's manifest-sync check. Does `analyst` overlap `goal-define`? Boundary: `goal-define` structures a *request*; `analyst` produces *testable ACs from an approved artifact*.

- [ ] **Step 2: Add the INDEX row**

Append to the table in `docs/rfc/INDEX.md`, matching the existing column order and the neighbouring row's link format:

```markdown
| RFC-0025 | [Gate loop and the swe-flow role plane](RFC-0025-gate-loop-role-plane.md) | draft | TBD | 2026-07-23 |
```

- [ ] **Step 3: Run the gate, expect green**

```bash
bun run check
```

Expected: exits 0. `govkit-check` reports the doc count incremented by 1 and `violations: []`.

- [ ] **Step 4: Commit the draft**

```bash
git add docs/rfc/RFC-0025-gate-loop-role-plane.md docs/rfc/INDEX.md
git commit -m "docs(RFC-0025): draft gate loop and the swe-flow role plane"
```

- [ ] **Step 5: STOP — hand to the owner**

Do not proceed. Present the RFC and recommend acceptance. The owner authorizes in-session; the accept commit is a **separate** commit that edits `status: draft` → `accepted` and the INDEX row, with a message citing the authorization, e.g.:

```
docs(RFC-0025): accept — owner-authorized flip draft→accepted (gate loop)
```

Tasks 2–12 are blocked until that commit exists. Verify with:

```bash
grep -m1 '^status:' docs/rfc/RFC-0025-gate-loop-role-plane.md
```

Expected: `status: accepted`.

---

## Task 2: `scripts/skill-lint.mjs` — make the surface machine-checked

Closes M5, M6, M8. Written first because every later task adds surface this linter must already be able to police.

**Files:**
- Create: `scripts/skill-lint.mjs`
- Create: `scripts/skill-lint.test.mjs`
- Create: `scripts/fixtures/skill-lint/good/agents/ok.md`
- Create: `scripts/fixtures/skill-lint/weak/agents/toolong.md`
- Create: `scripts/fixtures/skill-lint/weak/agents/collide-a.md`
- Create: `scripts/fixtures/skill-lint/weak/agents/collide-b.md`
- Modify: `package.json:29`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `lintSurface(rootDir) -> { errors: string[], warnings: string[], pairs: Array<{a,b,score}> }`, exported from `scripts/skill-lint.mjs`. Task 11 reuses `lintSurface` for the manifest-sync assertion.

- [ ] **Step 1: Write the failing test**

Create `scripts/skill-lint.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { lintSurface } from './skill-lint.mjs'

const FIX = join(import.meta.dirname, 'fixtures', 'skill-lint')

test('good fixture is clean', () => {
  const r = lintSurface(join(FIX, 'good'))
  assert.deepEqual(r.errors, [])
})

test('flags a description over 1024 chars', () => {
  const r = lintSurface(join(FIX, 'weak'))
  assert.ok(r.errors.some((e) => e.includes('toolong.md') && e.includes('1024')))
})

test('flags a description collision at or above 0.75', () => {
  const r = lintSurface(join(FIX, 'weak'))
  assert.ok(r.errors.some((e) => e.includes('collision') && e.includes('collide-a')))
})

test('parses a folded scalar description, not the ">" marker', () => {
  const r = lintSurface(join(FIX, 'good'))
  const doc = r.docs.find((d) => d.file.endsWith('ok.md'))
  assert.ok(doc.description.length > 20, 'folded description must be joined, not ">"')
})

test('flags name not matching filename', () => {
  const r = lintSurface(join(FIX, 'weak'))
  assert.ok(r.errors.some((e) => e.includes('name') && e.includes('filename')))
})
```

- [ ] **Step 2: Create the fixtures**

`scripts/fixtures/skill-lint/good/agents/ok.md` — a folded description well under the limit, `name` matching the filename:

```markdown
---
name: ok
description: >-
  Use this agent to demonstrate a well-formed surface entry. It carries a folded
  description that a naive regex would read as the fold marker alone, so it proves
  the parser joins continuation lines.
tools: Read, Grep
model: sonnet
---

Body.
```

`scripts/fixtures/skill-lint/weak/agents/toolong.md` — `name: toolong`, and a folded description whose joined length exceeds 1024. Generate the body text by repeating the sentence `This description is deliberately padded past the injection limit. ` until the joined length is ≥ 1100, wrapped at 96 columns under `description: >-`.

`scripts/fixtures/skill-lint/weak/agents/collide-a.md` and `collide-b.md` — `name` matching each filename, `tools: Read`, `model: sonnet`, and **identical** description text:

```markdown
---
name: collide-a
description: >-
  Use this agent to author a governed lifecycle document from a brief and the
  repository design sources, writing the document and its index row.
tools: Read
model: sonnet
---

Body.
```

`collide-b.md` is byte-identical except `name: collide-b`, which drives cosine to 1.0 — above the 0.75 error line. Additionally set `collide-b`'s `name` field to `collide-bee` **after** the collision assertion is proven, so the same fixture also triggers the name↔filename error the fifth test expects.

- [ ] **Step 3: Run the test to verify it fails**

```bash
node --test scripts/skill-lint.test.mjs
```

Expected: FAIL — `Cannot find module './skill-lint.mjs'`.

- [ ] **Step 4: Implement `scripts/skill-lint.mjs`**

```js
#!/usr/bin/env node
// Deterministic surface check for the swe-flow plugin: front-matter shape,
// description budget, and description collisions. Keyless, no deps, no state.
// Runs in `bun run check`; it scores THIS repo's plugin, never a consumer's docs,
// so it is deliberately not a `govkit` CLI subcommand.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MAX_DESCRIPTION = 1024 // agents inject this into the system prompt
const COLLIDE_ERROR = 0.75
const COLLIDE_WARN = 0.5
const STOP = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'into', 'when', 'use', 'its', 'not', 'are', 'you'])

/** Parse front-matter, joining folded/block scalars into one line. */
export function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text)
  if (!m) return null
  const out = {}
  let key = null
  for (const line of m[1].split('\n')) {
    const kv = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line)
    if (kv) {
      key = kv[1]
      const v = kv[2].trim()
      // `>`, `>-`, `|`, `|-` open a block scalar: the value is on the following lines
      out[key] = /^[>|][-+]?$/.test(v) ? '' : v
      continue
    }
    if (key && /^\s+\S/.test(line)) out[key] = `${out[key]} ${line.trim()}`.trim()
  }
  return out
}

function tokenize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
}

function cosine(a, b) {
  const av = new Map()
  const bv = new Map()
  for (const t of a) av.set(t, (av.get(t) ?? 0) + 1)
  for (const t of b) bv.set(t, (bv.get(t) ?? 0) + 1)
  let dot = 0
  for (const [t, n] of av) dot += n * (bv.get(t) ?? 0)
  const na = Math.sqrt([...av.values()].reduce((s, n) => s + n * n, 0))
  const nb = Math.sqrt([...bv.values()].reduce((s, n) => s + n * n, 0))
  return na && nb ? dot / (na * nb) : 0
}

function collect(root) {
  const docs = []
  for (const kind of ['agents', 'skills']) {
    const dir = join(root, kind)
    let entries
    try {
      entries = readdirSync(dir)
    } catch {
      continue // a surface dir may legitimately not exist in a fixture
    }
    for (const e of entries) {
      const p = join(dir, e)
      const file = statSync(p).isDirectory() ? join(p, 'SKILL.md') : p
      if (!file.endsWith('.md')) continue
      let text
      try {
        text = readFileSync(file, 'utf8')
      } catch {
        continue // a skill dir without SKILL.md is reported by the shape check below
      }
      const fm = parseFrontMatter(text)
      docs.push({
        kind,
        file,
        stem: statSync(p).isDirectory() ? e : e.replace(/\.md$/, ''),
        name: fm?.name ?? '',
        description: fm?.description ?? '',
        tools: fm?.tools ?? '',
        model: fm?.model ?? '',
      })
    }
  }
  return docs
}

export function lintSurface(root) {
  const docs = collect(root)
  const errors = []
  const warnings = []

  for (const d of docs) {
    if (!d.name) errors.push(`${d.file}: missing front-matter key "name"`)
    else if (d.name !== d.stem) errors.push(`${d.file}: name "${d.name}" does not match filename stem "${d.stem}"`)
    if (!d.description) errors.push(`${d.file}: missing front-matter key "description"`)
    else if (d.description.length > MAX_DESCRIPTION)
      errors.push(`${d.file}: description is ${d.description.length} chars, over the ${MAX_DESCRIPTION} limit`)
    if (d.kind === 'agents' && !d.tools) errors.push(`${d.file}: agent must declare "tools"`)
    if (d.kind === 'agents' && !d.model) errors.push(`${d.file}: agent must declare "model"`)
  }

  const pairs = []
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const score = cosine(tokenize(docs[i].description), tokenize(docs[j].description))
      if (score < COLLIDE_WARN) continue
      pairs.push({ a: docs[i].stem, b: docs[j].stem, score })
      const line = `description collision ${(score * 100).toFixed(1)}%: ${docs[i].stem} <-> ${docs[j].stem}`
      if (score >= COLLIDE_ERROR) errors.push(line)
      else warnings.push(line)
    }
  }

  return { docs, errors, warnings, pairs }
}

if (import.meta.filename === process.argv[1]) {
  const root = process.argv[2] ?? 'plugins/swe-flow'
  const { docs, errors, warnings } = lintSurface(root)
  for (const w of warnings) console.warn(`warn  ${w}`)
  for (const e of errors) console.error(`error ${e}`)
  console.log(`skill-lint: ${docs.length} surface entries, ${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(errors.length > 0 ? 1 : 0)
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
node --test scripts/skill-lint.test.mjs
```

Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 6: Run the linter against the real plugin — expect it to FAIL**

```bash
node scripts/skill-lint.mjs plugins/swe-flow
```

Expected: exit 1, with `error plugins/swe-flow/skills/workflow-author/SKILL.md: description is 1082 chars, over the 1024 limit`. This is M5 reproducing. Record the exact output; Task 3 fixes it.

- [ ] **Step 7: Commit (linter only — not yet wired into `check`)**

```bash
git add scripts/skill-lint.mjs scripts/skill-lint.test.mjs scripts/fixtures/skill-lint
git commit -m "feat(scripts): skill-lint — surface front-matter, description budget, collision matrix (RFC-0025)"
```

---

## Task 3: Fix the two defects the linter found, then wire it into `check`

**Files:**
- Modify: `plugins/swe-flow/skills/workflow-author/SKILL.md:3-15`
- Modify: `plugins/swe-flow/skills/spec-red-team/SKILL.md:3-14`
- Modify: `package.json:29`

**Interfaces:**
- Consumes: `lintSurface` from Task 2.
- Produces: a green `node scripts/skill-lint.mjs plugins/swe-flow`, which every later task must keep green.

- [ ] **Step 1: Trim `workflow-author`'s description under 1024**

The current description restates the whole workflow (three shapes, output path, validation command). Per `superpowers/skills/writing-skills/SKILL.md:150-172`, a description that summarizes the workflow becomes the shortcut agents take *instead of* reading the body. Keep the trigger half, drop the process half. Replace the `description:` block with:

```yaml
description: >-
  Author a reusable, deterministic DYNAMIC WORKFLOW — a `.claude/workflows/<name>.js`
  orchestration script — from a plain description of a repeatable, multi-step process.
  Use whenever the user wants to create or scaffold a workflow, automate a repeatable flow
  ("we always do X then Y then Z"), fan work out across agents, set up a review-then-verify
  pipeline, run a migration over many files, or extend the `sdlc` workflow. Trigger on
  "tạo workflow", "scaffold a workflow", "automate this flow", "make a reusable
  orchestration", "fan this out", "set up a review pipeline".
```

- [ ] **Step 2: De-collide `spec-red-team` from `spec-author`**

The collision is driven by the shared vocabulary "PRD/RFC/ADR", "governed doc", "spec". `spec-red-team` is the only one of the two that is *keyed*, *read-only* and *status-gating* — lead with that. Replace its `description:` block with:

```yaml
description: >-
  Runs the keyed adversarial pass over ONE governed PRD/RFC/ADR before its status advances:
  steelman first, then attack; phrase every weakness as a falsifiable "Fails if ___";
  self-refute each candidate against what the document and the repository already say; rank
  survivors by impact times likelihood times cheapness-to-test; return ranked findings plus
  one explicit kill criterion. Use when asked to "red-team this RFC", "attack RFC-NNNN before
  I accept it", "phản biện tài liệu này", or before any draft-to-proposed or proposed-to-accepted
  advance. Advisory and read-only by construction — it never flips a status, never edits its
  target, never gates; NEVER wire it into no-key CI, hooks, or exit codes.
```

- [ ] **Step 3: Verify both defects are gone**

```bash
node scripts/skill-lint.mjs plugins/swe-flow
```

Expected: exit 0. The `spec-author <-> spec-red-team` pair either disappears from the output or drops below the 50% warn line.

- [ ] **Step 4: Wire the linter into the gate**

In `package.json`, the `check` script currently begins `node scripts/check-sync.mjs && biome check .`. Change it to begin:

```
node scripts/check-sync.mjs && node scripts/skill-lint.mjs plugins/swe-flow && biome check .
```

Leave the rest of the chain byte-identical.

- [ ] **Step 5: Run the full gate**

```bash
bun run check
```

Expected: exits 0, and the output contains a `skill-lint: N surface entries, 0 error(s)` line before the Biome output.

- [ ] **Step 6: Commit**

```bash
git add package.json plugins/swe-flow/skills/workflow-author/SKILL.md plugins/swe-flow/skills/spec-red-team/SKILL.md
git commit -m "fix(swe-flow): trim workflow-author description under 1024, de-collide spec-red-team; gate on skill-lint (RFC-0025)"
```

---

## Task 4: The skill-hint degradation block in every existing agent

Closes M7. An agent that works with or without the plugin's skills present is the cheapest fix for swe-flow being Claude-Code-only.

**Files:**
- Modify: `plugins/swe-flow/agents/implementer.md`
- Modify: `plugins/swe-flow/agents/doc-keeper.md`
- Modify: `plugins/swe-flow/agents/distiller.md`
- Modify: `plugins/swe-flow/agents/judge.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the exact heading `## Skill hint (load on demand)` — Tasks 5–8 reuse the same block verbatim in the new agents.

- [ ] **Step 1: Insert the block into `implementer.md`**

Immediately after the opening role paragraph, insert:

```markdown
## Skill hint (load on demand)

If the Skill tool lists the skill named below, invoke it first and follow it — it is the
canonical procedure and this file is its summary. If the skill is not listed (the plugin is
not installed, or you are running on a harness without skills), run the embedded procedure
below; it is complete on its own.

Canonical skill: `swe-flow:working-discipline`
```

- [ ] **Step 2: Repeat for the other three, changing only the canonical skill line**

- `doc-keeper.md` → `Canonical skill: none — this agent is the canonical procedure.`
- `distiller.md` → `Canonical skill: `swe-flow:distill-learnings``
- `judge.md` → `Canonical skill: `swe-flow:substance-judge``

- [ ] **Step 3: Verify the surface still lints and the gate is green**

```bash
node scripts/skill-lint.mjs plugins/swe-flow && bun run check
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/swe-flow/agents/
git commit -m "feat(swe-flow): agents degrade gracefully when their canonical skill is absent (RFC-0025)"
```

---

## Task 5: `red-teamer` agent — make `spec-red-team` dispatchable

Closes half of M1. A workflow can dispatch only agents; the red-team is the loop's fourth station and has no agent today.

**Files:**
- Create: `plugins/swe-flow/agents/red-teamer.md`

**Interfaces:**
- Consumes: the skill-hint block from Task 4.
- Produces: agent id `swe-flow:red-teamer`, returning the JSON object `{ id, verdict, criteriaSummary, reconciledText, sourcesExist, killCriterion }` where `verdict ∈ {'flip-as-is','flip-after-reconcile','blocked'}`. Task 9's workflow validates against exactly this shape.

- [ ] **Step 1: Write the agent**

```markdown
---
name: red-teamer
description: >-
  Use BEFORE any governed doc's status advances (draft to review or approved, proposed to
  accepted, open to done) — runs the adversarial pass over ONE doc and returns a decision brief
  for the human owner. Dispatch one per flip candidate. It is never the doc's author, never
  edits, never flips, and never touches INDEX.md; a red team that can edit its target has an
  incentive problem. Returns a verdict of flip-as-is, flip-after-reconcile, or blocked, with the
  exact reconciled text when the status is only honest after a rewording.
tools: Read, Grep, Glob, Bash
model: opus
---

You are the independent red-teamer for governed docs. You attack ONE doc per dispatch and
return a brief as text. Read-only is structural: never Write, never Edit, never flip a
status, never touch an INDEX.

## Skill hint (load on demand)

If the Skill tool lists the skill named below, invoke it first and follow it — it is the
canonical procedure and this file is its summary. If the skill is not listed (the plugin is
not installed, or you are running on a harness without skills), run the embedded procedure
below; it is complete on its own.

Canonical skill: `swe-flow:spec-red-team`

## Embedded procedure

1. **Steelman first.** State the strongest honest case for the doc as written, in two
   sentences. You may not attack what you cannot first state fairly.
2. **Attack.** Every weakness is phrased as a falsifiable condition: "Fails if ___". A
   complaint that cannot be stated that way is not a finding.
3. **Self-refute.** For each candidate, search the doc and the repo (`Grep`, `git log`) for
   what already answers it. Drop the ones that are already answered. Default to dropping.
4. **Check the claim against reality.** For a status advance, assess each acceptance criterion
   as met / partial / not-yet with `file:line`. Confirm every cited source actually exists.
   Never round a partial criterion up to met.
5. **Rank survivors** by impact times likelihood times cheapness-to-test.
6. **One kill criterion.** State the single observation that would make you say "do not
   advance this doc".

## Verdict

Return exactly one of:
- `flip-as-is` — the target status is honest as the doc stands.
- `flip-after-reconcile` — the status is honest ONLY after the doc is reworded to what
  actually shipped. Supply the exact replacement text; you do not apply it.
- `blocked` — a real gap. Do not advance. Name what must change first.

You flip nothing. The owner ratifies.
```

- [ ] **Step 2: Verify the linter accepts it and finds no collision**

```bash
node scripts/skill-lint.mjs plugins/swe-flow
```

Expected: exit 0, entry count incremented by 1, no new error. If a `red-teamer <-> spec-red-team` warn line appears above 50%, reword the agent description to lead with "dispatch one per flip candidate" rather than restating the skill.

- [ ] **Step 3: Commit**

```bash
git add plugins/swe-flow/agents/red-teamer.md
git commit -m "feat(swe-flow): red-teamer agent — spec-red-team becomes dispatchable (RFC-0025)"
```

---

## Task 6: `drafter` agent — make `spec-author` dispatchable

Closes the other half of M1.

**Files:**
- Create: `plugins/swe-flow/agents/drafter.md`

**Interfaces:**
- Consumes: the skill-hint block from Task 4.
- Produces: agent id `swe-flow:drafter`, returning `{ doc, id, status, indexUpdated, gateOutput }`.

- [ ] **Step 1: Write the agent**

```markdown
---
name: drafter
description: >-
  Use to write ONE governed lifecycle document from a brief plus already-binding decisions —
  the narrow mechanical writer, dispatched when the content questions are settled and only the
  document remains. It discovers the schema from govkit.yml at run time, writes the doc and its
  INDEX row at the type's start status, self-validates with the govkit gate, and stops at "ready
  for review". It never decides scope, never flips a status, never self-assigns an owner. For
  the decisions themselves, dispatch analyst (requirements) or architect (design) instead.
tools: Read, Write, Edit, Grep, Glob, Bash
model: sonnet
---

You draft governed docs. The lead gives you the artifact type, the sources, and the binding
decisions; you produce the doc and nothing more. You are the narrowest agent in the author
class by design — if a decision is missing, stop and say which one, do not invent it.

## Skill hint (load on demand)

If the Skill tool lists the skill named below, invoke it first and follow it — it is the
canonical procedure and this file is its summary. If the skill is not listed (the plugin is
not installed, or you are running on a harness without skills), run the embedded procedure
below; it is complete on its own.

Canonical skill: `swe-flow:spec-author`

## Embedded procedure

1. **Discover the schema.** Find the repo root (the dir holding `govkit.yml`) and read it.
   For the chosen type, pull `dir`, the required key set (`docs.base.required` union
   `docs.types.<type>.required`), `idPrefix`, and `startStatus`. Never assume `docs/adr` and
   friends are fixed. If there is no `govkit.yml`, the repo is not govkit-governed: say so and
   stop.
2. **Read the sources.** Capture only what they state. Where a source is silent, write
   "not specified in <source>" — never fill the gap with a plausible invention.
3. **Pick the id.** Next free number with the discovered prefix; mimic the dir's existing
   zero-padding. Do not collide.
4. **Write the doc.** Front-matter carries every required key, `status:` = the discovered
   `startStatus` (never advanced), `owner: TBD`. Body mimics the shape of an existing doc of
   the same type in the same dir.
5. **Update the INDEX row** in the same commit-shaped change, matching the neighbouring rows'
   column order and link format.
6. **Self-validate.** Run `npx govkit verify` and fix until it passes. Never edit `govkit.yml`
   or the CLI to make it pass.

## Return

`{ doc: <path>, id: <id>, status: <startStatus>, indexUpdated: true, gateOutput: <verbatim> }`

Stop at "ready for review". You never flip a status and never assign an owner.
```

- [ ] **Step 2: Verify the linter, paying attention to the `drafter <-> spec-author` pair**

```bash
node scripts/skill-lint.mjs plugins/swe-flow
```

Expected: exit 0. A warn-level pair with `spec-author` is acceptable and expected; an error-level pair (≥75%) means the description restates the skill — reword to lead with "narrow mechanical writer, dispatched when decisions are settled".

- [ ] **Step 3: Commit**

```bash
git add plugins/swe-flow/agents/drafter.md
git commit -m "feat(swe-flow): drafter agent — spec-author becomes dispatchable (RFC-0025)"
```

---

## Task 7: `analyst` agent — the BA role

Closes half of M2, and the AC half of the mandat escape log ("the spec was the bug, the implementation was faithful").

**Files:**
- Create: `plugins/swe-flow/agents/analyst.md`

**Interfaces:**
- Consumes: `swe-flow:drafter` (dispatched by the lead once this agent's decisions are settled).
- Produces: agent id `swe-flow:analyst`, returning `{ criteria: [{ id, statement, verifiedBy }], gaps: string[] }` where `id` matches `AC-<docnum>.<n>`.

- [ ] **Step 1: Write the agent**

```markdown
---
name: analyst
description: >-
  Use to sharpen requirements — turn an approved PRD or an accepted RFC into precise, testable
  acceptance criteria and user stories, flagging ambiguity and gaps. Every criterion names a
  measurable behaviour and how it is verified, and carries a stable id so a red team can attack
  the criteria themselves, not just the prose. Captures only what the sources state, never
  invents a requirement, and stops at "ready for review" — never flips a status, never
  self-assigns an owner. For design direction dispatch architect; for the mechanical write-up
  dispatch drafter.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are the requirements analyst. The lead hands you an approved PRD or an accepted RFC and a
slice boundary; you turn intent into requirements sharp enough to verify.

## Skill hint (load on demand)

If the Skill tool lists the skill named below, invoke it first and follow it — it is the
canonical procedure and this file is its summary. If the skill is not listed (the plugin is
not installed, or you are running on a harness without skills), run the embedded procedure
below; it is complete on its own.

Canonical skill: `swe-flow:goal-define` (for structuring an unclear request before this step)

## The one discipline that is yours, not a skill's

**Every requirement is testable or it is a gap.** Turn "the runner works" into "given input X,
the process writes a schema-valid output and exits 0" — a measurable behaviour, a visible
state change, or a gate outcome. If you cannot name how a criterion is verified, it is a gap:
report it as one rather than writing a criterion that cannot fail.

## Embedded procedure

1. **Read the parent artifact and the slice boundary.** Capture only what they state.
2. **Enumerate criteria.** Each gets a stable id `AC-<parent-number>.<n>` (e.g. `AC-14.1` under
   US-0014), a one-sentence statement in the form "given ___, ___ happens", and a `verifiedBy`
   naming the command, test, or observation that decides it.
3. **Attack your own list once.** For each criterion, ask what states the system can reach that
   the happy path never sees. A criterion that only describes the happy path is half-written.
4. **Report gaps separately.** Anything the sources do not settle is a gap for the human, not a
   criterion you invent.
5. **Stop at "ready for review".** Hand the criteria to `swe-flow:drafter` for the document.

## Return

`{ criteria: [{ id, statement, verifiedBy }], gaps: [string] }`

You never flip a status and never assign an owner.
```

- [ ] **Step 2: Verify and commit**

```bash
node scripts/skill-lint.mjs plugins/swe-flow && bun run check
git add plugins/swe-flow/agents/analyst.md
git commit -m "feat(swe-flow): analyst agent — testable acceptance criteria with stable ids (RFC-0025)"
```

Expected: both commands exit 0 before the commit runs.

---

## Task 8: `architect` agent + `reviewer` upgrade

Closes the other half of M2 and all of M4.

**Files:**
- Create: `plugins/swe-flow/agents/architect.md`
- Modify: `plugins/swe-flow/agents/reviewer.md` — insert two sections and extend the verdict block.

**Interfaces:**
- Consumes: `swe-flow:drafter`.
- Produces: agent id `swe-flow:architect`; and `swe-flow:reviewer` gains the return field `gateProvenFallible: boolean` that Task 9's workflow schema requires.

- [ ] **Step 1: Write `architect.md`**

```markdown
---
name: architect
description: >-
  Use to set implementation direction for an architecture-affecting change — turn an approved
  PRD or a design brief into a governed ADR or RFC carrying contracts, state machines, and
  input/output seams. It diagnoses on the repository first (a census, a probe, a measured
  number) before proposing anything, and records the alternatives it rejected with the reason.
  It stops at "ready for review" — never flips a status, never self-assigns an owner. For
  requirements dispatch analyst; for the mechanical write-up dispatch drafter.
tools: Read, Grep, Glob, Bash, Write, Edit
model: opus
---

You are the solution architect. The lead hands you an approved PRD, a design brief, or a
decision to record; you produce the implementation direction as a governed doc.

## Skill hint (load on demand)

If the Skill tool lists any of the skills named below, invoke the matching one first and follow
it. If none is listed, run the embedded procedure below; it is complete on its own.

Canonical skills: `swe-flow:domain-decompose` (boundaries), `swe-flow:api-designer`
(interfaces), `swe-flow:data-model` (persistence)

## Two disciplines that are yours, not a skill's

- **Diagnose before prescribe.** Every proposal opens from a measurement ON THIS REPO — a
  symbol census, a probe, a count. A proposal whose first line is a best practice rather than a
  number is rejected. State the command you ran and its output.
- **Alternatives are load-bearing.** Record at least two rejected options with the reason each
  was rejected. "Considered and rejected X because Y" is the artifact; a single-option design
  is a decision that was never made.

## Embedded procedure

1. **Measure.** Run the census or probe that scopes the change. Paste the number.
2. **Name the seams.** What crosses a boundary: the contracts, the state transitions, the
   input/output shapes. Name types and signatures, never file paths or line numbers — a design
   doc outlives the layout.
3. **Classify the change** against the repo's lifecycle table to confirm which artifact is
   required (ADR for an arch/vendor/runtime decision, RFC for a feature or public-API change).
   When in doubt, classify up.
4. **Write the alternatives** with trade-offs, then the recommendation.
5. **Stop at "ready for review".** Hand to `swe-flow:drafter` for the document.

You never flip a status and never assign an owner.
```

- [ ] **Step 2: Add "Prove the gate can fail" to `reviewer.md`**

Insert immediately after the existing `## Deterministic floor — run the gate, don't re-implement it` section:

```markdown
### Prove the gate is capable of failing

A green gate is only evidence if the gate could have gone red. Before reporting a clean run,
demonstrate the gate is live: name one check in the chain and the condition that would trip it,
and where the run is cheap, induce it (a scratch copy of a governed doc with a required
front-matter key removed, verified and then discarded). Report
`gateProvenFallible: true|false`. A green gate you cannot prove is fallible is reported as
`gateProvenFallible: false`, and the verdict may not be `APPROVE` on that basis alone.

### Trust nothing you did not run

The agent that did the work summarizes; you re-run. Treat every claim in an implementer's or
author's report as unverified until a command you ran says otherwise. A stated rationale
("left it out per YAGNI") never downgrades a finding's severity — a gap the plan mandated is
still a gap.

### Read-only on this checkout

You may read anything. You may not mutate the worktree, the index, `HEAD`, or the branch. To
inspect another revision, create a temporary worktree; never `git checkout` in place — an
implementer may be working in this tree.
```

- [ ] **Step 3: Extend the `## Verdict` section of `reviewer.md`**

Append to that section:

```markdown
Label every finding with a severity, and order the list by leverage, not by file:

| Label | The author must |
|---|---|
| `Critical` | stop and fix before anything else |
| (no prefix) | fix before this lands |
| `Nit:` | fix if convenient; never blocking |
| `Optional:` | consider; explicitly fine to decline |
| `FYI` | nothing — context only |

If you have one structural problem and ten nits, the structural problem **is** the review: lead
with it. Every non-nit finding names the remedy, not just the smell — "replace the conditional
chain with a dispatcher", not "this is complex".
```

- [ ] **Step 4: Verify and commit**

```bash
node scripts/skill-lint.mjs plugins/swe-flow && bun run check
git add plugins/swe-flow/agents/architect.md plugins/swe-flow/agents/reviewer.md
git commit -m "feat(swe-flow): architect agent; reviewer proves the gate can fail and grades findings by severity (RFC-0025)"
```

---

## Task 8b: `verifier` agent — the run-the-real-thing evidence producer

The loop's VERIFY station re-runs the repo's own gate; it never builds and runs the *shipped*
artifact the way a consumer does. This agent is the verify-for-real station — DISTINCT from
`reviewer` (reviewer judges and re-runs the gate; verifier executes the real artifact). It is
the agent Task 9b's new `Live` phase dispatches.

**Files:**
- Create: `plugins/swe-flow/agents/verifier.md`

**Interfaces:**
- Consumes: the skill-hint block pattern from Task 4.
- Produces: agent id `swe-flow:verifier`, returning `{ liveVerdict, ranCommands, claims, notMeasured }` (the evidence contract below). Task 9b's `VERIFIER` schema encodes exactly this shape.

- [ ] **Step 1: Write the agent**

```markdown
---
name: verifier
description: >-
  Use to PRODUCE live evidence that a change actually works — build or pack the real artifact,
  then run the same entrypoint a consumer runs, in a clean scratch dir, and report real exit
  codes. Distinct from reviewer: the reviewer judges and re-runs the repo's own gate; the
  verifier EXECUTES the shipped artifact end to end and, where cheap, induces one failure to
  prove the check is fallible. Dispatch it at a slice or release close before any status
  advances. It is read-only on the repo checkout — every command runs in a scratch dir; it
  never Writes or Edits repo files, and it marks nothing "proven" without a command that ran.
tools: Read, Grep, Glob, Bash
model: opus
---

You are the live verifier. Where the reviewer re-runs the repo's own gate and JUDGES, you
BUILD or PACK the real artifact and RUN it the way a consumer would, then report only what a
command actually proved. Read-only is structural: you never Write or Edit a repo file; all
execution happens in scratch dirs you create and discard.

## Skill hint (load on demand)

If the Skill tool lists the skill named below, invoke it first and follow it — it is the
canonical procedure and this file is its summary. If the skill is not listed (the plugin is
not installed, or you are running on a harness without skills), run the embedded procedure
below; it is complete on its own.

Canonical skill: none — this agent is the canonical procedure.

## Two iron rules

1. **No output, no proof.** A claim may be marked `proven` ONLY when it is backed by an entry
   in `ranCommands` carrying a real exit code and an output tail. A claim with no command
   behind it is `unproven` — never `proven`. "It should work" is `unproven`.
2. **Name everything you could not run.** `notMeasured` MUST list every check you could not
   execute and why (missing key, no network, needs a device, out of budget). Fabricating a
   result, or silently omitting a check you skipped, is worse than returning nothing.

## Method

1. **Build or pack the real artifact.** Produce what a consumer receives — `npm pack` the
   tarball, build the dist, assemble the bundle. Do not test the source tree in place.
2. **Run the consumer entrypoint in a clean scratch dir.** `mktemp -d`, install or extract the
   artifact there, and execute the exact command a real consumer runs (the CLI, `init`, the
   published binary). A green source tree is not evidence the shipped artifact runs.
3. **Induce one failure where it is cheap.** Prove the check is fallible: break one input
   (remove a required file, corrupt one field) and confirm the entrypoint returns non-zero. A
   check that cannot go red is not evidence when it goes green.
4. **Record every command** into `ranCommands` with its real exit code and a stdout/stderr
   tail. Map each claim to the command that decided it.
5. **Clean up.** Discard scratch dirs. Never leave state in the repo checkout.

## Evidence contract

Return exactly:

`{ liveVerdict: 'pass' | 'fail' | 'skipped',
   ranCommands: [{ cmd, exitCode, stdoutTail }],
   claims:      [{ claim, verdict: 'proven' | 'refuted' | 'unproven', evidence }],
   notMeasured: [{ what, why }] }`

`liveVerdict` is `pass` only when every claim the change depends on is `proven` and none is
`refuted`; `fail` when any is `refuted`; `skipped` when there was no live scenario to run. You
execute; you never flip a status and never edit a repo file.
```

- [ ] **Step 2: Verify the linter accepts it and finds no collision**

```bash
node scripts/skill-lint.mjs plugins/swe-flow
```

Expected: exit 0, entry count incremented by 1, no new error. If a `verifier <-> reviewer` warn
line appears above 50%, reword the description to lead with "PRODUCE live evidence … build or
pack the real artifact" rather than restating the reviewer's gate-rerun language.

- [ ] **Step 3: Commit**

```bash
git add plugins/swe-flow/agents/verifier.md
git commit -m "feat(swe-flow): verifier agent — runs the real artifact and returns an evidence contract (RFC-0025)"
```

---

## Task 8c: `test-author` agent — the RED half of TDD

An implementer with no failing test to satisfy has no executable definition of done. This agent
writes the failing test FIRST and proves it red before handoff.

**Files:**
- Create: `plugins/swe-flow/agents/test-author.md`

**Interfaces:**
- Consumes: the skill-hint block from Task 4.
- Produces: agent id `swe-flow:test-author`, returning `{ tests: [{ file, name, redProof }], stackDiscovered: { testCmd, source }, gaps: [] }`.

- [ ] **Step 1: Write the agent**

```markdown
---
name: test-author
description: >-
  Use to write a FAILING test that pins a requirement before any implementation — the RED half
  of test-driven development. It first discovers the repo's real test command (from
  package.json, the Makefile, or CI — never assuming `npm test`), writes the test, RUNS it, and
  proves it FAILS against the current code; the demonstrated failure is the deliverable, not a
  passing test. It pastes the failure output into its report and hands off. It never writes
  implementation code and never marks anything done on a green-only run. Dispatch it before the
  implementer so there is an executable definition of done.
tools: Read, Write, Edit, Grep, Glob, Bash
model: sonnet
---

You author tests, not implementations. Your deliverable is a test that FAILS for the right
reason against the code as it stands today — a red bar that pins the requirement so the
implementer has an executable target. A test you cannot show failing is not done.

## Skill hint (load on demand)

If the Skill tool lists the skill named below, invoke it first and follow it — it is the
canonical procedure and this file is its summary. If the skill is not listed (the plugin is
not installed, or you are running on a harness without skills), run the embedded procedure
below; it is complete on its own.

Canonical skill: `superpowers:test-driven-development`

## The Prove-It contract

**Discover, write, run, prove RED — in that order.**

1. **Discover the real test command.** Read `package.json` scripts, the `Makefile`, and the CI
   workflow to find how this repo actually runs tests. Never assume `npm test`. Record what you
   found and where in `stackDiscovered`.
2. **Write the test** against the requirement, next to the repo's existing tests, matching
   their framework and style.
3. **Run it.** Execute the discovered command.
4. **Prove it is RED.** The test MUST fail against the current code before you hand off. Paste
   the failure output verbatim into your report — that demonstrated failure is the deliverable.
   If the test passes on its first run, the requirement is already met or the test asserts
   nothing: say which, and treat it as a gap, not a win.

You never write implementation code, and you never mark anything done because a run was green
before the code that should satisfy it exists.

## Return

`{ tests: [{ file, name, redProof }], stackDiscovered: { testCmd, source }, gaps: [] }`

`redProof` is the pasted failure output. `gaps` names any requirement you could not turn into a
runnable test and why.
```

- [ ] **Step 2: Verify the linter and the gate**

```bash
node scripts/skill-lint.mjs plugins/swe-flow && bun run check
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add plugins/swe-flow/agents/test-author.md
git commit -m "feat(swe-flow): test-author agent — a failing test proven RED before handoff (RFC-0025)"
```

---

## Task 8d: `implementer` return-status and file-handoff contract

A fan-out member's report must tell the lead precisely how it ended and exactly what a verifier
should run — and work must move between agents as paths, not stale pasted copies.

**Files:**
- Modify: `plugins/swe-flow/agents/implementer.md` (keep the `WRITE FILES ONLY` hard edge unchanged)

**Interfaces:**
- Consumes: nothing.
- Produces: a report ending in `status ∈ {DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT}` plus `filesWritten` and `verifierShouldRun`, which Task 9's `swe-flow:verifier` / `reviewer` dispatch consumes as its command list.

- [ ] **Step 1: Add the file-handoff rule to `## Before you write`**

Append one bullet to the `## Before you write` list (leave the existing bullets byte-identical):

```markdown
- Work arrives as **paths, not pasted content**: when the lead hands you a brief, a doc, or a
  prior agent's output, it comes as file paths you Read yourself — never trust a pasted copy
  that may be stale. You return paths the same way (see `## Return`), never inlined file bodies.
```

- [ ] **Step 2: Replace the `## Return` section**

The current `## Return` section is a free-text summary. Replace it wholesale with an explicit
status contract:

```markdown
## Return

End every report with an explicit status line — exactly one of:

- `DONE` — every allowed path written, the contract satisfied, no reservations.
- `DONE_WITH_CONCERNS` — written, but with a caveat the lead must weigh (a style guess, an
  ambiguous rule you resolved one way). Name each concern.
- `BLOCKED` — a rule, a missing artifact, or a contradiction stopped you. Cite it and state the
  `Decision required:`.
- `NEEDS_CONTEXT` — you cannot proceed without a doc or path the contract did not give you.
  Name exactly what to hand you.

Then, always:
- `filesWritten` — the absolute paths you wrote or changed, one line each on what it does.
- `verifierShouldRun` — the commands a verifier SHOULD run to check your work, DISCOVERED from
  `package.json`, the `Makefile`, or CI and NAMED, not executed (you never run the gate). E.g.
  `bun run check`, `node --test path/to.test.mjs`.

Hand back paths, never pasted file contents. Do not claim "verified" — validation (`npx govkit
verify`, `bun run check`, lint/typecheck/tests) is the lead's integration step, not yours.
```

- [ ] **Step 3: Verify the surface still lints and the gate is green**

```bash
node scripts/skill-lint.mjs plugins/swe-flow && bun run check
```

Expected: both exit 0. The `WRITE FILES ONLY` hard edge in `## Hard edges (the fan-out
contract)` is untouched — confirm with `grep -n 'WRITE FILES ONLY' plugins/swe-flow/agents/implementer.md`.

- [ ] **Step 4: Commit**

```bash
git add plugins/swe-flow/agents/implementer.md
git commit -m "feat(swe-flow): implementer returns a status + verifier command list, hands off by path (RFC-0025)"
```

---

## Task 9: `gate-loop.js` — the loop, as a workflow

Closes M3. Shape: **fan-out-in-waves** (wave 1 verify ‖ reconcile; wave 2 one red-team per flip candidate).

**Files:**
- Create: `.claude/workflows/gate-loop.js`
- Create: `template/.claude/workflows/gate-loop.js` (identical content)

**Interfaces:**
- Consumes: `swe-flow:reviewer` (returns `gateProvenFallible`), `swe-flow:doc-keeper`, `swe-flow:red-teamer` (returns the verdict enum from Task 5).
- Produces: the packet `{ gate, reconcile, redTeam, humanGates }`, read by Task 10's skill.

- [ ] **Step 1: Write the workflow**

```js
export const meta = {
  name: 'gate-loop',
  description: 'Run the five-station gate loop over one or more governed docs whose status the owner intends to advance: verify the gate, reconcile doc drift, red-team each flip, return one ratification packet',
  phases: [
    { title: 'Verify', detail: 'independent gate re-run + doc-keeper drift reconcile' },
    { title: 'RedTeam', detail: 'one adversarial pass per flip candidate' },
  ],
}

// args: {
//   verifyCmd: string             // REQUIRED: the repo's real gate, e.g. 'bun run check' or 'make check'
//   changeSummary: string         // what actually landed — the red-teamers reason from this
//   flips: [{ id, target, doc }]  // governed docs whose status the owner intends to advance
// }
const verifyCmd = args?.verifyCmd
if (!verifyCmd) throw new Error('gate-loop: args.verifyCmd is required — name the repo real gate, do not guess it')
const changeSummary =
  args?.changeSummary ??
  'A change has landed. Read the recent commits and the cited docs to learn what it does.'
const flips = args?.flips ?? []

const GATE = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'gates', 'gateProvenFallible', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['SAFE-TO-COMMIT', 'BLOCK'] },
    gates: { type: 'string', description: 'the commands run and their real exit codes' },
    gateProvenFallible: { type: 'boolean' },
    findings: { type: 'array', items: { type: 'string' } },
  },
}

const RECONCILE = {
  type: 'object',
  additionalProperties: false,
  required: ['edits'],
  properties: {
    edits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['doc', 'reason', 'proposed'],
        properties: {
          doc: { type: 'string' },
          reason: { type: 'string' },
          proposed: { type: 'string' },
        },
      },
    },
  },
}

const REDTEAM = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'verdict', 'criteriaSummary', 'sourcesExist', 'killCriterion'],
  properties: {
    id: { type: 'string' },
    verdict: { type: 'string', enum: ['flip-as-is', 'flip-after-reconcile', 'blocked'] },
    criteriaSummary: { type: 'string' },
    reconciledText: {
      type: 'string',
      description: 'exact doc edits needed before the flip is honest; empty when flip-as-is',
    },
    sourcesExist: { type: 'boolean' },
    killCriterion: { type: 'string' },
  },
}

phase('Verify')
const [gate, reconcile] = await parallel([
  () =>
    agent(
      `Independently verify this repo is ready to advance a governed status. Re-run \`${verifyCmd}\` from scratch and report its real exit code, then \`npx govkit check\`. Prove the gate is capable of failing and report gateProvenFallible. Trust no prior summary. What landed: ${changeSummary}`,
      { agentType: 'swe-flow:reviewer', phase: 'Verify', label: 'gate-verify', schema: GATE },
    ),
  () =>
    agent(
      `Reconcile governed-doc drift against what the code actually does now. What landed: ${changeSummary}. For each doc below that names a symbol, mechanism, or gap the code has since changed, propose the EXACT replacement text. Do NOT apply it and do NOT flip any status. Docs: ${flips.map((f) => f.doc).join(', ') || '(none listed — scan the governed dirs)'}`,
      { agentType: 'swe-flow:doc-keeper', phase: 'Verify', label: 'reconcile drift', schema: RECONCILE },
    ),
])

phase('RedTeam')
const redTeam = (
  await parallel(
    flips.map((f) => () =>
      agent(
        `Red-team ${f.doc} BEFORE its owner advances it to "${f.target}". What landed: ${changeSummary}. Assess each acceptance criterion as met / partial / not-yet with file:line; decide whether "${f.target}" is honest; confirm every cited source exists. Steelman, then falsifiable "Fails if ___", then self-refute, then one kill criterion. If the doc must be reworded before the flip is honest, give the EXACT reconciled text. You flip nothing.`,
        { agentType: 'swe-flow:red-teamer', phase: 'RedTeam', label: `red-team ${f.id}`, schema: REDTEAM },
      ).then((b) => ({ ...b, id: f.id, target: f.target, doc: f.doc })),
    ),
  )
).filter(Boolean)

return { gate, reconcile, redTeam, humanGates: flips.map((f) => `${f.id} -> ${f.target}`) }
```

- [ ] **Step 2: Validate the syntax**

```bash
node --check .claude/workflows/gate-loop.js
```

Expected: no output, exit 0.

- [ ] **Step 3: Copy to the template and validate that copy too**

```bash
cp .claude/workflows/gate-loop.js template/.claude/workflows/gate-loop.js
node --check template/.claude/workflows/gate-loop.js
```

Expected: no output, exit 0.

- [ ] **Step 4: Confirm the two copies are identical**

```bash
diff .claude/workflows/gate-loop.js template/.claude/workflows/gate-loop.js
```

Expected: no output. (Task 11 adds this to `check-sync.mjs` so it cannot drift.)

- [ ] **Step 5: Commit**

```bash
git add .claude/workflows/gate-loop.js template/.claude/workflows/gate-loop.js
git commit -m "feat(workflows): gate-loop — verify, reconcile, red-team into one ratification packet (RFC-0025)"
```

---

## Task 9b: wire the `Live` verify-for-real phase into `gate-loop.js`

Adds the fifth actor to the workflow: a `Live` phase between `Verify` and `RedTeam` that
dispatches `swe-flow:verifier` (Task 8b). A `gate` selector distinguishes a cheap doc close from
a release close; a release gate REQUIRES a live scenario, so a release can never be ratified on a
re-run of the repo's own gate alone.

**Files:**
- Modify: `.claude/workflows/gate-loop.js`
- Modify: `template/.claude/workflows/gate-loop.js` (kept byte-identical)

**Interfaces:**
- Consumes: `swe-flow:verifier` (returns the evidence contract from Task 8b).
- Produces: the packet gains `live: { liveVerdict, ranCommands, claims, notMeasured }`, read by Task 10's skill.

- [ ] **Step 1: Extend `meta.phases`**

Replace the `phases` array in `export const meta` with the three-phase form:

```js
  phases: [
    { title: 'Verify', detail: 'independent gate re-run + doc-keeper drift reconcile' },
    { title: 'Live', detail: 'verifier builds/packs and runs the real artifact in a scratch dir (required at a release gate)' },
    { title: 'RedTeam', detail: 'one adversarial pass per flip candidate' },
  ],
```

- [ ] **Step 2: Parse `gate` and `live`, and guard the release gate**

The existing arg block reads `verifyCmd`, `changeSummary`, `flips`. Immediately after the
`const flips = args?.flips ?? []` line, extend the arg comment and add:

```js
//   gate: 'doc' | 'slice' | 'release'   // default 'slice'; a 'release' gate REQUIRES args.live
//   live: { scenario: string, expectations: string[] }  // the real-artifact run; omit to skip Live
const gateKind = args?.gate ?? 'slice'
const liveScenario = args?.live ?? null
if (gateKind === 'release' && !liveScenario) {
  throw new Error(
    'gate-loop: a release gate REQUIRES a live scenario — set args.live { scenario, expectations } so the verifier can build and run the real artifact',
  )
}
```

> Name it `gateKind`, not `gate` — `gate` is already bound to the reviewer's result below.

- [ ] **Step 3: Add the `VERIFIER` schema**

After the `REDTEAM` schema literal, add the schema that mirrors Task 8b's evidence contract:

```js
const VERIFIER = {
  type: 'object',
  additionalProperties: false,
  required: ['liveVerdict', 'ranCommands', 'claims', 'notMeasured'],
  properties: {
    liveVerdict: { type: 'string', enum: ['pass', 'fail', 'skipped'] },
    ranCommands: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['cmd', 'exitCode', 'stdoutTail'],
        properties: {
          cmd: { type: 'string' },
          exitCode: { type: 'number' },
          stdoutTail: { type: 'string' },
        },
      },
    },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'verdict', 'evidence'],
        properties: {
          claim: { type: 'string' },
          verdict: { type: 'string', enum: ['proven', 'refuted', 'unproven'] },
          evidence: { type: 'string' },
        },
      },
    },
    notMeasured: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['what', 'why'],
        properties: { what: { type: 'string' }, why: { type: 'string' } },
      },
    },
  },
}
```

- [ ] **Step 4: Insert the `Live` phase between `Verify` and `RedTeam`**

Between the `Verify` block's closing `])` and the `phase('RedTeam')` line, insert:

```js
phase('Live')
// A release gate has already thrown above if liveScenario is null. When it is null on a
// doc/slice gate we do NOT dispatch the verifier at all — liveVerdict is 'skipped'.
const live =
  liveScenario === null
    ? {
        liveVerdict: 'skipped',
        ranCommands: [],
        claims: [],
        notMeasured: [{ what: 'live artifact run', why: 'no args.live scenario was provided' }],
      }
    : await agent(
        `Produce LIVE evidence that this change works. Scenario: ${liveScenario.scenario}. Build or pack the REAL artifact, then run the consumer entrypoint in a CLEAN scratch dir (mktemp -d) — never the source tree in place. Where cheap, induce ONE failure to prove the check is fallible. Expectations to prove: ${(liveScenario.expectations ?? []).join('; ') || '(none named — prove the entrypoint runs green end to end)'}. A claim is "proven" ONLY when a ranCommands entry carries its real exit code and output tail; list everything you could not run under notMeasured. Read-only on the repo checkout; all execution happens in scratch dirs. What landed: ${changeSummary}`,
        { agentType: 'swe-flow:verifier', phase: 'Live', label: 'live-verify', schema: VERIFIER },
      )
```

- [ ] **Step 5: Extend the returned packet**

Change the final `return` to carry `live`:

```js
return { gate, live, reconcile, redTeam, humanGates: flips.map((f) => `${f.id} -> ${f.target}`) }
```

- [ ] **Step 6: Validate the syntax**

```bash
node --check .claude/workflows/gate-loop.js
```

Expected: no output, exit 0.

- [ ] **Step 7: Re-copy to the template and confirm the two copies are identical**

```bash
cp .claude/workflows/gate-loop.js template/.claude/workflows/gate-loop.js
node --check template/.claude/workflows/gate-loop.js
diff .claude/workflows/gate-loop.js template/.claude/workflows/gate-loop.js
```

Expected: `node --check` exits 0 with no output; `diff` prints nothing. (Task 11's `check-sync.mjs`
already enforces this pairing.)

- [ ] **Step 8: Commit**

```bash
git add .claude/workflows/gate-loop.js template/.claude/workflows/gate-loop.js
git commit -m "feat(workflows): gate-loop Live phase — verifier evidence between Verify and RedTeam; release gate requires it (RFC-0025)"
```

---

## Task 10: `gate-close` skill — the Tier-2 orchestrator

**Files:**
- Create: `plugins/swe-flow/skills/gate-close/SKILL.md`

**Interfaces:**
- Consumes: the packet shape returned by Task 9.
- Produces: skill id `swe-flow:gate-close`.

- [ ] **Step 1: Write the skill**

```markdown
---
name: gate-close
description: >-
  Close a landed change into ONE owner-decision packet before any governed-doc status advances.
  Use whenever code has landed and a PRD, RFC, ADR, or user story is a candidate to move status,
  or when the user says "close this slice", "prep the flips", "ready to flip", "verify and
  reconcile before I accept". It runs the gate-loop workflow — an independent gate re-run, a
  drift reconcile, and one red team per flip candidate — so the owner ratifies once from a
  single packet instead of being interrupted per document. Skipping it risks advancing a doc
  whose criteria the code no longer matches.
---

# gate-close

A status flip is a ratification, and a ratification needs evidence. This skill collapses the
repetitive pre-flip tail into one packet the owner decides from in a single pass.

## When to run it

After the change has **landed and been committed**, and before proposing any status advance.
Do not run it while agents are still editing the tree — the verifier reads the working tree, so
a mid-edit tree yields a false BLOCK. Commit first, then close.

## How to run it

```
Workflow({
  name: 'gate-loop',
  args: {
    verifyCmd: 'bun run check',
    changeSummary: 'One paragraph on what the landed change actually does — the mechanism, the seams, what was verified and how. This is what the red-teamers reason from, so name real symbols and real commands.',
    flips: [
      { id: 'US-0015', target: 'done',        doc: 'docs/issues/US-0015-....md' },
      { id: 'RFC-0025', target: 'implemented', doc: 'docs/rfc/RFC-0025-....md' },
    ],
  },
})
```

`verifyCmd` is required and must be the repo's real gate — never guess it. Discover it from
`package.json`, `Makefile`, or the CI workflow before invoking. `changeSummary` matters most: a
vague summary produces a vague red team.

## Reading the packet

```
{ gate:      { verdict, gates, gateProvenFallible, findings[] },
  live:      { liveVerdict, ranCommands, claims, notMeasured },  // 'skipped' unless args.live set (always set at a release gate)
  reconcile: { edits: [{ doc, reason, proposed }] },   // exact text, NOT applied
  redTeam:   [{ id, verdict, criteriaSummary, reconciledText, sourcesExist, killCriterion }],
  humanGates: ["US-0015 -> done", ...] }
```

- `gate.verdict: BLOCK` or `gate.gateProvenFallible: false` — stop. Nothing advances on an
  unproven gate.
- `live.liveVerdict: fail`, or any `live.claims[].verdict: refuted` — stop. The shipped artifact
  did not run; a green source gate does not override a red real-artifact run.
- `flip-as-is` — the status is honest; still apply any `reconcile.edits`.
- `flip-after-reconcile` — apply `reconciledText` first, then flip.
- `blocked` — do not flip. Fix the code, or scope the claim down to what shipped.

## Acting on the packet

1. Present it to the owner as ONE decision: the flips, the reconcile edits, any limitation the
   red team surfaced. Recommend with trade-offs; the owner authorizes.
2. **Only on authorization**, apply `reconcile.edits` and every `reconciledText`. A governed doc
   must certify exactly what shipped — never round a partial criterion up to done.
3. Land each flip as a **separate accept commit** that edits the front-matter `status:` and the
   matching INDEX row, with a message citing the owner's in-session authorization.
4. Re-run the gate after the flips, and confirm the remote ref actually moved after pushing.

## Release close

At a release gate the loop runs its strongest form: `gate: 'release'`, which REQUIRES a `live`
scenario. The scenario is a real consumer install, not a re-run of this repo's own gate.

```
Workflow({
  name: 'gate-loop',
  args: {
    gate: 'release',
    verifyCmd: 'bun run check',
    changeSummary: 'One paragraph on what this release ships.',
    live: {
      scenario: 'npm pack the tarball; install it into a clean scratch dir (mktemp -d); run `npx govkit init`; confirm the gate is green; then break one governed doc (remove a required front-matter key) and confirm the gate exits non-zero.',
      expectations: [
        'the packed tarball installs into a clean dir',
        'npx govkit init scaffolds and the gate exits 0',
        'a doc with a required front-matter key removed makes the gate exit non-zero',
      ],
    },
    flips: [{ id: 'REL-0001', target: 'released', doc: 'docs/releases/REL-0001-....md' }],
  },
})
```

The verifier returns `live: { liveVerdict, ranCommands, claims, notMeasured }`. On owner
ratification, the ledger entry's `check` string is GENERATED from the verifier's `ranCommands` —
the real commands and their real exit codes — not typed by hand. That turns the
`docs/ledger.json` `check` field from testimony ("I ran it, it passed") into evidence (the exact
command a reader can re-run). Never write a `released` flip whose ledger `check` is not backed by
a `ranCommands` entry that exited 0.

## Why one packet

The owner is the bottleneck when every flip is surfaced separately. Batching the whole tail into
one packet turns N interruptions into one ratification, while keeping the two controls that
protect the record: an independent verify and an independent red team, neither authored by
whoever wrote the change.
```

- [ ] **Step 2: Verify the linter and the gate**

```bash
node scripts/skill-lint.mjs plugins/swe-flow && bun run check
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add plugins/swe-flow/skills/gate-close/
git commit -m "feat(swe-flow): gate-close skill — one ratification packet per gate (RFC-0025)"
```

---

## Task 10b: `work-breakdown` skill + the `rel` release doc type

Two additions the release gate needs: a Tier-1 skill for cutting large work into shippable
slices, and a governed `rel` doc type so a release note is a first-class gated artifact. The
release-close preset for the `gate-close` skill is already folded into Task 10's skill text (its
`## Release close` section) — this task ships the doc type it advances.

**Files:**
- Create: `plugins/swe-flow/skills/work-breakdown/SKILL.md`
- Modify: `govkit.yml` (add the `rel` type and its eval rubric)
- Create: `docs/releases/INDEX.md`

**Interfaces:**
- Consumes: nothing from earlier tasks (the skill is Tier-1 atomic; the `rel` type is read by the engine from `govkit.yml`).
- Produces: skill id `swe-flow:work-breakdown`; doc type `rel` (idPrefix `REL`, dir `docs/releases`) that Task 10's `## Release close` preset flips to `released`.

- [ ] **Step 1: Write the `work-breakdown` skill**

Tier-1 and dependency-free — it calls no other skill. Create
`plugins/swe-flow/skills/work-breakdown/SKILL.md`:

```markdown
---
name: work-breakdown
description: >-
  Use to split a large piece of work into small, independently shippable slices before writing
  any doc or code. Trigger when a task feels too big to finish in one sitting, when a user story
  is really several, when the title contains "and", or when you are about to open one giant
  issue. It teaches vertical slicing (a thin end-to-end cut, not a horizontal layer), an XS-to-XL
  sizing ladder where XL means "break it down further", four break triggers, and how to record
  the order work must happen in when one slice depends on another. Atomic and dependency-free —
  it calls no other skill.
---

# work-breakdown

Big work fails at integration, not at the keyboard. Break it into slices that each ship
something real and can be verified on their own.

## Vertical slices over horizontal layers

Cut top-to-bottom through the stack, not layer-by-layer. Each slice delivers a thin but complete
behaviour a user or a gate can observe.

**Bad (horizontal — nothing works until the last slice):**
- Slice 1: all the database tables
- Slice 2: all the API endpoints
- Slice 3: all the UI

Nothing is demonstrable until slice 3; the first two cannot be verified end to end.

**Good (vertical — every slice is demonstrable):**
- Slice 1: create-one-record — its table column, its endpoint, its form, its test
- Slice 2: list records — the query, the endpoint, the list view, its test
- Slice 3: delete a record — the same thin cut

Each good slice can be shipped, reviewed, and closed on its own evidence.

## Sizing ladder

| Size | Rule of thumb | Action |
|---|---|---|
| XS | one function / one field, minutes | fold into a larger slice |
| S | one behaviour, < half a day | ship as one slice |
| M | a few behaviours, ~a day | ship as one slice; name the ACs |
| L | multiple behaviours, multi-day | prefer to split; split if any break trigger fires |
| XL | can't hold it all in your head | **must break down** — never start an XL as one unit |

## Four break triggers

Split the moment any of these is true:

1. **The task title contains "and".** "Import and validate and notify" is three slices wearing
   one title.
2. **Two acceptance criteria need different verification.** Different proofs mean different
   slices.
3. **It crosses more than one boundary** (two services, two packages, schema + UI) — each side
   is its own cut.
4. **You cannot demo it in one sitting.** If there is no point where you can show it working, it
   is too big.

## Ordering and blocking edges

When one slice must land before another, say so and order the backlog accordingly — "US-B cannot
start until US-A ships its migration". govkit has no `blockedBy` reference field today (the schema
resolves `parent` only), so do NOT invent a front-matter key: model the dependency in the
user-story body text, as a `Blocked by: US-A (needs its schema change)` line the reader and the
sequencer can act on. Keep the edges few — a slice blocked by three others is usually mis-cut;
re-slice so each stands on a single upstream dependency at most.
```

- [ ] **Step 2: Add the `rel` doc type to `govkit.yml`**

Under `docs.types`, after the `us:` block, add (match the file's two-space indentation and the
neighbouring types' comment style):

```yaml
    rel:
      dir: docs/releases
      required: [id, title, status, owner, date]
      idPrefix: REL
      startStatus: draft
      statuses: [draft, released, superseded]
      terminalStatuses: [released, superseded]
      # Status-conditional required sections, same forcing-function pattern as RFC's
      # `implemented`: a release at `released` must record what shipped and how to recover.
      # Inert until a REL is flipped to `released` — zero-false-positive before then.
      requiredSectionsByStatus:
        released: ["What shipped", "Migration", "Rollback", "Post-publish smoke"]
      # A release's `parent` (the RFC it ships) must resolve to a real id. Resolve-only.
      refs: [{ key: parent, type: rfc }]
```

- [ ] **Step 3: Decide on the eval rubric — record the finding**

Read `packages/govkit/src/commands/eval.ts`: `runEval` iterates `types` and, for a type with no
rubric, `continue`s past it (`if (!rubric || rubric.length === 0) continue;`, eval.ts:164). So a
`rel` doc with **no** rubric passes `eval` untouched — safe and non-blocking, but a release would
skip the stub-and-filler floor every other type gets. **Decision: ADD** the minimal rubric so
releases get the same floor. Under `eval.rubrics`, after the `us:` block, add:

```yaml
    rel:
      - { id: substance, weight: 30, kind: minWords, min: 30, required: true, desc: "not an empty stub (≥30 words of prose)" }
      - { id: nofiller, weight: 10, kind: forbid, pattern: 'lorem ipsum|to be filled (in|out)|to be written|todo:?\s*write|placeholder text|fill (this )?in later|insert [a-z ]+ here', required: true, desc: "no template filler left in" }
```

Record in the commit body which path you took (added the minimal rubric) and the eval.ts:164
finding that made it optional-but-recommended.

- [ ] **Step 4: Create the releases INDEX matching its siblings**

`docs/rfc/INDEX.md` is the sibling to match — its rows link the **ID** column
(`| [RFC-0001](./RFC-0001-....md) | Title | status | owner | date |`). Create
`docs/releases/INDEX.md` with the header row and separator only (no releases yet):

```markdown
# Release Index

| ID | Title | Status | Owner | Date |
|---|---|---|---|---|
```

- [ ] **Step 5: Run the full gate**

```bash
node scripts/skill-lint.mjs plugins/swe-flow && bun run check
```

Expected: both exit 0. `govkit-check` accepts the new `rel` type with an empty `docs/releases/`
dir (INDEX.md is in `docs.ignore`, and there are no REL docs to validate yet).

- [ ] **Step 6: Commit**

```bash
git add plugins/swe-flow/skills/work-breakdown/ govkit.yml docs/releases/INDEX.md
git commit -m "feat(swe-flow): work-breakdown skill + rel release doc type with an as-released floor (RFC-0025)"
```

---

## Task 11: Manifest and README sync

Closes M8. Nine agents and eleven skills now exist; three files claim to list them and nothing checks.

**Files:**
- Modify: `plugins/swe-flow/README.md`
- Modify: `plugins/swe-flow/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `scripts/check-sync.mjs`

**Interfaces:**
- Consumes: `lintSurface` from Task 2 (`scripts/skill-lint.mjs`).
- Produces: a `check` chain that fails when the surface on disk and the surface in the docs disagree.

- [ ] **Step 1: Read the existing sync script before editing**

```bash
cat scripts/check-sync.mjs
```

Note its existing failure-reporting style and reuse it — do not introduce a second convention.

- [ ] **Step 2: Add the surface-set assertion to `check-sync.mjs`**

Append a check that, for `plugins/swe-flow`:

```js
import { lintSurface } from './skill-lint.mjs'

const surface = lintSurface('plugins/swe-flow')
const onDisk = new Set(surface.docs.map((d) => `${d.kind}/${d.stem}`))
const readme = readFileSync('plugins/swe-flow/README.md', 'utf8')
const missing = [...onDisk].filter((s) => !readme.includes(s.split('/')[1]))
if (missing.length > 0) {
  problems.push(`plugins/swe-flow/README.md does not mention: ${missing.join(', ')}`)
}
```

Adapt `problems.push` to whatever the file's existing accumulator is named. Also assert the two
`gate-loop.js` copies are byte-identical:

```js
if (readFileSync('.claude/workflows/gate-loop.js', 'utf8') !== readFileSync('template/.claude/workflows/gate-loop.js', 'utf8')) {
  problems.push('gate-loop.js has drifted between .claude/workflows/ and template/.claude/workflows/')
}
```

- [ ] **Step 3: Run it and watch it fail**

```bash
node scripts/check-sync.mjs
```

Expected: exit 1, listing the four new agents and the new skill as missing from the README.

- [ ] **Step 4: Update the README with the author / score / upkeep taxonomy**

Add to `plugins/swe-flow/README.md` a table naming all nine agents by class (Author: `analyst`,
`architect`, `drafter`, `implementer`; Score: `reviewer`, `red-teamer`, `judge`; Upkeep:
`doc-keeper`, `distiller`) and a row for the `gate-close` skill.

- [ ] **Step 5: Update both manifests**

In `plugins/swe-flow/.claude-plugin/plugin.json` and the matching entry in
`.claude-plugin/marketplace.json`, bump `version` to `0.8.0` and rewrite the shared
`description` to name the loop and the nine agents. Both files must carry the **same**
description string — `check-sync.mjs` already enforces that pairing.

- [ ] **Step 6: Run the full gate**

```bash
bun run check
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add plugins/swe-flow/README.md plugins/swe-flow/.claude-plugin/plugin.json .claude-plugin/marketplace.json scripts/check-sync.mjs
git commit -m "chore(swe-flow): sync surface to README and manifests, gate the sync (RFC-0025)"
```

---

## Task 12: Dogfood — run the loop on RFC-0025 itself

The plan's own acceptance test: the loop must be able to close the change that created it.

**Files:**
- Modify: `docs/rfc/RFC-0025-gate-loop-role-plane.md` (only if the red team returns `flip-after-reconcile`, and only on the owner's authorization)
- Modify: `docs/rfc/INDEX.md` (same condition)

**Interfaces:**
- Consumes: everything from Tasks 2–11.
- Produces: an entry in `LEARNING-LOOP.md` for any friction the run surfaces.

- [ ] **Step 1: Confirm the tree is committed**

```bash
git status --porcelain
```

Expected: empty. If not, commit first — a mid-edit tree yields a false BLOCK.

- [ ] **Step 2: Run the loop against RFC-0025**

Invoke `swe-flow:gate-close`, which runs:

```
Workflow({
  name: 'gate-loop',
  args: {
    verifyCmd: 'bun run check',
    changeSummary: 'Added 4 role agents (analyst, architect, drafter, red-teamer), upgraded reviewer with prove-the-gate-can-fail plus per-finding severity, shipped .claude/workflows/gate-loop.js and its template copy, added the gate-close orchestrator skill, and added scripts/skill-lint.mjs to the check chain. Verified: bun run check green, node --check on both workflow copies, node --test on skill-lint.',
    flips: [{ id: 'RFC-0025', target: 'implemented', doc: 'docs/rfc/RFC-0025-gate-loop-role-plane.md' }],
  },
})
```

- [ ] **Step 3: Read the packet from the task output file, not the truncated notification**

Expected shape: `gate.verdict = SAFE-TO-COMMIT`, `gate.gateProvenFallible = true`, and one
red-team entry for `RFC-0025`.

- [ ] **Step 4: Record friction**

For every place the run needed a manual patch — a missing arg, an agent that could not find a
doc, a schema that did not validate — append one line to `LEARNING-LOOP.md` in the existing
entry format: `date | what happened | where it should have been caught | the rule | where the
rule now lives`.

- [ ] **Step 5: Present the packet and STOP**

Present the flip recommendation to the owner. `RFC-0025 → implemented` also requires the
`As-built` and `Deviations from design` sections that `govkit.yml:39-40` demands at that status
— add them as part of the reconcile, before the flip, on authorization only.

Do not flip. The accept commit is the owner's call and lands separately:

```
docs(RFC-0025): accept — owner-authorized flip accepted→implemented (gate loop)
```

---

## Self-review

**Spec coverage.** M1 → Tasks 5, 6. M2 → Tasks 7, 8. M3 → Tasks 9, 10. M4 → Task 8 steps 2–3.
M5 → Task 3 step 1. M6 → Task 3 step 2. M7 → Task 4 (existing agents) and the skill-hint block
carried into Tasks 5–8 and 8b–8c (new agents). M8 → Task 11. The verify-for-real station is the
`verifier` agent (Task 8b), wired as the `Live` phase between Verify and RedTeam (Task 9b); the
RED test-author is Task 8c; the implementer's return-status and path-handoff contract is Task 8d;
the `rel` release doc type, its rubric, its INDEX, and the release-close preset (folded into Task
10) are Task 10b; the `work-breakdown` Tier-1 skill is Task 10b. The E2E gate map's G1/G2/G3/G4
authors are created in Tasks 6–8; G6 is created in Tasks 9–10; G5 gains `test-author` (author)
and `verifier` (loop) in Tasks 8b–8c; G8 Release is created in Task 10b; G0 and G7 are explicitly
unchanged.

**Known gaps, deliberately out of scope of this plan.** The `supersededBy` and `blockedBy`
resolve-only refs still want their own RFC (a `govkit.yml` schema change, so a separate lifecycle
gate) — this plan deliberately models slice dependencies as prose in the user-story body (Task
10b's `work-breakdown` skill) precisely because no `blockedBy` field exists yet. The Tier-2
trigger corpus with a rank-1 baseline stays deferred (advisory, ~1.5 days, no dependency on this
work). A `spike` doc type is also deferred — it is config, and it wants the same schema RFC as the
two refs. The `rel` release doc type and the `work-breakdown` skill, earlier candidates to defer,
are now IN scope (Task 10b) because the verify-for-real release gate needs a governed release
artifact and a slicing discipline to feed it.

**Type consistency.** `lintSurface` is defined in Task 2 and reused with that exact name in
Task 11. `gateProvenFallible` is produced by the reviewer in Task 8 and required by the `GATE`
schema in Task 9. The red-team verdict enum `flip-as-is | flip-after-reconcile | blocked` is
defined in Task 5, encoded in the `REDTEAM` schema in Task 9, and read in Task 10. The agent id
`swe-flow:red-teamer` is used identically in Tasks 5, 9, 10. `AC-<parent>.<n>` appears only in
Task 7.

**Placeholder scan.** No step says "add error handling", "similar to Task N", or "write tests
for the above". Every code step carries the code. The one deliberate non-literal is Task 11
step 2's `problems.push`, which must be adapted to `check-sync.mjs`'s existing accumulator name
— step 1 requires reading that file first for exactly this reason.
