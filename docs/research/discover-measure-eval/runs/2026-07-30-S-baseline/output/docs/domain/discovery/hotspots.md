# FleetOps — hotspots (the most valuable output of this round)

Ids are stable: **`H1`…`H23` are never renumbered.** A re-run adds ids, it does not renumber. Every
row is open. None was closed to make this document tidy — an open hotspot is a finding, a quietly
closed one is a decision nobody made.

`Raised by` is `mined` throughout, because no human was present. That is not a neutral fact: a
hotspot nobody argued about has not been pressure-tested, and several below will collapse into
"oh, that's obvious" the moment an operator reads them. The ones that do not are the real work.

| # | Question | Raised by | Blocks | Who could answer |
|---|---|---|---|---|
| H1 | 8 picklist option sets are **named with zero option values** in the whole export (`asset_status`, `wo_status`, `priority`, `severity`, `result`, `reason`, `trade`, `owner_role`). What are the states? | mined — `queries.py q_picklists_named_but_no_values` | every lifecycle event and aggregate state machine | FleetOps operator; the live database |
| H2 | **0 of 257 attributes carries `required="true"`.** Not one invariant is declared anywhere in the export. Where do the rules live? | mined — `queries.py q_required_attributes` | aggregate invariants; all of `8-code` | domain expert; incident history |
| H3 | The `addon` package is `state=patch`, installed 2023-08-02, yet holds **fewer** attributes than `core` on 13 entities and ships **5 files with no `Attributes` node at all**. Live patch, or abandoned branch? Which definition does the running system apply? | mined — 13 `definition-divergence` conflict facts | which definition is real; every attribute count downstream | whoever owns the `fo` publisher's release history |
| H4 | `Inspection.Inspector` is `string` in `addon` and `lookup→Employee` in `core`. `Inspection.Result` is `string` in `addon` and `picklist→result` in `core`. Is an inspector a person or a note? | mined — 4 `attribute-type` / `attribute-target` conflict facts | `Inspection` aggregate; whether inspection is a people process | inspection supervisor |
| H5 | `WorkOrder.TotalCost = Cost + Sum(PartsRequest.Cost) * 1.1` sums `PartsRequest.Cost`, which is typed **`string`**. Does this rollup work today? And what is the `1.1`? | mined — `WorkOrder_TotalCost.txt` + polysemy on `Cost` | any costing claim; `Cost` boundary | finance; whoever wrote the formula |
| H6 | `PartsRejectNotify` fires on update, but there is **no rejection field anywhere** — no `RejectedBy`, no `RejectedOn`, no rejected state value. Where is a rejection recorded? | mined — workflow vs attribute set | the parts-request lifecycle | parts store lead |
| H7 | `WorkOrder.SlaBreached` reads `Priority.SlaHours`. `Priority` is a picklist option set, not an entity, and `SlaHours` appears in **none** of the 65 files. Where does the SLA live? | mined — `stage7_graph.py` unresolved references | SLA rules; whether the formula runs at all | service manager |
| H8 | `Downtime` is an entity (`Asset`, `Hours`, `Reason`) **and** a `decimal` on `WorkOrder`. Two meanings of one word. Which one does the business use? | mined — `stage6_polysemy.py` | aggregate boundary around downtime | operations |
| H9 | `Part.ReorderFlag` computes a reorder signal that **no workflow reads**. Who acts on it, and how? | mined — formula vs workflow set | procurement process; is it dead code? | stores / procurement |
| H10 | `Asset` is the graph's **only articulation point** (degree 14; 8 entities point at it; all 5 bridges are `Asset--*`). Seam or god-object? Separately, `CostCentre` and `Region` declare **no relationships of their own**. | mined — Tarjan pass in `stage7_graph.py` | how the model can be split at all | domain expert, with the polysemy report in hand |
| H11 | The `legacy` package is `state=index`, `publisher=flt`, `installed=2017-01-30` — yet it is listed **last** in the apply order, names only **8 of 20** entities, and every schema name in it uses the `fo_` prefix its declared publisher would not produce. Is it a checksum of a superseded system, or something still live? | mined — `manifest.txt` vs `monolith.xml` | provenance; what "the system" even means | whoever ran the 2017 migration |
| H12 | 12 of 36 workflow steps are `sendmail` and **no recipient appears anywhere** in the export. Who gets notified, and does anyone read it? | mined — `queries.py q_business_logic_outside_the_entity_model` | notification / escalation design | operations; the people on the list |
| H13 | Five unexplained constants: `0.15` depreciation, `30`-day contract expiry, `5000` approval threshold, `5` reorder level, `1.1` cost uplift. Policy, or someone's guess in 2019? | mined — 5 formula files | whether these are business rules or accidents | finance; procurement |
| H14 | `AssetTransfer` fires on Asset update, but the only depot-ish field on `Asset` is `Owner:lookup→Depot`, and no transfer history is stored. Is a transfer just a change of `Owner`? | mined — workflow vs attribute set | asset lifecycle; audit needs | depot manager |
| H15 | `FuelAnomaly` fires on every fuel-log create with `condition → setvalue → sendmail`, and the anomaly **threshold is in none of the 65 files**. What counts as an anomaly? | mined — workflow vs formula set | fuel-fraud detection | fleet controller |
| H16 | `ContractRenewal` is `trigger=scheduled`, but `Contract` has only `StartsOn`/`EndsOn`. Does renewal mutate the row or create a new contract? | mined — workflow vs attribute set | contract lifecycle; history | commercial / legal |
| H17 | **Not one command is named in 65 files.** The export holds entities, forms, triggers and formulas — never an imperative. Every command in the model is missing. | mined — `stage1_inventory.py` kind census | the entire command side of the storm | any user; needs a session, not a script |
| H18 | Where should `docs/` live in this repo? `references/output-template.md` requires a human to say; this tree was created at the skill's default path unconfirmed. | mined — no `docs/` existed | nothing in the model; a path only | repo owner |
| H19 | `Asset.ModifiedOn:datetime` sits beside the platform column `fo_modifiedon:datetime`, on `Asset` only. Two modification timestamps — which one does the business read, and why only assets? | mined — `stage6` + platform-attribute filter | audit trail; whether `ModifiedOn` is business data | whoever added it |
| H20 | 4 of 6 `addon-managed` twins (`Asset`, `Depot`, `PartsRequest`, `WorkOrder`) are fact-identical to **`core`**, not to their own `addon` package; `Employee` and `Part` have no `addon` sibling at all. What did `addon-managed` actually install? | mined — `managed-twin` filter, 117 facts dropped and counted | package provenance; deployment reality | release engineer |
| H21 | `Employee.Cost` is a `lookup→CostCentre`. Is an employee's "Cost" their cost centre, or their cost? The word does both jobs on one entity. | mined — `stage6_polysemy.py` | the `Cost` boundary; payroll/costing seam | finance |
| H22 | `Owner` carries **4 senses** — a depot, an employee, a role, and free text. Is a depot's `Owner` a person, a company, or a region? | mined — `stage6_polysemy.py` | ownership model; likely two contexts | domain expert |
| H23 | `Category.Parent → Category` is a self-referencing hierarchy with no declared depth limit and no cycle guard (and `required` is `false`, per H2). How deep does it go, and can it loop? | mined — `stage5_normalise.py` L1 | `Category` aggregate; any tree walk in the replacement | asset engineering |

