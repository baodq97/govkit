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
    expect(r.baseline?.corpusShrunk).toBe(false); // same coverage — a miss, not a shrink
    expect(r.ok).toBe(false);
  });

  it("flags a SHRUNKEN corpus vs the baseline counts as a regression (F4)", () => {
    // A perfect 1-good/1-weak matrix — but the committed baseline pins 4+4 graded docs,
    // so coverage shrank: the ratio comparison alone would pass this (recall/f1 both 1).
    plant("good", "ADR-0001", SUBSTANTIVE);
    plant("weak", "ADR-0001", STUB);
    const baseline = {
      floor: { precision: 1, recall: 1, f1: 1 },
      counts: { tp: 4, fp: 0, fn: 0, tn: 4 },
      advisory: { goodAverageScore: 100, weakAverageScore: 0 },
    };
    const r = runCalibrate({ corpus, config: CFG, baseline });
    expect(r.counts).toEqual({ tp: 1, fp: 0, fn: 0, tn: 1 });
    expect(r.baseline?.recallRegressed).toBe(false);
    expect(r.baseline?.f1Regressed).toBe(false);
    expect(r.baseline?.corpusShrunk).toBe(true);
    expect(r.ok).toBe(false); // corpus coverage shrank → same verdict as a floor regression
  });

  it("throws naming the file when a corpus doc is NOT graded (no front-matter stub, F3)", () => {
    plant("good", "ADR-0001", SUBSTANTIVE);
    plant("weak", "ADR-0001", STUB);
    // A weak fixture with NO front-matter: runEval silently skips it, so without the
    // coverage check it would vanish from the matrix — a fixture-authoring error.
    const orphan = join(corpus, "weak", "docs", "adr", "ADR-0002.md");
    writeFileSync(orphan, "Just a bare stub with no front-matter block.\n");
    expect(() => runCalibrate({ corpus, config: CFG })).toThrow(
      /corpus doc\(s\) not graded[\s\S]*ADR-0002\.md/,
    );
  });

  it("throws when a corpus doc lives under a dir no configured type covers (F3)", () => {
    plant("good", "ADR-0001", SUBSTANTIVE);
    plant("weak", "ADR-0001", STUB);
    const strayDir = join(corpus, "good", "docs", "unknown-type");
    mkdirSync(strayDir, { recursive: true });
    writeFileSync(join(strayDir, "DOC-0001.md"), `${FM("DOC-0001")}${SUBSTANTIVE}`);
    expect(() => runCalibrate({ corpus, config: CFG })).toThrow(
      /corpus tree .*good.*not graded.*DOC-0001\.md/,
    );
  });

  it("calibrates the standard corpus layout even when the HOST config sets docs.root (F13)", () => {
    // RFC-0007: a host repo governed under .govkit must still grade the corpus, whose
    // convention is type dirs directly under good/ and weak/ — docs.root is forced to ".".
    plant("good", "ADR-0001", SUBSTANTIVE);
    plant("weak", "ADR-0001", STUB);
    const hosted: GovkitConfig = { ...CFG, docs: { ...CFG.docs, root: ".govkit" } };
    const r = runCalibrate({ corpus, config: hosted });
    expect(r.counts).toEqual({ tp: 1, fp: 0, fn: 0, tn: 1 });
    expect(r.ok).toBe(true);
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
    // The confirmation is a status line, not a result: stderr, so --json stdout stays pure.
    expect(write.stderr).toContain("baseline updated");
    const baseline = JSON.parse(readFileSync(path, "utf8"));
    expect(baseline.floor.precision).toBe(1);
    expect(baseline.counts.fp).toBe(0);

    const rerun = cli(["calibrate", "--corpus", FIXTURES, "--baseline", path]);
    expect(rerun.status).toBe(0);
    expect(rerun.stdout).toContain("(ok)"); // the baseline comparison line is printed
  });

  it("a missing --baseline file WITHOUT --update-baseline is a hard error naming the path (F1)", () => {
    const path = join(corpus, "no-such-baseline.json");
    const r = cli(["calibrate", "--corpus", FIXTURES, "--baseline", path]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`govkit: baseline file not found: ${path}`);
    expect(r.stderr).toContain("--update-baseline to create it");
  });

  it("--json --update-baseline keeps stdout pure JSON (F2)", () => {
    const path = join(corpus, "baseline.json");
    const r = cli([
      "calibrate",
      "--json",
      "--corpus",
      FIXTURES,
      "--baseline",
      path,
      "--update-baseline",
    ]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout); // throws (fails the test) on any non-JSON noise
    expect(parsed.counts.fp).toBe(0);
    expect(r.stderr).toContain("baseline updated");
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
