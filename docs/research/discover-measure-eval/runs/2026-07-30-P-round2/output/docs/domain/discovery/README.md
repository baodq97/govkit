---
id: DOMAIN-DISC-0001
title: Harbourline — discovery session 2026-07-30
status: draft
owner: TBD
date: 2026-07-30
mode: discover
technique: eventstorming-big-picture
---

## Who was in the room

Stated before starting, per the skill: the value of this step is capped by who is present.
Nobody was present. This run had no human participant of any kind.

| Role | Present | Notes |
|---|---|---|
| Domain expert | **no** | Tuan (ops), Duc (yard) exist in the documents; neither was reachable |
| Real end user | **no** | no customer or driver spoke; every customer-behaviour row is inference from a ticket digest |
| Product / business strategy | **no** | Mai (commercial), Linh (finance) named in documents only |
| Developers / testers | **no** | the one code artifact is abandoned and unattributed |
| Facilitator | agent only | an experienced human facilitator is worth recommending for a first big-picture session |

**Consequence, stated plainly: this run discovered nothing. It is a literature review of nine
documents with orange stickies on it.** Every element below is `candidate`. Nothing was promoted to
`confirmed`, because only a person can confirm and no person was here.

A distinction worth keeping for the next round: 11 of the 43 timeline rows trace to a *named person
speaking on a dated record* (the two meeting notes), and 32 trace only to an unattributed document
or to the abandoned DDL — counted with
`grep -cE '^\| [0-9]+ \|.*(2026-05-14|2026-06-02)' timeline.md` → 11, and its inverse → 32. Neither
group is a confirmation. The first is cheap to convert — one
30-minute call with Tuan, Mai, Linh, Ha and Duc would flip most of it or correct it. That call is
the next action, not more reading.

## Mode and corpus decision

DISCOVER mode: `docs/` existed with prose and one DDL file; `docs/domain/discovery/` did not exist,
so this is a first round, not an UPDATE. `docs/domain/discovery/` was created per the output
template's rule 2.

**The corpus was measured and is not a corpus.** The skill's floor for entering
`references/measure-playbook.md` is *structured* **and** *≥20 files sharing one shape, or one
artifact carrying ≥200 definitions*. Measured:

| Test | Command | Result | Verdict |
|---|---|---|---|
| structured artifacts | `find . -maxdepth 3 -type f \( -name '*.sql' -o -name '*.xsd' -o -name '*.proto' -o -name 'openapi*' -o -name '*.json' \)` | `./db/schema.sql` — 1 file | 1 < 20 |
| definitions in it | `grep -c 'CREATE TABLE' db/schema.sql` | `3` | 3 < 200 |
| whole corpus | `find . -maxdepth 3 -type f \| wc -l` / `cat` \| `wc -l` | 9 files, 123 lines | readable in full |

So the playbook was **not** entered: no mining scripts, no `.ddd-flow/mine/`, no coverage manifests.
All nine files were read end to end, and each finding below carries the file it came from. The
playbook names this exact snapshot shape as a recorded failure ("a nine-document prose repo
containing one abandoned three-table schema" producing eight green manifests that measured nothing
in doubt), and it forbids scripting prose word-counts as findings: "counting how often a word
appears across documents tells you which files used it, never which meaning it carried."

## Coverage

**Covered** — the as-is booking flow end to end (request → record → slot check → confirm →
dispatch → collect → gate → customs → load → bill), the quoting and rate-card dispute, the
visibility gap, the customer-complaint shape, and the abandoned DDL read against the prose.

**Not covered, and who is needed:**

- The actual booking states. `booking.status` is free-text `TEXT` and no document enumerates it — needs Tuan.
- Everything downstream of `ContainerLoaded`. Ops declares the job done there; billing was never walked. Needs Linh.
- The customer's own view. Half the complaints are "where is my box"; no customer was interviewed. Needs a real end user.
- Rate-card mechanics: who changes it, on what authority, what happens to a live quote when it changes. Needs Mai + whoever owns the card (undecided — H2).
- The email carrier's process. The memo says it "will not change" and nobody described it. Needs the carrier account owner.
- Frequency and volume of anything. The support digest states "rough proportions, not counts"; the ops walkthrough says the worst outcome happens "perhaps twice a month". Both are the documents' own estimates and are recorded as such, not as measurements.

## Confidence

**0 confirmed elements · 43 candidates · 23 open hotspots.**

Read that first line as the finding it is. The timeline is a set of proposals for a room to correct.

## Visual surface — not run

The skill wants a live wall (`preview-server.cjs` against `.ddd-flow/discovery`). Not started: there
was no participant to watch it and no browser, and the view skill's script is outside this run's
permitted read scope. Fallback taken as the skill allows — a markdown timeline — and the cost is
stated: a text timeline loses the thing that makes EventStorming work, everyone seeing the same wall
change at once. `model.json` is still emitted to the template's contract so the wall and the
documents cannot disagree when someone does run it.

## Next step

`3-decompose` consumes `timeline.md` and `ubiquitous-language.md` as its step-2 input, and it will
be exactly as good as this discovery was — which is to say it will be consuming an unconfirmed
reading of nine documents. **No context boundaries were drawn here**; that is `3-decompose`'s job,
and the seven live term collisions in `ubiquitous-language.md` are the seams it should be looking at.
Run the confirmation call before decomposing, or the boundary argument will be had against documents
instead of people.