## Why this round stopped

The stop rule says stop when the next question would not change the model. It bit early and hard
here: **every remaining unknown needs someone who is not in the room.** Mining answered every
question a script can answer — what exists, how much, how often, which names carry two senses — and
the next 22 questions are all of the form "what does the business mean by this", which no further
parsing will touch. Continuing to script would have produced more precision about the same 65 files.

## The first human session — five questions, concrete, one at a time

Phrased per the interview guide: concrete scenarios beat abstractions, and invariants hide behind
incident stories. Ask in this order, and stop after any one that produces a story.

1. *"Tell me about the last parts request that got rejected — what happened, and where did you see
   it had been rejected?"* → H6, H1, H12
2. *"Walk me through the last asset that moved between depots. What did you change on the screen?"*
   → H14, H22
3. *"When was the last time a work order breached its SLA? How did you find out?"* → H7, H1, H2
4. *"What's the weirdest thing you've had to do to get a cost right this month?"* → H5, H21, H13
5. *"You said 'downtime' — what exactly counts as one? Does everyone here use it the same way?"*
   → H8

## What is deliberately NOT here

- **No boundaries.** No hotspot proposes a bounded context. The stage 7 clusters
  (`.ddd-flow/mine/reports/graph.md`) are cohesion candidates carrying their own warning; drawing
  boundaries is `3-decompose`'s job.
- **No resolutions.** H4, H8, H21 and H22 all *look* like tidy-ups (qualify the field, pick the
  richer type, move on). Resolving them here would delete the exact linguistic seams
  `3-decompose` needs, so the senses stay side by side in `ubiquitous-language.md`.
- **No promotions.** Nothing was moved to `confirmed`. Only a person can do that.
