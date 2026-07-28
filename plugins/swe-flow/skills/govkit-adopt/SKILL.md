---
name: govkit-adopt
description: >
  Get govkit governance INTO a repo — from nothing (greenfield: `govkit init` scaffolds
  govkit.yml, the PreToolUse write-time hook, and docs/{product,rfc,adr,issues}/INDEX.md,
  idempotently) or onto an existing corpus of prose docs that predate front-matter (adopt:
  `govkit init --adopt` extracts declared metadata like **Status**: X, sentinels what it
  cannot find so the gate still catches it, and reports status values outside the enum as
  a suggested govkit.yml patch — dry-run unless --apply). Use whenever the user says
  "adopt govkit", "set up governance", "govkit init", "migrate our docs", "bring govkit
  into this repo", "onboard this repo to govkit", or asks how to start gating their docs.
  Decides greenfield vs adopt from evidence on disk, never by asking. Never flips a status
  or assigns an owner. A repo is RED right after adopting — expected, not a bug — and this
  skill gives the triage order.
allowed-tools: Read, Grep, Glob, Bash
---

# Govkit Adopt

Turn a repo with no governance, or one with prose docs that predate govkit, into a
govkit-gated repo. Two paths. **Deciding which one is the skill's first job — from
evidence on disk, not by asking the user.**

## Which path

| Signal (check on disk) | Path |
|---|---|
| No `govkit.yml`, and no markdown that already looks like a spec/decision/story (no `**Status**:`-shaped prose, no `docs/{adr,rfc,decisions,product}` etc.) | **Greenfield** |
| No `govkit.yml`, but markdown docs already exist with declared prose metadata and no YAML front-matter | **Adopt** |
| `govkit.yml` already exists | Governance is already wired. Run `npx govkit doctor` if this govkit build has it (an in-flight sibling addition — check `govkit --help` for it) and follow its next-action line; otherwise run `npx govkit verify` / `npx govkit report` and treat any doc still lacking front-matter as the **Adopt** case below. |

Grep, don't guess: `grep -rlE '^\*\*Status\*\*|^Status:' <candidate dirs>` finds prose
metadata; `grep -rL '^---' <candidate dirs>/*.md` finds docs with no front-matter block at
all. Both are real signals; a hunch is not.

## Path A — Greenfield

```
npx govkit init [--root <dir>] [--docs-root <dir>]
```

Scaffolds `govkit.yml` (the default schema: types `prd`/`rfc`/`adr`/`us`), the PreToolUse
write-time hook (`.claude/settings.json`, wired to `govkit audit-write`), and one
`INDEX.md` stub per type. **Idempotent** — an existing file is skipped and reported, never
clobbered, unless `--force`. Nothing else to decide; run it and move to doc-type choice below.

## Path B — Adopt

`govkit init --adopt` **requires an existing `govkit.yml`** — it reads doc dirs and
required keys from it (`loadConfig`), it does not scaffold one. So the real sequence is:

1. **`npx govkit init`** first, even in the adopt case — idempotent, so if `govkit.yml`
   already exists this step just reports `exists ... skipped` for everything and writes
   nothing. This step never touches your existing docs; it only fills gaps (INDEX stubs,
   the hook, the schema file itself).
2. **Point the config at your real layout.** The scaffolded schema assumes
   `docs/{product,rfc,adr,issues}`. If your docs live elsewhere (`docs/decisions/`,
   `adr/`, `rfcs/`), edit `govkit.yml`'s `docs.types.<type>.dir` to match — `adopt` walks
   exactly the dir the config names, nothing more. See doc-type choice below for adding or
   renaming types.
3. **Dry run:** `npx govkit init --adopt [--root <dir>]`. For every doc that has NO
   front-matter, it prints the exact block it would prepend — one line per required key,
   each tagged `# extracted from prose` or `# NEEDS REVIEW — not found`. Docs that already
   carry a (well-formed) front-matter block are **never touched**, even if incomplete —
   that is a human edit, not a migration. A doc whose block is present but malformed is
   also left alone, for `verify` to report separately.
4. **Read the preview before applying.** This is the diff. Do not skip straight to
   `--apply` — that is exactly the "launder a guess into a record" failure this tool is
   built to avoid.
5. **Apply:** `npx govkit init --adopt --apply`. Writes the previewed blocks to disk.
   Exit code reflects whether any migrated doc still has a `NEEDS REVIEW` field, so a CI
   step cannot mistake a partial migration for a clean one.
