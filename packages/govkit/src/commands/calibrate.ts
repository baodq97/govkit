import { statSync } from "node:fs";
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

export function runCalibrate(opts: CalibrateOptions): CalibrateResult {
  const corpus = resolve(opts.corpus);
  const missing = ["good", "weak"].filter((label) => !isDir(join(corpus, label)));
  if (missing.length > 0) {
    throw new Error(
      `govkit: calibrate corpus '${corpus}' must contain good/ (docs that must pass the ` +
        `required floor) and weak/ (docs that must fail it) — missing: ${missing.join(", ")}`,
    );
  }

  // Grade each labeled tree with the SAME engine and config the gate runs — calibrate
  // measures the shipped floor, not a test-only approximation.
  const good = runEval({ root: join(corpus, "good"), config: opts.config });
  const weak = runEval({ root: join(corpus, "weak"), config: opts.config });
  // Fail loud, never green-on-nothing: a corpus that grades zero artifacts (no rubric
  // configured, wrong layout, unparseable front-matter) proves nothing about the floor.
  if (good.note || weak.note) {
    throw new Error(`govkit: calibrate has nothing to grade — ${good.note ?? weak.note}`);
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
    ok: counts.fp === 0 && !baseline?.recallRegressed && !baseline?.f1Regressed,
  };
}
