# Orchestration lessons — what three multi-agent rounds actually measured

Source: three consecutive rounds on the govkit repo, 2026-07-28. 27 subagents, 1738 tool calls,
~3.4M subagent tokens. Every number below was re-derived from the run transcripts, not from the
agents' own reports.

This file is the *why*. The rules it justifies live at the top of `SKILL.md`, because compaction
keeps only the first part of a skill body and a rule you cannot read is a rule that does not run.

---

## The experiment that failed three times

The question was: **how should work be split across parallel agents so they stop leaving defects
between them?** Each round pre-registered the same bar — zero seam defects, zero rule
contradictions — and each round an independent reviewer counted the result.

| Round | Split axis | Seam defects | Rule contradictions |
|---|---|---|---|
| 1 | by **file** — each agent owns disjoint paths | 3 | 1 |
| 2 | by **bounded context** — each agent also gets its context's invariants and relationships | 3 | 1 |
| 3 | by **seam** — one agent owns *both sides* of the boundary it works on | 3 (per reviewer) | 1 |

Three geometries. No movement. The bar was never lowered to make a round look better.

### Why it kept failing

Round 2 measured the mechanism directly: a builder **saw** a defect on the other side of a file
boundary, measured it, wrote it into its own report, and did not fix it — because the file belonged
to another agent. Knowing was not enough.

Round 3 removed that boundary and the count held, which rules out the simple explanation. The
evidence points somewhere else:

1. **Three of round 3's five defects were already written down by the builders themselves**, under
   an "Outside my seam" heading, before any reviewer found them. Detection worked in every round.
   **Disposition was never built.**
2. **Whatever the axis, its complement has no owner.** Split by file and the complement is another
   file. Split by context and it is another context. Split by seam and it is a third party — the
   CLI entry point, the config file, the RFC that describes the payload.
3. **No gate read across the doc↔code boundary.** A governed RFC sat at `implemented`, passed the
   structural gate, scored 100/100 on the quality rubric, and described a record shape that no
   longer existed. Structure cannot catch a false sentence.

**The conclusion is not about geometry.** It is that a fan-out needs an *integrator* — someone who
owns the union of every "not mine" — and a gate that can read a claim about code. Adding agents
does not create either one.

### What the defect count hides

Round 3 also closed **15 defects inside a seam by the agent that owned it, 11 of them unprompted**.
That number appears in no defect count, and it is the strongest argument for giving an agent both
sides of a boundary: it does not lower the escape rate, but it raises the catch rate. Judge a split
by both.

---

## Cost, measured

| | Agents | Tool calls | Est. gate wait |
|---|---|---|---|
| Round 1 | 13 | 638 | ~71s |
| Round 2 | 9 | 513 | ~177s |
| Round 3 | 8 | 587 | **~363s** |

Wait grew 5× while the agent count fell. The cause was the prompt: each round tightened
verification — *"re-run bare, pasting full output and exit code"* — without ever pricing it.

Round 3's breakdown:

```
18× full test suite   ≈288s   ← 79% of all gate wait
66× a scoped check      (cheap)
42× the linter          (cheap)
29× calibrate           (cheap)
24× verify             ≈24s
```

One command was four fifths of the cost, and nothing in the prompt distinguished it from the ones
that cost a second. Meanwhile the agents were disciplined by every other measure: duplicate
commands ran at 1–3%, tool errors at 0–1%. **The waste was structural, authored by the orchestrator,
not sloppiness on their side.** When a fan-out is slow, read your own prompt first.

### Tool mix

Bash was 66–71% of every round's tool calls; Read was 52–84 calls total. 30–50 Bash calls per round
were `cat` / `head` / `sed -n` — reading files through a shell. Agents use the shape they are given;
if the prompt demonstrates Bash, they will reach for Bash.

### A real race, not just slowness

Agents share one working tree. Round 3 issued 11 builds concurrently with 18 test runs against the
same build output. Round 1 had already recorded the symptom:

> *"One transient failure on the first run (4 drift e2e 'Module not found dist/cli.js') was a
> concurrent rebuild by the sibling agent wiping dist mid-run — it does not reproduce."*

"Does not reproduce" is the signature of a race, not evidence of harmlessness. Any agent that
writes a shared build artifact needs `isolation: 'worktree'`, or the fan-out needs exactly one
builder.

---

## Bars

Eight bars in a single round rested on a denominator nobody re-measured: 605 citations were 652,
"five readers" were seven, "nine violation kinds" were eleven, "38 relationship sides" were 104.
Three rounds running.

The instruction *"re-measure the denominator before accepting the bar"* was written into round 3's
shared preamble — and the round still shipped eight stale ones. That is the general lesson of all
three rounds, arriving one level up from where it started:

> **What a script can establish, do not ask an agent to remember.**

Hence `scripts/measure-bars.sh`: it runs the measurements and emits the bar block ready to paste,
so the number in the prompt is the number on disk.

Two corollaries worth keeping:

- **A bar met by its letter can still be missed by its intent.** One round asked that every
  relationship declare a role, and got 38/38 — with 30 of them declaring the role `other`. The
  schema was complete and empty. Ask for the property you want, not the field you can count.
- **A bar calibrated on the sample it must judge is not a bar.** One wall-clock threshold was
  picked after seeing the run it had to grade; resampling put it at the 5th percentile. Register
  before, or do not register.

---

## Reviewing

Reviewers are worth their cost — round 3's overturned their builders in three places, including a
claim that a helper covered all three surfaces when it covered them only on the green path. Two
review habits earned their keep:

- **Hunt unreachable branches.** A printing branch that could never execute shipped past two
  reviewers with every test green. For each new conditional, construct an input that reaches it or
  declare it dead.
- **Re-derive the number, don't check the arithmetic.** Reviewers that wrote their own counting
  script found what reviewers reading the builder's script did not.

And one trap on the orchestrator's side: **do not act on a weak instrument.** A quick
symbol-proximity checker written mid-round reported 74 broken citations; a third of them were false
positives, because a citation into a function body legitimately sits far from its declaration. The
tested checker disagreed. Prove the instrument before trusting its verdict — a weak check is worse
than no check, because it certifies what it cannot see.
