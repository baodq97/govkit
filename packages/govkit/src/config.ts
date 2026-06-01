import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

export interface DocType {
  dir: string;
  required: string[];
  /** Status a freshly-authored doc of this type starts at (used by init/spec-author). */
  startStatus?: string;
  /** Allowed lifecycle states. When set, `verify` rejects any status outside this set. */
  statuses?: string[];
  /**
   * The subset of `statuses` that means "decided / shipped" — a TERMINAL state (RFC-0008).
   * Drives chain-status coherence: a doc in a terminal state may not have a `parent` ref that
   * resolves to a doc whose own type is terminal yet whose status is NOT (you shipped a thing
   * whose design was never decided). OPT-IN: a type without `terminalStatuses` is exempt, so
   * the coherence gate is non-breaking and dark until configured. "Terminal" is a set, not a
   * single value — `accepted` AND `superseded` are both decided, so done-under-superseded is
   * legitimate; only a pre-decision (draft/proposed) or rejected parent is the inconsistency.
   */
  terminalStatuses?: string[];
  /** Required id prefix (e.g. "ADR"). When set, `verify` enforces id + filename convention. */
  idPrefix?: string;
  /**
   * Cross-artifact references. Each entry names a front-matter key whose value, WHEN
   * non-empty, must resolve to an existing doc id anywhere in the governed chain — this is
   * how `verify` makes "governs the whole chain" literally true (see RFC-0003). Resolve-only
   * (v1): empty/absent values are skipped (an optional link is not a dangling one), `type` is
   * recorded but NOT enforced, there is no required-ref or transitive/cycle walking, and a ref
   * is a SINGLE SCALAR id per key (arrays are a future extension).
   */
  refs?: { key: string; type?: string }[];
}

// Deterministic, no-API-key quality scorers. Each rule contributes its weight when it
// passes. The deterministic layer is honestly a STRUCTURAL FLOOR — it proves a doc has
// the canonical sections, isn't a stub, and isn't smuggling signals in code fences. It
// cannot judge whether the prose is *sound* (a keyword-salad with the right headings has
// the same lexical fingerprint as a real doc) — that is the swe-flow `reviewer` agent's
// job (opt-in, needs a key, never in no-key CI). See RFC-0001.
export type RubricRuleKind = "section" | "regex" | "frontmatter" | "minWords" | "forbid";

export interface RubricRule {
  id: string;
  desc: string;
  weight: number;
  kind: RubricRuleKind;
  /** section: heading regex · regex/forbid: body regex · frontmatter: optional value regex. */
  pattern?: string;
  /** frontmatter: the key that must be present (and match `pattern` if given). */
  key?: string;
  /** minWords: minimum body word count (counted on prose, after stripping code/comments). */
  min?: number;
  /**
   * When true, failing this rule BLOCKS the artifact (CI-failing) regardless of score —
   * the structural floor. Keep the required set small and only on dimensions every
   * legitimate doc of the type carries; a false positive here is what gets gates disabled.
   */
  required?: boolean;
}

export interface EvalConfig {
  /** Advisory quality bar (0–100). Below it warns + lowers the trend; it does NOT block CI. */
  threshold: number;
  /** Quality rubric per doc-type name (matches `docs.types` keys). */
  rubrics: Record<string, RubricRule[]>;
}

export interface GovkitConfig {
  schemaVersion: number;
  docs: {
    /**
     * Parent directory for ALL kit-managed docs, relative to the repo root (CLI `--root`),
     * prepended to every `type.dir` (RFC-0007). Default `"."` → `docs/rfc` exactly as before,
     * so this is non-breaking. Set e.g. `.govkit` to isolate governed docs under one folder
     * (`.govkit/docs/rfc`). Resolution lives in ONE helper (`typeDir`) so every reader and the
     * per-write hook agree — a path the whole engine depends on must have a single source.
     * Optional in the type (absent ⇒ `"."` everywhere) so the field is purely additive: a
     * hand-built config or a pre-RFC-0007 govkit.yml without it behaves exactly as before.
     */
    root?: string;
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
  const docs = raw.docs ?? { root: ".", ignore: DEFAULT_IGNORE, base: { required: [] }, types: {} };
  const docsRoot = docs.root ?? ".";
  // Fail loud (RFC-0007): a docs.root that escapes the repo would have init/adopt try to write
  // outside --root and verify/eval silently govern nothing. A typo must error at load, not
  // pass as "0 docs checked" — the same fail-loud-not-fail-open principle as ref resolution.
  const escaped = relative(resolve(root), resolve(root, docsRoot));
  if (escaped.startsWith("..") || isAbsolute(escaped)) {
    throw new Error(
      `govkit: docs.root '${docsRoot}' resolves outside the repo root — it must stay within --root`,
    );
  }
  return {
    schemaVersion: raw.schemaVersion ?? 1,
    docs: {
      root: docsRoot,
      ignore: docs.ignore ?? DEFAULT_IGNORE,
      base: docs.base ?? { required: [] },
      types: docs.types ?? {},
    },
    eval: raw.eval,
  };
}
