---
name: gate-close
description: >-
  Close a landed change into ONE owner-decision packet before any governed-doc status advances.
  Use whenever CODE HAS LANDED and one or more PRD/RFC/ADR/US docs are candidates to move
  status, or when the user says "close this slice", "prep the flips", "ready to flip". For a
  single doc with NO code landed yet (a draft heading to proposed/accepted), use spec-red-team
  instead — gate-close already contains a red team per flip.
hooks:
  # US-0010 (RFC-0032 F-freeze): DENY any agent Edit|Write that would flip a governed-doc
  # `status:` front-matter value or an INDEX.md Status-column cell, so a status advance stays an
  # owner ratification and never an agent's incidental edit. Skill-scoped BY DESIGN: this block
  # lives ONLY here, never in settings.default.json, so the freeze is active only during a
  # gate-close run and clears on the next message — an owner-authorized flip applied OUTSIDE an
  # active run is not intercepted. DOCUMENTED GAP (accepted, stated not hidden): the matcher is
  # Edit|Write only, so a flip driven through Bash (`sed -i ...`) or any other tool bypasses this
  # hook entirely; the always-on Stop gate re-checks the whole tree.
  PreToolUse:
    - matcher: Edit|Write
      hooks:
        - type: command
          command: node "${CLAUDE_SKILL_DIR}/freeze-status-edit.mjs"
---

# Gate Close

A status flip is a ratification, and a ratification needs evidence. This skill collapses the
repetitive pre-flip tail into one packet the owner decides from in a single pass.

## When to run it

After the change has **landed and been committed**, and before proposing any status advance.
Do not run it while agents are still editing the tree — the verifier reads the working tree, so
a mid-edit tree yields a false BLOCK. Commit first, then close.

## Current gate verdict (live)

Injected at invocation so the packet is read against ground truth, not a reconstruction — this is
the repo's real verify, read-only:

!`npx govkit verify --json`

The injection is an accelerant, not a dependency: if that command is unavailable (govkit not
installed, or a non-Node repo), ignore this block and discover the real gate from `package.json`
below. `verify` reads the working tree, so a non-empty violation list here usually means the tree
is still dirty — commit first (see above), then close.

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

`packet.humanGates` lists every flip candidate flatly — the workflow itself does not tier them.
The split below (RFC-0027) is this skill's job, done once the packet is back.

## Acting on the packet

1. **Tier each flip (RFC-0027).** Read the repo's `govkit.yml` for a top-level `ratification:`
   block. For each flip, its transition key is `doctype:from->to` — read the doc's CURRENT
   `status:` (`packet.humanGates` only names the id and the target) to build it.
   - **Block absent** → every flip is **R0** (owner-tier). This is the pre-RFC-0027 behavior,
     unchanged — nothing here regresses a repo that has not adopted the block yet.
   - **Block present**, transition matches `R0_owner.transitions`, matches no tier at all, or IS
     an edit to the `ratification:` block itself → **R0**. An unmatched transition always falls
     to R0, never to R1 — the default is the ask, not the skip.
   - Matches `R1_packet.transitions` (`rfc:accepted->implemented`, `us:in-progress->done`,
     `drift --ack`) AND every condition holds — `gate.verdict == "SAFE-TO-COMMIT"` with
     `gate.gateProvenFallible == true` (the FULL gate, never a narrower command), this packet is
     itself the required evidence, and this flip's `redTeam[].verdict` is `flip-as-is` or
     `flip-after-reconcile` with `reconciledText` already applied → **R1, auto-apply**.
   - Matches `R1_packet.transitions` but a condition fails (`gate.verdict == "BLOCK"` or
     `gateProvenFallible == false`, `redTeam[].verdict == "blocked"`, or a `flip-after-reconcile`
     whose `reconciledText` was never applied) → **R1, escalate** — fold it into the owner-facing
     set below, naming the exact condition that failed. Never quietly downgrade an unmet R1 to a
     silent auto-apply.
   - Matches `R2_lead.transitions` (`us:open->in-progress`, `us->blocked`) → **R2, no ceremony** —
     these carry no evidence bar to begin with; land directly, citing the policy source only.
