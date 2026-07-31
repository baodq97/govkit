# Measure playbook — mining a structured corpus by writing your own scripts

Read this in DISCOVER mode when the artifacts are a **corpus** — structured **and** past the size
where reading it exhaustively is something you could defend. Structured: a published schema, DDL, XSD,
`.proto`, OpenAPI, a migrations directory. Past the size: **≥20 files sharing one shape, or one
artifact carrying ≥200 definitions** (tables, entities, messages, endpoints).

**Both halves are required, and the floor governs every format on that list.** A three-table
`schema.sql` is DDL and is not a corpus; the honest move there is to read it and record the finding
with the file name beside it. This has been measured: handed a nine-document prose repo containing one
abandoned three-table schema, a run entered this playbook on the word *DDL*, emitted eight coverage
manifests — one of them scanning the eight narrative documents — and produced six of its nineteen
hotspots by script over prose. Every gate was green. Nothing was wrong except that none of it was a
measurement of anything in doubt.

You are not looking for a parser to run. There isn't one, and there shouldn't be — a parser shipped
inside this plugin would bake one vendor's format into a general method and rot the week the format
changes. **You write the script.** Act like a data analyst who has been handed an unfamiliar dataset
and a question: find the schema, write the query, report the number, keep the query.

## Why this exists

A structured corpus read by a language model produces claims of the form *"not found in the exported
solution"*. That is a **sentence**, and it silently becomes *"was never built"* one artifact later.
A script produces *"3,664 files scanned, 3,421 parsed, 243 skipped for these stated reasons"* — a
**set**, which someone can disagree with, re-run, and correct.

The concrete failure this prevents was recorded twice in one project's own modelling log
(*"I let 'not found in the exported solution' become 'not built'"*), on a corpus of 3,664 XML files
that had been mined by six agents reading — one of which swept 24 of 266 files and reported a
finding as though it had swept all 266.

## The analyst loop

Once per question. Not once per project.

1. **State the question as a measurement**, with the output shape you expect.
   *"How many senses does `Cost` carry?" → a table of (container, name, type, target), one row per
   occurrence.*
2. **Find the format's own schema before parsing anything.** Most formats publish one — an XSD, a
   JSON Schema, a DDL dump, a `.proto`, an OpenAPI document, a vendor reference page. Fetch it and
   validate one sample against it. Minutes spent here replaces a reverse-engineered guess that will
   be subtly wrong in a way nobody catches.
3. **Write the script.** Small, one question, no framework. **Commit it** — the script *is* the
   provenance of every number it produced. A claim whose script was thrown away is back to being a
   sentence.
4. **Run it. Emit facts + a manifest.**
5. **Gate on the manifest before believing any number**, including your own.

Record the exact invocation next to the result. Someone will doubt a count in three weeks, and the
only cheap answer is re-running the command.

## Seven stages

An ordering, not a program. Each stage is a question you script an answer to, and each has a gate
that must pass before the next stage's numbers mean anything.

| # | Stage | The question | Gate |
|---|---|---|---|
| 0 | **Ground** | what is this format's own schema? | one real sample validates against it |
| 1 | **Inventory** | what exists, by kind, how many? *Parse nothing.* | `total` matches an independent count; nothing is unclassified without a stated reason |
| 2 | **Sample** | one record **of every shape stage 1 found**, full fidelity | you read the emitted facts against the raw source, by eye, and they agree — and every element and attribute present in the source is either consumed or named as a deliberate drop |
| 3 | **Scale** | all records — and which definition wins when one thing is defined twice? | every conflict emits a `conflict` fact carrying *both* values and *both* locators; a killed-and-resumed run reproduces the same fact set as a clean one |
| 4 | **De-noise** | what here is platform artefact rather than author intent? | `--filters none` round-trips stage 3 byte-identically; every filter reports a counted, explained drop |
| 5 | **Normalise** | what does this look like as one readable file per subject? | a human can review a diff of it |
| 6 | **Polysemy** | which names carry more than one meaning? | senses emitted **unresolved**, each with a locator |
| 7 | **Graph** | what clusters, and what bridges the clusters? | report names the algorithm, seed and resolutions, carries the warning below inside it, and re-runs byte-identically at the same seed |

### Stage 0 — the format usually documents itself

