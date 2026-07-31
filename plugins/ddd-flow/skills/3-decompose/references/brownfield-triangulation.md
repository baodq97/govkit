# Brownfield triangulation — decomposing from a mined corpus

The detail behind `SKILL.md` step 2b and the single-source-of-truth / shared-concept rules in step 6.
Read this when `2-discover` has mined a structured legacy corpus — a committed `.ddd-flow/mine/` with
`facts.jsonl` and a coverage manifest that passed `mine_coverage.py --strict`.

## Triangulate the mined corpus — language leads, structure only cross-checks

When step 2's raw material is a mined corpus, do **not** read boundaries off any single axis.
Triangulate three, and **language leads** — the other two only agree or disagree with it:

- **Language (leads the boundary).** The polysemy report (measure-playbook stage 6): a name
  carrying two types, or two reference targets, across containers is **two senses**, and the seam
  falls *between the senses*. This is the boundary signal. Keep the senses unresolved — collapsing
  `Cost` to `cost_estimate` deletes exactly the seam you came for.
- **Behaviour (confirms).** Events and invariants mined from the behaviour axis — `.cs` plugin
  registrations, formula and workflow files (e.g. `WorkOrder.SlaBreached`, `PartsRequest.NeedsApproval`
  live in a `.cs`/`.txt`, not the entity model). An aggregate is where the events that must stay
  consistent cluster, so use them to confirm which side of a language seam a concept sits on. Name
  only events the corpus states — a mined event is still a *candidate*, never an invented one.
- **Structure (cross-checks only — never leads).** FK-graph clusters (stage 7: Leiden/Louvain
  communities, articulation points, bridges). **The legacy-cluster trap, stated:** community
  detection on a legacy foreign-key graph faithfully **reproduces the legacy's table clusters** —
  the exact error this whole exercise exists to avoid, now wearing a modularity score. So structure
  is *one input to reconcile with the language seam*, never a verdict. When an FK cluster agrees
  with a language seam, confidence rises; when it cuts across one, **keep the language seam and
  record the disagreement as a hotspot** — do not let the FK graph redraw the boundary. An
  articulation point is a boundary *candidate* (a seam or a god-object — language tells you which),
  not a decision.

Everything this step produces is **candidate**, tagged with its `facts.jsonl` locator, and lands
in `docs/domain/discovery/` (via the output template, tagged `candidate`) — **never** written
straight into a context's `model.yaml`. The human-confirmed subset is what later enters a context
`model.yaml` through step 6. A human confirms the subset; a mine confirms nothing.

## One model, generated views (single source of truth)

The per-context `model.yaml` files are the **single source of truth**. The `context-map.md` Mermaid
map (a **C4 level-2** view of the contexts and their relationships) and each aggregate design canvas
(**C4 level-3**, deepened in `7-define`) are **views generated or re-derived from those `model.yaml`
files** — the same one-way direction the measure-playbook holds between L0 facts and L1 model:
*derive downward, never edit the view to fix the model.* A context map hand-edited to say something
no `model.yaml` says has silently become a second, unprovenanced source of truth — the drift that let
a six-edge model draw a two-edge map.

- **Stamp freshness on every generated view.** Head each view with `generated_from:` (the
  `model.yaml` paths and the commit/date they were read at) and `generated_at:`. A view whose source
  models changed after that stamp is **stale, and says so** — a thin dated view beats a full stale
  one, the same honesty thesis govkit gates on. Regenerate or re-derive the view; do not patch it.
- **Scope the "regenerate, don't patch" rule to the *derived* parts** of `context-map.md` — the
  Mermaid map and the sub-domain classification. Its **Conflicts & reconciliation table and
  Changelog are primary, human-authored** content: they record human-flagged reconciliation
  decisions that live in no `model.yaml`. Preserve them verbatim on any regeneration — never clobber
  a human flag by re-deriving the view.
- **Altitude, not just format.** L2 (context map) moves at a context's cadence; L3 (aggregate
  canvas) is the generate-don't-hand-draw layer. Do **not** deepen the L2 map into aggregate detail
  to look thorough — that collapses the altitude ladder. Keep the map coarse; the canvas carries the
  depth.

## The shared-concept answer — a thin reference context, not a fat shared blob

When several contexts lean on one concept, do **not** mint a single "Shared" / "Common" / "Core"
context that owns it — that is the universal model bounded contexts exist to remove (§2.6), and a
mined corpus *tempts* it because the FK graph shows everything touching one table (the legacy-cluster
trap again). Two legitimate moves, cheapest coupling first:

- **A thin reference / Foundation context** publishing a **Published Language** — a versioned
  contract (lookup lists, shared value objects, an integration-event schema) each consumer translates
  at its own edge. The default, healthy way to share: coupling sits on the contract, not the internals.
- **A Shared Kernel, only with its cost written down** — a small domain model both sides touch live,
  changed by mutual consent, drift risk named, and the **Core Domain kept out** (§2.4). Last resort,
  smallest possible.

A shared **entity or domain class** left on the map is Shared Kernel coupling by definition — flag it
with that cost, or split it into a reference context + Published Language. Never leave a fat shared
blob unlabelled.
