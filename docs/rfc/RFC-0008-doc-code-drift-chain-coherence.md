---
id: RFC-0008
title: Doc–code drift, gate-half — chain-status coherence and a cleanup report
status: accepted
owner: baodq97
date: 2026-06-01
---

> Answers the question "how do we keep docs from rotting into trash, and get feedback back into
> the docs after code ships?" with the honest scope first: govkit will **never** make docs and
> code one artifact — that needs *generating* one from the other, which it does not do. The
> achievable goal is to make drift **loud and acknowledged, not silent**. This RFC builds the
> half of that which is honest to *enforce* (the GATE class); the advisory half is named as
> RFC-0009, deliberately not folded in. Drafted at `status: draft`; the accept is the owner's.

## Summary

A governance gate that only checks a doc *in isolation* cannot tell whether the doc still
matches reality — so docs rot, and a team ends up maintaining two diverging truths (the doc and
the code). The user's ask: track what is **done** vs **outdated** vs **cleanup**, and get a
**feedback loop after implementation** so the docs reflect what shipped.

The load-bearing realization, stated so it is not overclaimed: **"docs == code, one source of
truth" is not achievable by a no-key gate** (or by any check short of generating one artifact
from the other). Judging whether a doc's prose still describes the code's behavior is a semantic
judgment — exactly what RFC-0001 reserves for the opt-in `reviewer` agent, never the
deterministic floor. So this RFC does **not** promise to unify docs and code. It delivers the
part that *is* deterministic and zero-false-positive: it makes structural drift between the
governed artifacts **visible and blocking-on-acknowledgment**.

It splits the anti-rot work along the exact line RFC-0001 already drew:

- **GATE class (this RFC):** **chain-status coherence** — a structural inconsistency between a
  doc's lifecycle state and its parent's — plus a **cleanup report**. Both are deterministic
  with no semantic judgment, so they are honest to block / surface.
- **ADVISORY class (RFC-0009, named not built):** **staleness** — a `governs:` link + git
  recency proxy. Necessarily advisory (any trivial commit to governed code trips it), the
  eval-class sibling of the gate-class coherence check.

## Decision

**1. Chain-status coherence (GATE — blocks).** Extend the reference machinery RFC-0003 already
built (a doc's `parent` resolves to a real id) with a *status* relationship across that edge:

- Each type may declare **`terminalStatuses`** — the subset of its `statuses` that means
  "decided / shipped" (e.g. `rfc: [accepted, superseded]`, `us: [done]`). Opt-in: a type with
  no `terminalStatuses` is exempt, so the check is **non-breaking** and lights up only where
  configured.
- **The rule:** a doc whose status ∈ its own `terminalStatuses`, and which has a `parent` ref,
  requires that parent's status ∈ **the parent type's** `terminalStatuses`. In words: *you may
  not ship a thing whose design was never decided.* A `done` issue under a `draft`/`proposed`/
  `rejected` RFC is the canonical violation — and the strongest "feedback-after-implement"
  signal there is, because it fires exactly when you mark the work done.
- **Terminal, not equal.** The rule is "parent is in **a** terminal state," not "parent ==
  accepted". A `done` issue under a `superseded` RFC is legitimate (the design was decided, then
  replaced); only a *pre-decision* parent (draft/proposed) or a *rejected* one is the
  inconsistency. This precision is what keeps the check zero-false-positive and therefore safe
  to gate.

