---
id: RFC-0027
title: Risk-tiered ratification — fewer asks, same provenance
status: draft
owner: TBD
date: 2026-07-24
governs:
  - govkit.yml
  - AGENTS.md
  - plugins/swe-flow/skills/gate-close
parent: PRD-0001
---

> Encodes the measured load of the two-round gate-loop dogfood (LEARNING-LOOP Rounds 17-18) as a
> `ratification:` config block in `govkit.yml`: three tiers over status transitions that keep the
> owner in the loop for every one-way door while letting the lead flip a *recording of reality*
> once the deterministic gate + the gate-loop packet already prove it. Honor-system enforced —
> the RFC-0012 tier, now WITH a committed text — because a stateless no-git gate cannot see a
> transition (that honesty is why the tiers live in config that skills/agents read, not in the
> engine). No engine change, no new CLI subcommand, no `verify`/`eval` change, no key in CI.
> Drafted at `status: draft`; the accept is the owner's.

## Summary

The dogfood loop works, but it taxes the one human it depends on. Across two slices (RFC-0025,
RFC-0026) the owner was touched by **4 interrupts + 4 flip commits + 1 drift-ack commit (×3
docs)** — and roughly half of those carried no decision. They were *recording-of-reality*
ratifications: the code had
already shipped, `bun run check` was already green, the gate-loop packet already had an
independent verify and an independent red team, and the "ask" only added latency before writing
down what was already true.

This RFC tiers ratification by the reversibility of the transition, encoded as a `ratification:`
top-level block in `govkit.yml`:

| Tier | Name | When | Transitions / acts |
|---|---|---|---|
| **R0** | owner | always in-session human ratification, no exceptions | `prd->approved`, `rfc->accepted`, `adr->accepted`, any `->superseded`, `rel->released`, merge/publish acts, **and any edit to the `ratification:` block itself** |
| **R1** | packet | the lead may flip WITHOUT a fresh ask when ALL conditions hold | `rfc: accepted->implemented`, `us: in-progress->done`, `drift --ack` |
| **R2** | lead | no ceremony | `us: open->in-progress`, `us: ->blocked` |

The R1 conditions are the whole safety of the scheme: full repo gate green (`bun run check`), a
gate-loop packet exists for this slice, the red-team verdict is `flip-as-is` or
`flip-after-reconcile` (reconcile applied first), and the flip commit cites **both** the packet
run id **and** the policy (`govkit.yml @ <commit sha>`). The engine never reads this block —
skills and agents do. It is the RFC-0012 honor-system tier, made auditable by giving it a
committed text and a periodic distiller audit, not by teaching a no-git gate to police
transitions (which it structurally cannot).

## Motivation

### The measured 2-round load

Rounds 17-18 built and closed two slices end-to-end through the gate-loop. The owner-facing
ratification events, classified by whether each was a genuine decision or bookkeeping:

| # | Ratification | Slice | One-way door, or recording reality? | Real decision? | Tier here |
|---|---|---|---|---|---|
| 1 | `rfc draft->accepted` | RFC-0025 | one-way door — authorizes building the design | **yes** | R0 |
| 2 | `rfc accepted->implemented` | RFC-0025 | recording reality — code shipped, gate green, red-team flip-as-is | no (bookkeeping) | R1 |
| 3 | `rfc draft->accepted` | RFC-0026 | one-way door | **yes** | R0 |
| 4 | `rfc accepted->implemented` | RFC-0026 | recording reality | no (bookkeeping) | R1 |
| 5 | `drift --ack` ×3 docs (RFC-0017/0019/0022), one authorization, commit `cc8901b` | RFC-0025 close | recording reality — packet confirms the governed designs are unaffected | no (bookkeeping — re-vouch with evidence, no design decision) | R1 |

