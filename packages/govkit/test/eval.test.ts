import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runEval } from "../src/commands/eval";
import { loadConfig } from "../src/config";

// The eval's own trust comes from a LABELED corpus: hand-authored "good" artifacts
// that must score high and deliberately-weak ones that must score low — graded by
// the REPO'S SHIPPED rubric (govkit.yml), not a test-only stub. If this passes, the
// scorers demonstrably discriminate substance from filler.
const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const good = join(here, "..", "eval", "fixtures", "good");
const weak = join(here, "..", "eval", "fixtures", "weak");
const config = loadConfig(repoRoot);

describe("govkit eval — the rubric discriminates good from weak", () => {
  it("scores every good fixture at or above the threshold", () => {
    const r = runEval({ root: good, config });
    expect(r.scored).toBe(4); // one per type: prd, rfc, adr, us
    expect(r.passRate).toBe(1);
    expect(r.ok).toBe(true);
    expect(r.averageScore).toBeGreaterThanOrEqual(config.eval?.threshold ?? 70);
  });

  it("scores every weak fixture below the threshold", () => {
    const r = runEval({ root: weak, config });
    expect(r.scored).toBe(4);
    expect(r.passRate).toBe(0);
    expect(r.ok).toBe(false);
    for (const a of r.artifacts) expect(a.missed.length).toBeGreaterThan(0);
  });

  it("reports a clear note (and stays green) when no rubric is configured", () => {
    const r = runEval({ root: good, config: { schemaVersion: 1, docs: config.docs } });
    expect(r.note).toContain("no eval rubric");
    expect(r.ok).toBe(true);
    expect(r.scored).toBe(0);
  });
});
