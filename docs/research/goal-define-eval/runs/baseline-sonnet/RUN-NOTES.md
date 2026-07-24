# Run notes — files read, in order

This run followed the hard blinding constraints: read only the listed skill
dir, the fixture dir, and files written by this run itself. No rubric, README,
prior runs, other docs/research dirs, or self-learning repo were read.

## Files read, in exact order

1. `/home/bd/personal-projects/govkit/plugins/swe-flow/skills/goal-define/SKILL.md`
2. `/home/bd/personal-projects/govkit/plugins/swe-flow/skills/goal-define/references/goal-template.md`
3. `/home/bd/personal-projects/govkit/docs/research/goal-define-eval/fixture/founder-brief.md`
4. `/home/bd/personal-projects/govkit/docs/research/goal-define-eval/fixture/emails/email-01-marcus-sales.md`
5. `/home/bd/personal-projects/govkit/docs/research/goal-define-eval/fixture/emails/email-02-dana-product.md`
6. `/home/bd/personal-projects/govkit/docs/research/goal-define-eval/fixture/slack-thread.txt`
7. `/home/bd/personal-projects/govkit/docs/research/goal-define-eval/fixture/support-ticket.md`

Note: `find` was also run (not `Read`) over both the skill dir and the fixture
dir to enumerate file paths before reading — this only lists filenames, does
not read file contents, and was scoped to the two permitted directories.
`ls`/`mkdir` were run against
`docs/research/goal-define-eval/runs/` to create this run's own output
directory; a pre-existing sibling directory `runs/baseline-opus/` was observed
in that listing but was never opened or read.

## Files written, in order

1. `/tmp/.../scratchpad/goal-draft.md` — scratch draft of the `/goal` block,
   used only to check character-budget compliance (`wc -c`) before finalizing;
   not part of the deliverable.
2. `/home/bd/personal-projects/govkit/docs/research/goal-define-eval/runs/baseline-sonnet/GOAL.md`
3. `/home/bd/personal-projects/govkit/docs/research/goal-define-eval/runs/baseline-sonnet/QUESTIONS.md`
4. `/home/bd/personal-projects/govkit/docs/research/goal-define-eval/runs/baseline-sonnet/RUN-NOTES.md` (this file)

## Character-budget check

`wc -c` on the assembled `/goal` block: 2610 bytes (first draft was 3050/3072,
over budget — compressed per SKILL.md's compression rules until it cleared the
3000-char limit).
