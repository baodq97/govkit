# Substance scoring anchors — rubric v1 (RFC-0019)

Pinned scale for `swe-flow:judge`. Every verdict cites `rubricVersion: substance-v1` and the
judging model; scores are comparable ONLY within one (rubric, model) pair. Four dimensions,
each 0–100 against the bands below; overall = weighted mean (weights beside each dimension).
Judge the prose in front of you — never reward length, headings, or keyword density (the
deterministic floor already screened shape, and shape is exactly what a gamer fakes).

## Dimensions and weights

| Dimension | Weight | Question |
|---|---|---|
| claims-evidence | 35 | Are claims specific and backed — numbers, named files/runs, cited events — rather than asserted? |
| consistency | 25 | Do the sections agree with each other and with the doc's own front-matter/status? |
| alternatives | 20 | Were alternatives genuinely weighed (real trade-offs, stated rejection reasons), or strawmanned/absent? |
| actionability | 20 | Could a competent stranger act on this — reproduce, implement, or audit — without the author present? |

## Bands (every dimension uses the same five)

- **0–20 — vacuous.** Keyword-salad, circular restatement, or filler; removing the doc would
  lose nothing. Right headings with empty rooms behind them land here, not higher.
- **21–40 — shape without substance.** Real sentences, but claims are generic and
  unfalsifiable ("improves quality", "robust design"); no numbers, no named artifacts; an
  LLM could have written it about any project.
- **41–60 — plausible but unverifiable.** Coherent and project-specific, but key claims
  cannot be checked from what is written (missing figures, unnamed evidence, hand-waved
  trade-offs). The default band when you cannot tell — uncertainty scores DOWN, not up.
- **61–80 — sound with gaps.** Specific, checkable, internally consistent; minor holes (one
  unquantified claim, one alternative dismissed too fast) that a reviewer would note but not
  block on.
- **81–100 — sound, specific, falsifiable.** Claims carry their evidence; a stranger could
  re-derive or refute the doc from its own text; alternatives read like they were really
  considered by someone who wanted one of them to win.

## Hard rules

- Uncertainty scores toward the LOWER band boundary. A 90 must be earned on the page.
- Never score structure: missing sections are the floor's business; judge only what the
  prose asserts and whether it holds.
- One-line reason per dimension, quoting or naming the decisive evidence (or its absence).
