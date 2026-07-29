---
id: REL-0006
title: govkit 0.10.2 — the anti-filler rubric stops rejecting ordinary English
status: released
owner: baodq97
date: 2026-07-29
---

> The eval floor's `nofiller` rule listed `to be written` as a filler marker. It matches
> "when it had to be written" — a normal clause — and it blocked a real RFC in this repo
> while writing it. The corpus reported `fp 0` throughout, because no `good/` fixture had ever
> used the phrase legitimately: the false positive was real and simply unmeasured. Removing
> the alternative costs zero recall (no `weak/` fixture relies on it) and the case is now
> pinned by a fixture.

## What shipped

Engine `govkit@0.10.2`, a rubric and corpus change over 0.10.1 — no source change:

- **One alternative removed from the `nofiller` pattern** in all three configs that carry it
  (`packages/govkit/templates/govkit.default.yml`, `template/govkit.yml`, and this repo's own
  `govkit.yml`). What the rule keeps — every alternative that cannot occur in ordinary prose:

  ```
  lorem ipsum|to be filled (in|out)|todo:?\s*write|placeholder text|fill (this )?in later|insert [a-z ]+ here
  ```

  Note that this record had to fence that pattern to pass its own gate: the rubric strips code
  fences before matching, so a doc quoting the markers in prose blocks itself. That is a second
  false positive of the same rule, mitigated by markup rather than fixed — writing about a
  filler detector is rare enough that a fence is a fair price, and fencing a literal config
  value is the correct markup anyway.
- **A `good/` corpus fixture that uses the phrase legitimately**
  (`RFC-0002-ordinary-english.md`, "when it had to be written we had a single consumer"). This
  is what makes the false positive measurable: restoring the old pattern turns `calibrate` red
  with `fp 1`, naming the file, and flags the f1 regression against the committed baseline.
  Corpus true-negatives go 4 → 5; precision, recall and f1 stay at 1.

## Migration

None. This only loosens a blocking rule, so a doc that passed 0.10.1 still passes. A repo whose
own `govkit.yml` carries the old pattern keeps it — the config is the consumer's, and `init`
never rewrites an existing one. To adopt the fix, delete `to be written|` from the `nofiller`
pattern in each rubric.

## Rollback

`npm i -D govkit@0.10.1` — stateless engine, pin change only. Nothing in a 0.10.2-scaffolded
config is unknown to 0.10.1's loader.

## Post-publish smoke

Executed 2026-07-29 after the release workflow ran green, through `npx --yes govkit@latest` in
a clean git repo outside this monorepo. Both directions were checked, because loosening a
blocking rule is only safe if it still blocks what it should:

- `npm view govkit version` → `0.10.2`.
- **The false positive is gone.** An RFC whose Context reads "When it had to be written we had
  one consumer" → `verify` OK, `eval` OK, floor 100%, score 100/100, **exit 0**. The same doc
  blocked on 0.10.1.
- **Recall is intact.** An ADR stubbed with two of the retained markers:

  ```
  ## Context
  TODO: write this up properly once we know what we are doing about the queue.
  ## Decision
  Placeholder text.
  ```

  → `eval` **FAIL, exit 1**, citing both floor rules (`not an empty stub`, `no template filler
  left in`). The rule still catches the thing it exists for.
- In-repo, the fixture is proven fallible: restoring the removed alternative turns `calibrate`
  red with `fp 1`, names `good/docs/rfc/RFC-0002-ordinary-english.md`, and reports the f1
  regression 1 → 0.909 against the committed baseline.
