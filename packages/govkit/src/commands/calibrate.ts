import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GovkitConfig } from "../config";
import { runEval } from "./eval";

// `govkit calibrate` — the eval's OWN regression harness. The required floor's one hard
// invariant is ZERO FALSE POSITIVES on legitimate docs (a good doc blocked is what gets
// gates disabled — see RFC-0001); this command measures that invariant against a LABELED
// corpus (good/ must pass the floor, weak/ must fail it) and turns any rubric change into
// a checkable precision/recall/f1 diff vs a committed baseline. Pure like the other
// commands: it returns a result object; cli.ts owns printing, exit codes, and the
// baseline file I/O.

export interface CalibrationBaseline {
  floor: { precision: number; recall: number; f1: number };
  counts: { tp: number; fp: number; fn: number; tn: number };
  advisory: { goodAverageScore: number; weakAverageScore: number };
}

/** Parse + shape-check a calibration baseline. Malformed JSON, a missing floor block, or
 *  missing counts is an operational error (thrown as `govkit: …`) — comparing against
 *  garbage would let a regression pass on an undefined < undefined false, and the counts
 *  are live data (they pin corpus coverage — see the shrinkage check below). Pure: takes
 *  the raw string; cli.ts owns the readFileSync, `source` only names the file in errors. */
export function parseBaseline(raw: string, source: string): CalibrationBaseline {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`govkit: cannot read baseline ${source}: ${detail}`);
  }
  const baseline = parsed as CalibrationBaseline;
  const floor = baseline?.floor;
  const counts = baseline?.counts;
  if (
    typeof floor?.precision !== "number" ||
    typeof floor?.recall !== "number" ||
    typeof floor?.f1 !== "number" ||
    typeof counts?.tp !== "number" ||
    typeof counts?.fp !== "number" ||
    typeof counts?.fn !== "number" ||
    typeof counts?.tn !== "number"
  ) {
    throw new Error(
      `govkit: baseline ${source} is malformed — expected ` +
        `{ "floor": { "precision", "recall", "f1" }, "counts": { "tp", "fp", "fn", "tn" }, … }`,
    );
  }
  return baseline;
}

export interface CalibrateResult {
  corpus: string;
  /** Floor-level confusion matrix: the POSITIVE class is "blocked by the required floor",
   *  so TP = weak doc blocked, TN = good doc passed, FP = good doc blocked (the invariant
   *  violation), FN = weak doc that slipped through. */
  counts: { tp: number; fp: number; fn: number; tn: number };
  floor: { precision: number; recall: number; f1: number };
  /** Advisory-score discrimination: a healthy rubric scores good ≫ weak. */
  advisory: { goodAverageScore: number; weakAverageScore: number };
  /** The actionable part: each mislabeled artifact by path. */
  falsePositives: string[];
  falseNegatives: string[];
  /** Present only when a baseline was provided — the regression comparison. */
  baseline?: {
    floor: { precision: number; recall: number; f1: number };
    recallRegressed: boolean;
    f1Regressed: boolean;
    /** True when fewer weak (tp+fn) or good (tn+fp) docs were graded than the committed
     *  counts pin — corpus coverage shrank, so the floor's evidence base silently relaxed. */
    corpusShrunk: boolean;
  };
  /** False when any FP exists or the floor regressed vs the baseline — the CI verdict. */
  ok: boolean;
}

export interface CalibrateOptions {
  corpus: string;
  config: GovkitConfig;
  baseline?: CalibrationBaseline;
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    // absent path → "not a directory"; the caller reports which label tree is missing.
    return false;
  }
}