Before writing a line of parsing, spend ten minutes finding out whether the format publishes a
schema. Most do, and almost nobody looks: an XSD or JSON Schema, a DDL dump, a `.proto`, an OpenAPI
document, a migrations directory, a vendor reference page enumerating its own component types.

Validate **one real sample** against it. Two things come out of that:

- the element and field names you were about to guess at, with their real cardinality and nullability
- a **vocabulary of kinds** you can classify against in stage 1, taken from the format's own
  taxonomy rather than one you invented

If the format publishes nothing, say so in the manifest (`notes:`) and treat every field name you
derive as a candidate. An undocumented format is not a reason to skip stages — it is a reason stage 2
matters more.

### Stage 1 comes before stage 4, and the order is load-bearing

Inventory everything first, filter second. A filter written before the inventory *silently defines*
coverage — you never learn what it hid, because the thing it hid was never counted.

This is the same trap as writing "only report high-severity findings" into a review prompt:
instruction-following models honour it literally and measured recall drops, because the filter ate
the coverage. Count first, then filter, and report both numbers.

### Stage 2 exists so you find out cheaply that you were wrong

Pick one record — small, and ideally one you already understand. Emit its facts in full and read them
against the raw source with your own eyes. **Lock the fact schema here.** Discovering at record 3,000
that you dropped a field is expensive; discovering it at record 1 is free.

**One sample per shape, not one sample.** Stage 1 told you the corpus holds several kinds; a fact
schema locked from one of them silently under-reads the rest. Sample each kind and diff the element
names you consumed against the element names present.

**The manifest counts files. Count fields too.** This is the failure mode that survives every gate in
this playbook, and it was found by running it: a mining pass reported `total`/`parsed`/`skipped`
green on all four manifests while dropping one attribute — the field naming *which* attribute change
fires a workflow — from every workflow record, because stage 2 had sampled only the entity shape. The
run then wrote a hotspot *inferring* what that attribute stated outright. File coverage was complete
and perfect; field coverage was never asked about, so nothing could report the hole.

So emit the field census alongside the file census: the set of element and attribute names seen in the
source, the subset consumed into facts, and the difference **with a reason each**. It is one `set()`
per shape, and it is the only thing that makes *"the corpus does not say"* a claim rather than an
artifact of your parser. An unconsumed field name is exactly as much a blind spot as an unscanned
file, and it hides better.

### Stage 3 is usually the hard part

Real corpora define the same thing more than once: a base definition plus patches, an older snapshot
alongside a newer one, the same entity shipped by four packages. You need a stated layering rule and
a `conflict` fact for every disagreement.

Never blend two definitions into a third that exists in neither source. That is invention wearing
reconciliation's clothes, and it is undetectable downstream.

**Price the run before you engineer it.** Time stage 2 on its one record, multiply by stage 1's
count. 3,664 files at 50 ms is three minutes and needs none of what follows; the same corpus at 2 s
per file is two hours and needs all of it. Do that multiplication out loud — it is the difference
between a script and a pipeline, and guessing sends you to the pipeline every time.

Past that line, four mechanics, in the order they start to matter:

**Append as you go.** One fact per line, flushed at the end of each source file, never accumulated
and written at the end. A crash at record 3,000 then costs the file it was on and nothing else.

**Resume on the source file, not a row count.** The source file is the natural batch unit because it
is also the natural resume key: read the emitted facts' `source_file` values on startup, skip those,
carry on. Batching by "1,000 rows" buys nothing and makes restart arithmetic you have to get right.
Emitting facts per file also means a partially-written file is detectable — its facts exist but its
manifest entry does not.

**Hold one record, not the corpus.** Memory is a ceiling you hit without warning, and the fix is
almost always the streaming form of the parser you already chose (`iterparse` + `clear()` for XML,
a row cursor rather than `fetchall()`, a line iterator rather than `read()`). The one structure that
legitimately spans the whole run is stage 3's conflict index — and it holds **keys and locators, not
documents**: `(subject, name) -> [locator, …]` stays small on a corpus whose parsed bodies never
would.

**Parallelise last, and only per file.** Two conditions: facts for one file must not depend on
another file, and the run must already be correct — parallelism multiplies a wrong parse faster than
a serial run finds it. Then one worker per file, **one output shard per worker**, concatenated at
the end; never several writers appending to one `facts.jsonl`, which interleaves partial lines and
corrupts the audit floor. The price is that fact order is no longer the corpus's order, so sort
before diffing two runs — and if a number changes when the worker count changes, you have found a
real bug, not a flake.

