---
id: US-0011
title: Structure owner decisions as AskUserQuestion — artifact-type pick and gate-close ratification prompt
status: open
owner: TBD
date: 2026-07-31
priority: P2
parent: RFC-0032
---

As a govkit owner who authors specs and ratifies status flips, I want the two owner-decision
points in the swe-flow skills — the spec-author artifact-type pick and the gate-close ratification
prompt — to instruct the agent to use the `AskUserQuestion` tool with structured options, so that
each human gate is a deliberate structured choice reinforced by the tool, not a free-prose ask an
agent can gloss over or answer on my behalf.

## Context

This is RFC-0032 Phase 2 (F9), the "prose → deterministic human-gate" phase, enforcement class,
SMALL. F9's finding: no skill uses the `AskUserQuestion` tool. Owner decisions are handled in
prose today, so the human gate at the decision point rests on the agent choosing to pause and ask
rather than on a structured tool call the surface makes hard to skip. RFC-0032 §"F-freeze / F9"
sets the direction: "structure the owner decisions (artifact-type pick, ratification) as
`AskUserQuestion` rather than prose prompts, reinforcing the human-gate at the point of decision."

This is instruction editing in SKILL.md prose only — no code, no schema, no test. The two decision
points, verified in the current tree:

1. **Artifact-type pick — `spec-author/SKILL.md`.** The type drives the doc dir, the required
   front-matter, and the start status, so it is an owner decision, not an agent guess. Today the
   skill says "The user picks the artifact type. If they haven't, ask" and step 2 "Confirm the
   type" — prose, no structured tool. The `## Picking the type (quick guide)` table already
   enumerates the four options (PRD / RFC / ADR / US) and what each captures, so the structured
   `AskUserQuestion` options are already written down; this slice wires that pick to the tool.

2. **Ratification prompt — `gate-close/SKILL.md`.** In `## Acting on the packet`, step 2 is
   "Present the R0 set — including every escalated R1 … — to the owner as ONE decision". That is
   the ratification prompt. This slice makes that presentation an `AskUserQuestion` call with
   structured options (authorize / hold / reword-first) rather than a free-prose ask.

