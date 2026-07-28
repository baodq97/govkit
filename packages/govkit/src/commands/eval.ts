import {
  classifyWaivers,
  type GovkitConfig,
  loadConfig,
  type RubricRule,
  summarizeWaivers,
  type Waiver,
  type WaiverSummary,
  waiverCovers,
} from "../config";
import { isParseError } from "../frontmatter";
import { headingLines, matches, str, stripNonProse, toPathspec, walkGovernedDocs } from "../util";

export interface RuleResult {
  id: string;
  desc: string;
  weight: number;
  required: boolean;
  passed: boolean;
}

export interface ArtifactScore {
  file: string;
  type: string;
  /** 0–100, weighted fraction of rubric rules passed. ADVISORY — does not block CI. */
  score: number;
  /**
   * True if every `required` rule passed. The LITERAL structural truth, deliberately unchanged by
   * waivers: `floorPassRate` and `govkit calibrate`'s false-positive/negative counts read this, and
   * a waiver that could move a calibration number would let accepted debt re-tune the rubric.
   */
  requiredOk: boolean;
  /**
   * Required-rule failures an ACTIVE waiver excused. Marking, never filtering — the rule is still
   * `passed: false` in `rules` and its description is still in `missedRequired`, so every reader
   * sees the gap; only `floorOk` (and therefore the gate) changes its mind about it.
   */
  waived: { rule: string; waiver: Waiver }[];
  /** What the CI gate reads: `requiredOk`, OR every missed required rule is waived. */
  floorOk: boolean;
  /** True if `score >= threshold` — the advisory quality bar. */
  passedAdvisory: boolean;
  rules: RuleResult[];
  /** Descriptions of failed `required` rules — the blocking gaps. */
  missedRequired: string[];
  /** Descriptions of all failed rules — the actionable "make it better" list. */
  missed: string[];
}

export interface EvalResult {
  /** CI gate: every artifact cleared its required structural floor. */
  ok: boolean;
  threshold: number;
  scored: number;
  averageScore: number;
  /** Fraction of artifacts clearing the required floor (0–1). */
  floorPassRate: number;
  /** Fraction of artifacts at/above the advisory threshold (0–1). */
  advisoryPassRate: number;
  artifacts: ArtifactScore[];
  /**
   * Waiver accounting for this run — `applied` is the number of required-rule failures excused.
   * Always present (all-zero when nothing is configured). A MALFORMED or EXPIRED waiver is
   * counted here but not narrated: `verify` owns reporting the waiver config itself (as a
   * `waiver`-kind violation on `govkit.yml`), and `govkit check` runs both, so the one report
   * has one home. What matters at this layer is that neither kind suppresses anything.
   */
  waivers: WaiverSummary;
  /** Set when there is nothing to grade (no rubric configured). */
  note?: string;
  /** Set only when `changed` scoping was applied — names the base ref and how many
   *  artifacts were scored, so output is never silently scoped. */
  scoped?: { ref: string; changedDocs: number };
}

/** The `required floor:` clause of the eval header. Lives beside the counting rule rather than in
 *  the CLI printer, the same home `verifySummaryLine` has and for the same reason: the header may
 *  never claim a number its own body cannot account for, and the numbers must be assertable
 *  without spawning a process.
 *
 *  TWO units, so both are named. `applied` counts rule×artifact — a waiver is a rule×scope
 *  exception — while the body prints one line per ARTIFACT, so a bare "2 waived" over two lines of
 *  which one reads BLOCK is a count the reader cannot reconcile with anything visible. The
 *  artifact term counts every artifact that prints a signature below, INCLUDING a partly-signed
 *  one that still blocks, so the two numbers describe exactly the lines beneath them. */
export function evalFloorLine(result: EvalResult): string {
  const passed = `required floor: ${Math.round(result.floorPassRate * 100)}% passed`;
  const applied = result.waivers.applied;
  if (applied === 0) return passed;
  const signed = result.artifacts.filter((a) => a.waived.length > 0).length;
  return `${passed}, ${applied} rule(s) waived on ${signed} artifact(s)`;
}

