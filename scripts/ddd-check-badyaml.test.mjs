// Regression guard for ddd_check.py robustness (check 0, `model-yaml-unparseable`).
// A malformed model.yaml used to crash the whole run: yaml.safe_load raised a YAMLError that
// nothing caught, so `verify` printed a stack trace instead of a finding. This replays the RED
// fixture (a bare `: ` inside a plain multi-line bullet — ordinary prose, illegal YAML) and asserts
// the run now REPORTS the bad file gracefully: exit 0 plain, a `high` finding naming the file, and a
// clean exit 1 under --strict with NO traceback on stderr. Skips cleanly where python3 is absent.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const CK = join(repo, "plugins/ddd-flow/skills/design/scripts/ddd_check.py");
const hasPython = spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;
const skip = hasPython ? false : "python3 unavailable";

// The RED repro from the plan: line 5 is the continuation of a plain multi-line scalar bullet, and
// the bare `disagree: ` makes the scanner try to open a mapping where a scalar is being read.
const BAD_MODEL = `context: WaiverPolicy
subdomain_type: core
open_questions:
  - Does the schema own validation, or the ledger
    when two policies disagree: which side wins is unresolved
aggregates:
  - name: Waiver
    invariants:
      - A waiver cannot outlive its policy
`;

let root;
const run = (extra = []) =>
  spawnSync("python3", [CK, "--root", root, ...extra], { encoding: "utf8" });

before(() => {
  root = mkdtempSync(join(tmpdir(), "ddd-badyaml-"));
  mkdirSync(join(root, "docs/domain/WaiverPolicy"), { recursive: true });
  writeFileSync(join(root, "docs/domain/WaiverPolicy/model.yaml"), BAD_MODEL);
});

after(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

test("a malformed model.yaml is REPORTED, not thrown (graceful, exit 0)", { skip }, () => {
  const r = run(["--json"]);
  assert.equal(r.status, 0, `plain run must be graceful, not crash\n${r.stderr}`);
  assert.doesNotMatch(r.stderr, /Traceback/, "must not print a Python stack trace");
  const finding = JSON.parse(r.stdout).findings.find((f) => f.id === "model-yaml-unparseable");
  assert.ok(finding, "must fire: the unparseable model.yaml is reported as a finding");
  assert.equal(finding.severity, "high");
  assert.match(finding.title, /WaiverPolicy\/model\.yaml is not valid YAML/);
  // The parser's own reason is carried in the evidence so the author knows what to fix.
  assert.ok(
    finding.evidence.some((e) => /mapping values are not allowed here/.test(e)),
    "the finding carries the parser's reason",
  );
});

test("--strict still blocks (exit 1) on the bad file without crashing", { skip }, () => {
  const r = run(["--strict"]);
  assert.equal(r.status, 1, "the `high` finding makes --strict block");
  assert.doesNotMatch(r.stderr, /Traceback/, "blocks by reporting, not by exploding");
});