**Where the ratification prompt actually lives (correction to the finding's tentative pointer).**
The finding lists `gate-loop/SKILL.md` "(or wherever ratification prompts live)". There is no
`gate-loop/SKILL.md`: `gate-loop` is a deterministic Node workflow at
`.claude/workflows/gate-loop.js` that *assembles and logs* the packet and flips nothing — it has
no agent tools and structurally cannot call `AskUserQuestion` (an agent-only tool). The
owner-facing prompt is in `gate-close/SKILL.md`, the skill that reads the packet and presents the
R0/escalated set to the owner. So the ratification edit lands in `gate-close/SKILL.md`, and
`gate-loop.js` is deliberately out of scope.

**Sequencing / overlap (hard edge on `gate-close/SKILL.md`).** `gate-close/SKILL.md` is also
edited by US-0010 (F-freeze — the freeze skill-hook that blocks agent edits to status columns) and
by US-0014 (F7 live `!npx govkit verify` state injection, and F6 the LEARNING-LOOP-fed "Gotchas"
section). Three slices touching one file are **not parallel-safe** (work-breakdown: any overlap →
not parallel-safe). Resolve by sequencing, not by asserting independence: these three edits to
`gate-close/SKILL.md` must land one-at-a-time and each rebase on the prior, OR be merged into a
single gate-close editing pass at integration. This US touches only the `## Acting on the packet`
ratification-prompt prose, a narrow region, so a rebase is cheap — but the collision must be
surfaced, not silently folded. The `spec-author/SKILL.md` edit is disjoint from US-0010/US-0014
and can proceed in parallel with them.

`Blocked by:` none in artifact terms — no upstream slice must ship first. This is a soft ordering
note, not a hard gate: F9 is independent of the Phase 0/1 correctness slices (US-0006/US-0007/
US-0008) already done. The only real constraint is the same-file sequencing on `gate-close/SKILL.md`
with US-0010 and US-0014 above.

`Touches:` `plugins/swe-flow/skills/spec-author/SKILL.md` (the artifact-type pick — step 2 and the
"if they haven't, ask" line), `plugins/swe-flow/skills/gate-close/SKILL.md` (the ratification
prompt in `## Acting on the packet`, step 2). **NOT** touched: `.claude/workflows/gate-loop.js`
(a deterministic workflow, no agent tools, cannot call `AskUserQuestion`); there is no
`gate-loop/SKILL.md`.

## Testable? No — structural, not automated.

This slice edits only SKILL.md instruction prose; it ships no code and no unit or integration test.
Every acceptance criterion below is verified by **reading the two edited SKILL.md files** — a
reviewer confirms the `AskUserQuestion` instruction is present at each decision point and correctly
scoped. `govkit verify` / `bun run check` score governed docs and lint skill *surface* metadata
(name, description, char budget, trigger-shape), not the body prose these edits change, so there is
nothing here for CI to assert about the instruction itself. The check is human inspection against
the criteria, and the existing skill-lint gate staying green (surface metadata unchanged).

## Acceptance criteria

- [ ] `spec-author/SKILL.md` instructs the agent, at the artifact-type decision point ("The user
      picks the artifact type. If they haven't, ask" / step 2 "Confirm the type"), to use the
      `AskUserQuestion` tool with one structured option per artifact type — PRD, RFC, ADR, US —
      each option labeled with what that type captures (sourced from the existing `## Picking the
      type` table).
- [ ] That `AskUserQuestion` pick is conditional on the type being unknown: if the user already
      named the artifact ("write the ADR", "draft a US for this"), the skill proceeds WITHOUT a
      redundant prompt — the edit preserves the current "if they haven't, ask" guard and does not
      force a re-ask.
- [ ] `gate-close/SKILL.md` step 2 of `## Acting on the packet` instructs the agent to present the
      R0 + escalated-R1 owner-facing set via `AskUserQuestion` with structured options (e.g.
      authorize / hold / reword-first) instead of a free-prose ask, keeping the "ONE decision"
      batching (all flips surfaced in a single ratification, not N separate prompts).
- [ ] The `AskUserQuestion` ratification prompt is scoped to the R0 + escalated-R1 set ONLY. The
      edit must NOT add a prompt to the R1 auto-apply path or the R2 no-ceremony path — RFC-0027
      deliberately removed the fresh ask there, and reintroducing one on those tiers is a
      regression the reviewer should reject.
- [ ] Both edits leave every existing non-negotiable intact and unrephrased in force:
      `owner: TBD` / never self-assign and start-status-only (spec-author); never self-approve /
      self-merge / act as code owner, and the packet's independent verify + independent red team
      (gate-close). `AskUserQuestion` structures the human gate; it replaces no control.
- [ ] The slice changes only SKILL.md body prose — no `allowed-tools` / `name` / `description`
      front-matter edit, no code, no test file. `bun run check` (including skill-lint surface rules
      and `govkit verify`) stays green, because no surface metadata or governed doc changed.

## Design & risks

Labeled **LOW RISK**: prose-only, additive, reversible (delete the added instruction to revert),
and it touches no engine, no schema, and no gate behavior. Recorded anyway because two concrete
failure modes are worth a reviewer's attack.

- **Mechanism.** At each decision point the SKILL.md prose gains an explicit instruction to call
  `AskUserQuestion` with a fixed, structured option list — the four artifact types for spec-author,
  the authorize/hold/reword-first choices for gate-close — instead of "ask the user" prose. The
  options already exist in the two skills (the type table; the R0/reconcile/reword vocabulary of
  the packet), so the edit wires an existing decision to the tool, it does not invent new choices.
- **Failure mode 1 — an ask reintroduced where RFC-0027 removed it.** gate-close's R1_packet
  (auto-apply) and R2_lead (no ceremony) tiers are deliberately ask-free. A careless edit that
  attaches `AskUserQuestion` to "every flip" instead of to the R0 + escalated-R1 set alone would
  re-add the very interruption RFC-0027 engineered out, and would let an unmet R1 be silently
  downgraded through a prompt instead of escalated. The reviewer should attack the scope of the
  new instruction: it must sit in step 2 (the owner-facing set), not in step 4 (auto-apply).
- **Failure mode 2 — a forced re-ask when the type is already given.** spec-author must keep the
  pick conditional. If the instruction says "always call `AskUserQuestion` for the type", a user
  who wrote "draft the ADR" gets an unnecessary prompt, and the friction pushes operators to skip
  the skill. The reviewer should confirm the tool call is gated on the type being unknown.
- **Same-file collision (see Context).** The gate-close edit shares a file with US-0010 and
  US-0014; the risk is a merge conflict or one slice clobbering another's block, mitigated by the
  narrow region this US touches and the stated sequencing.

## Non-goals

- Making `AskUserQuestion` mandatory in any other skill or at any other decision point — F9 scopes
  exactly the two owner decisions (artifact-type pick, ratification). The broader "every human
  gate becomes a structured tool call" is not this slice.
- Editing `.claude/workflows/gate-loop.js` — the workflow assembles the packet deterministically
  and has no agent tools; the prompt belongs in the skill, not the workflow.
- The F-freeze skill-scoped PreToolUse hook (US-0010) — that is the *other half* of the "prose →
  deterministic human-gate" pair and lands separately; this slice only structures the two decision
  prompts, it does not add any blocking hook.
- Any change to `govkit verify` / `govkit eval` / skill-lint behavior, the ratification policy in
  `govkit.yml`, or the packet shape returned by the gate-loop workflow.
