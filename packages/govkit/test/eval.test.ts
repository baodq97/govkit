import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runEval } from "../src/commands/eval";
import { loadConfig } from "../src/config";

// The eval's own trust comes from a LABELED corpus, graded by the REPO'S SHIPPED rubric
// (govkit.yml), not a test-only stub. Two distinct claims are asserted:
//   1. the REQUIRED structural floor blocks stubs and clears legitimate docs (zero FP), and
//   2. the ADVISORY score discriminates substantive docs from filler.
const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const good = join(here, "..", "eval", "fixtures", "good");
const weak = join(here, "..", "eval", "fixtures", "weak");
const config = loadConfig(repoRoot);

// The corpus is append-only and GROWS (each distill round may add fixtures — RFC-0017), so
// expected counts are derived from the trees, never pinned: a pinned count breaks per round.
const fixtureCount = (tree: string): number =>
  readdirSync(tree, { recursive: true, encoding: "utf8" }).filter(
    (f) => f.endsWith(".md") && !f.endsWith("INDEX.md"),
  ).length;

describe("govkit eval — floor + advisory on the labeled corpus", () => {
  it("clears every good fixture: floor passes and advisory score is high", () => {
    const r = runEval({ root: good, config });
    expect(r.scored).toBe(fixtureCount(good)); // every fixture on disk is graded — none skipped
    expect(r.ok).toBe(true); // CI floor: all required rules pass
    expect(r.floorPassRate).toBe(1);
    expect(r.advisoryPassRate).toBe(1);
    expect(r.averageScore).toBeGreaterThanOrEqual(config.eval?.threshold ?? 70);
  });

  it("blocks every weak fixture on the required floor (a stub cannot pass)", () => {
    const r = runEval({ root: weak, config });
    expect(r.scored).toBe(fixtureCount(weak));
    expect(r.scored).toBeGreaterThanOrEqual(4); // the original corpus is the floor, growth-only
    expect(r.ok).toBe(false); // blocked
    expect(r.floorPassRate).toBe(0);
    for (const a of r.artifacts) {
      expect(a.requiredOk).toBe(false);
      expect(a.missedRequired.length).toBeGreaterThan(0);
    }
  });

  it("reports a clear note (and stays green) when no rubric is configured", () => {
    const r = runEval({ root: good, config: { schemaVersion: 1, docs: config.docs } });
    expect(r.note).toContain("no eval rubric");
    expect(r.ok).toBe(true);
    expect(r.scored).toBe(0);
  });
});

describe("govkit eval — --changed adoption scoping (RFC-0005)", () => {
  const ref = "origin/main";

  it("scores ONLY changed artifacts — an untouched failing doc no longer blocks", () => {
    // The weak corpus all fails the floor. Scope to a doc NOT in it → nothing scored,
    // nothing blocks: exactly the adoption fix (legacy debt doesn't avalanche the gate).
    const r = runEval({ root: weak, config, changed: { files: new Set(["/no/such.md"]), ref } });
    expect(r.scored).toBe(0);
    expect(r.ok).toBe(true);
    expect(r.scoped).toEqual({ ref, changedDocs: 0 });
  });

  it("still blocks a CHANGED failing doc (scoping quiets untouched debt, not new debt)", () => {
    const file = runEval({ root: weak, config }).artifacts[0]?.file as string;
    const r = runEval({ root: weak, config, changed: { files: new Set([file]), ref } });
    expect(r.scored).toBe(1);
    expect(r.ok).toBe(false); // a weak doc the PR touched is its responsibility
    expect(r.scoped?.changedDocs).toBe(1);
  });

  it("passes a CHANGED good doc and records the scope", () => {
    const file = runEval({ root: good, config }).artifacts[0]?.file as string;
    const r = runEval({ root: good, config, changed: { files: new Set([file]), ref } });
    expect(r.scored).toBe(1);
    expect(r.ok).toBe(true);
    expect(r.scoped).toEqual({ ref, changedDocs: 1 });
  });
});