/** Artifacts whose required floor was cleared ONLY by an active waiver: `requiredOk` says the
 *  literal structural truth is a failure and `floorOk` says the gate cleared it anyway. This is
 *  the number that EXPLAINS a sub-100% `floorPassRate` on an `ok: true` run, so it is the count
 *  the journal carries. Deliberately NOT the number of artifacts that print a signature — an
 *  artifact can be partly signed and still block, which is the printer's concern and not a
 *  consumer's "did this gate fail open?" question. */
export function waiverClearedArtifacts(result: EvalResult): number {
  return result.artifacts.filter((a) => !a.requiredOk && a.floorOk).length;
}

export interface EvalOptions {
  root: string;
  config?: GovkitConfig;
  /** `--changed` adoption mode (RFC-0005): absolute paths of new-or-modified governed
   *  docs. When provided, ONLY those artifacts are scored — the floor, advisory average,
   *  and pass-rates are computed over that subset. Unlike `verify`, eval has no cross-doc
   *  check, so scoping the scored set (not just the report) is safe: there is no global
   *  violation that could be masked by quieting an untouched file. */
  changed?: { files: Set<string>; ref: string };
  /** The instant waiver expiry is judged against. Injected so a test can prove the boundary
   *  without waiting for it; defaults to now. Nothing else in eval reads a clock. */
  now?: Date;
}

function wordCount(prose: string): number {
  return prose.match(/[A-Za-z0-9$%]+/g)?.length ?? 0;
}

function scoreArtifact(
  file: string,
  type: string,
  data: Record<string, unknown>,
  body: string,
  rubric: RubricRule[],
  threshold: number,
  /** Bound to THIS artifact's path by the caller: the active waiver covering `ruleId` here, if
   *  any. A closure rather than the waiver list, so scoring stays path-matching-free. */
  waiverFor: (ruleId: string) => Waiver | undefined,
): ArtifactScore {
  const prose = stripNonProse(body);
  const headings = headingLines(prose);
  // Greedy injective heading→rule matching: each heading satisfies at most one `section`
  // rule, so a single kitchen-sink heading ("## Context, Decision & Consequences") can no
  // longer pass every section rule at once.
  const usedHeading = new Set<number>();
  const wc = wordCount(prose);

  const rules: RuleResult[] = rubric.map((rule) => {
    let passed = false;
    switch (rule.kind) {
      case "section":
        if (rule.pattern) {
          for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            if (usedHeading.has(i) || heading === undefined) continue;
            if (matches(`(?:${rule.pattern})`, heading)) {
              passed = true;
              usedHeading.add(i);
              break;
            }
          }
        }
        break;
      case "regex":
        passed = rule.pattern ? matches(rule.pattern, prose) : false;
        break;
      case "forbid":
        // Passes (earns weight) when the forbidden filler pattern is ABSENT.
        passed = rule.pattern ? !matches(rule.pattern, prose) : true;
        break;
      case "frontmatter": {
        const value = rule.key ? str(data[rule.key]) : "";
        passed = value !== "" && (rule.pattern ? matches(rule.pattern, value) : true);
        break;
      }
      case "minWords":
        passed = wc >= (rule.min ?? 0);
        break;
    }
    return {
      id: rule.id,
      desc: rule.desc,
      weight: rule.weight,
      required: rule.required ?? false,
      passed,
    };
  });

  const total = rules.reduce((sum, r) => sum + r.weight, 0);
  const earned = rules.filter((r) => r.passed).reduce((sum, r) => sum + r.weight, 0);
  const score = total > 0 ? Math.round((earned / total) * 100) : 100;
  const failedRequired = rules.filter((r) => r.required && !r.passed);
  const waived = failedRequired.flatMap((r) => {
    const waiver = waiverFor(r.id);
    return waiver ? [{ rule: r.id, waiver }] : [];
  });
  return {
    file,
    type,
    score,
    requiredOk: failedRequired.length === 0,
    waived,
    // The gate clears only when EVERY failed required rule is individually signed for — a waiver
    // is a rule×scope exception, never a blanket "this file is exempt from the floor".
    floorOk: failedRequired.length === waived.length,
    passedAdvisory: score >= threshold,
    rules,
    missedRequired: failedRequired.map((r) => r.desc),
    missed: rules.filter((r) => !r.passed).map((r) => r.desc),
  };
}

