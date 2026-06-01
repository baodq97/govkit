---
id: RFC-0006
title: init --adopt — migrate existing prose metadata into front-matter without asserting it
status: implemented
owner: baodq97
date: 2026-05-31
governs:
  - packages/govkit/src/commands/adopt.ts
---

> Drafted from the RFC-0005 field test (LEARNING-LOOP Round 5), which validated `--changed`
> on a real 86-doc repo and surfaced the cost `--changed` deliberately does **not** pay: the
> first time a PR touches a legacy doc, that doc must pass the *full* gate. This RFC proposes
> the complement. It was drafted at `status: draft`; the owner accepted it and, after the code
> shipped, flipped it to `implemented` (see As-built) — each flip a human act, never an agent's
> (RFC-0002/0003/0004/0005 provenance lesson).

## Summary

`--changed` makes an existing repo **adoptable** by deferring the backlog: new debt blocks, legacy
debt is paid down as docs are touched. But Round 5 measured what "paid down" actually costs. The
field-test repo's 114 `missing YAML front-matter` failures were not docs *without* metadata — the two
specs the PR touched carried `**Status**: Proposed · **Date**: 2026-05-29 · **Owner**: Platform`:
title, status, date, *and* owner, all present, in **prose**. govkit reads only a leading `---` YAML
block and is blind to metadata in any other form. So an adopter touching a legacy doc hears "you have
no metadata" while staring at a doc full of it, and must hand-retype it into front-matter — per doc,
forever. A second, smaller facet: two docs that *had* front-matter used `status: shipped`, a term the
configured enum omitted — the gate's expectations are **vocabulary**, not only syntax.

This RFC proposes `govkit init --adopt`: a **non-destructive, diff-first** migration aid that lowers
the first-touch cost — explicitly **without** crossing the line govkit exists to police. The hard
constraint, stated up front because it shapes every decision below: **`--adopt` must never assert
metadata a human has not approved.** An auto-filled doc that silently passes the gate is the exact
`looks-governed-but-isn't` leak the two-trust-layers model (RFC-0001) was built to prevent — adoption
tooling that creates that leak is worse than the avalanche it removes.

## Decision

`govkit init --adopt [--root <dir>] [--apply]` — a scaffolder that operates in two distinct lanes,
because the field test surfaced two distinct costs with two distinct safe remedies.

**Lane 1 — front-matter migration (touches docs, dry-run by default).** For each governed doc that
**lacks** front-matter (only those — a doc with any `---` block is never rewritten):
- Best-effort **extract** the required keys from the doc's prose using bounded, declared heuristics
  (e.g. a `**Status**: X` / `Status: X` line, a leading `# Title`, an ISO date, an `Owner:` line),
  and **map** extracted values through the type's existing config (a `proposed` extraction is kept;
  an unmappable status is left as the raw extracted string).
- Emit a proposed front-matter block as a **unified diff**, printed, applied to nothing. Each field
  is tagged by provenance: `# extracted from prose` vs `# NEEDS REVIEW — not found`.
- A field that could not be extracted is written as a **deliberately gate-failing** value
  (an explicit sentinel that is *not* a placeholder token the gate would mask, and *not* a real-
  looking guess), so the doc keeps failing `verify` until a human supplies it. **Absence stays
  loud; it is never quietly satisfied.**
- `--apply` writes the diffs to disk. Without it, nothing is mutated. Either way, the **human commit
  of the migration is the governing act** — the same git-auditable provenance every accept rides on
  (RFC-0002), not a CI autopilot. `--adopt` is a developer tool, never a gate step.

**Lane 2 — vocabulary / config drift (touches nothing, reports only).** Scan governed docs that *do*
have front-matter and collect values that fall outside the configured sets — status terms not in the
enum, doc types in directories not yet mapped, missing INDEX files. Emit these as a **suggested
`govkit.yml` patch** (`statuses: [..., shipped]`) and an INDEX scaffold, printed for the human to
accept or reject. `--adopt` **never edits `govkit.yml`** — the schema is the human's contract with the
engine; the tool proposes, the owner disposes.

**The load-bearing rule, one line:** *extract and surface; never assert.* High-confidence extractions
become reviewable diffs; everything else stays visibly unsatisfied. The tool's job is to turn "retype
all your metadata" into "review a diff," not to manufacture a green check.

## Alternatives considered

| Option | Why rejected / deferred |
|---|---|
| **Auto-fill front-matter and apply silently** (the obvious "just fix it" move) | Manufactures the `looks-governed-but-isn't` leak: a doc passes the gate with metadata no human verified. Directly inverts govkit's reason to exist. Hard-rejected — this is the line the whole RFC is drawn around. |
| Extract values but write *placeholder* tokens (`<owner>`, `TODO`) for misses | Two failure modes: a token the placeholder-check catches just re-encodes "missing" noisily; a token it *doesn't* catch (e.g. bare `TBD`, which is legal for `owner`) would let an unreviewed doc pass. Use a sentinel chosen to fail the *enum/required* check loudly instead. |
| Teach `verify` to **read** prose metadata directly (a second parser) | Permanently widens the gate's input surface and its bug surface; every doc would then have two sources of truth for status. Migration is a one-time act — bake it into a tool, not the everyday gate. Rejected. |
| Make `--adopt` a **gate/CI step** that auto-migrates on the fly | Re-creates the silent-assert leak at CI scope, and mutates the tree in CI. `--adopt` is explicitly a local, diff-reviewed developer action. Rejected. |
| Auto-edit `govkit.yml` to absorb every out-of-enum value | The schema is the human's deliberate contract; silently widening it to make red go green defeats the point of having an enum. Propose a patch, never apply it. Deferred to "report-only." |
| Do nothing — document "retype your front-matter by hand" | The status quo Round 5 measured as the real adoption tax. The existence proof (metadata is *present*, just in the wrong form) is exactly what makes a migration aid worth building. Rejected. |

