import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * How a doc type relates to its INDEX.md (RFC-0011). `false` skips ALL index checks for the
 * type (a type that keeps no INDEX). An object lists the front-matter keys whose values must
 * each appear as a matched table cell in the doc's INDEX row. Absent ⇒ `{ sync: ["status"] }`
 * — the pre-RFC-0011 status-only behavior, so this field is purely additive / non-breaking.
 */
export type IndexConfig = false | { sync: string[] };

/**
 * The canonical verify check kinds — the single list `tiers:` validation checks against.
 * Lives here (not commands/verify.ts) because loadConfig must validate config keys against
 * it and verify already imports config; verify derives its ViolationKind from this array so
 * the two can never drift. Alphabetical, so the validation error doubles as documentation.
 */
export const VIOLATION_KINDS = [
  "citation",
  "coherence",
  "duplicate",
  "frontmatter",
  "id",
  "index",
  "placeholder",
  "reference",
  "section",
  "status",
  "waiver",
] as const;

export type ViolationKind = (typeof VIOLATION_KINDS)[number];

/** Risk tier for a verify kind (RFC-0014): `blocking` fails the gate as always; `advisory`
 *  is reported (warn prefix, separate count) but never flips the verdict. */
export type ViolationTier = "blocking" | "advisory";

export interface DocType {
  dir: string;
  required: string[];
  /**
   * Walk SUBDIRECTORIES of `dir` when collecting this type's docs. Default `false` — the flat
   * scan every existing repo gets, unchanged. The premise at the top of govkit.yml is that any
   * doc LAYOUT adopts govkit by editing config: a flat numbered corpus (`PRD-0001.md` beside
   * its siblings) and a named design tree (`context-map.md` + per-context `README.md` +
   * `message-flows/`) are both legitimate layouts, and the layout is exactly the kind of
   * difference that belongs here rather than in the engine. Turning it on widens WHICH files
   * are governed and nothing else: front-matter completeness, the status set, globally-unique
   * ids, placeholder rejection and INDEX sync all still apply to every file the walk finds.
   * `ignore` entries match subdirectory names too, so a subtree can be excluded by name.
   */
  recursive?: boolean;
  /**
   * Enforce the id↔filename convention (`<id>.md` or `<id>-*.md`) for this type. Default
   * `true` — today's behavior. Set `false` for a type whose filenames are NAMES rather than
   * numbers (`context-map.md` carrying id `DOMAIN-CM-0001`), where the convention would reject
   * every legitimate file. Scoped to the one type, and it drops ONLY the filename half:
   * `idPrefix` is still enforced on the id itself, and ids are still globally unique — the doc
   * remains addressable by id, which is what the convention exists to guarantee.
   */
  idFilenameConvention?: boolean;
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
  /**
   * Keys subtracted from `base.required` for THIS type (RFC-0011). Effective required =
   * (base.required − excludeBase) ∪ required. Lets a lifecycle-less type (e.g. a runbook with
   * no `status`) opt out of a base key that otherwise can't be dropped. `id`/`title` may NOT be
   * excluded — they anchor duplicate-detection and refs — and loadConfig fails loud if they are.
   */
  excludeBase?: string[];
  /** INDEX relationship (RFC-0011). See IndexConfig. Absent ⇒ status-only sync (legacy). */
  index?: IndexConfig;
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
  /**
   * Optional recorded exceptions — see the WAIVERS block below for the model. Deliberately typed
   * `unknown[]`, NOT `Waiver[]`: an entry is validated at GATE time, not at load time, because a
   * malformed waiver must surface as a reported violation. Throwing at load would take the whole
   * gate down for one bad exception; dropping it silently would be the suppression the mechanism
   * exists to make impossible. Only the LIST shape is checked in loadConfig.
   */
  waivers?: unknown[];
}

// ── WAIVERS: the recorded, EXPIRING exception ────────────────────────────────────────────────
// Measured absence: before this block govkit had NO suppression mechanism at all — no ignore
// comment, no waivers key, nothing. That absence is what makes a gate feel rigid: when a rule is
// wrong for ONE case, the only moves left are to distort the artifact or to start ignoring the
// output, and both are worse than an exception someone signed. Two official precedents shape the
// fields: Snyk's `.snyk` policy carries a human `reason` plus an `expires` datetime per ignore,
// and ESLint's disable comments take a description after a `--` separator. We are DELIBERATELY
// stricter than Snyk in exactly one way: Snyk permits a permanent ignore by omitting `expires`;
// here `expires` is MANDATORY. Every waiver dies, its finding comes back on its own, and accepted
// debt cannot accumulate silently — which is the only reason a gate can afford to have an escape
// hatch at all.

