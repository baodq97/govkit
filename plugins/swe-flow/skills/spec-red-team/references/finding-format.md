# Red-team finding format and ranking rubric — v1 (RFC-0022)

Pinned contract for every `spec-red-team` brief. Findings that do not fit this shape are
not findings; change this file only via an RFC-0022 amendment, never inline.

## The finding shape

Every reported finding carries five fields, all mandatory:

| Field | Content |
|---|---|
| id | `F1`, `F2`, … in rank order |
| Fails if | ONE concrete, testable condition — the design is wrong exactly when this holds |
| I × L × C | the three rubric scores below, plus their product (the rank score) |
| Evidence to gather | the specific observation that would confirm or clear the condition — a command to run, a file to read, a consumer to ask, a number to measure |
| Self-refutation | one line: what in the doc/repo was checked against this finding and why it did not defeat it |

Phrasing rules for "Fails if":

- Concrete and testable — someone could design an observation that settles it. "Fails if
  the eval floor and this skill disagree on what counts as a governed doc" qualifies;
  "seems risky", "might not scale", "could confuse users" do not.
- About THIS doc — grounded in a quoted or named passage, config key, or repo fact, never a
  generic risk any project has.
- One condition per finding — compound conditions split into separate findings and rank
  separately.

## Ranking rubric

Score each dimension 1–3 against the anchors; rank score = impact × likelihood ×
cheapness-to-test (range 1–27, higher = attend first). Ties break toward the cheaper test.
Uncertainty scores toward the LOWER anchor — an inflated likelihood is an invented weakness
by another route.

| Score | Impact (if the condition holds) | Likelihood (that it holds) | Cheapness-to-test |
|---|---|---|---|
| 3 | proposal is wrong or must be abandoned | doc/repo evidence points at it now | one command or one file read settles it |
| 2 | a section or mechanism needs rework | plausible under stated assumptions | an experiment or a consumer conversation settles it |
| 1 | cosmetic; a patch absorbs it | requires several unlikely things at once | only real-world usage over time settles it |

The product deliberately rewards cheap tests: a 3-impact, 2-likelihood, 3-cheap finding
(18) outranks a 3-impact, 3-likelihood, 1-cheap one (9), because the brief optimizes for
what the owner should check NEXT, not for how alarming a finding sounds.

## Brief template

The brief is response text for a PR body or review comment — never a file, never content
for the doc under attack.

```markdown
## Red-team brief: <doc id> — <title>

Target: <path> · status: <current> → intended: <target flip>
Floor: verify <green/red> · check <green/red>   (red floor = stop; no brief)

### Steelman

<The doc's strongest case, in its own terms. 3–6 sentences: problem, mechanism,
why the rejected alternatives lose.>

### Ranked findings

#### F1 — Fails if <condition> (I3 × L2 × C3 = 18)
- Evidence to gather: <the observation that confirms or clears it>
- Self-refutation: <what was checked; why it did not defeat this>

#### F2 — …

### Refuted candidates

- <candidate condition> — answered by <quoted/cited passage>.

### Kill criterion

<ONE condition under which the proposal should be abandoned rather than patched,
plus the observation that would establish it.>
```

## Hard rules

- **Never invent; never suppress.** Every finding survives an explicit self-refutation
  attempt; every dropped candidate the doc answers is listed with the answering passage.
  An empty findings list with a populated refuted list is a legitimate brief.
- **The kill criterion is mandatory and singular.** It must name an observable condition
  under which patching is the wrong response. "Fails if it doesn't work" and restated
  finding F1 are both invalid — the kill criterion is the abandon-vs-patch line, not the
  top-ranked risk repeated.
- **Every finding names its test.** A finding whose evidence-to-gather field is empty or
  circular ("check whether it fails") is unfinished; either name the observation or drop
  the finding.
- **No verdicts, no scores, no status advice.** The brief never says APPROVE/BLOCK and
  never recommends a status value — the reviewer verdicts, the judge scores, the owner
  flips. This brief only hands the owner better reasons.
