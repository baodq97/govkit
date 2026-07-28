---
id: RFC-0023
title: Config generality hardening — let a divergent consumer retire its parallel bash gate
status: implemented
owner: baodq97
date: 2026-06-09
reconciled: sha256:1679905ad67cfb29
governs:
  - packages/govkit/src/config.ts
  - packages/govkit/src/commands/verify.ts
---

> R1 of PRD-0001. The deliverable was framed as "make `govkit.yml` parameterize the diverging
> surface (status vocabularies, extra required keys, extra doc types)". Exploring the two real
> consumers showed that framing is **already satisfied** — both edit statuses, extra required
> keys, and (customs) a 5th doc type today, via config, with zero engine change. So this RFC does
> NOT add those knobs. It closes the *specific* expressiveness gaps that the evidence shows forced
> a real consumer to keep a **parallel hand-rolled gate** alongside govkit. Drafted at
> `status: draft`; the accept is the owner's.

## Summary

govkit's config surface looked fully general, but the n=2 proving grounds disagree in a
measurable way. `alert-triage-agent` runs `npx govkit verify` + `eval` straight in CI with no
custom scripting — it proves the kernel works for a straightforward consumer.
`customs-platform`, the divergent consumer, runs `govkit.yml` **and** a hand-rolled
`scripts/verify.sh` that re-implements front-matter + INDEX checks in bash. Its own
`docs/known-traps.md` KT-0004 records the cost: the two gates "only agree when owners are written
`owner: "@handle"`" — customs maintains two governance engines by hand and they drift.

The reason the bash gate exists is not preference; it is three things `govkit.yml` cannot
currently express. This RFC makes them expressible, with one measurable success criterion:
**customs-platform deletes `scripts/verify.sh` and relies on `npx govkit verify` as the single
gate.** That collapses a real consumer's two-gate drift into one — the exact "looks-enforced"
failure govkit exists to prevent, found in govkit's own adoption.

## Context — the evidence

The generality dataset PRD-0001 names is the diff of the two consumers' `govkit.yml` plus what
they govern *outside* it. Reading both:

1. **`base.required` is forced onto every doc type.** `verify.ts` unions `base.required`
   (`[id, title, status, owner, date]`) into every type's required set. customs has doc types
   with **no lifecycle** — `docs/runbooks` (required `id title service severity owner date`, no
   `status`) and `docs/postmortems`. It could not add them to `govkit.yml` because govkit would
   force a `status` key they do not have, so it left them in bash. verify.sh's own comment:
   *"Runbooks have no status: field — skip INDEX sync for them."*
2. **INDEX-sync is status-only and substring-fragile.** `checkIndex` finds a row via
   `line.includes(id)` and validates status via `row.includes(status)`. Substring matching
   false-passes `US-1` against a row for `US-10`, and a status `draft` against the word "draft"
   anywhere on the row (e.g. in a title cell). customs' bash anchors both to table cells
   (`grep -qE "[| ]$status[ |]"`) — precision govkit lacks.
3. **INDEX-sync cannot check any column but status.** customs' bash also drift-checks the
   **owner** column against front-matter (KT-0004). govkit has no way to say "the owner column
   must match too".

None of the advanced chain features (`refs`, `terminalStatuses`, `requiredSectionsByStatus`) are
used by *either* consumer — so this RFC deliberately does not touch them. The gap is narrow and
real, not the broad one imagined.

## Decision / recommendation

Three additive, optional `DocType` fields. All absent in every config today ⇒ byte-for-byte
identical behavior for govkit-self and alert-triage; only customs opts in.

1. **`excludeBase: string[]`** — keys subtracted from `base.required` for this type. Effective
   required = `(base.required − excludeBase) ∪ type.required`. A lifecycle-less type sets
   `excludeBase: [status]`. Status-enum validation already no-ops when a type has no `statuses`
   (`verify.ts:146`), and INDEX status-sync already skips an empty status value — so dropping the
   *required* constraint is the only change needed for a status-less type to pass.

2. **`index: false | { sync: string[] }`** — `false` skips all INDEX checks for the type (a type
   with no INDEX.md at all). An object configures which front-matter keys must appear, as matched
   table cells, in the doc's INDEX row. Absent ⇒ `{ sync: ["status"] }` — the current behavior,
   so this is non-breaking. customs sets `index: { sync: [status, owner] }` on its lifecycle
   types.

3. **Bounded table-cell matching (behavior, not a field).** `checkIndex` locates a doc's row by
   matching its `id` as a whole table cell (`/(?:^|\|)\s*<id>\s*(?:\||$)/`) instead of a
   substring, and validates each `index.sync` key's value the same way. Both sides are
   quote-normalized — the front-matter value arrives parser-unquoted, and a single surrounding
   quote pair is stripped from the INDEX cell — so `owner: "@handle"` agrees with a `"@handle"`
   or bare `@handle` cell, closing the KT-0004 drift directly. (Validated on the real
   customs-platform repo: the cell was written `"@baodq97"` with literal quotes — bare-only
   matching would have false-flagged it; the synthetic fixture missed this, real data caught it.)

Together these let customs express runbooks/postmortems and owner-column sync in `govkit.yml`,
and they make INDEX validation precise enough to replace the bash anchoring — the three reasons
verify.sh exists.

## Alternatives / trade-offs considered