6. It also prints **status-vocabulary drift**: real `status:` values it found (in docs
   that already had front-matter) that fall outside your configured enum, as a suggested
   `docs.types.<type>.statuses` patch. This is a **report only** — adopt never edits
   `govkit.yml`. A human decides whether to widen the enum or fix the doc.

**Lighter-weight alternative, if migrating the whole backlog isn't worth it today:**
wire CI's gate with `npx govkit check --changed --base <ref>` so only new-or-modified
docs must comply; the report is scoped to changed docs (though verify still full-scans
for corpus-level checks like duplicate ids). Existing legacy docs stay ungated until
someone touches them. This is a real alternative to migrating the whole backlog at once,
not a lesser version of adopt.

Full mechanics, an example transcript, and the id/filename gotcha:
`references/adopt-mechanics.md`.

## Why it refuses to guess

The load-bearing rule: a **missed** extraction costs a human one diff line to fill in; a
**wrong** extraction asserts metadata nobody approved — worse than a red gate, because it
launders a guess into a record. So extraction only reads declared shapes (`**Status**: X`,
a line-leading `Key:`, the first `#` heading, a labelled ISO date, an id-prefixed
filename) and never scans running prose. When it can't find one, it writes the sentinel
`<MISSING — fill in>` — chosen specifically because it still fails `verify`'s placeholder
check, on every required key, including `owner`/`title`/`date` which have no enum of their
own to fail against otherwise. **Never write a real value the source didn't declare. Never
assign an owner. Never pick a status.**

## Choosing doc types for this repo

Default four — `prd`, `rfc`, `adr`, `us` — cover most repos. Adding a type (this repo adds
a fifth, `rel` for release notes) is copying an existing `docs.types.<name>` block and
changing `dir`/`idPrefix`/`statuses`/`startStatus`.

**The minority case: `domain`.** A `domain` doc type (governing `docs/domain/**`, DDD
bounded-context models) fits a repo with genuinely heavy business logic, not a general
default. Evidence, from this repo itself: it authored the `ddd-flow` plugin and ran it
end-to-end here, producing 31 files under `docs/domain/` — and its own `govkit.yml` still
declares only `prd, rfc, adr, us, rel`. No `domain` type. That is not an oversight to fix
in passing; it is the honest baseline. Propose `domain` only when the repo's own domain
model is a first-class deliverable a team maintains over time, not a one-off design
exercise — and say so explicitly rather than defaulting it on.

## After adopting: the repo is RED — that is correct

Run `npx govkit check` (or `verify`) right after `--apply` and expect failures. That is
the tool working, not broken — every sentinel and every unreviewed status is a fact
nobody has vouched for yet, gated exactly as it should be. Triage in this order:

1. **Sentinels first** (`<MISSING — fill in>`) — mechanical, no judgment call. Someone who
   knows the doc fills in the real `owner`/`title`/`date`/`status`/`id`.
2. **Enum drift second** — a config/policy call: widen `docs.types.<type>.statuses` in
   `govkit.yml` to include a real value in use, or correct the doc's `status:` to an
   existing one. A human decision, not the agent's to make.
3. **Malformed blocks third** — docs `adopt` skipped entirely; `verify`'s own report names
   them separately. Fix by hand.
4. **Re-run** `npx govkit check` until green.

If `npx govkit doctor` exists in this build (`govkit --help` will show it), prefer its
report and next-action line over re-deriving this order by hand each time — it is the
current source of truth for "what's still red and what to do next," not this prose.

## Hard rules

- **Decide the path from evidence on disk** (grep for prose metadata / missing
  front-matter), never by asking the user which mode to use.
- **`--apply` only after showing the dry-run diff.** Never apply unreviewed.
- **Never flip a status. Never assign an owner.** Adopt writes only what the prose already
  declared; anything unsourced stays sentinelled and red — a gate that asserts unverified
  metadata is worse than a red one.
- **A post-adopt red gate is the expected, correct state.** Report it as such and give the
  triage order above; don't imply something broke.
- **Editing `docs.types.<type>.dir` / adding a type is a human-reviewed config change** —
  propose it, don't silently rewrite `govkit.yml` and re-run.
- **`domain` is opt-in for heavy-domain-logic repos, not a default** — say so, with the
  31-file/no-domain-type evidence above, when a user asks whether to enable it.
