// Regression guard for `ddd_check.discovery_from_markdown` — the markdown fallback used to count
// grounding when `discovery/model.json` is absent.
//
// The header detector accepted ANY row containing a cell equal to a column name, and `event` is
// both a column name (`NAME_COLS`) and the documented value of the timeline's `Type` column. So on
// the exact shape `references/artifact-shapes.md` prescribes, every event row was re-read as a
// fresh header and skipped: a 3-row timeline parsed as 1 element, 0 confirmed, 0 candidate.
//
// The damage is silent and lands on the gate that matters most. Check 16 falls back to this
// function when there is no `model.json`, so a repo that discovered events in markdown alone
// reported almost none — and "0 confirmed" reads identically whether discovery was thin or the
// parser ate it.
//
// Fix: a table has exactly ONE header, so only the first matching row while `idx` is unset is a
// header; once the columns are known every later row is data.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(here, "..", "plugins/ddd-flow/skills/design/scripts");
const hasPython = spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;
const skip = hasPython ? false : "python3 unavailable";

// Exactly the shape references/artifact-shapes.md prescribes for discovery/timeline.md.
const TIMELINE = `# Timeline

| # | Element | Type | State | Actor / command | Status | Source |
|---|---|---|---|---|---|---|
| 1 | EquipmentAllocated | event | as-is | Depot Clerk / CommitReservation | confirmed | Ha, 2026-07-27 |
| 2 | DepotTransferRequested | event | to-be | — | candidate | ADR-0013 §Decision |
| 3 | cancel reservations when a unit goes out of service | policy | as-is | — | confirmed | Ha, 2026-07-27 |
| 4 | DepotCapacityForecast | read-model | could-be | — | confirmed | Minh, 2026-07-27 |
`;

const LANGUAGE = `| Term | Definition | Held by | Status |
|---|---|---|---|
| Transfer | a physical depot-to-depot move | Operations | confirmed |
| Transfer | a billing line on the invoice | Finance | confirmed |
`;

let root;
const counts = () =>
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
          `co, hot, dupes, rules = c.discovery_from_markdown(Path(${JSON.stringify(root)}))`,
          "print(json.dumps({'counts': co, 'dupes': dupes}))",
        ].join("\n"),
      ],
      { encoding: "utf8" },
    ).stdout,
  );

before(() => {
  root = mkdtempSync(join(tmpdir(), "ddd-timeline-"));
  mkdirSync(join(root, "discovery"), { recursive: true });
  writeFileSync(join(root, "discovery/timeline.md"), TIMELINE);
  writeFileSync(join(root, "discovery/ubiquitous-language.md"), LANGUAGE);
});

after(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

test("every timeline row is counted, including rows whose Type is `event`", { skip }, () => {
  const { counts: c } = counts();
  // 4 timeline rows + 2 language rows; the language table's name column is `Term`.
  assert.equal(c.elements, 6, `all rows must parse, got ${JSON.stringify(c)}`);
  assert.equal(c.confirmed, 5, "3 confirmed timeline rows + 2 confirmed terms");
  assert.equal(c.candidate, 1, "the one `candidate` row");
});

test("a polysemous term is still reported as a duplicate", { skip }, () => {
  assert.deepEqual(
    counts().dupes,
    ["Transfer"],
    "both senses kept and flagged — the boundary signal",
  );
});