// The graded quality layer. It is an HONEST structural FLOOR, not a substance judge:
// `verify` proves a doc is well-formed; `eval` proves it has the canonical sections
// (as distinct headings), isn't a stub, and isn't smuggling signals in code fences. CI
// BLOCKS only on the small `required` floor — tuned for zero false-positive on legitimate
// docs, accepting that a determined gamer can pass the floor. The 0–100 score is ADVISORY
// (a quality trend to watch). Judging whether the prose is SOUND is the swe-flow
// `reviewer` agent's job (opt-in, needs a key, never in no-key CI). See RFC-0001.
export function runEval(opts: EvalOptions): EvalResult {
  const config = opts.config ?? loadConfig(opts.root);
  const threshold = config.eval?.threshold ?? 70;
  // Classified ONCE against ONE instant, the same discipline verify applies: two artifacts graded
  // in the same run must never disagree on whether a waiver is still in force. Only `active`
  // states reach `waiverFor` below, so malformed and expired entries suppress nothing here.
  const waiverStates = classifyWaivers(config, opts.now ?? new Date());
  const activeWaivers = waiverStates.flatMap((s) => (s.state === "active" ? [s.waiver] : []));
  const rubrics = config.eval?.rubrics;
  if (!rubrics || Object.keys(rubrics).length === 0) {
    return {
      ok: true,
      threshold,
      scored: 0,
      averageScore: 0,
      floorPassRate: 1,
      advisoryPassRate: 1,
      artifacts: [],
      waivers: summarizeWaivers(waiverStates, 0),
      note: "no eval rubric configured in govkit.yml — add an `eval:` block to grade quality",
    };
  }

  const artifacts: ArtifactScore[] = [];
  // The shared corpus walk (util.walkGovernedDocs) — the graded corpus must be the gated
  // corpus, or a nested doc would pass the gate and never be scored.
  walkGovernedDocs(opts.root, config, ({ file, typeName, fm }) => {
    const rubric = rubrics[typeName];
    if (!rubric || rubric.length === 0) return; // no rubric for this type → nothing to grade
    if (opts.changed && !opts.changed.files.has(file)) return; // RFC-0005: score only changed
    if (!fm || isParseError(fm)) return; // unparseable front-matter is the gate's job; eval grades well-formed docs
    // Repo-relative, forward-slash: a `scope` must mean the same thing on every OS and in
    // every clone — the same spelling verify matches against.
    const rel = toPathspec(opts.root, file);
    const waiverFor = (ruleId: string): Waiver | undefined =>
      activeWaivers.find((w) => waiverCovers(w, ruleId, rel));
    artifacts.push(scoreArtifact(file, typeName, fm.data, fm.body, rubric, threshold, waiverFor));
  });

  const scored = artifacts.length;
  const sum = (pick: (a: ArtifactScore) => number): number =>
    artifacts.reduce((acc, a) => acc + pick(a), 0);
  return {
    // The gate reads `floorOk` (waivers honored); `floorPassRate` below keeps reading
    // `requiredOk` — the trend must keep showing the debt a waiver merely postponed.
    ok: artifacts.every((a) => a.floorOk),
    threshold,
    scored,
    averageScore: scored > 0 ? Math.round(sum((a) => a.score) / scored) : 0,
    floorPassRate: scored > 0 ? sum((a) => (a.requiredOk ? 1 : 0)) / scored : 1,
    advisoryPassRate: scored > 0 ? sum((a) => (a.passedAdvisory ? 1 : 0)) / scored : 1,
    artifacts,
    waivers: summarizeWaivers(
      waiverStates,
      sum((a) => a.waived.length),
    ),
    ...(opts.changed ? { scoped: { ref: opts.changed.ref, changedDocs: scored } } : {}),
  };
}
