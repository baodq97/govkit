# Selftest fixture pair (RFC-0020)

The pinned pair for the substance judge's keyed ranking probe: before any real verdict, the
judge must score `good/` STRICTLY above `weak/` — or the skill refuses to judge.

Constraints on this tree:

- **Both fixtures pass the deterministic floor by construction** — full front-matter,
  distinct canonical RFC sections, ≥40 words of prose, no filler patterns. That is the
  point: the calibrate corpus's `weak/` tree floor-fails, so it proves nothing about
  substance ranking; this pair differs ONLY in substance (same topic, same headings —
  `weak/` is the floor-passing keyword-salad shape RFC-0001's red-team produced).
- **Labeled and append-only**, like the calibrate corpus: never edit a fixture in place —
  a reworded fixture silently moves the probe's bar. Add a new pair instead (per-doc-type
  pairs are an RFC-0020 open question awaiting refusal data).
- These files are skill assets, not governed docs: no govkit type dir covers this path, so
  `verify`/`eval` never grade them and the `RFC-0001` id cannot collide with a real doc.
