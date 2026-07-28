# Euro Parking — a full run of the eight steps

One domain, taken end to end by the eight step skills, with nothing hand-edited afterwards. This is
what the plugin produces, not what it aspires to — including the parts it refused to fill in.

## What the run was given

| File | What it is |
|---|---|
| `INPUT.md` | twelve numbered requirements, verbatim from the **SAP DDD Kata** (Apache-2.0) — the kata the ddd-crew starter process names as the way to practise it |
| `EXPERT.md` | one domain-expert session, answering the questions the modelling raised, inside the kata's guardrails |

Nothing else. No code, no schema, no wiki. The kata publishes **no solution**, so nothing here could
be recalled rather than modelled.

## What came out

| | |
|---|---|
| Bounded contexts | 10 — 4 core, 4 supporting, 2 generic |
| Aggregate canvases | 4, in 3 contexts; six contexts get an explicit "no aggregate" with a reason |
| Message flows | 4 scenarios — happy path, the money path, a refusal, and one hotspot |
| Discovery | 69 elements, 68 confirmed by the expert, 19 open hotspots |
| Total | ~3,400 lines |

## Read it in this order

1. `docs/domain/context-map.md` — the boundaries, and the seven candidates that were **declined**,
   each with the condition that would promote it.
2. `docs/domain/core-domain-chart.md` — where the investment goes, and the investment-mismatch
   section: the two contexts holding most of the model are the two nobody could place on
   differentiation.
3. `docs/domain/message-flows/DOMAIN-FLOW-0002-pay-then-exit.md` — eleven messages, which trips the
   nine-message limit. The flow says so about itself.
4. `docs/domain/parking-visit/README.md` and `.../aggregates/ParkingVisit.md` — a Bounded Context
   Canvas v5 and an Aggregate Design Canvas v1.1 filled from evidence.

Then put it on a screen, which is how it is meant to be reviewed:

```bash
cd examples/euro-parking
python3 ../../skills/view/scripts/ddd_view.py --root . --out .ddd-flow/preview/model.json
node ../../skills/view/scripts/preview-server.cjs --dir .ddd-flow/preview
```

## The parts worth studying are the refusals

A model that answers everything from a twelve-line brief is fabricating. What this run would not do:

- **No tariff was invented.** The expert gave rates, so `Tariff` exists; before he did, `2-discover`
  wrote *"naming `FeeCalculated` here would be fabrication"* and left the money path unnamed.
- **Nine relaxed rules carry no corrective policy**, and say so. The repair path for an offline exit
  that never uploads is a business decision nobody was asked for.
- **Every throughput and size cell reads `unknown`** with a named owner. The expert gave effort
  (*"four hours a week per site"*) and never a volume, so no volume appears.
- **Two contexts stay unplaced on differentiation.** They sit on the chart's mid-line, which the
  chart labels as *"not a placement — the conversation that has not happened"*.

## Findings the deterministic checks produce on it

`python3 ../../skills/design/scripts/ddd_check.py --root .` reports two high findings, and both are
contradictions **between** files that reading them one at a time would not surface: a flow that
needs eleven messages against a nine-message limit, and four contexts labelled `core` on a map whose
own core domain chart reduces that to one.

It also reports `discovery-state-unlabelled`, and that one is a gap in **this run**, not in the
domain: the timeline predates the `as-is` / `to-be` / `could-be` column, so every element here is
implicitly present-tense. It is left standing rather than back-filled, because hand-editing the
output would cost this example the only thing that makes it worth reading.

## Provenance

Requirements: <https://github.com/SAP/curated-resources-for-domain-driven-design/blob/main/ddd-kata.md>
(Apache-2.0). `EXPERT.md` was written for this run to play the Domain Expert role the kata assigns,
and is fiction in the same sense the kata is — consistent, inside the guardrails, and not a record
of any real operator. Everything under `docs/domain/` is generated output, `status: draft`,
`owner: TBD`.
