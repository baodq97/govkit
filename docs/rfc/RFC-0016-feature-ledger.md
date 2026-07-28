---
id: RFC-0016
title: Machine-checkable feature ledger — append-only done-ness agents cannot game (govkit ledger)
status: implemented
owner: baodq97
date: 2026-07-07
reconciled: sha256:b749aad127726c7d
governs:
  - packages/govkit/src/commands/ledger.ts
---

> Adds an opt-in committed JSON ledger of features — `{ id, title, spec, passes, check? }` —
> and a `govkit ledger` gate that enforces schema, unique ids, spec resolution into the
> governed-doc chain, and an APPEND-ONLY rule diffed against git HEAD: entries and their
> `check` provenance may never vanish, while `passes` may flip honestly in either direction.
> The ground truth of "done" becomes a contract agents cannot game by deleting the evidence.
> The owner delegated approval in-session and implementation ships in the same PR, so this RFC
> lands directly at `status: implemented`, the RFC-0013 precedent.

## Summary

The system can now enforce that docs are structurally sound (verify), referenced correctly
(RFC-0003), coherent in status (RFC-0008), and reconciled with code (RFC-0015). What it cannot
yet do is state, machine-checkably, *which features are done and how that was established* —
per-feature, with provenance, in a form an agent cannot quietly rewrite. Anthropic's
long-running-agent harness demonstrated the pattern this RFC adopts (the F4 research
candidate): a committed feature list where agents "edit this file only by changing the status
of a passes field", under the explicit rule that "It is unacceptable to remove or edit tests
because this could lead to missing or buggy functionality". The insight is that the *list of
claims* must be tamper-evident even when the *claims* themselves are honest booleans.

The mechanism: an opt-in committed JSON file (default `docs/ledger.json`, path configurable
via a new optional `ledger.path` config key) of the shape
`{ "entries": [{ "id", "title", "spec", "passes": bool, "check"? }] }`. `spec` references a
governed doc id (US/RFC) and MUST resolve — chain referential-integrity (RFC-0003) extended to
the ledger. `check` is an optional human-readable command string recording how `passes` was
earned. `govkit ledger` gates the file: parse and schema fail loud, ids are unique, every
`spec` resolves, and — the anti-gaming core — the current file is diffed against
`git show HEAD:<path>`: a removed entry id, or a removed `check` field on an existing entry,
is a violation. Flipping `passes` in either direction is always legal (false→true is done;
true→false is an honest regression), and new entries are always legal.

## Motivation

A status flip on a US is one front-matter edit — no per-feature granularity, no record of how
done-ness was established, and nothing stopping an agent from flipping it back and forth
invisibly between reviews. Fowler's observation about SDD tooling applies with force here:
prose checklists are exactly what agents ignore, and instructions not to delete evidence are
instructions, not guardrails. The repo's standing posture (RFC-0013's citation) is that things
which absolutely must not happen need deterministic enforcement. "Evidence of done-ness must
not vanish" is such a thing. The ledger makes the evidence a parsed contract and makes its
deletion a red gate — the agent's only legal moves are the honest ones: add an entry, flip a
boolean, or update a `check` string in a reviewed diff.

## Design

**The file.** Opt-in and committed: `docs/ledger.json` by default, overridable via a new
optional `ledger.path` config key. JSON, not YAML — deliberately, see Alternatives. Entries
carry `id` (unique), `title`, `spec` (a governed doc id, US or RFC), `passes` (boolean), and
optionally `check` (a human-readable command string recording how `passes` was earned).

**The gate, in four layers.** `govkit ledger` runs, in order: (1) parse + schema — malformed
JSON or a shape violation fails loud, never degrades; (2) unique ids; (3) referential
integrity — every `spec` must resolve to a real governed doc id, the RFC-0003 discipline
extended to the ledger; (4) **append-only vs git** — the working copy is diffed against
`git show HEAD:<path>`; a REMOVED entry id, or a removed `check` field on a surviving entry,
is a violation. `passes` flips are legal both ways; new entries are legal; editing a `title`
is legal. Evidence may not vanish.

**Degradation posture.** No git, or no committed version of the ledger yet: the git-backed
layer (4) degrades to skipped with a stderr note — the same honesty posture as `stale`
(RFC-0009): never silently green, never a hard failure for a missing capability. Layers 1–3
are pure and always run.

**The summary.** The command prints an advisory `N/M passing` line that never affects the exit
code — the gate is about integrity, not completeness; a ledger full of honest `false` is a
passing gate. `ledger` joins `--journal` (RFC-0012) and `--hook` (RFC-0013) with standard gate
semantics: violation ⇒ would-be exit 1 ⇒ exit 2 under `--hook`.

## Alternatives

