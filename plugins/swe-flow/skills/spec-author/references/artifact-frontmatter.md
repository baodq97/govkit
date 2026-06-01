# Artifact front-matter — the exact shape govkit verifies

This is the output contract for `spec-author`. Everything here is **derived from the
consumer's `govkit.yml`** at run time — the tables below are the *typical* govkit defaults,
not a hardcoded truth. When the consumer's `govkit.yml` differs (extra required keys, a
different `dir`, a different `startStatus`), the config wins. Read it first; never assume.

## What govkit actually checks (so you write to pass on the first run)

`npx govkit verify` enforces several structural rules; the two below are the ones you control
when authoring a single artifact — match both and a fresh doc passes on the first run:

1. **Front-matter completeness.** The doc must open with a leading `---` YAML block, and
   every key in `base.required ∪ types.<type>.required` must be present and **non-empty**
   (empty string, `null`, or whitespace counts as missing). Extra keys are fine.
2. **INDEX.md sync** (per doc dir):
   - The dir must contain an `INDEX.md`.
   - It must have a **row that literally contains the doc's `id` string** (e.g. `ADR-0007`).
   - That same row must **literally contain the doc's `status` string** (e.g. `proposed`).
   - The match is a substring line-match, not a table parse — so the id and status text
     must appear verbatim on the row. A row whose status text is stale = a violation.

The same two checks run as a per-write PreToolUse gate (`govkit audit-write`); its block
message literally tells you to "Set owner: TBD and status: <startStatus>". Honor that.

## Discover the schema, do not hardcode

```
# in the consumer repo root (the dir holding govkit.yml)
cat govkit.yml        # read docs.base.required, docs.types, each type's dir/required/startStatus
```

`govkit.yml` shape (schemaVersion 1):

```yaml
docs:
  ignore: [INDEX.md, _TEMPLATE.md]   # filenames verify skips
  base:
    required: [id, title, status, owner, date]   # keys EVERY governed doc must carry
  types:
    <type>:
      dir: docs/<dir>          # where this type's docs live + its INDEX.md
      required: [ ... ]        # type-specific keys; verify checks base ∪ this
      startStatus: <status>    # the status a NEW doc of this type opens with
```

The effective required-key set for a type is `base.required` unioned with
`types.<type>.required` (deduped). Compute it from the file — do not reuse the table below
if the consumer's config has more.

## Typical defaults (govkit's own schema — confirm against the consumer's)

| Type | `dir` (typical) | Required keys (base ∪ type) | **Start `status:`** |
|------|-----------------|------------------------------|---------------------|
| **PRD** | `docs/product` | `id, title, status, owner, date` | `draft` |
| **RFC** | `docs/rfc` | `id, title, status, owner, date` | `draft` |
| **ADR** | `docs/adr` | `id, title, status, owner, date` | `proposed` |
| **US** | `docs/issues` | `id, title, status, owner, date, priority` | `open` |

Note **US carries an extra `priority` key** in govkit's default schema — a US written with
the PRD/RFC key set will fail verify. Always take the per-type `required` list from the
consumer's `govkit.yml`, not from memory.

## Front-matter block to emit (fill from the discovered required set)

```yaml
---
id: <TYPE-NNNN>          # next free id in the dir (scan existing files + INDEX rows)
title: <one line>
status: <startStatus>    # from govkit.yml — NEVER accepted/done/active on a new doc
owner: TBD               # ALWAYS — agents never self-assign; propose the owner in the PR body
date: <YYYY-MM-DD>       # today
# ...any other key the consumer's required list adds, e.g.:
priority: <P0|P1|P2>     # US only, when the schema requires it
---
```

## Id numbering

- Use the type's conventional prefix: `PRD-`, `RFC-`, `ADR-`, `US-` (match what the dir
  already uses — mimic neighbours; some repos use `US-NNN`, others `US-NNNN`).
- Pick the next free number by scanning existing filenames **and** INDEX rows in the dir.
  Don't reuse or collide with an id already present.

## The INDEX.md row

Append (or update) one row in the dir's `INDEX.md`. Match the existing table's columns
exactly — mimic the neighbour rows. The row **must literally contain the doc's `id` and
its `status`** or verify fails. Typical column shape:

```
| ID | Title | Status | Owner | Date |
|---|---|---|---|---|
| [TYPE-NNNN](./TYPE-NNNN-slug.md) | <title> | <startStatus> | TBD | <YYYY-MM-DD> |
```

If the dir has no `INDEX.md` yet but will hold a governed doc, create it with a header row +
this doc's row (a dir with docs but no INDEX is itself a verify violation).

## Status: start values and the no-self-flip rule

| Action | Allowed? |
|--------|----------|
| Open a PRD at `draft`, RFC at `draft`, ADR at `proposed`, US at `open` | Yes — that's the start status |
| Flip to `accepted` / `approved` / `done` / `active` / `merged` | **NO** — that is the human doc owner's act |
| Set `owner:` to a person/handle | **NO** — always `owner: TBD` |

When the artifact is ready to advance, **propose** the next status in the PR body for the
human doc owner to apply — e.g. "Proposes ADR-0007 → `accepted` pending CODEOWNER review."
Never write the advanced status into the doc or the INDEX yourself. Both `verify` and the
write-time gate are satisfied by the *start* status; advancing is a governed human step.