2. Present the R0 set — including every escalated R1, each tagged with the condition that failed
   — to the owner as ONE decision via the `AskUserQuestion` tool: surface every flip in this set
   in a single ratification (not N separate prompts), with structured options — authorize / hold /
   reword-first — alongside the reconcile edits and any limitation the red team surfaced.
   Recommend with trade-offs; the owner authorizes. Scope this prompt to the R0 + escalated-R1 set
   ONLY — the R1 auto-apply (step 4) and R2 no-ceremony flips get no fresh ask (RFC-0027).
3. **Only on that authorization**, apply `reconcile.edits` and every `reconciledText` for the
   R0/escalated set. A governed doc must certify exactly what shipped — never round a partial
   criterion up to done. Land each as a **separate accept commit** that edits the front-matter
   `status:` and the matching INDEX row, citing the owner's in-session authorization.
4. **R1 auto-apply (and R2) flips do not wait for step 2.** Apply that flip's `reconciledText`
   first if its verdict was `flip-after-reconcile`, then land it in its OWN commit whose message
   cites the packet's run id (the workflow invocation id, e.g. `wf_xxxxxxxx`) and the policy
   source (`govkit.yml @ <short-sha>`) — that citation REPLACES the in-session owner quote, it
   does not supplement it.
5. Re-run the gate after the flips, and confirm the remote ref actually moved after pushing.

## Why fewer asks is safe here

R1 removes the ask; it removes nothing that verifies. Three controls stay exactly as strict as
before RFC-0027:

- **The deterministic section gate at `implemented` is untouched.** `govkit verify` still fails
  an RFC flipped to `implemented` (or a `rel` at `released`) that is missing its
  `requiredSectionsByStatus` sections — As-built / Deviations from design (RFC-0010). An R1 flip
  that skips the ask still cannot skip proving what shipped.
- **The distiller audits every R1 flip commit.** DISTILL (RFC-0017) reads each R1 commit against
  the packet it cites: a flip that cites a red gate, a `blocked` red-team, or no packet at all is
  an escape, logged to LEARNING-LOOP. The audit lands after the fact, but it is not optional —
  R1 is fast, not unwatched.
- **Code approval stays untouched, always.** This tiering covers doc `status:` bookkeeping only.
  Never self-approve, never self-merge, never act as code owner (AGENTS.md) — R1 does not touch
  that rule and never will; it only changes who signs the transcription of a fact the gate and
  the packet already established.

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

## Gotchas

The failure modes this ritual keeps re-learning, written where you meet them (seeded from
`LEARNING-LOOP.md`; the distiller extends this list from new escapes):

- **Premature `drift --ack`.** `drift` hashes the **staged/committed** blob, not the working tree.
  Acking while the governed change is still unstaged pins the *old* blob — the gate goes green, then
  drift re-fires the moment you commit. Always stage/commit the governed change **first**, then
  `drift --ack`. (Round 23; hit twice in one gate-close session.)
- **Front-matter ↔ INDEX drift.** A doc's `status:`/`owner:` and its INDEX row cell must match;
  `verify` catches a mismatch. When you flip a status, edit **both** the front-matter and the INDEX
  row in the same change, or the close goes red on the next run.
- **Status flip is an owner act, in its own commit.** A sub-agent never flips a `status:` (the
  skill-scoped freeze hook now denies it at the tool boundary). The main agent flips only on the
  owner's in-session authorization, in a **separate** commit that cites it — never folded into the
  implementation commit. (RFC-0027/RFC-0032 F-freeze.)
- **Never pipe the gate through `head`/`grep` in a `&&` chain** — the pipe swallows the failing exit
  code and a red gate reads green. Capture to a file or check `$?` before chaining. (Round 12.)
- **Act on the *same* green.** `bun run check && <flip/merge/push>` in one chain — a green captured a
  few edits ago certifies the previous tree, not this one. (Round 22.)

## Why one packet

The owner is the bottleneck when every flip is surfaced separately. Batching the whole tail into
one packet turns N interruptions into one ratification, while keeping the two controls that
protect the record: an independent verify and an independent red team, neither authored by
whoever wrote the change.
