# `govkit init --adopt` — exact mechanics

Sourced from `packages/govkit/src/commands/adopt.ts` and `cli.ts` — read the code, don't
paraphrase from memory; it changes independently of this doc.

## The two lanes

Adopt walks every configured type's `dir` and classifies each markdown file (front-matter
parsed with the same parser `verify` uses):

- **Lane 1 — no front-matter block at all.** Adopt proposes one: it strips fenced code and
  HTML comments from the body first (so a doc that *shows* a front-matter example inside a
  fence never has that example lifted as its real metadata), then extracts each required
  key with a narrow, declared-shape rule (below). The block is only ever *written* under
  `--apply`; either way it is always shown in the dry-run preview.
- **Lane 2 — a front-matter block already exists.** Adopt never touches it, even if a
  required key is missing or empty — that gap is a human edit, `verify` will report it,
  and it is out of adopt's scope on purpose. The only thing adopt does with Lane-2 docs is
  check `status:` against the type's configured `statuses:` enum and collect any value
  outside it, for the drift report.
- **Malformed block** (a `---` block present but unparseable) — skipped entirely by
  adopt, in both lanes; it is `verify`'s job to report a doc in this state, not adopt's to
  fix or overwrite.

## Extraction rules — what counts as "declared", what doesn't

Every extractor returns `null` on ambiguity, which becomes the sentinel. None of them ever
reads a bare sentence.

| Key | Rule | Why |
|---|---|---|
| Any key except title/id/date | `**Key**: value` (bold, anywhere on the line) *or* a line-leading `Key: value`. Stops at a bold marker, `·`, `|`, or newline. | Both are shapes real docs already use to declare metadata inline or as a labelled line; a word inside a sentence is not. |
| `title` | The **first ATX heading** (`# ...`) only. | The "first non-empty line" fallback is deliberately not used — it would guess a title out of arbitrary prose. |
| `date` | A labelled `Date:` line whose value is strict `YYYY-MM-DD`. | A bare date floating in prose ("ship by 2026-01-01") is too ambiguous to trust. |
| `id` | The filename only, and only when the type declares `idPrefix` and the filename actually starts with `<idPrefix>-` (e.g. `ADR-0001-foo.md` → `ADR-0001`). | An id is never invented from prose. |
| `status` | Same rule as any key, then lowercased. | Normalizes `Proposed` → `proposed` before the enum check downstream. |

**The id/filename gotcha:** if your existing docs are not named `TYPE-NNNN-slug.md` (e.g.
they're dated like `2026-05-29-decision.md`, or just descriptive names), `id` will
sentinel on **every single doc**, regardless of any other config. `idFilenameConvention:
false` on a type only tells `verify` not to *require* the id inside the filename going
forward — it does not change what `adopt` can extract, because `extractId` only ever
looks at the filename. Don't try to fix this by tweaking config; the honest fix is either
renaming files to carry the id, or accepting that this repo will assign real ids by hand
post-adopt.

## Serialization

Every value is written double-quoted (so a real heading like `# Connector: Secrets`
round-trips as legal YAML), and every line carries a trailing provenance comment —
`# extracted from prose` or `# NEEDS REVIEW — not found` — because a wrongly-extracted
value is only catchable if the diff says where it came from. Read that comment before
trusting an "extracted" field; it is a comment, not a guarantee.

## CLI surface (verified against `govkit --help`)

```
govkit init         [--root <dir>] [--force] [--docs-root <dir>]
govkit init --adopt [--root <dir>] [--apply]
```

- `--apply` is only legal combined with `--adopt` (`govkit init --apply` alone errors:
  "`--apply` is only valid with `init --adopt`").
- `--force` is init-only (greenfield); it is meaningless combined with `--adopt` and the
  CLI rejects the combination.
- `--changed` is **not** valid on `init`/`init --adopt` at all — it is scoped to
  `verify`/`eval`/`check` only. Adopt always processes every doc under a type's configured
  `dir`; there is no partial/incremental adopt run. (The `--changed`-scoped gate is a
  separate, complementary onboarding technique — see SKILL.md's "lighter-weight
  alternative".)
- Exit code of `init --adopt`: `0` if every migrated doc's fields were fully extracted
  (or there was nothing to migrate), `1` if any migrated doc still carries a `NEEDS
  REVIEW` field — so a CI step cannot mistake a partial migration for a clean one.

## Example dry-run transcript (shape, not literal output)

```
$ npx govkit init --adopt

docs/adr/2026-05-29-use-postgres.md [adr]  ← has NEEDS-REVIEW fields (will still fail verify)
  id: "<MISSING — fill in>" # NEEDS REVIEW — not found
  title: "Use Postgres for the primary store" # extracted from prose
  status: "accepted" # extracted from prose
  owner: "<MISSING — fill in>" # NEEDS REVIEW — not found
  date: "2026-05-29" # extracted from prose

govkit init --adopt: 1 doc(s) would get front-matter (1 with NEEDS-REVIEW fields) —
nothing written; pass --apply to write.
  (docs that already have a front-matter block are left untouched, even if incomplete.)

govkit init --adopt: 'adr' has status value(s) outside its enum: shipped
  suggested govkit.yml — docs.types.adr.statuses: [proposed, accepted, rejected, superseded, shipped]
  (not applied — govkit.yml is your contract; edit it yourself if you agree.)
```

Read every `NEEDS REVIEW` line before `--apply` — those are exactly the fields nobody
declared and adopt refused to guess.
