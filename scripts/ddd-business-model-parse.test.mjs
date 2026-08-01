// Regression guard for `ddd_check.load_business_model` — the capability table that checks 1-3
// (`classification-mismatch`, `too-many-core`, `investment-mismatch`, `under-invested-core`) read
// their business evidence from. Two RED cases, both found by running the skills rather than by
// reading them, and both SILENT: the checks simply report nothing and nobody is told the
// comparison never ran.
//
//   1. The header guard skipped ANY row whose first cell began with "capability" — so a capability
//      literally named "Capability return loop" was dropped from a capability-centric domain, which
//      is exactly where that name is most likely. The guard was also redundant: a real header row
//      is already rejected because its 4th cell ("Differentiation") is not a differentiation value.
//   2. A table authored without the fixed column order parses to zero rows, so checks 1-3 go dark.
//      Pinned here so `references/artifact-shapes.md`'s column contract stays load-bearing.
//
// Skips cleanly where python3 is absent.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const SCRIPTS = join(repo, "plugins/ddd-flow/skills/design/scripts");
const hasPython = spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;
const skip = hasPython ? false : "python3 unavailable";

const BUSINESS_MODEL = `---
id: DOMAIN-0001
title: Demo — business model
status: draft
owner: TBD
---

## Capability classification

| Capability | Business role | Evolution stage | Differentiation | Evidence |
|---|---|---|---|---|
| Capability return loop | closes plan against outcome | unknown | yes | PRD-0001 §Moat |
| Expected vs realized reconciliation | the moat | custom | yes | PRD-0001 §Moat |
| Tenancy and access control | table stakes | commodity | no | PRD-0010 |
| Vendor management | breadth pillar | unknown | partial | PRD-0006 |
`;

// The same four capabilities, in the order an author would naturally pick: differentiation second,
// because that is the interesting column. The parser is positional and reads the 4th cell, so it
// takes the EVOLUTION STAGE as the differentiation verdict.
const WRONG_ORDER = `---
id: DOMAIN-0001
title: Demo — business model
status: draft
owner: TBD
---

## Capability classification

| Capability | Differentiation | Business role | Evolution stage | Evidence |
|---|---|---|---|---|
| Capability return loop | yes | closes plan against outcome | unknown | PRD-0001 §Moat |
| Expected vs realized reconciliation | yes | the moat | custom | PRD-0001 §Moat |
| Tenancy and access control | no | table stakes | commodity | PRD-0010 |
| Vendor management | partial | breadth pillar | unknown | PRD-0006 |
`;

let root;

/** Call load_business_model directly: the finding under test is an ABSENCE, and an absence is
 *  invisible in the checker's own output — a table that parses to zero rows and a domain with no
 *  mismatches print exactly the same thing. */
const parse = (docsDir) =>
  JSON.parse(
    spawnSync(
      "python3",
      [
        "-c",
        [
          "import sys, json",
          `sys.path.insert(0, ${JSON.stringify(SCRIPTS)})`,
          "import ddd_check as c",
          "from pathlib import Path",
          `print(json.dumps(c.load_business_model(Path(${JSON.stringify(docsDir)}))))`,
        ].join("\n"),
      ],
      { encoding: "utf8" },
    ).stdout,
  );

before(() => {
  root = mkdtempSync(join(tmpdir(), "ddd-bm-parse-"));
  for (const [dir, body] of [
    ["ok", BUSINESS_MODEL],
    ["wrong-order", WRONG_ORDER],
  ]) {
    mkdirSync(join(root, dir, "docs/domain"), { recursive: true });
    writeFileSync(join(root, dir, "docs/domain/business-model.md"), body);
  }
});

after(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

test("every capability row parses — including one NAMED 'Capability …'", { skip }, () => {
  const caps = parse(join(root, "ok/docs/domain"));
  assert.equal(
    Object.keys(caps).length,
    4,
    `all four rows must parse; got ${JSON.stringify(Object.keys(caps))}`,
  );
  assert.ok(
    caps["Capability return loop"],
    "a capability whose name begins with 'Capability' must not be mistaken for the header row",
  );
  assert.equal(caps["Capability return loop"].differentiation, "yes");
  assert.equal(caps["Tenancy and access control"].differentiation, "no");
  assert.equal(caps["Vendor management"].differentiation, "partial");
  assert.equal(caps["Expected vs realized reconciliation"].evolution_stage, "custom");
});

test("the header row itself is never parsed as a capability", { skip }, () => {
  const caps = parse(join(root, "ok/docs/domain"));
  assert.ok(!caps.Capability, "the literal header row must not become a capability");
});

test("a table in the author's own column order yields WRONG evidence, not empty", { skip }, () => {
  // Not a bug the script can fix — which column holds differentiation cannot be guessed without
  // inventing evidence. Pinned because the failure is worse than a blank: the parser reads
  // whatever sits in the 4th cell, so checks 1-3 run against evidence nobody wrote. This is what
  // makes the fixed column order in references/artifact-shapes.md load-bearing rather than tidy.
  const truth = { "Vendor management": "partial", "Tenancy and access control": "no" };
  const caps = parse(join(root, "wrong-order/docs/domain"));
  const wrong = Object.entries(truth).filter(
    ([name, want]) => caps[name] && caps[name].differentiation !== want,
  );
  assert.ok(
    wrong.length > 0,
    `misordered columns must produce at least one wrong differentiation; got ${JSON.stringify(caps)}`,
  );
});