## Impact / rollout

- **Greenfield + already-adopted repos see zero change.** `--adopt` is a separate, opt-in subcommand;
  `init`, `verify`, `eval`, `check` are untouched. This repo's 100/100 path is unaffected.
- **Composes with `--changed`, does not replace it.** `--changed` *defers* the backlog; `--adopt`
  *cheapens paying it down*. A realistic adoption flow: `check --changed` to gate new work today, then
  `init --adopt` opportunistically as legacy docs are revisited. Closes the first-touch-cost residue
  named in RFC-0004 / LEARNING-LOOP Round 4 — without retrofitting the whole repo at once.
- **Non-destructive by construction.** Dry-run prints diffs; `--apply` is required to write; docs that
  already have front-matter are never rewritten; `govkit.yml` is never edited. Rollback of a dry-run is
  nothing; rollback of `--apply` is `git checkout`.
- **Scope (v1).** Required-key extraction for the built-in field shapes (title, status, owner, date)
  via declared heuristics; vocabulary/INDEX drift as a printed report. **Non-goals (v1):** parsing
  metadata out of HTML tables or YAML-in-comments; multi-line/free-form owner normalization;
  auto-applying config patches; any network or LLM call (the no-key invariant holds — extraction is
  pure-fs regex, same trust class as the rest of the engine).
- **Tests must pin the load-bearing rule, not just the happy path:** (a) a prose-metadata doc →
  `--adopt` proposes a diff with the extracted values tagged by provenance; (b) a doc missing a field
  → that field is written as a value that **still fails `verify`** (the no-silent-assert floor — the
  single most important test in the feature); (c) a doc that already has front-matter is **left
  byte-identical**; (d) `govkit.yml` is unmodified after any `--adopt` run; (e) without `--apply`, no
  file on disk changes.

## Open questions

- **Extraction confidence threshold.** How aggressive should prose extraction be before it becomes
  guessing? A `**Status**: Proposed` line is high-confidence; an `Owner: Platform` (a *team*, not a
  person — is that a valid owner at all?) is murkier; a date buried in a sentence is low-confidence.
  Lean: extract only from a small set of **declared, documented line shapes**, tag everything by
  provenance, and let the human diff-review be the confidence gate — rather than a numeric score the
  tool can't honestly compute.
- **Which sentinel for a missing field.** It must fail `verify` *loudly* (so absence stays visible) yet
  be obviously machine-inserted and trivially greppable (so a human can find every one). Candidate:
  a reserved token like `__GOVKIT_ADOPT_MISSING__` that is in no status enum and is not a legal
  placeholder/`TBD`. To be settled at implementation, RED-first.
- **Does `--adopt` belong under `init` or as its own top-level verb?** It is adjacent to `init`
  (both bootstrap governance) but operates on an *existing* corpus rather than scaffolding empty
  structure. Naming TBD with the owner; the behavior is the decision, the verb is cosmetic.
- **Self-attestation residue recurs here.** The migration's git commit is the human governing act, but
  — as in Round 2 — it is *auditable*, not *independently verifiable*: nothing proves the committer
  actually reviewed each extracted value versus rubber-stamping the diff. `--adopt` narrows the cost of
  honest review (a readable diff beats retyping); it does not, and cannot deterministically, *enforce*
  that the review happened. Named, not papered over.

## As-built

Shipped as `govkit init --adopt [--apply]` (`commands/adopt.ts`, `runAdopt`), two lanes as designed:
Lane 1 migrates front-matter for docs that LACK it — extracts required keys from declared prose
shapes, emits a reviewable preview, and writes a deliberately gate-failing sentinel for any field it
cannot find (absence stays loud); dry-run unless `--apply`. Lane 2 reports vocabulary/config drift as
a SUGGESTED `govkit.yml` patch, never applied. Docs that already have front-matter are left
byte-identical; `govkit.yml` is never edited. The load-bearing rule held: extract and surface, never
assert.

## Deviations from design

- **Verb stayed under `init`** (`init --adopt`) rather than becoming a top-level command — the open
  question resolved toward "adjacent to init," the behavior being the decision and the verb cosmetic.
- **The missing-field sentinel was settled at implementation** to a token that fails the
  required/enum check loudly and is trivially greppable, exactly as the open question required.
- **No deviation on the floor:** the no-silent-assert rule shipped intact (a missing field still
  fails `verify`), no network/LLM call entered, and the no-key pure-fs trust class held.