Raw tally behind the table: **4 interrupts** (the owner pulled mid-flow per document instead of
once from a packet) + **4 flip commits** (2 slices × accept + implemented) + **1 drift-ack
commit** (one in-session authorization re-vouching 3 docs, `cc8901b` — the gate journal and git
history record a single ratification event here, not three). Of the five distinct ratifications,
**two** (the accepts) were one-way-door decisions; **three** were recording-of-reality. The two
adjudications that *were* real judgment (RFC-0026's red-team P1 "no-change" call, Round 18) sit
under R0 too — they stay the owner's. So the load that this RFC removes is precisely the
bookkeeping half: rows 2, 4, 5 asked a human to confirm something the deterministic gate and the
two-agent packet had already established.

### One-way door vs recording of reality

The distinction the tiers turn on:

- A **one-way door** authorizes a commitment that is costly to reverse: accepting an RFC means
  code may now be built against it; approving a PRD unlocks the RFC; superseding retires a
  decision others depend on; releasing publishes to consumers. Reversing any of these costs
  rework downstream. These stay R0 — a human decides, in session, every time.
- A **recording of reality** writes down a state that is *already true and already proven*: an
  RFC reaches `implemented` only after the code has shipped and the gate + packet certify it; a
  US reaches `done` the same way; a `drift --ack` records that a governed doc's design is
  unaffected by an edit the packet's red-team examined. Nothing is being *decided* — the flip
  transcribes an established fact. Asking a human to ratify a transcription adds ceremony without
  adding judgment, *as long as* the evidence is present and cited. R1 is exactly "the evidence is
  present and cited, so the lead may transcribe."

This is not "trust the lead." It is "the deterministic gate + the independent two-agent packet
have already done the checking a human ratification would re-do by eye, so bind the flip to that
evidence instead of to a fresh interruption." The evidence is the ratifier; the citation makes it
auditable.

## Design

### The `ratification:` block (config, not code)

A new top-level block in `govkit.yml`. The engine never reads it; `gate-close` / the gate-loop
workflow and the acting agent do. Illustrative shape (final key names settle in implementation):

```yaml
# ── Ratification policy (RFC-0027) — honor-system, engine never reads this ────
# Tiers status transitions by reversibility. R0 stays a human, in session, always.
# R1 lets the lead transcribe a proven recording-of-reality without a fresh ask,
# but ONLY when every condition holds and the flip commit cites the evidence.
ratification:
  R0_owner:            # one-way doors — always in-session human ratification
    transitions: [prd->approved, rfc->accepted, adr->accepted, "*->superseded", rel->released]
    acts: [merge, publish, "edit:ratification"]   # editing this block is itself R0
  R1_packet:           # recording-of-reality — lead may flip WITHOUT a fresh ask iff ALL hold
    transitions: [rfc:accepted->implemented, us:in-progress->done, "drift --ack"]
    conditions:
      - full_gate_green: bun run check            # the FULL gate, never a narrower command
      - packet_exists                             # a gate-loop packet for THIS slice
      - red_team_in: [flip-as-is, flip-after-reconcile]   # reconcile applied first
      - cite: [packet.runId, "govkit.yml@<sha>"]  # commit cites BOTH the run and the policy
  R2_lead:             # no ceremony
    transitions: [us:open->in-progress, us->blocked]
```

This YAML is illustrative, for exposition only — it is not a second normative copy. Once
committed, `govkit.yml`'s own `ratification:` block is the canonical source for the R0/R1/R2
transition lists; this RFC does not restate them elsewhere as a copy that could drift from it.

`gate-close`'s "Acting on the packet" step reads this block to decide, per flip in the packet,
whether the lead may land the accept commit directly (R1, all conditions met and cited) or must
present it to the owner (R0, or R1 with any condition unmet). AGENTS.md § Agent constraints — the
blanket "never self-flip a `status:` field" rule — is amended to carve out exactly the R1/R2
transitions under exactly these conditions, and to keep every R0 transition as-is.

### Why config, not engine

`govkit verify` is a stateless, no-git, no-key gate. It reads the working tree's current
front-matter; it cannot see *who* flipped a status or *from what*. A doc born at `accepted`
passes clean (AGENTS.md § Agent constraints already states this — it is RFC-0012's honesty). So
transition legality cannot be a `verify` check without either giving the gate git/history access
(breaking the no-key CI invariant) or making it stateful (breaking its portability). The tiers
therefore live where the actor that *performs* the transition already runs — the skill/agent —
as committed config it must honor. This is the RFC-0012 honor-system tier, upgraded from "a rule
in prose" to "a rule in versioned config with a periodic audit."

### Safety nets that stay (unchanged)

- **The as-built forcing function is untouched.** `verify` still gates the required
  `As-built` / `Deviations from design` sections at `implemented` (govkit.yml
  `requiredSectionsByStatus`, RFC-0010). R1 removes the *ask* to flip; it does not remove the
  deterministic proof that the flipped doc records what shipped. An R1 flip whose doc lacks those
  sections still fails the gate.
- **The distiller audits R1 flips.** The periodic DISTILL step (RFC-0017) gains one duty: audit
  R1 flip commits against their cited packets. A flip that cites a packet whose gate was red, or
  whose red-team said `blocked`, or that cites no packet at all, is an **escape** → logged to
  LEARNING-LOOP. This is R1's compensating control: the flip is fast and unblocked, but it is not
  unaudited.
- **Code approval stays human.** This policy covers doc STATUS bookkeeping only. Never
  self-approve, never self-merge, never act as code owner (AGENTS.md) is untouched — approval of
  CODE remains a human act. R0's `merge`/`publish` acts name the doc-side of those events
  (recording a merge/publish in a governed doc); they do not license an agent to merge code.

## Alternatives considered

- **(a) Keep everything in-session (status quo).** Rejected on the measurement: three of the five
  ratifications in Rounds 17-18 carried no decision. Keeping them all in-session pays a
  fixed human-interrupt tax on every slice to re-confirm, by eye, facts the deterministic gate
  and the two-agent packet already established. The bottleneck is the owner (AGENTS.md blind
  spots); this alternative widens it for zero added judgment.
- **(b) Put transition-legality in the ENGINE (`verify` checks who flipped).** Rejected on two
  grounds. First, honesty: a stateless no-git gate cannot see a transition at all — it reads the
  current tree, where a doc born at `accepted` is indistinguishable from one legitimately
  advanced (RFC-0012; AGENTS.md § Agent constraints states this in the repo already). Second,
  invariant: teaching `verify` to read git history or persist prior state would drag git/state
  into the no-key CI path and break the load-bearing "same binary, no API key, non-Claude
  contributor gated identically" invariant (RFC-0001). The honest home for a transition rule is
  the actor that performs the transition, not the gate that cannot see it.
- **(c) Drop the `implemented`/`done` ceremony entirely.** Rejected: the as-built ritual is the
  *record*, not the ask (RFC-0010). Dropping the ceremony would delete the forcing function that
  makes design↔code divergence explicit and reviewable — the exact thing RFC-0010 exists to
  produce. This RFC removes only the *ask* to flip, and only when the packet already proves the
  record is honest; the required `As-built`/`Deviations` sections still gate at `implemented`.

## Impact / rollout

- **`govkit.yml`** gains one additive `ratification:` block. The engine does not read it, so
  `verify`/`eval`/`check` behaviour is byte-for-byte unchanged and no test in the deterministic
  suite moves. Editing the block is itself an R0 act.
- **`AGENTS.md`** § Agent constraints: the blanket "never self-flip a `status:`" bullet is
  amended to reference the R0/R1/R2 tiers — R0 transitions stay human, R1/R2 are carved out under
  the cited conditions. § Coding rules gains one line binding an R1 flip commit to cite both the
  packet run id and `govkit.yml @ <sha>`.
- **`plugins/swe-flow/skills/gate-close`** SKILL.md "Acting on the packet" step: per flip, read
  the tier; land R1/R2 directly with the citation, escalate R0 to the owner. The "one packet"
  framing is unchanged — the packet still carries an independent verify + independent red team;
  R1 changes only *who signs* a recording-of-reality flip, not *what evidence backs it*.
- **The distiller** (RFC-0017) gains the R1-audit duty above.
- **No engine change, no new CLI subcommand, no `verify`/`eval`/`drift` change, no new
  dependency, no key in CI.** Rollback is deleting the config block and reverting the three doc
  edits; there is no migration and no state.

## Open questions

- **R1 trusts a two-agent packet (gate + red-team) with no fresh human in the loop.** The
  compensating control is the distiller's periodic audit of R1 flip commits against their cited
  packets — but that audit is *after the fact*, so a bad R1 flip lives until the next DISTILL
  run. Is that latency acceptable, or should R1 additionally require the packet to be less than N
  commits old? Leaning acceptable (the as-built gate still blocks a dishonest `implemented` flip
  synchronously; the audit only catches a flip that cited a *red* packet), but flagged for the
  first real escape to settle it.
- **The owner's global CLAUDE.md rule needs a matching one-line amendment.** The standing
  instruction "AI proposes, flips in a separate accept commit citing authorization" is stated
  repo-agnostically; R1 introduces a narrow, evidence-gated exception to "never self-flip." That
  one-line amendment lives in the owner's private global config, **out of this repo's scope** —
  flagged here for the owner to make, so the global rule and this repo's policy do not silently
  diverge.
- **R1's `us: in-progress->done` reuses the same evidence contract as `rfc->implemented`.** A US
  has no `As-built`/`Deviations` forcing function (that is RFC-specific), so a `done` flip's only
  synchronous proof is the gate + packet, with no doc-section backstop. If a US `done` flip turns
  out to need its own record, that is a follow-up, unneeded until the first case.
