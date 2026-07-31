// Regression guard for the grounding-readiness gate (ddd_check.py check 16, `grounding-under-ratified`).
// Closes the REL1 / F-GATE-INERT risk: a gate asserted-but-never-replayed rots into an inert check.
// Replays the REAL case both ways — SILENT on a grounded model, FIRES on a decompose cut from 0
// confirmed events — and asserts the --strict-grounding exit code. Skips cleanly where python3 is absent.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const CK = join(repo, "plugins/ddd-flow/skills/design/scripts/ddd_check.py");
const hasPython = spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;
const skip = hasPython ? false : "python3 unavailable";

const run = (root, docs, extra = []) =>
  spawnSync("python3", [CK, "--root", root, "--docs", docs, ...extra], { encoding: "utf8" });

test("grounding-readiness stays SILENT on a grounded model (euro-parking: 68 confirmed, 38 events)", {
  skip,
}, () => {
  const root = join(repo, "examples/euro-parking");
  const docs = join(root, "docs/domain");
  const r = run(root, docs, ["--json"]);
  assert.equal(r.status, 0, r.stderr);
  const findings = JSON.parse(r.stdout).findings;
  assert.ok(
    !findings.some((f) => f.id === "grounding-under-ratified"),
    "must not fire on a human-confirmed model",
  );
  assert.equal(run(root, docs, ["--strict-grounding"]).status, 0, "--strict-grounding is green");
});

test("grounding-readiness FIRES on a decompose over 0 confirmed events (the btm shape)", {
  skip,
}, () => {
  const root = join(here, "fixtures/grounding-red");
  const docs = join(root, "docs/domain");
  const plain = run(root, docs, ["--json"]);
  assert.equal(plain.status, 0, `warning-only: plain run must not block\n${plain.stderr}`);
  const finding = JSON.parse(plain.stdout).findings.find(
    (f) => f.id === "grounding-under-ratified",
  );
  assert.ok(finding, "must fire: candidate-only discovery with a context-map present");
  assert.match(finding.title, /under-grounded: 0 confirmed \/ 4 candidate/);
  assert.equal(
    run(root, docs, ["--strict-grounding"]).status,
    1,
    "--strict-grounding blocks (exit 1)",
  );
});
