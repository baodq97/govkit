// Regression guard for ddd_check.py check 13b (`context-is-future-only`).
//
// The finding is real — a boundary drawn around behaviour that does not run yet is one nothing
// can falsify — but it was emitted once PER CONTEXT. On a greenfield product every context is
// future-only by construction, so an honest model got N copies of one observation and read as "N
// problems", while a model that mislabelled its timeline `as-is` got a clean run. Measured on a
// real eval: the honest arm drew 4 findings, the model that called a not-yet-built product `as-is`
// drew 0. A check that pays better for the wrong label is worse than no check.
//
// Fixed by collapsing: when EVERY qualifying context is future-only that is a property of the
// model, reported once and naming them all. When only SOME are, the per-context finding is real
// signal — a migration whose one new boundary rests on nothing running — and is kept.
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
const CK = join(here, "..", "plugins/ddd-flow/skills/design/scripts/ddd_check.py");
const hasPython = spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;
const skip = hasPython ? false : "python3 unavailable";

const modelYaml = (name, events) => `context: ${name}
subdomain_type: core
aggregates:
  - name: ${name}Root
    domain_events:
${events.map((e) => `      - { name: ${e}, payload: [id] }`).join("\n")}
    invariants:
      - "${name} keeps its own books [INV1, stated]"
`;

/** state per event name; status is irrelevant to this check but present so the record is realistic. */
const discovery = (states) =>
  JSON.stringify({
    schemaVersion: 1,
    kind: "discovery",
    timeline: Object.entries(states).map(([name, state], i) => ({
      seq: i + 1,
      name,
      type: "event",
      status: "confirmed",
      state,
    })),
  });

let root;
const build = (dir, contexts, states) => {
  const docs = join(root, dir, "docs/domain");
  mkdirSync(join(docs, "discovery"), { recursive: true });
  for (const [name, events] of Object.entries(contexts)) {
    mkdirSync(join(docs, name), { recursive: true });
    writeFileSync(join(docs, name, "model.yaml"), modelYaml(name, events));
  }
  writeFileSync(join(docs, "discovery/model.json"), discovery(states));
};

const findings = (dir) => {
  const r = spawnSync("python3", [CK, "--root", join(root, dir), "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0, `checker must not crash\n${r.stderr}`);
  return JSON.parse(r.stdout).findings.filter((f) => f.id === "context-is-future-only");
};

before(() => {
  root = mkdtempSync(join(tmpdir(), "ddd-future-"));

  // Greenfield: nothing this product does exists yet. The two `as-is` rows are the CUSTOMER's
  // present-day pain, which is how a real greenfield discovery record looks — so a global
  // "no as-is anywhere" test would not have caught this.
  build(
    "greenfield",
    { alpha: ["AlphaOpened", "AlphaClosed"], beta: ["BetaFiled", "BetaPaid"] },
    {
      AlphaOpened: "to-be",
      AlphaClosed: "to-be",
      BetaFiled: "to-be",
      BetaPaid: "could-be",
      ExcelSpreadsheetMaintained: "as-is",
      LegacyReportRun: "as-is",
    },
  );

  // Migration: `alpha` runs today, `beta` is the new boundary resting on nothing running.
  build(
    "mixed",
    { alpha: ["AlphaOpened", "AlphaClosed"], beta: ["BetaFiled", "BetaPaid"] },
    {
      AlphaOpened: "as-is",
      AlphaClosed: "as-is",
      BetaFiled: "to-be",
      BetaPaid: "to-be",
    },
  );
});

after(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

test("every context future-only is ONE finding naming them all, not one each", { skip }, () => {
  const f = findings("greenfield");
  assert.equal(f.length, 1, `expected a single collapsed finding, got ${f.length}`);
  const blob = `${f[0].title} ${f[0].evidence.join(" ")}`;
  assert.match(blob, /alpha/, "the collapsed finding must still name every context");
  assert.match(blob, /beta/, "the collapsed finding must still name every context");
  assert.equal(f[0].severity, "info");
});

test("only SOME contexts future-only stays per-context — that is real signal", { skip }, () => {
  const f = findings("mixed");
  assert.equal(f.length, 1, "exactly one context qualifies here");
  const blob = `${f[0].title} ${f[0].evidence.join(" ")}`;
  assert.match(blob, /beta/, "the future-only context must be named");
  assert.doesNotMatch(f[0].title, /alpha/, "a context with as-is behaviour is not future-only");
});
