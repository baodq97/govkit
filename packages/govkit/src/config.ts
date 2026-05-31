import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface DocType {
  dir: string;
  required: string[];
  /** Status a freshly-authored doc of this type starts at (used by init/spec-author). */
  startStatus?: string;
  /** Allowed lifecycle states. When set, `verify` rejects any status outside this set. */
  statuses?: string[];
  /** Required id prefix (e.g. "ADR"). When set, `verify` enforces id + filename convention. */
  idPrefix?: string;
}

/** Deterministic, no-API-key quality scorers. Each rule contributes its weight when it passes. */
export type RubricRuleKind = "section" | "regex" | "frontmatter" | "minWords";

export interface RubricRule {
  id: string;
  desc: string;
  weight: number;
  kind: RubricRuleKind;
  /** section: heading regex · regex: body regex · frontmatter: optional value regex. */
  pattern?: string;
  /** frontmatter: the key that must be present (and match `pattern` if given). */
  key?: string;
  /** minWords: minimum body word count. */
  min?: number;
}

export interface EvalConfig {
  /** Pass threshold (0–100). An artifact scoring below this fails the eval. */
  threshold: number;
  /** Quality rubric per doc-type name (matches `docs.types` keys). */
  rubrics: Record<string, RubricRule[]>;
}

export interface GovkitConfig {
  schemaVersion: number;
  docs: {
    ignore: string[];
    base: { required: string[] };
    types: Record<string, DocType>;
  };
  /** Optional quality-eval layer. Absent → `govkit eval` reports "no rubric configured". */
  eval?: EvalConfig;
}

const DEFAULT_IGNORE = ["INDEX.md", "_TEMPLATE.md"];

// Load the pluggable governance schema. A missing file is an explicit, actionable
// error — never a silent default that would let an unconfigured repo "pass".
export function loadConfig(root: string): GovkitConfig {
  const path = join(root, "govkit.yml");
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(
      `govkit: no govkit.yml at ${path} — run \`govkit init\` first (${(err as Error).message})`,
    );
  }
  const raw = (parseYaml(text) ?? {}) as Partial<GovkitConfig>;
  const docs = raw.docs ?? { ignore: DEFAULT_IGNORE, base: { required: [] }, types: {} };
  return {
    schemaVersion: raw.schemaVersion ?? 1,
    docs: {
      ignore: docs.ignore ?? DEFAULT_IGNORE,
      base: docs.base ?? { required: [] },
      types: docs.types ?? {},
    },
    eval: raw.eval,
  };
}