/** The fields every `waivers:` entry must carry, non-empty. Named once so the validator, the
 *  error message, and the `govkit.yml` example cannot drift. */
const WAIVER_REQUIRED_FIELDS = ["rule", "scope", "reason", "authorized_by", "expires"] as const;

/** How far ahead the summary warns about an active waiver's expiry. A waiver is a debt with a due
 *  date; two weeks is enough to renew-or-fix before the finding comes back and reddens CI. */
const WAIVER_EXPIRY_HORIZON_DAYS = 14;

/** One validated `waivers:` entry. Every field mandatory — see the block comment above. */
export interface Waiver {
  /** The finding waived: a verify `ViolationKind` (`index`) or an eval rubric rule id (`kpi`). */
  rule: string;
  /** Repo-relative path or glob (`docs/adr/ADR-0007.md`, `docs/adr/**`). `*` and `?` stay inside
   *  ONE path segment; `**` crosses separators. Matched against forward-slash paths on every OS. */
  scope: string;
  /** Why this finding is acceptable here. Non-empty — an unexplained exception is an ignore. */
  reason: string;
  /** The human who authorized it. An agent may PROPOSE a waiver; it may never author this field
   *  for itself, the same rule that forbids self-assigning an owner or self-flipping a status. */
  authorized_by: string;
  /** ISO `YYYY-MM-DD` (valid THROUGH that day, UTC) or a full ISO datetime. */
  expires: string;
}

/** A waiver's state at one instant — the discriminated union every consumer switches on. Three
 *  states, and only ONE of them suppresses anything: `malformed` and `expired` are reported and
 *  inert, so the failure mode of this feature is a noisy gate, never a quiet one. */
export type WaiverState =
  | { readonly state: "malformed"; readonly index: number; readonly problems: string[] }
  | { readonly state: "expired"; readonly index: number; readonly waiver: Waiver }
  | {
      readonly state: "active";
      readonly index: number;
      readonly waiver: Waiver;
      /** Whole days until `expires`, rounded up — drives the expiring-soon warning. */
      readonly daysLeft: number;
    };

/** Waiver counts for a run's summary line. `applied` is the only one measured against findings;
 *  the rest describe the config itself. */
export interface WaiverSummary {
  /** Total `waivers:` entries in config. */
  configured: number;
  /** Well-formed and not yet past `expires` — the only entries that can suppress. */
  active: number;
  /** Past `expires`. They suppress NOTHING; the finding they used to cover is back. */
  expired: number;
  /** Missing a mandatory field, or naming a rule the gate never emits. They suppress NOTHING. */
  malformed: number;
  /** Active entries expiring within `horizonDays` — renew or fix before CI reddens. */
  expiringSoon: number;
  horizonDays: number;
  /** Findings an active waiver actually excused in THIS run. */
  applied: number;
}

/** Trim-normalize a YAML scalar. A three-line duplicate of util's `str` on purpose: util imports
 *  this module, so a value import back into config would close a runtime cycle. */
function text(value: unknown): string {
  return value != null ? String(value).trim() : "";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?$/;
const MS_PER_DAY = 86_400_000;

/** Epoch ms at which a waiver stops being in force, or null when `expires` is not ISO. A DATE-ONLY
 *  value is valid THROUGH that day (23:59:59.999 UTC): `expires: 2026-12-31` reading as "dead at
 *  midnight on the 30th" is the kind of off-by-one that gets a mechanism distrusted. Deliberately
 *  narrower than `Date.parse`, which accepts implementation-defined junk like `Dec 31 2026`. */
function expiryInstant(value: string): number | null {
  if (!ISO_DATE.test(value) && !ISO_DATETIME.test(value)) return null;
  const ms = Date.parse(ISO_DATE.test(value) ? `${value}T23:59:59.999Z` : value);
  return Number.isNaN(ms) ? null : ms;
}

/** The vocabulary a waiver's `rule` may name: every verify kind ∪ every configured eval rubric
 *  rule id. A `rule` outside it is a TYPO, and a typo'd waiver waives nothing while reading as
 *  though it did — the same looks-configured-but-isn't leak `tiers` fails loud on. Here it lands
 *  as a malformed-waiver VIOLATION rather than a load throw, because unlike `tiers` a waiver is
 *  data the gate reports on. */
function knownRuleKeys(config: GovkitConfig): Set<string> {
  const keys = new Set<string>(VIOLATION_KINDS);
  for (const rubric of Object.values(config.eval?.rubrics ?? {})) {
    for (const rule of rubric) keys.add(rule.id);
  }
  return keys;
}

function classifyOne(
  entry: unknown,
  index: number,
  known: Set<string>,
  nowMs: number,
): WaiverState {
  const label = `waivers[${index}]`;
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return {
      state: "malformed",
      index,
      problems: [`${label} must be a mapping with ${WAIVER_REQUIRED_FIELDS.join(", ")}`],
    };
  }
  const raw = entry as Record<string, unknown>;
  const problems: string[] = [];
  for (const field of WAIVER_REQUIRED_FIELDS) {
    if (text(raw[field]) === "") {
      problems.push(
        `${label} is missing a non-empty '${field}' — an exception without one is an ignore`,
      );
    }
  }
  const rule = text(raw.rule);
  if (rule !== "" && !known.has(rule)) {
    problems.push(
      `${label} names unknown rule '${rule}' — it would waive nothing; ` +
        `valid rules: ${[...known].sort().join(", ")}`,
    );
  }
  const expires = text(raw.expires);
  const expiresAt = expires === "" ? null : expiryInstant(expires);
  if (expires !== "" && expiresAt === null) {
    problems.push(`${label} expires '${expires}' is not an ISO date (YYYY-MM-DD) or ISO datetime`);
  }
  if (problems.length > 0 || expiresAt === null) return { state: "malformed", index, problems };
  const waiver: Waiver = {
    rule,
    scope: text(raw.scope),
    reason: text(raw.reason),
    authorized_by: text(raw.authorized_by),
    expires,
  };
  if (expiresAt < nowMs) return { state: "expired", index, waiver };
  return { state: "active", index, waiver, daysLeft: Math.ceil((expiresAt - nowMs) / MS_PER_DAY) };
}

