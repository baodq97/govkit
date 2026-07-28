---
name: distill-learnings
disable-model-invocation: true
description: >
  Runs the DISTILL step of the R7 learning flywheel (RFC-0017): reads the gate journal
  (.govkit/journal.jsonl), the escape log (LEARNING-LOOP.md), and the git delta since the
  last round, clusters incidents into evidence-backed lessons, encodes each at the
  lowest-cost surface (AGENTS.md rule, corpus fixture, govkit.yml tweak, ledger entry),
  validates gate-touching proposals with `govkit calibrate` (FP=0, non-regressing recall),
  and hands off as a PR — proposal-only, never merged by the agent. Use when asked to
  "distill learnings", "chưng cất bài học", "run the learning loop", or "update the corpus
  from the journal", and after incidents or retrospectives. Exits early with "insufficient
  data" on a thin journal rather than inventing lessons.
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
---

# Distill Learnings

Turn the repo's operating record into proposed guardrail changes, under RFC-0017's three
hard laws. You propose; a human ratifies. Work on a branch, never on main.

## Step 0 — insufficient-data early exit

Count the journal records and escape-log entries since the last distill round (find the last
round entry in `LEARNING-LOOP.md`). If there is too little signal to distinguish a pattern
from noise, report **"insufficient data"** with the counts and STOP. An invented lesson
poisons an append-only corpus; fail-honest over fail-productive.

## The procedure

1. **Read the record.** `.govkit/journal.jsonl` (gate outcomes, including drift/ledger
   records), `LEARNING-LOOP.md` (the escape log), and `git log` since the last distill
   round.

2. **Cluster incidents and escapes into candidate lessons.** Each lesson must carry its
   evidence: the specific journal records and/or escape entries that justify it. No
   evidence, no lesson.

3. **Pick the LOWEST-cost encoding for each lesson,** in this order:
   - an existing rule already covers it → **drop it** (say so);
   - a rule line in `AGENTS.md`;
   - a `weak/` or `good/` fixture under `packages/govkit/eval/fixtures`;
   - a `govkit.yml` tweak (e.g. a `tiers:` demotion backed by journal FP evidence);
   - a ledger entry for newly discovered work.

4. **Validate.** Every proposed fixture must actually be caught: run
   `node packages/govkit/dist/cli.js calibrate --corpus packages/govkit/eval/fixtures
   --baseline packages/govkit/eval/baseline.json` and require FP=0 with non-regressing
   recall. A `weak/` fixture the floor MISSES is itself a finding — propose the floor rule
   and the fixture together, and flag it loudly rather than quietly shelving the fixture.

5. **Write the proposals to the working tree** (on the branch), append a round entry to
   `LEARNING-LOOP.md` recording what was distilled and from which evidence, and run the full
   gate (`bun run check` or the repo's equivalent) so the change-set arrives green.

6. **Hand off as a PR — never merge.** State the three hard laws in the handoff:
   (1) proposal-only — the distiller never merges, never self-flips a status, never edits
   the baseline except via the documented `--update-baseline` human path; (2) every
   gate-touching proposal passed `govkit calibrate` with FP=0 and non-regressing recall
   before entering the PR; (3) the corpus is append-only — fixtures were added, none
   removed or weakened.
