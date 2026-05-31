import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type GovkitConfig, loadConfig, type RubricRule } from "../config";
import { parseFrontMatter } from "../frontmatter";
import { listMarkdown, str } from "../util";

export interface RuleResult {
  id: string;
  desc: string;
  weight: number;
  passed: boolean;
}

export interface ArtifactScore {
  file: string;
  type: string;
  /** 0–100, weighted fraction of rubric rules passed. */
  score: number;
  passed: boolean;
  rules: RuleResult[];
  /** Descriptions of the rules that failed — the actionable "make it better" list. */
  missed: string[];
}

export interface EvalResult {
  ok: boolean;
  threshold: number;
  scored: number;
  averageScore: number;
  /** Fraction of artifacts at or above the threshold (0–1). */
  passRate: number;
  artifacts: ArtifactScore[];
  /** Set when there is nothing to grade (no rubric configured). */
  note?: string;
}

export interface EvalOptions {
  root: string;
  config?: GovkitConfig;
}

// Does a single deterministic rule pass against a doc's front-matter + body?
// A malformed config pattern fails the rule (surfaced in `missed`) rather than
// crashing the whole eval — one bad rubric line must not take CI down.
function passesRule(rule: RubricRule, data: Record<string, unknown>, body: string): boolean {
  try {
    switch (rule.kind) {
      case "section":
        return rule.pattern ? new RegExp(`^#{1,6}.*(?:${rule.pattern})`, "im").test(body) : false;
      case "regex":
        return rule.pattern ? new RegExp(rule.pattern, "i").test(body) : false;
      case "frontmatter": {
        const value = rule.key ? str(data[rule.key]) : "";
        if (value === "") return false;
        return rule.pattern ? new RegExp(rule.pattern, "i").test(value) : true;
      }
      case "minWords":
        return body.trim().split(/\s+/).filter(Boolean).length >= (rule.min ?? 0);
      default:
        return false;
    }
  } catch {
    // safe to ignore: a bad user-supplied regex fails its rule (visible in `missed`),
    // never a process crash.
    return false;
  }
}

function scoreArtifact(
  file: string,
  type: string,
  data: Record<string, unknown>,
  body: string,
  rubric: RubricRule[],
  threshold: number,
): ArtifactScore {
  const rules: RuleResult[] = rubric.map((rule) => ({
    id: rule.id,
    desc: rule.desc,
    weight: rule.weight,
    passed: passesRule(rule, data, body),
  }));
  const total = rules.reduce((sum, r) => sum + r.weight, 0);
  const earned = rules.filter((r) => r.passed).reduce((sum, r) => sum + r.weight, 0);
  const score = total > 0 ? Math.round((earned / total) * 100) : 100;
  return {
    file,
    type,
    score,
    passed: score >= threshold,
    rules,
    missed: rules.filter((r) => !r.passed).map((r) => r.desc),
  };
}

// The graded quality layer. It runs ON TOP of a passing `verify` gate: the gate
// proves a doc is well-FORMED; eval grades whether it carries real SUBSTANCE
// (KPIs, alternatives, testable criteria…). Deterministic + no API key, so the
// "source of trust" is a number CI can watch over time — not an LLM's say-so.
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
      passRate: 1,
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
  const averageScore =
    scored > 0 ? Math.round(artifacts.reduce((sum, a) => sum + a.score, 0) / scored) : 0;
  const passing = artifacts.filter((a) => a.passed).length;
  return {
    ok: artifacts.every((a) => a.passed),
    threshold,
    scored,
    averageScore,
    passRate: scored > 0 ? passing / scored : 1,
    artifacts,
  };
}