**2. Cleanup report (advisory — surfaces, does not block).** A lifecycle summary that groups
governed docs by status and names the cleanup candidates — docs in a terminal-but-retired state
(`superseded`, `rejected`) that still linger, and counts per state ("3 accepted, 2 superseded —
cleanup candidates, 1 draft"). Pure reuse of the status enum, no new data. It answers "what is
done / outdated / needs cleanup" directly, without pretending to judge content.

**3. The feedback trigger is the transition, not a scan.** Coherence runs in `verify` (full
sweep) for CI, but the *reconciliation reminder* is event-driven: the `audit-write` hook already
gates writes, and a write that flips a doc into a terminal status is the precise moment to emit
"you marked this done — re-read its parent and confirm it reflects what shipped." Deterministic
prompt, not a semantic check; cheaper and better-targeted than scanning every doc every run.

## Alternatives considered

| Option | Why rejected / deferred |
|---|---|
| **Block on git-recency staleness** (code newer than the doc it governs ⇒ fail) | Any trivial commit (typo, rename, lint autofix) to a governed path trips it → the RFC-0004/0005 avalanche reborn, *and* worse: it trains people to touch the doc meaninglessly to turn red green — lying to the gate, turning "doc updated" into noise. Staleness MUST be advisory → RFC-0009, not here. |
| **Fold staleness into this RFC** | Conflates two trust classes. The whole point (RFC-0001) is that the gate is zero-false-positive and the proxy is advisory; mixing them re-introduces the false positives the gate must never have. Kept separate on purpose. |
| **Semantic "does the doc still describe the code" check** | The actual single-source-of-truth dream, and exactly what a no-key deterministic layer cannot do (a stale-but-well-formed doc has the same lexical fingerprint as a current one). That is the opt-in `reviewer` agent's job. Out of scope by construction. |
| **Generate docs from code (or code from docs)** | The only true single-source — and a different product. govkit governs hand-written docs; it does not generate either artifact. Named so the honest ceiling is explicit. |
| **`parent == accepted` (strict equality)** | Mis-fires on the legitimate `done`-under-`superseded` case, creating a false positive that would get the whole coherence gate distrusted. Rejected for "parent ∈ terminalStatuses". |

## Impact / rollout

- **Non-breaking / opt-in.** Coherence fires only for types that declare `terminalStatuses`;
  absent ⇒ exempt. This repo can adopt it (mark `us: [done]`, `rfc: [accepted, superseded]`) or
  not — verify stays green until the config opts in. No migration.
- **Reuses RFC-0003 refs** — the `parent` edge and its resolution already exist; this adds a
  status predicate on the resolved parent, a small, well-scoped extension of `checkReferences`.
- **Honors `--changed` (RFC-0004/0005):** a new coherence violation is a cross-doc check, so it
  rides the same "always-report global-integrity" lane — a `done` child can implicate an
  *untouched* parent, exactly the masking case `--changed` must not hide.
- **Cleanup report** is advisory output (a new `govkit report`, or a section of existing output
  — TBD in impl); it never affects exit codes.
- **Tests:** (a) `done` issue + `draft` parent ⇒ violation; (b) `done` issue + `accepted` parent
  ⇒ ok; (c) `done` issue + `superseded` parent ⇒ ok (terminal, not equal — the precision test);
  (d) a type with no `terminalStatuses` is exempt (non-breaking floor); (e) the coherence
  violation is always-reported under `--changed` even when only the child changed.
- **Rollback** is removing `terminalStatuses` from config; the check goes dark with no residue.

## Open questions

- **RFC-0009 — staleness advisory (named here, not built).** A `governs: [glob]` front-matter
  key linking a doc to the code it describes, plus a git-recency check (`eval`-class, advisory):
  if the governed paths have commits newer than the doc's last commit, warn "code moved since
  this doc was last touched — reconcile or supersede." It is the *advisory* sibling of this
  RFC's gate check, and stays advisory because the real question it raises — *was the change
  significant?* — is semantic, which the no-key layer cannot answer (so it defers significance
  to the human / reviewer agent rather than guessing). To be its own RFC; deliberately not in
  scope here so the gate class stays zero-false-positive.
- **Where the cleanup report lives.** A dedicated `govkit report`, or folded into `check`'s
  output? Lean: a separate read-only command, so it never tempts anyone to gate on it.
- **Should `terminalStatuses` default from position in the `statuses` list** (e.g. the last
  state is terminal) instead of an explicit key? Lean no — explicit is honest and avoids a
  magic convention, consistent with config-not-code. Recorded.
- **Multi-parent / transitive coherence.** v1 checks the single `parent` edge one level (as
  RFC-0003's refs are single-scalar, non-transitive). A done issue two levels under a draft
  ancestor is not caught. Named as the same bounded-scope choice refs already made.
- **The write-time nudge (item 3) misses the Edit-based status flip — RESIDUE.** `audit-write`
  defers every Edit by design (an Edit carries partial content the hook cannot parse for full
  front-matter), so the reconciliation reminder fires only when a doc is *authored* complete
  with a terminal status in one Write — NOT on the far more common `open → done` flip done as an
  Edit of the status line. The **reliable** feedback-after-implement is therefore the CI
  coherence gate (this RFC's GATE half); the nudge is best-effort on the Write path. Lifting it
  means teaching `audit-write` to detect a status transition in an Edit's `new_string`, a
  deliberate v1 non-goal. Named so item 3 is not read as fully delivering moment-of-flip feedback.
