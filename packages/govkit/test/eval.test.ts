import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
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

describe("govkit eval — floor + advisory on the labeled corpus", () => {
  it("clears every good fixture: floor passes and advisory score is high", () => {
    const r = runEval({ root: good, config });
    expect(r.scored).toBe(4); // one per type: prd, rfc, adr, us
    expect(r.ok).toBe(true); // CI floor: all required rules pass
    expect(r.floorPassRate).toBe(1);
    expect(r.advisoryPassRate).toBe(1);
    expect(r.averageScore).toBeGreaterThanOrEqual(config.eval?.threshold ?? 70);
  });

  it("blocks every weak fixture on the required floor (a stub cannot pass)", () => {
    const r = runEval({ root: weak, config });
    expect(r.scored).toBe(4);
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
