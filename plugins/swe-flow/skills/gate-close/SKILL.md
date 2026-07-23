---
name: gate-close
description: >-
  Close a landed change into ONE owner-decision packet before any governed-doc status advances.
  Use whenever code has landed and a PRD, RFC, ADR, or user story is a candidate to move status,
  or when the user says "close this slice", "prep the flips", "ready to flip", "verify and
  reconcile before I accept". It runs the gate-loop workflow — an independent gate re-run, a
  drift reconcile, and one red team per flip candidate — so the owner ratifies once from a
  single packet instead of being interrupted per document. Skipping it risks advancing a doc
  whose criteria the code no longer matches.
---

# Gate Close

A status flip is a ratification, and a ratification needs evidence. This skill collapses the
repetitive pre-flip tail into one packet the owner decides from in a single pass.

## When to run it

After the change has **landed and been committed**, and before proposing any status advance.
Do not run it while agents are still editing the tree — the verifier reads the working tree, so
a mid-edit tree yields a false BLOCK. Commit first, then close.

## How to run it

```
Workflow({
  name: 'gate-loop',
  args: {
    verifyCmd: 'bun run check',
    changeSummary: 'One paragraph on what the landed change actually does — the mechanism, the seams, what was verified and how. This is what the red-teamers reason from, so name real symbols and real commands.',
    flips: [
      { id: 'US-0015', target: 'done',        doc: 'docs/issues/US-0015-....md' },
      { id: 'RFC-0025', target: 'implemented', doc: 'docs/rfc/RFC-0025-....md' },
    ],
  },
})
```

`verifyCmd` is required and must be the repo's real gate — never guess it. Discover it from
`package.json`, `Makefile`, or the CI workflow before invoking. `changeSummary` matters most: a
vague summary produces a vague red team.

## Reading the packet

```
{ gate:      { verdict, gates, gateProvenFallible, findings[] },
  live:      { liveVerdict, ranCommands, claims, notMeasured },  // 'skipped' unless args.live set (always set at a release gate)
  reconcile: { edits: [{ doc, reason, proposed }] },   // exact text, NOT applied
  redTeam:   [{ id, verdict, criteriaSummary, reconciledText, sourcesExist, killCriterion }],
  humanGates: ["US-0015 -> done", ...] }
```

- `gate.verdict: BLOCK` or `gate.gateProvenFallible: false` — stop. Nothing advances on an
  unproven gate.
- `live.liveVerdict: fail`, or any `live.claims[].verdict: refuted` — stop. The shipped artifact
  did not run; a green source gate does not override a red real-artifact run.
- `flip-as-is` — the status is honest; still apply any `reconcile.edits`.
- `flip-after-reconcile` — apply `reconciledText` first, then flip.
- `blocked` — do not flip. Fix the code, or scope the claim down to what shipped.

## Acting on the packet

1. Present it to the owner as ONE decision: the flips, the reconcile edits, any limitation the
   red team surfaced. Recommend with trade-offs; the owner authorizes.
2. **Only on authorization**, apply `reconcile.edits` and every `reconciledText`. A governed doc
   must certify exactly what shipped — never round a partial criterion up to done.
3. Land each flip as a **separate accept commit** that edits the front-matter `status:` and the
   matching INDEX row, with a message citing the owner's in-session authorization.
4. Re-run the gate after the flips, and confirm the remote ref actually moved after pushing.

## Release close

At a release gate the loop runs its strongest form: `gate: 'release'`, which REQUIRES a `live`
scenario. The scenario is a real consumer install, not a re-run of this repo's own gate.

```
Workflow({
  name: 'gate-loop',
  args: {
    gate: 'release',
    verifyCmd: 'bun run check',
    changeSummary: 'One paragraph on what this release ships.',
    live: {
      scenario: 'npm pack the tarball; install it into a clean scratch dir (mktemp -d); run `npx govkit init`; confirm the gate is green; then break one governed doc (remove a required front-matter key) and confirm the gate exits non-zero.',
      expectations: [
        'the packed tarball installs into a clean dir',
        'npx govkit init scaffolds and the gate exits 0',
        'a doc with a required front-matter key removed makes the gate exit non-zero',
      ],
    },
    flips: [{ id: 'REL-0001', target: 'released', doc: 'docs/releases/REL-0001-....md' }],
  },
})
```

The verifier returns `live: { liveVerdict, ranCommands, claims, notMeasured }`. On owner
ratification, the ledger entry's `check` string is GENERATED from the verifier's `ranCommands` —
the real commands and their real exit codes — not typed by hand. That turns the
`docs/ledger.json` `check` field from testimony ("I ran it, it passed") into evidence (the exact
command a reader can re-run). Never write a `released` flip whose ledger `check` is not backed by
a `ranCommands` entry that exited 0.

## Why one packet

The owner is the bottleneck when every flip is surfaced separately. Batching the whole tail into
one packet turns N interruptions into one ratification, while keeping the two controls that
protect the record: an independent verify and an independent red team, neither authored by
whoever wrote the change.
