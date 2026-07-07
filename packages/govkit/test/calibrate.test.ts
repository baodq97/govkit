import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCalibrate } from "../src/commands/calibrate";
import type { GovkitConfig } from "../src/config";

// `calibrate` is the eval's own regression harness: it grades a LABELED corpus (good/
// must pass the required floor, weak/ must fail it) and reports the floor's confusion
// matrix. The tests pin the matrix math, the actionable FP/FN listings, the baseline
// regression comparison, and the CLI exit semantics against the repo's real corpus.

const CLI = join(import.meta.dir, "../dist/cli.js");
const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const FIXTURES = join(import.meta.dir, "..", "eval", "fixtures");

// A focused config (same approach as eval-hardening.test.ts): one adr type whose floor
// is "≥30 words of prose + no filler" — enough to separate a substantive doc from a stub.
const CFG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: [] },
    types: { adr: { dir: "docs/adr", required: [] } },
  },
  eval: {
    threshold: 70,
    rubrics: {
      adr: [
        { id: "context", weight: 30, kind: "section", pattern: "context", desc: "context" },
        { id: "decision", weight: 30, kind: "section", pattern: "decision", desc: "decision" },
        {
          id: "substance",
          weight: 30,
          kind: "minWords",
          min: 30,
          required: true,
          desc: "≥30 words",
        },
        {
          id: "nofiller",
          weight: 10,
          kind: "forbid",
          pattern: "to be filled in",
          required: true,
          desc: "no filler",
        },
      ],
    },
  },
};

const FM = (id: string): string =>
  `---\nid: ${id}\ntitle: t\nstatus: accepted\nowner: a\ndate: 2026-01-01\n---\n\n`;

const SUBSTANTIVE =
  "## Context\n\nWe evaluated several storage engines against our workload and operational " +
  "constraints over two weeks of benchmarking and review.\n\n## Decision\n\nWe chose Postgres " +
  "because it satisfies the relational and durability requirements with the least new " +
  "operational surface for the team.\n";

const STUB = "We picked a thing. It seems fine.\n";

let corpus: string;

function plant(label: "good" | "weak", name: string, body: string): void {
  const dir = join(corpus, label, "docs", "adr");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.md`), FM(name) + body);
}

beforeEach(() => {
  corpus = mkdtempSync(join(tmpdir(), "govkit-calibrate-"));
});

afterEach(() => {
  rmSync(corpus, { recursive: true, force: true });
});

describe("runCalibrate — floor confusion matrix", () => {
  it("computes a perfect matrix on a correctly-labeled corpus", () => {
    plant("good", "ADR-0001", SUBSTANTIVE);
    plant("weak", "ADR-0001", STUB);
    const r = runCalibrate({ corpus, config: CFG });
    expect(r.counts).toEqual({ tp: 1, fp: 0, fn: 0, tn: 1 });
    expect(r.floor).toEqual({ precision: 1, recall: 1, f1: 1 });
    expect(r.falsePositives).toEqual([]);
    expect(r.falseNegatives).toEqual([]);
    expect(r.advisory.goodAverageScore).toBeGreaterThan(r.advisory.weakAverageScore);
    expect(r.ok).toBe(true);
  });

  it("lists a planted failing GOOD doc as an FP by path and degrades precision", () => {
    plant("good", "ADR-0001", SUBSTANTIVE);
    plant("good", "ADR-0002", STUB); // deliberately mislabeled: blocked good doc = FP
    plant("weak", "ADR-0001", STUB);
    const r = runCalibrate({ corpus, config: CFG });
    expect(r.counts).toEqual({ tp: 1, fp: 1, fn: 0, tn: 1 });
    expect(r.floor.precision).toBe(0.5); // 1 / (1 + 1)
    expect(r.floor.recall).toBe(1);
    expect(r.floor.f1).toBeCloseTo(2 / 3, 10); // 2·(0.5·1)/(0.5+1)
    expect(r.falsePositives).toEqual([join(corpus, "good", "docs", "adr", "ADR-0002.md")]);
    expect(r.ok).toBe(false); // FP > 0 is the hard invariant, baseline or not
  });

  it("counts a floor-passing WEAK doc as an FN and flags the recall drop vs a baseline", () => {
    plant("good", "ADR-0001", SUBSTANTIVE);
    plant("weak", "ADR-0001", SUBSTANTIVE); // slips through the floor = FN
    const baseline = {
      floor: { precision: 1, recall: 1, f1: 1 },
      counts: { tp: 1, fp: 0, fn: 0, tn: 1 },
      advisory: { goodAverageScore: 100, weakAverageScore: 0 },
    };
    const r = runCalibrate({ corpus, config: CFG, baseline });
    expect(r.counts).toEqual({ tp: 0, fp: 0, fn: 1, tn: 1 });
    expect(r.floor.recall).toBe(0); // 0 / (0 + 1)
    expect(r.falseNegatives).toEqual([join(corpus, "weak", "docs", "adr", "ADR-0001.md")]);
    expect(r.baseline?.recallRegressed).toBe(true);
    expect(r.baseline?.f1Regressed).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("throws the govkit: operational error when good/ or weak/ is missing", () => {
    plant("good", "ADR-0001", SUBSTANTIVE); // no weak/
    expect(() => runCalibrate({ corpus, config: CFG })).toThrow(/^govkit: calibrate corpus .*weak/);
    rmSync(join(corpus, "good"), { recursive: true, force: true });
    expect(() => runCalibrate({ corpus, config: CFG })).toThrow(/must contain good\//);
  });

  it("fails loud (never green-on-nothing) when a tree grades zero artifacts", () => {
    plant("good", "ADR-0001", SUBSTANTIVE);
    mkdirSync(join(corpus, "weak"), { recursive: true }); // exists but empty
    expect(() => runCalibrate({ corpus, config: CFG })).toThrow(/graded 0 artifacts/);
  });
});

describe("CLI calibrate (e2e on dist/cli.js against the repo's labeled corpus)", () => {
  const cli = (args: string[], cwd = REPO_ROOT) =>
    spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8", stdio: "pipe" });

  it("exits 0 with the repo config and reports a zero-FP matrix", () => {
    const r = cli(["calibrate", "--corpus", FIXTURES]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("govkit calibrate: OK");
    expect(r.stdout).toContain("fp 0");
  });

  it("--update-baseline writes a parseable baseline; a rerun against it exits 0", () => {
    const path = join(corpus, "baseline.json");
    const write = cli(["calibrate", "--corpus", FIXTURES, "--baseline", path, "--update-baseline"]);
    expect(write.status).toBe(0);
    expect(write.stdout).toContain("baseline updated");
    const baseline = JSON.parse(readFileSync(path, "utf8"));
    expect(baseline.floor.precision).toBe(1);
    expect(baseline.counts.fp).toBe(0);

    const rerun = cli(["calibrate", "--corpus", FIXTURES, "--baseline", path]);
    expect(rerun.status).toBe(0);
    expect(rerun.stdout).toContain("(ok)"); // the baseline comparison line is printed
  });

  it("exits 2 with a usage line when --corpus is missing", () => {
    const r = cli(["calibrate"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("calibrate requires --corpus");
    expect(r.stderr).toContain("usage:");
  });

  it("rejects --update-baseline without --baseline (exit 2)", () => {
    const r = cli(["calibrate", "--corpus", FIXTURES, "--update-baseline"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--update-baseline requires --baseline");
  });

  it("rejects the calibrate-only flags on other commands (exit 2)", () => {
    const r = cli(["verify", "--corpus", FIXTURES]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--corpus is only valid for calibrate");
  });
});