// Every .md under `dir`, RECURSIVELY, minus the ignore list. Deliberately deeper than the
// flat `listMarkdown` the readers use: an ungraded corpus doc is by definition somewhere
// runEval did not look (unknown type dir, no rubric), so the coverage check must see it.
function listMarkdownDeep(dir: string, ignore: string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listMarkdownDeep(path, ignore));
    else if (entry.isFile() && entry.name.endsWith(".md") && !ignore.includes(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

export function runCalibrate(opts: CalibrateOptions): CalibrateResult {
  const corpus = resolve(opts.corpus);
  const missing = ["good", "weak"].filter((label) => !isDir(join(corpus, label)));
  if (missing.length > 0) {
    throw new Error(
      `govkit: calibrate corpus '${corpus}' must contain good/ (docs that must pass the ` +
        `required floor) and weak/ (docs that must fail it) — missing: ${missing.join(", ")}`,
    );
  }

  // Grade each labeled tree with the SAME engine and rubric the gate runs — calibrate
  // measures the shipped floor, not a test-only approximation. One exception (RFC-0007):
  // the corpus layout is its own convention (type dirs directly under good/ and weak/),
  // independent of the HOST repo's docs.root — a repo governed under `.govkit` must still
  // calibrate the standard corpus, so grading forces `docs.root` back to ".".
  const config: GovkitConfig = { ...opts.config, docs: { ...opts.config.docs, root: "." } };
  const good = runEval({ root: join(corpus, "good"), config });
  const weak = runEval({ root: join(corpus, "weak"), config });
  // Fail loud, never green-on-nothing: a corpus that grades zero artifacts (no rubric
  // configured, wrong layout, unparseable front-matter) proves nothing about the floor.
  if (good.note || weak.note) {
    throw new Error(`govkit: calibrate has nothing to grade — ${good.note ?? weak.note}`);
  }
  // A corpus doc that exists but was NOT graded (missing/broken front-matter, a dir no
  // configured type covers, a type with no rubric) is a fixture-authoring error, never a
  // silent skip: an invisible weak stub would leave the matrix claiming coverage the run
  // never actually measured.
  for (const [label, result] of [
    ["good", good],
    ["weak", weak],
  ] as const) {
    const tree = join(corpus, label);
    const graded = new Set(result.artifacts.map((a) => a.file));
    const ungraded = listMarkdownDeep(tree, config.docs.ignore).filter((f) => !graded.has(f));
    if (ungraded.length > 0) {
      const shown = ungraded.slice(0, 5).join(", ");
      const more = ungraded.length > 5 ? `, … (${ungraded.length - 5} more)` : "";
      throw new Error(
        `govkit: calibrate corpus tree '${tree}' has ${ungraded.length} corpus doc(s) not ` +
          `graded — every corpus fixture must carry parseable front-matter and live under a ` +
          `configured type dir: ${shown}${more}`,
      );
    }
  }
  if (good.scored === 0 || weak.scored === 0) {
    const empty = good.scored === 0 ? "good" : "weak";
    throw new Error(
      `govkit: calibrate corpus tree '${join(corpus, empty)}' graded 0 artifacts — ` +
        "check the corpus layout matches the config's docs.types dirs",
    );
  }

  const falsePositives = good.artifacts.filter((a) => !a.requiredOk).map((a) => a.file);
  const falseNegatives = weak.artifacts.filter((a) => a.requiredOk).map((a) => a.file);
  const counts = {
    tp: weak.scored - falseNegatives.length,
    fp: falsePositives.length,
    fn: falseNegatives.length,
    tn: good.scored - falsePositives.length,
  };
  // Degenerate denominators default to the PERFECT value (1): with zero blocked-or-weak
  // artifacts there is no evidence of a miss, and the FP count separately guards the
  // invariant that actually matters.
  const precision = counts.tp + counts.fp === 0 ? 1 : counts.tp / (counts.tp + counts.fp);
  const recall = counts.tp + counts.fn === 0 ? 1 : counts.tp / (counts.tp + counts.fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const baseline = opts.baseline
    ? {
        floor: opts.baseline.floor,
        recallRegressed: recall < opts.baseline.floor.recall,
        f1Regressed: f1 < opts.baseline.floor.f1,
        // The committed counts pin corpus COVERAGE, not just ratios: grading fewer weak
        // (tp+fn) or good (tn+fp) docs than the baseline recorded means fixtures vanished
        // from the evidence base — a regression the ratio comparison alone cannot see
        // (a shrunken corpus can keep a perfect recall/f1).
        corpusShrunk:
          counts.tp + counts.fn < opts.baseline.counts.tp + opts.baseline.counts.fn ||
          counts.tn + counts.fp < opts.baseline.counts.tn + opts.baseline.counts.fp,
      }
    : undefined;

  return {
    corpus,
    counts,
    floor: { precision, recall, f1 },
    advisory: { goodAverageScore: good.averageScore, weakAverageScore: weak.averageScore },
    falsePositives,
    falseNegatives,
    ...(baseline ? { baseline } : {}),
    ok:
      counts.fp === 0 &&
      !baseline?.recallRegressed &&
      !baseline?.f1Regressed &&
      !baseline?.corpusShrunk,
  };
}