- **Separate `skipIndex` + `indexColumns` fields instead of one `index`.** Rejected: two knobs
  for one concern (how this type relates to its INDEX). The single `index` field reads as one
  decision and has fewer failure modes. Trade-off accepted: `index` carries both "is there an
  INDEX" and "which columns sync" — documented, not split.
- **A general `required`-override that replaces base entirely (`requiredOverride: [...]`).**
  Rejected: forces every type to re-list the base keys it keeps, inviting omission bugs;
  `excludeBase` is the minimal subtraction and keeps base as the default.
- **Make INDEX a full markdown-table parser (column-by-header).** Rejected for v1: heavier, and
  header names diverge (`ID` vs `Id`). Bounded-cell matching gets the precision without binding to
  a header schema — same "good-enough heuristic, honestly scoped" stance as the original
  checkIndex.
- **Do nothing — tell customs to add the types to `govkit.yml` as-is.** Rejected: it can't, that
  is the whole finding — `base.required` would force `status` onto a runbook.

## Impact / migration / rollout

- **Backward-compat:** the three fields are absent everywhere today. govkit-self and
  alert-triage configs and docs are unchanged in behavior. Risk concentrates in one place:
  bounded-cell matching is *stricter* than `includes()`, so a currently-passing INDEX that relied
  on loose substring matching could newly fail.
- **Mitigation / generality proof:** a regression test loads all three real `govkit.yml`
  (govkit, customs, alert) and runs `verify` against each repo's real `docs/**/INDEX.md`; all
  must stay green across the change. This is the n=3 generality evidence PRD-0001 asks for, drawn
  from **real** data rather than a synthetic config.
- **Rollout:** ship the engine fields, then (separately, in the customs repo) add the runbook /
  postmortem types and `index.sync` to its `govkit.yml`, run both gates to confirm parity, then
  delete `scripts/verify.sh`. The deletion is the acceptance signal, executed in the consumer,
  not here.
- **Scope of code change:** `config.ts` (three optional fields + load defaults) and `verify.ts`
  (`required` filtering, `checkIndex` skip + bounded matching + multi-key sync). No new command,
  no new dependency, no change to the no-key invariant.

## Open questions / risks

- **Stricter matching as a hidden breaking change.** The regression suite is the guard, but an
  *external* consumer's INDEX could be looser than the three we can test. Decision: bounded-cell
  matching is correct; if it surfaces a real external false-positive, that is a fixture to add,
  not a reason to keep the substring bug. Flagged for the friction log.
- **`excludeBase` could be abused to drop `id`/`title`.** A type with no `id` breaks duplicate
  detection and refs. Open: whether to forbid excluding `id`/`title` (engine guard) or leave it
  to the author. Leaning toward a guard, since dropping `id` silently disables cross-doc checks.
- **`postmortems` lifecycle.** Postmortems *do* carry `status` in customs, so they need
  `index.sync`, not `excludeBase` — only runbooks are truly status-less. The design covers both;
  noting it so the customs config change targets each correctly.
- **Does owner-cell matching over-fit customs' table?** A consumer whose INDEX has no owner column
  but sets `sync: [owner]` would fail every row. Decision: that is a correct failure (they asked
  to sync a column that does not exist); document it.

## As-built

Shipped as designed — three optional, non-breaking config fields plus bounded INDEX matching, no
new command and no change to the no-key invariant:

- **`config.ts`** — `IndexConfig` (`false | { sync: string[] }`), `DocType.excludeBase`,
  `DocType.index`, and a load-time guard that fails loud if `excludeBase` drops `id`/`title` (the
  Open-question guard was taken, not deferred).
- **`verify.ts`** — G1 `excludeBase` subtraction in `runVerify`'s effective-required set and
  `checkIndex`'s `index === false` skip; G2 bounded id lookup (`rowHasId`) and cell match
  (`rowHasCell`) replacing the substring `includes()`; G3 configurable multi-key `sync` (default
  status-only, fail-soft on empty).
- **Tests** — `packages/govkit/test/config-generality.test.ts` covers loadConfig fields, the
  id/title exclusion guard, and G1/G2/G3 runVerify behaviour.

Verified against the real divergent consumer: with an extended `govkit.yml` (status-less
`runbook`/`postmortem` types + owner-sync), the consumer's corpus verifies with 0 violations —
the measurable success criterion (retire the doc-governance half of its parallel `scripts/verify.sh`)
is met. Gate green on merge into `main`: 238 tests, `verify`/`eval`/`drift`/`ledger` all OK.

## Deviations from design

- **Quote tolerance, added beyond the original design.** Real-consumer data exposed a case the
  synthetic fixtures missed: an INDEX owner cell written `"@handle"` (literal YAML quotes) against
  a parser-unquoted front-matter value. `rowHasCell` strips one surrounding quote pair
  (`stripQuotes`) before comparing — mirroring the consumer's own bash `tr -d`. Not in the drafted
  decision; recorded as a friction→fixture per RFC-0024's loop.
- **Renumbered RFC-0011 → RFC-0023.** This RFC was authored as RFC-0011 on a divergent local line;
  when that line merged with `origin/main` (which had independently shipped a different RFC-0011),
  it was renumbered to RFC-0023 to keep ids unique. No design change — filename, `id:`, and the
  cross-reference in RFC-0024 were updated together.
- **G4 (template sentinels, `.env`-leak, AGENTS.md-size) left out of scope**, as the Decision
  section scoped it — the consumer keeps only that non-govkit remainder of its bash gate.