### Stage 4 — cleaning is a set of counted filters, not a judgement

Noise here means *artefact of the tool that produced the corpus*, not *stuff I found boring*. The
distinction is the whole rule: dropping platform residue sharpens the signal, dropping what you
judged uninteresting deletes evidence and leaves no trace that you did.

So every filter has the same shape:

```
filter(facts) -> (facts, dropped: int, reason: str)
```

and every one reports its count into the manifest's `filters:` list. A filter that cannot say how
many rows it removed is not a filter, it is a leak.

**Two properties worth holding onto.** `--filters none` must reproduce stage 3 **byte-identically** —
that is the test that cleaning is reversible and that L0 is genuinely lossless. And filters compose
in any order without changing the result; if two filters interact, they are really one filter and
should say so.

**The classes of noise almost every corpus has.** These are categories to look for, not a list to
implement — what fills each one is discovered per format:

| Class | What it is | Watch out |
|---|---|---|
| platform-supplied | fields or records the tool created, never the author — audit columns, generated keys, framework scaffolding | some carry real signal (a version stamp can date a design change) |
| naming-era | one thing named several ways across eras, publishers or migrations | resolve by **longest prefix wins**, and record the collapse — it is itself a finding about the corpus's history |
| duplicate representation | the same content in two forms: managed/unmanaged twins, a generated mirror of a source, an index file restating a definition | pick one deliberately, count the other; a "name-only index" is a **checksum**, not a definition |
| volatile identity | GUIDs, timestamps, version numbers that churn without meaning | mask, do not delete — you often need them as join keys |
| localisation | *n* copies of one label in *n* languages | keep one locale; a term that differs *in meaning* between locales is a stage 6 finding, not noise |
| presentation geometry | pixel widths, spans, ordering coordinates | **keep field identity and grouping** — grouping is stage 7's cohesion proxy, so dropping it costs you the graph |

That last row is the one that bites. It reads like the most obviously droppable noise in the corpus,
and it is the only proxy you have for *"these fields are looked at together by one person in one
task"*.

### Stage 5 — three layers, and the shape differs on purpose

The output is not one artifact. It is three, and the direction is one-way:

```
L0   facts.jsonl        lossless · append-only · one fact per line
                        every fact carries {kind, source_file, locator}
      │                 the audit floor. Never hand-edited.
      │  filters (stage 4, counted)
      ▼
L1   <subject>.yaml     one file per subject · de-noised · canonical names and types
      │                 the layer a human reviews and git diffs
      │  derive
      ▼
L2   reports + graph    polysemy report, relationship graph, cluster candidates
                        regenerable — never a source of truth
```

**Why JSONL at L0.** It streams, so an append-as-you-go run survives a crash; it diffs per line; and
a query engine reads it directly — `duckdb -c "SELECT … FROM read_json_auto('facts.jsonl')"` gives
you SQL over the facts **without adding a single dependency** to the script. Stage 6's cross-join and
stage 7's graph are both a few lines of SQL against L0.

**Why YAML at L1.** Because a person has to read it, argue with it, and see a meaningful diff when
the corpus changes. That is what makes the mined output reviewable rather than merely produced.

**The rule that keeps the layers honest: never edit L1 to fix a fact.** If L1 is wrong, L0 is wrong
or a filter is wrong — fix the script and re-run. An L1 file touched by hand has silently become a
source of truth with no provenance, which is the state this whole playbook exists to get out of.

### Stage 6 is the one that changes where boundaries go

The recipe, stated so it works on any format:

> For every **name** appearing in more than one **container**, emit the tuple set
> `(container, name, type, reference_target, enumeration)`.
>
> **Two same-named fields with different types, or different reference targets, are two senses —
> proven, not tallied.** Emit them as **boundary candidates, deliberately unresolved.**

"Container" is whatever the format calls a table, entity, message, class, or record; "reference
target" is whatever it calls a foreign key, lookup, or `$ref`.

This measures the thing `2-discover`'s ubiquitous-language step already asks for — *"when the same
word means two things, record both meanings"* — which in practice degrades to recording a tally and
picking one, because nobody could check it. Now it is checkable.

