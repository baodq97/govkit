---
id: US-0005
title: Evaluate an opt-in hash-anchored strict mode for citations (VeriContext prior art)
status: open
owner: baodq97
date: 2026-07-29
priority: P2
---

As a maintainer of a governed repo with high-stakes doc→code citations, I want the option
of a fail-closed, content-hashed citation check, so that a citation whose target code
changed AT ALL is flagged — even when the anchored resolver's ±3-line tolerance would
still pass it.

## Context

The 2026-07-29 field verification confirmed prior art: **VeriContext**
(github.com/amsminn/vericontext, npm) embeds a SHA-256 content hash in every code
citation at write time and verifies fail-closed — "either the hash matches or it
doesn't. No fuzzy matching." This also stales PRD-0001's R7 evidence line ("no tool has
deterministic drift detection"), corrected in the same change-set as this US.

govkit already occupies the tolerant end of this trade-off, deliberately:

- `verify --check-citations` (`citations.ts`) resolves ANCHORED citations — path, line
  span, and a code token from the citing line within ±3 lines — precisely because a
  positional check "certifies staleness" and a live corpus always carries one-or-two-line
  drift between edits.
- `drift` (RFC-0015) pins `reconciled:` shas at pathspec granularity with an explicit ack
  ritual.

A hash-per-citation mode is STRICTER than both: it catches semantic edits inside an
unchanged line count, but it fires on every legitimate touch of cited code until the doc
re-hashes — on this repo's own corpus that is FP-generating behavior, and FP→0 is the
north star (PRD-0001). So the question is not "copy VeriContext" but "is there a citation
class (crypto params, security invariants, published API examples) where fail-closed is
worth the re-hash tax, as an opt-in tier".

## Acceptance criteria

- [ ] A short written evaluation exists (this US updated, or a linked note) measuring, on
      this repo's own corpus: how many current citations would a hash mode have flagged
      over the last 30 days of history, and how many of those flags were signal
      (semantic change) vs. tax (formatting/rename touches).
- [ ] A decision is recorded: adopt as an opt-in per-citation or per-type tier
      (`kind: hash`), or reject with the FP analysis as evidence.
- [ ] If adopted: a follow-up RFC is drafted before any code (AGENTS.md lifecycle —
      system-boundary change to the gate logic classifies up).
- [ ] PRD-0001's R7 evidence row cites VeriContext as catalogued prior art (done in the
      same change-set that authored this US).

## Non-goals

- Replacing the anchored resolver's tolerance as the default — the ±3 window exists
  because zero-FP on a live corpus is the product (RFC-0001, PRD-0001 north star).
- Any always-on hash verification in the no-key CI path before the FP analysis exists.