/** Classify every configured waiver against `now`. Pure and clock-injected so a test can prove the
 *  expiry boundary without waiting for it, and so `verify` and `eval` reading the same config at
 *  the same instant can never disagree on which waivers are in force. */
export function classifyWaivers(config: GovkitConfig, now: Date): WaiverState[] {
  const known = knownRuleKeys(config);
  const nowMs = now.getTime();
  return (config.waivers ?? []).map((entry, index) => classifyOne(entry, index, known, nowMs));
}

/** Compile a `scope` glob. Segment-aware: `*`/`?` stay inside one path segment, `**` crosses
 *  separators, and `docs/adr/**` covers every depth under `docs/adr/`. Anchored at BOTH ends so a
 *  scope can never widen itself by accidental substring match — a waiver that silently covers more
 *  than it says is exactly the failure this whole block exists to prevent. */
function globToRegExp(glob: string): RegExp {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i] ?? "";
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          source += "(?:.*/)?"; // `a/**/b.md` also matches `a/b.md`
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (ch === "?") {
      source += "[^/]";
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

/** Does this waiver cover `rule` at `relPath` (repo-relative, forward slashes)? BOTH halves must
 *  match — a waiver is a rule×scope pair, never a blanket over a file or over a rule. */
export function waiverCovers(waiver: Waiver, rule: string, relPath: string): boolean {
  return waiver.rule === rule && globToRegExp(waiver.scope).test(relPath);
}

/** Roll classified states + the number of findings actually excused into the run's summary. */
export function summarizeWaivers(states: WaiverState[], applied: number): WaiverSummary {
  const count = (s: WaiverState["state"]): number => states.filter((w) => w.state === s).length;
  return {
    configured: states.length,
    active: count("active"),
    expired: count("expired"),
    malformed: count("malformed"),
    expiringSoon: states.filter(
      (w) => w.state === "active" && w.daysLeft <= WAIVER_EXPIRY_HORIZON_DAYS,
    ).length,
    horizonDays: WAIVER_EXPIRY_HORIZON_DAYS,
    applied,
  };
}

const DEFAULT_IGNORE = ["INDEX.md", "_TEMPLATE.md"];

/** A config key that MUST be a list of front-matter key names — `docs.base.required` and every
 *  type's `required`. Both sit on the STRICT side of this schema's one real asymmetry:
 *  `journal.path` and `ledger.path` stay TOLERANT (validated at use) because an unused bad key
 *  can only break the one command that reads it, while `required` decides WHICH keys every doc
 *  of a type must carry — get it wrong and the type is silently un-governed while the config
 *  reads as though it weren't. That is the same looks-configured-but-isn't leak `docs.root`,
 *  `excludeBase` and `tiers` already fail loud on, so `required` fails loud here too.
 *
 *  Two failure modes, and the quiet one is the worse: an ABSENT list takes the gate down deep
 *  inside verify with a bare `Spread syntax requires ...iterable` that names no type and no key,
 *  while a SCALAR (`required: id`) never crashes at all — a string IS iterable, so it spreads to
 *  ['i', 'd'] and the gate demands two one-letter keys nobody wrote. Both end here, at load. */
function requiredKeyList(value: unknown, where: string, path: string): void {
  const bad = !Array.isArray(value) || value.some((k) => typeof k !== "string" || k.trim() === "");
  if (bad) {
    throw new Error(
      `govkit: ${where} must be a list of front-matter key names in ${path} — got ` +
        `${value === undefined ? "no value at all" : `'${JSON.stringify(value)}'`}; ` +
        `write an explicit '[]' for a type that adds no keys of its own`,
    );
  }
}

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
      `govkit: docs.root '${docsRoot}' in ${path} resolves outside the repo root — ` +
        `it must stay within --root`,
    );
  }
  // An ABSENT `base:` keeps its documented default (no shared keys); a base block that IS
  // written must be complete, because `base: {}` is a half-finished edit, not a default.
  const base = docs.base === undefined ? { required: [] } : docs.base;
  if (docs.base !== undefined) requiredKeyList(base.required, "docs.base.required", path);
  // RFC-0011: excluding id/title would silently disable cross-doc checks (duplicate ids, refs,
  // INDEX row lookup all key on id). Fail loud at load, same stance as the docs.root guard.
  for (const [name, def] of Object.entries(docs.types ?? {})) {
    // `dir` and `required` are the two keys that decide WHAT a type governs and WHAT it demands.
    // Both are non-optional in DocType, but YAML is never typechecked against it, so a type
    // missing either reaches a reader and crashes it — a TypeError from inside a gate names
    // neither the type nor the key, which is the opposite of a teaching error.
    if (typeof def.dir !== "string" || def.dir.trim() === "") {
      throw new Error(
        `govkit: type '${name}' is missing a 'dir' (the directory its docs live in) in ${path}`,
      );
    }
    requiredKeyList(def.required, `type '${name}' required`, path);
    const bad = (def.excludeBase ?? []).filter((k) => k === "id" || k === "title");
    if (bad.length > 0) {
      throw new Error(
        `govkit: type '${name}' excludeBase may not drop [${bad.join(", ")}] — these anchor cross-doc checks`,
      );
    }
    // Same fail-loud stance as `tiers`: these two booleans decide WHICH files are governed and
    // WHICH check runs, so a quoted `recursive: "true"` (a truthy string, but not `true`) would
    // leave a whole nested tree ungoverned while the config reads as if it weren't — the
    // looks-governed-but-isn't leak. A non-boolean must error at load, never coerce.
    for (const key of ["recursive", "idFilenameConvention"] as const) {
      const value = def[key];
      if (value !== undefined && typeof value !== "boolean") {
        throw new Error(
          `govkit: type '${name}' ${key} must be true or false (got '${String(value)}' in ${path})`,
        );
      }
    }
  }
  // `tiers` fails LOUD at load, unlike the tolerant `journal` passthrough: a typo'd kind
  // (`indx: advisory`) would otherwise leave the real kind blocking while the user believes
  // it demoted — and a typo'd tier value could silently un-gate a check. Both are the
  // looks-enforced-but-isn't leak, so name the offender and the full valid vocabulary.
  const tiers = raw.tiers;
  if (tiers !== undefined) {
    if (typeof tiers !== "object" || tiers === null || Array.isArray(tiers)) {
      throw new Error(
        `govkit: tiers must be a map of verify kind → blocking|advisory in ${path} ` +
          `(valid kinds: ${VIOLATION_KINDS.join(", ")})`,
      );
    }
    for (const [kind, tier] of Object.entries(tiers)) {
      if (!(VIOLATION_KINDS as readonly string[]).includes(kind)) {
        throw new Error(
          `govkit: tiers names unknown verify kind '${kind}' in ${path} — ` +
            `valid kinds: ${VIOLATION_KINDS.join(", ")}`,
        );
      }
      if (tier !== "blocking" && tier !== "advisory") {
        throw new Error(
          `govkit: tiers.${kind} must be 'blocking' or 'advisory' (got '${String(tier)}' ` +
            `in ${path})`,
        );
      }
    }
  }
  // SHAPE-only validation, deliberately not field validation. `waivers:` must be a LIST — a
  // mapping or a scalar there is a typo that would waive nothing while the config reads as if the
  // exception were recorded. But each ENTRY stays raw: a malformed waiver has to reach the gate
  // and be REPORTED as a violation (see classifyWaivers), never abort the run, never vanish.
  const waivers = raw.waivers;
  if (waivers !== undefined && !Array.isArray(waivers)) {
    throw new Error(
      `govkit: waivers must be a list of ` +
        `{${WAIVER_REQUIRED_FIELDS.join(", ")}} entries in ${path}`,
    );
  }
  return {
    schemaVersion: raw.schemaVersion ?? 1,
    docs: {
      root: docsRoot,
      ignore: docs.ignore ?? DEFAULT_IGNORE,
      base,
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
    waivers,
  };
}