| Option | Why rejected |
|---|---|
| **Doc front-matter statuses alone** | A status flip is one edit: no per-feature granularity beneath a US, no `check` provenance, no append-only protection. The ledger is finer-grained than the chain and tamper-evident where front-matter is not. |
| **YAML ledger** | JSON is diff-precise and agent-edit-friendly — a one-line boolean flip diffs as one line, with no indentation ambiguity or accidental restructuring — and matches the Anthropic pattern this adopts. |
| **Put the ledger under `verify`** | verify is pure-fs by invariant; the append-only check needs `git show HEAD:`. Same boundary that kept `stale` and `drift` out of the floor: git-touching gates are siblings, not verify kinds. |
| **A Markdown checklist** | Unparseable as a contract — exactly the artifact Fowler observed agents ignoring. A checklist can be reworded, reordered, or trimmed without any machine noticing; the ledger's whole point is that the machine notices. |

## Impact / rollout

- **Opt-in and dark until invoked, fail-loud once invoked:** `verify`/`eval`/`check` are
  untouched and the no-key CI gate never runs `govkit ledger`. But running the command against
  a missing ledger file is an operational error naming the expected path (exit 1, `--hook` 2),
  never a green exit — an opt-in gate pointed at nothing must never pass silently.
- **Adoption path:** seed the ledger from open US docs (`spec` pointing at each), all
  `passes: false`; from then on the only reviewed motions are boolean flips and new entries.
- **Reuses existing plumbing:** spec resolution consumes the shared governed-id collector
  (`util.collectGovernedIds`) — literally the same id universe verify's RFC-0003 reference
  check resolves against; the git call is the `execFileSync` discipline of `stale`/`drift`;
  `--journal`/`--hook` ride the RFC-0012/13 cli edge unchanged.
- **Rollback** is deleting the ledger file and the optional `ledger.path` key; nothing else
  reads either.

## Open questions

- **Chain-status coherence hookup.** Should a US at `done` require all its ledger entries
  passing? Deferred to a follow-up RFC once real usage exists — wiring the two newborn checks
  together before either has field history is the coupling RFC-0009 deliberately declined.
- **Machine-executable `check` commands.** Running them would make govkit a test runner, out
  of scope by construction: the ledger records how `passes` was earned, CI runs the checks.
- **Multi-ledger monorepos.** One `ledger.path` per repo for v1; per-package ledgers deferred
  until a consumer needs them.

## Roadmap fit

Implements the F4 research candidate and extends R5/R6: the ledger is the machine-readable
work-queue for parallel agent waves — each wave claims entries, earns `passes` flips, and the
gate guarantees no wave can erase another's evidence.

## As-built

Shipped as `commands/ledger.ts` (`govkit ledger`) with the `ledger.path` config key, as
recorded in the same PR; review-hardening lands before merge, keeping accepted design ==
shipped code. The four gate layers run in the recorded order, the git-backed layer degrades
with the stderr note exactly as § Design states, and the `N/M passing` summary is advisory
only — it never touches the exit code.

## Deviations from design

Review hardening (sprint-3 fixer pass) changed the shipped behavior in four ways:

- **The missing-file exit-0 flipped to fail-loud** (review decision): the draft Impact bullet
  said "no ledger file, no gate — exits 0"; shipped, a missing file at the configured path is
  an operational error naming the expected path (exit 1, `--hook` 2). An opt-in gate pointed
  at nothing must never pass silently — § Impact above now records the shipped semantics.
- **`git show HEAD:./<path>`** (git's cwd-relative form) replaced the bare `HEAD:<path>`
  spelling: the bare form resolves from the repo TOP LEVEL, so with `--root` a subdirectory of
  the repo the append-only baseline lookup always missed and layer 4 silently never ran.
- **Path-continuity guard:** when the configured ledger path has no HEAD baseline, the gate
  also reads HEAD's own govkit.yml — if the COMMITTED config's ledger path (explicit or
  defaulted) has a baseline that differs from the current path, that is a `path-moved`
  violation. This closes the rename bypass (point `ledger.path` at a fresh file in the same
  change and the committed evidence vanishes unseen); a genuine first-ever ledger still
  degrades to the surfaced skip note. Migrate by keeping the committed path in the same change.
- **Shared id collector:** spec resolution was reimplemented at first; it now consumes
  `util.collectGovernedIds`, the same collector verify's reference check uses, so the two id
  universes can never disagree — the § Impact reuse claim is one function, not a parallel walk.

## Recommendation

Ship `govkit ledger` as the tamper-evident ground truth of done-ness: committed JSON, spec ids
resolved into the chain, and an append-only rule against HEAD under which evidence may not
vanish but booleans may move honestly in both directions. Prefer this over front-matter
statuses alone (no granularity or provenance), over YAML (diff-imprecise), over a verify kind
(breaks the pure-fs floor), and over a Markdown checklist (not a contract) — each rejected
above.