**Do not resolve what you measure.** A glossary where every word has exactly one meaning leaves
`3-decompose` no seam to draw a boundary on, and a decomposition with no linguistic seam produces
modules labelled as bounded contexts.

### Stage 7 ships with its own warning attached

Graph clustering finds **cohesion, not language boundaries**. Run community detection on a legacy
foreign-key graph and it will faithfully **reproduce the legacy's table clusters** — which is the
error the whole exercise exists to avoid, now with a modularity score on it.

So: weight edges by stage 6's output **plus** co-occurrence in the same form / view / report / screen
(a usable proxy for "these are used together in one conversation"), and label the result **one input
to reconcile with stage 6**, never a verdict. Put that sentence in the report, not just in your head
— the next reader will see a clean diagram and believe it.

**Two questions, two different algorithms.** Name the one you ran in the report; "we clustered it"
is not re-runnable.

| Question | Run | Read it as |
|---|---|---|
| what clusters? | **Leiden**, or **Louvain** if that is what is installed | candidate groupings — Leiden because Louvain can emit internally disconnected communities, which look like findings and are artifacts |
| what bridges the clusters? | **articulation points** (cut vertices) and **bridges** (cut edges), one linear pass each — Tarjan | the sharpest boundary candidates in the graph: one subject whose removal splits two clusters is a seam or a god-object, and stage 6 tells you which |
| which link carries the most cross-cluster traffic? | **edge betweenness** (the Girvan–Newman ranking; the ranking is the output, not the resulting cut) | the integration you will have to design, ranked |

`networkx` covers all three in a few lines and ships nothing to install beyond itself
(`louvain_communities`, `articulation_points`, `bridges`, `edge_betweenness_centrality`);
`igraph` + `leidenalg` gets you Leiden proper. Either is fine — a named algorithm with a version is
the requirement, not a particular library.

**Sweep the resolution, then keep only what survives.** Modularity methods have a resolution knob
that decides how many clusters you get, and the default is not a fact about your domain. Run several
values, and report the groupings **stable across them**; a cluster that appears at exactly one
resolution is a parameter artifact. Same for the seed — these algorithms are stochastic, so state
both the seed and the resolutions in the report, or the diagram cannot be reproduced.

Then check that it *is* reproduced: re-run the stage and diff the report. Measured on a real run,
this is the one stage that fails it — twelve runs over byte-identical input produced four different
reports, all of them agreeing on the stable groupings, the articulation point and the bridges, and
differing only in the per-run modularity rows. That is the tell: **the invariant parts are the
findings, and anything that moves between runs is a diagnostic, not a result.** Either seed it so the
diff is empty, or keep the moving rows out of the report.

## The coverage manifest

Every stage emits one. This is the contract that makes a number arguable instead of assertable:

```yaml
source: <root that was scanned>
invocation: <the exact command; must be re-runnable>
total: 3664               # independently verifiable
parsed: 3421
skipped: [{path, reason}] # required, non-nullable
failed:  [{path, error}]  # required, non-nullable
filters: [{name, dropped, reason}]
fields:  [{shape, seen, consumed, unconsumed: [{name, reason}]}]
```

`skipped` and `failed` are required and never null. An empty list is a claim; a missing key is a
blind spot.

`fields` is what makes the manifest cover the inside of a record and not just the outside — one entry
per shape from stage 2, where `seen` counts the distinct element/attribute names present in the source
and `consumed` counts the ones that reached a fact. `seen` must equal `consumed + len(unconsumed)`,
and every `unconsumed` name carries its reason, for the same argument that every `skipped` path does.

Validate it:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/2-discover/scripts/mine_coverage.py \
  --manifest .ddd-flow/mine/out/manifest.yaml \
  --corpus '<root>/**/*.xml' --strict
