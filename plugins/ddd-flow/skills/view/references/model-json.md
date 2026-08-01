# `model.json` — the view payload contract

## The envelope (what the shell actually loads)

`ddd_view.py` emits ONE workspace object; every artifact is a document inside it. The shell checks
`kind === "workspace"` and, failing that, renders a single document with no rail and **no error**,
so a hand-written inner payload looks like a thin model rather than a mistake.

```json
{
  "schemaVersion": 2,
  "kind": "workspace",
  "source": { "docsRoot": "docs/domain", "documents": 12 },
  "documents": [
    { "id": "map", "title": "Context map", "kind": "domain", "step": "3-decompose",
      "payload": { "…": "one of the shapes below" } }
  ],
  "gaps": ["booking.md: no message table found under `## Flow`"]
}
```

Document ids are stable and are what `?doc=<id>` addresses: `review` · `map` · `bmc` · `timeline` ·
`chart` · `flow:<file-stem>` · `bc:<context-directory-name>` · `agg:<file-stem>`. Note `bc:` uses
the directory name and `agg:` the file stem, not the display title.

`gaps[]` is what the extractor could not parse. It is rendered, deliberately: an unparsed section
and an empty section look identical on screen, and only one of them is a modelling problem.

## The document payloads

Three shapes, selected by each document's `kind`. `ddd_view.py` generates all of them from the
artifact tree; read on only when hand-writing or patching one.

## Domain model (`3-decompose` output, or a draft in progress)

```json
{
  "schemaVersion": 1,
  "source": { "mode": "draft", "generatedAt": "…" },
  "contexts": [{
    "id": "DOMAIN-0001", "name": "Allocation", "subdomainType": "core",
    "tacticalPattern": "full-domain-model", "purpose": "…",
    "tableCount": 30, "attrCount": 141, "densestAttrs": 112, "layer": 2,
    "tables": ["…"], "aggregates": ["OrderLine", "Allocation"],
    "ubiquitousLanguage": [{"term": "…", "definition": "…"}],
    "assumptions": ["…"], "openQuestions": ["…"]
  }],
  "relationships": [{ "from": "Allocation", "to": "Logistics", "type": "shared-kernel" }],
  "externals": ["Carrier API"]
}
```

Two shapes are easy to get wrong because the natural guess is richer than the truth: `aggregates`
is a list of **plain name strings**, not objects (`ddd_view.py` runs `model.yaml`'s aggregate list
through `check._names`), and the key is **`externals`**, also a list of plain strings — it is
derived, being every relationship target that is not itself a modelled context, so an external node
has a name and nothing else.

`subdomainType`: `core` · `supporting` · `generic` · `master-data`.

`relationships[].type`: `upstream` · `downstream` · `shared-kernel` · `conformist` · `acl` ·
`open-host` · `published-language` · `partnership` · `customer-supplier`.

## Review (`kind: "review"`)

Built automatically by `ddd_view.py` as one document *inside* the workspace payload — there is no
separate command, and it merges step state (`ddd_state.py`) with cross-artifact findings
(`ddd_check.py`):

- `steps[]` — each with status, evidence, and `stale_against`
- `candidates[]` — the candidate actions
- `findings[]` — each with `severity`, `title`, `evidence[]` and `fix_owner`, the step skill that
  owns the fix

It is derived: regenerate it after every step, never edit it.

**Do not redirect `ddd_state.py --review` over `model.json`.** That replaces the whole workspace
with a review-only payload and collapses the document rail. The `--review` stdout report stays
available for terminal use through the `design` skill.

## Business model (`1-understand` output)

`kind: "business-model"`, plus `canvas` (the nine blocks), `classification`, `goals` and
`attendance`.

`scripts/shell.html` holds `BMC_BLOCKS`, which names each block key. Every block takes:

- `status` — `sourced` · `partial` · `proxy` · `empty`
- `items[]`, `source`
- for empty blocks: `question` and `who` could answer it

Those last two are what make an unanswered block render as an open question rather than as
whitespace, so an empty block without them is worse than no block at all.
