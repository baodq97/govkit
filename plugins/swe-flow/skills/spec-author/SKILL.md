---
name: spec-author
description: >
  Author a governed SDLC lifecycle artifact — a PRD, RFC, ADR, or User Story (US) — from
  design output (docs/domain, docs/api, docs/data) into the consumer repo's doc dirs with
  correct front-matter, then self-validate with `npx govkit verify`. Use whenever the user
  wants to write/draft/create a PRD, RFC, ADR, or user story, turn a domain model or API/data
  design into a lifecycle doc, "spec this out", record an architecture decision, or open a
  governed doc that has to pass govkit. The user picks which artifact type. The skill
  discovers the doc dirs and required front-matter from the consumer's govkit.yml (never
  hardcoded), writes with owner: TBD and the correct START status (PRD draft, RFC draft, ADR
  proposed, US open), updates the matching INDEX.md row, and runs govkit verify to confirm.
  Trigger even when the user names only the artifact ("write the ADR", "draft a US for this")
  as long as the output is a governed PRD/RFC/ADR/US doc.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Spec Author

Turn design output — a domain model (`docs/domain`), an API design (`docs/api`), a data
design (`docs/data`) — into a **governed lifecycle artifact**: a PRD, RFC, ADR, or User Story
(US). This is the keystone that converts design into the doc chain `PRD → RFC → ADR → US →
Code`. You **author** the artifact and **call `npx govkit verify`** to self-validate; you
never reimplement the gate.

The user picks the artifact type. If they haven't, ask — the type drives the doc dir, the
required front-matter, and the start status.

## The non-negotiable rules (bake these into every artifact)

- **`owner: TBD`, always.** Agents never self-assign an owner. Propose the owner in the PR body.
- **Start status, never advanced.** Open at the type's start status (PRD `draft`, RFC `draft`,
  ADR `proposed`, US `open` — confirm against the consumer's `govkit.yml`). **Never** write
  `accepted` / `approved` / `done` / `active`. To advance, propose the next status in the PR
  body for the human doc owner to flip.
- **Update the matching `INDEX.md` row.** A doc with no INDEX row, or a row whose status text
  is stale, is a verify violation — not a nit.
- **Discover, don't hardcode.** Doc dirs and required front-matter keys come from the
  consumer's `govkit.yml`, read at run time. Do not assume `docs/adr` etc. are fixed.
- **Never self-approve, self-merge, or act as code owner.** Your job ends at "ready for review".

## Reference (read before emitting)

- `references/artifact-frontmatter.md` — the exact front-matter shape, the per-type
  start-status table, the id-numbering rule, the INDEX row format, and **precisely what
  `govkit verify` checks** (front-matter completeness + INDEX line-match). Read it so you pass
  on the first run instead of fixing flagged violations after.

## Process

### 1. Discover the schema from `govkit.yml`
Find the consumer repo root (the dir holding `govkit.yml`) and read it. Pull, for the chosen
type: its `dir`, its full required-key set (`docs.base.required` ∪ `docs.types.<type>.required`,
deduped), and its `startStatus`. These — not any built-in list — define the contract. If there
is no `govkit.yml`, the repo isn't govkit-governed: tell the user and stop (don't invent a schema).

```bash
cat govkit.yml      # docs.base.required, docs.types.<type>.{dir,required,startStatus}, docs.ignore
```

Note per-type differences: a US may require an extra key (e.g. `priority`) that PRD/RFC/ADR
don't. Take the list from the file every time.

### 2. Confirm the type and gather source material
Confirm which artifact the user wants. Read the design output it derives from — the relevant
`docs/domain`, `docs/api`, or `docs/data` files (and any upstream artifact: a US cites its
RFC/ADR; an ADR cites its RFC; an RFC cites its PRD). Capture only what those sources state —
do not invent requirements, decisions, or acceptance criteria the design never describes.

### 3. Pick the id
Scan the type's `dir` (filenames **and** INDEX rows) for the next free number. Use the
conventional prefix (`PRD-`, `RFC-`, `ADR-`, `US-`) and mimic the dir's existing zero-padding
(`US-007` vs `US-0007`). Don't collide with an existing id.

### 4. Write the artifact
Create `<dir>/<TYPE-NNNN>-<slug>.md`. Open with a `---` block carrying **every** required key,
each non-empty:

- `id`, `title`, `date` (today) — straightforward.
- `status:` = the discovered **startStatus** (never advanced).
- `owner: TBD` — always.
- any extra required key the schema lists (e.g. `priority: P1` for a US).

Then write the body in the shape the type's neighbours use — mimic an existing PRD/RFC/ADR/US
in the dir for section structure. Keep it grounded in the design source from step 2.

### 5. Update `INDEX.md`
In the same dir, add (or update) one row for the new doc. Match the existing table's columns
exactly. The row **must literally contain the doc's `id` and its `status`** — that's how verify
checks sync. If the dir has no `INDEX.md`, create it (header row + this doc's row); a dir with
governed docs but no INDEX is itself a violation.

### 6. Self-validate with govkit, then fix
Run the deterministic gate from the consumer root and act on whatever it reports:

```bash
npx govkit verify          # or: npx govkit verify --json for machine output
```

- **OK** → done; proceed to step 7.
- **FAIL** → read each violation and fix the *artifact*, not the gate:
  - `missing or empty required front-matter key: X` → add `X` (still `owner: TBD`, start status).
  - `… has no row in INDEX.md` → add the row (step 5).
  - `… INDEX row status is stale` → make the INDEX row's status text match the doc's `status`.
  - `missing INDEX.md …` → create it.
  Re-run `npx govkit verify` until it passes. Never edit `govkit.yml` or the CLI to make it pass.

### 7. Hand off
Surface what you wrote (path, id, start status) and the **PR-body proposals the human owner
must apply**: the proposed `owner:` (replacing `TBD`), and — if the artifact is ready to
advance — the proposed next `status:`. Link the upstream artifact(s) by id. Stop at "ready for
review"; do not flip status, assign an owner, approve, or merge.

## Hard rules

- **Discover the schema; never hardcode doc dirs or required keys.** Read `govkit.yml` every run.
- **`owner: TBD` on every new artifact.** Propose the human owner in the PR body — never self-assign.
- **Start status only.** PRD `draft`, RFC `draft`, ADR `proposed`, US `open` (per `govkit.yml`).
  Never write an advanced status; propose advancement in the PR body for the doc owner to flip.
- **INDEX row must contain the id and the status verbatim** — keep it in sync or verify fails.
- **Capture only what the design source states.** Flag gaps; never invent requirements,
  decisions, or acceptance criteria. Match neighbour-doc structure in the target dir.
- **`npx govkit verify` is the source of truth** — author and call it, never reimplement or
  bypass it. Fix the artifact until verify is clean.
- **Never self-approve, self-merge, or act as code owner.**

## Picking the type (quick guide)

| Artifact | Captures | Start status | Note |
|----------|----------|--------------|------|
| **PRD** | the why/what — product requirements, scope, success metrics | `draft` | precedes the RFC for revenue/legal/compliance work |
| **RFC** | a proposed design/approach for a new feature or public-API change | `draft` | accepted before code on feature/public-API changes |
| **ADR** | an arch/vendor/runtime **decision** with context, trade-offs, consequences | `proposed` | `accepted` on consensus — a human act |
| **US** | one user story / backlog item with acceptance criteria | `open` | often needs an extra `priority` key — check the schema |

If the change class needs an artifact the user didn't ask for (e.g. an ADR before code for an
arch decision), say so and let the user decide — don't silently skip a gate.