```

**Any script that becomes a source of truth for an agent must warn about data it could not
classify.** The most expensive bug found while building this plugin was a state script reporting
"nothing done yet" on a repository that already held documents — because one filename fell outside
its glob, and it said nothing. Silence read as absence. `mine_coverage.py` applies that rule to
itself: a manifest key it does not recognise is a finding, not something to skip.

## Where things go

| What | Where |
|---|---|
| The scripts you write | `.ddd-flow/mine/*.py` in the consumer repo — **committed**, because they are the provenance |
| L0 facts + manifests | `.ddd-flow/mine/out/facts.jsonl`, `out/manifest.yaml` (one per stage) |
| L1 normalised model | `.ddd-flow/mine/model/<subject>.yaml` |
| L2 derived reports | `.ddd-flow/mine/reports/` — regenerable, safe to delete |
| Findings written up for humans | `docs/research/` — ungoverned and unbudgeted, so detail is free there |
| Candidates entering the model | `docs/domain/discovery/`, via the normal output template, tagged `candidate` |

**Never write `docs/domain/*/model.yaml` from a mining run**, and **never promote a mined item to
`confirmed`**. A schema cannot confirm anything; only a person can. Those two are the real
boundaries — everything else in this playbook is a habit, and habits are stated as the good move
rather than as a prohibition.

## Habits, as the good move

| Do this | Instead of |
|---|---|
| `find <root> -name '*.xml' \| wc -l` → 3,664, then write an inventory that must reach 3,664 | opening files until you feel you have the gist |
| one script, one question, committed as evidence | a mining framework with a plugin architecture |
| `skipped: [{path, reason}]` — 243 entries, each with a reason | a filter that quietly drops what it cannot parse |
| record `Cost` as 5 senses with 5 locators, unresolved | qualifying it to `cost_estimate` and moving on |
| *"57 formula files reference logic outside the entity model"* | *"business logic appears to live in the reporting layer"* |
| `conflict` fact holding both values and both paths | picking the richer definition because it looked more complete |

## Model dosage

Same file, cheap branch — check which model is running and take the matching line.

**Opus-class.** Bind the scope rules hardest: **one script per question; no framework; no
abstraction layer until the third repetition.** The failure here is not laziness, it is
self-expansion — a request to count files becomes a parser with a class hierarchy. Skip
self-verification instructions entirely; "double-check your counts" is actively harmful on this class
because it triggers over-verification of work already done. The manifest gate is a *script*, not
self-verification, so it applies to everyone.

**Sonnet-class and Haiku-class.** Take the trigger threshold literally and use it: **≥20 files
sharing one shape means write a script.** These models follow instructions faithfully and will not
generalise "structured corpus" on their own, so the number is the instruction. Treat the coverage
gate as a required step, not a suggestion.

## Worked example — Dataverse solution XML, 3,664 files

A real run of stages 0–3, kept because the shape of the surprises generalises.

**Stage 0 in one sentence.** The format documented itself: Microsoft publishes the XSDs
(`CustomizationsSolution.xsd` as the root, plus `FormXml.xsd`, `SiteMap.xsd`, `fetch.xsd`) and a
canonical component taxonomy as a numeric enum. Validating one sample against the real schema
replaced a day of guessing at element names.

**Stage 1 found the corpus was not one corpus.** 17 of 18 packages were unpacked into per-entity
folders; one was a single **7.2 MB monolithic file** holding 61 entities and 415 relationships. One
tree, two formats, and a discriminator that had to be found before anything could be counted.

**Stage 2 found the trap that breaks naive parsers.** 215 entity files resolved to only **157
distinct names**, and **26 of the 215 were four-line stubs with no metadata node at all**. A parser
that assumes the node exists either crashes or — worse — reports zero attributes and is believed.

**Stage 3 found the layering problem.** One entity was defined **five times**, with 111 / 86 / 7 / 4
/ 0 attributes. The layering signals existed in the package manifests (base vs patch vs unmanaged,
plus a per-component behaviour flag), but nothing in the corpus announced them; they had to be
measured and stated as a rule.

**What reading had missed entirely** across five prior discovery rounds: **57 formula files** holding
calculated and rollup field logic, **160 workflow definitions**, and **36 plugin registration files**
naming classes, pipeline stages and filtering attributes. All of it business logic living outside the
entity model — precisely the question two open hotspots were stuck on. The inventory found it in one
pass, because it was counting rather than reading.

**Noise that had to be filtered, each with a count:** ~30 platform-supplied system columns; a
four-way publisher-prefix collapse where the longest prefix has to win; **524 `_managed` duplicate
form files against 501 real ones**; non-default localisation labels; GUID churn; a UTF-8 BOM on
every single file. Prior art for several of these already existed in the same organisation's build
scripts — worth copying into a generated script, never worth importing as a plugin dependency.
