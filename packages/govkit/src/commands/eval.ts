import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type GovkitConfig, loadConfig, type RubricRule } from "../config";
import { parseFrontMatter } from "../frontmatter";
import { listMarkdown, str } from "../util";

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
  /** True if every `required` rule passed — the CI-BLOCKING structural floor. */
  requiredOk: boolean;
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
  /** Set when there is nothing to grade (no rubric configured). */
  note?: string;
}

export interface EvalOptions {
  root: string;
  config?: GovkitConfig;
}

// Strip non-prose before any match: fenced code, HTML comments. (Front-matter is
// already removed by parseFrontMatter.) Closes the "smuggle signal words inside a
// code fence" gaming vector and keeps minWords measuring prose, not pasted tables.
function stripNonProse(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function headingLines(prose: string): string[] {
  return prose.split(/\r?\n/).filter((line) => /^#{1,6}\s+\S/.test(line));
}

// Compile + test a user-supplied pattern; a malformed pattern is treated as "no match"
// (the rule simply fails) rather than crashing the whole eval.
function matches(pattern: string, text: string): boolean {
  try {
    return new RegExp(pattern, "i").test(text);
  } catch {
    // safe to ignore: a bad rubric regex fails its rule (visible in `missed`), never a crash.
    return false;
  }
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
  const missedRequired = rules.filter((r) => r.required && !r.passed).map((r) => r.desc);
  return {
    file,
    type,
    score,
    requiredOk: missedRequired.length === 0,
    passedAdvisory: score >= threshold,
    rules,
    missedRequired,
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
      note: "no eval rubric configured in govkit.yml — add an `eval:` block to grade quality",
    };
  }

  const { ignore, types } = config.docs;
  const artifacts: ArtifactScore[] = [];
  for (const [typeName, def] of Object.entries(types)) {
    const rubric = rubrics[typeName];
    if (!rubric || rubric.length === 0) continue;
    for (const file of listMarkdown(join(opts.root, def.dir), ignore)) {
      const fm = parseFrontMatter(readFileSync(file, "utf8"));
      if (!fm) continue; // unparseable front-matter is the gate's job; eval grades well-formed docs
      artifacts.push(scoreArtifact(file, typeName, fm.data, fm.body, rubric, threshold));
    }
  }

  const scored = artifacts.length;
  const sum = (pick: (a: ArtifactScore) => number): number =>
    artifacts.reduce((acc, a) => acc + pick(a), 0);
  return {
    ok: artifacts.every((a) => a.requiredOk),
    threshold,
    scored,
    averageScore: scored > 0 ? Math.round(sum((a) => a.score) / scored) : 0,
    floorPassRate: scored > 0 ? sum((a) => (a.requiredOk ? 1 : 0)) / scored : 1,
    advisoryPassRate: scored > 0 ? sum((a) => (a.passedAdvisory ? 1 : 0)) / scored : 1,
    artifacts,
  };
}
