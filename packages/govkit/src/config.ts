import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * The canonical verify check kinds — the single list `tiers:` validation checks against.
 * Lives here (not commands/verify.ts) because loadConfig must validate config keys against
 * it and verify already imports config; verify derives its ViolationKind from this array so
 * the two can never drift. Alphabetical, so the validation error doubles as documentation.
 */
export const VIOLATION_KINDS = [
  "coherence",
  "duplicate",
  "frontmatter",
  "id",
  "index",
  "placeholder",
  "reference",
  "section",
  "status",
] as const;

export type ViolationKind = (typeof VIOLATION_KINDS)[number];

/** Risk tier for a verify kind (RFC-0014): `blocking` fails the gate as always; `advisory`
 *  is reported (warn prefix, separate count) but never flips the verdict. */
export type ViolationTier = "blocking" | "advisory";

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
  /**
   * Status-conditional required sections (RFC-0010). A map from a status to the heading
   * patterns a doc MUST carry while it is at that exact status — `verify` flags a doc at a
   * keyed status that is missing one. The point is the *key*: it is a specific
   * post-implementation status (e.g. `implemented`), NOT `terminalStatuses` — `accepted`
   * precedes implementation, so requiring an `## As-built` section there would fire before any
   * divergence can exist and never re-fire when it does. Keyed to a status that FOLLOWS
   * implementation, the requirement lands exactly when as-built knowledge is real, stays
   * zero-false-positive before then, and is deliberately decoupled from `terminalStatuses`.
   * OPT-IN: a type without this map is exempt (non-breaking). Patterns are matched against
   * heading lines (after stripping fenced code), same machinery as the eval `section` rubric.
   */
  requiredSectionsByStatus?: Record<string, string[]>;
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
  /**
   * Optional `--journal` sensor destination. `path` is relative to the repo root (CLI
   * `--root`) and must stay within it (resolution + escape guard live in journal.ts, the
   * same confinement init applies to scaffold writes). Absent ⇒ `.govkit/journal.jsonl` —
   * purely additive, a config without it behaves exactly as before.
   */
  journal?: { path?: string };
  /**
   * Optional `govkit ledger` location (RFC-0016). `path` is relative to the repo root (CLI
   * `--root`) and must stay within it — resolution + escape guard live in commands/ledger.ts,
   * the same confinement journal.path gets. Absent ⇒ `docs/ledger.json` — purely additive,
   * a config without it behaves exactly as before (and nothing else reads the key).
   */
  ledger?: { path?: string };
  /**
   * Optional risk tiers for verify checks (RFC-0014): map a violation kind to `advisory`
   * to keep it REPORTED (warn prefix, its own count, in the journal and `--json`) without
   * failing the gate — e.g. demote `index` while a large adoption backfills INDEX rows.
   * Unlisted kinds stay `blocking`; absent key ⇒ all blocking, so this is purely additive.
   * Unlike `journal`, this IS validated at load: a misspelled kind would silently leave the
   * intended check blocking — the exact looks-configured-but-isn't drift govkit exists to stop.
   */
  tiers?: Partial<Record<ViolationKind, ViolationTier>>;
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
  // `tiers` fails LOUD at load, unlike the tolerant `journal` passthrough: a typo'd kind
  // (`indx: advisory`) would otherwise leave the real kind blocking while the user believes
  // it demoted — and a typo'd tier value could silently un-gate a check. Both are the
  // looks-enforced-but-isn't leak, so name the offender and the full valid vocabulary.
  const tiers = raw.tiers;
  if (tiers !== undefined) {
    if (typeof tiers !== "object" || tiers === null || Array.isArray(tiers)) {
      throw new Error(
        `govkit: tiers must be a map of verify kind → blocking|advisory ` +
          `(valid kinds: ${VIOLATION_KINDS.join(", ")})`,
      );
    }
    for (const [kind, tier] of Object.entries(tiers)) {
      if (!(VIOLATION_KINDS as readonly string[]).includes(kind)) {
        throw new Error(
          `govkit: tiers names unknown verify kind '${kind}' — ` +
            `valid kinds: ${VIOLATION_KINDS.join(", ")}`,
        );
      }
      if (tier !== "blocking" && tier !== "advisory") {
        throw new Error(
          `govkit: tiers.${kind} must be 'blocking' or 'advisory' (got '${String(tier)}')`,
        );
      }
    }
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
    // Tolerant passthrough: journal is an OPTIONAL sensor destination; path validation
    // (escape confinement) happens at use time in journal.ts, not at load — an unused bad
    // journal key must not break the gate commands that never touch it.
    journal: raw.journal,
    // Same tolerant passthrough as journal: ledger.path is validated (type + confinement) at
    // use time in commands/ledger.ts — an unused bad ledger key must not break the gate
    // commands that never touch it.
    ledger: raw.ledger,
    tiers,
  };
}
