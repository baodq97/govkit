import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import { type DocType, type GovkitConfig, loadConfig } from "../config";
import { isParseError } from "../frontmatter";
import { effectiveRequired, str, stripNonProse, walkGovernedDocs } from "../util";

// The sentinel for a field that could not be extracted (or was uncertain). It is an
// ANGLE-BRACKET placeholder on purpose: `verify`'s checkPlaceholder flags `/<[^>]*>/` on
// EVERY required key (RFC-0006 chose this over a token like `__MISSING__`, which would only
// fail keys that also have an enum/convention — owner/title/date have neither, yet must still
// fail loud). Absence stays visible until a human fills it; it is never quietly satisfied.
const MISSING = "<MISSING — fill in>";

export interface AdoptField {
  key: string;
  value: string;
  /** `extracted` from a declared prose line shape, or `missing` (the sentinel was written). */
  source: "extracted" | "missing";
}

export interface AdoptDocPlan {
  file: string;
  type: string;
  fields: AdoptField[];
  /** The front-matter block adopt would prepend (or did, under --apply). */
  block: string;
  /** True when any field is the sentinel — i.e. this doc will still fail `verify` after apply. */
  hasMissing: boolean;
}

export interface AdoptConfigDrift {
  type: string;
  key: string;
  /** Values found in real docs that fall outside the configured set. */
  unknown: string[];
  /** The set the human could paste into govkit.yml (existing ∪ unknown). adopt never writes it. */
  suggested: string[];
}

export interface AdoptResult {
  applied: boolean;
  /** Lane 1: docs that LACK front-matter, with the block adopt proposes. */
  planned: AdoptDocPlan[];
  /** Lane 2: status-vocabulary drift in docs that HAVE front-matter (report-only). */
  drift: AdoptConfigDrift[];
}

export interface AdoptOptions {
  root: string;
  apply?: boolean;
  config?: GovkitConfig;
}

// ── extraction: ONLY anchored, declared line shapes — never free prose ────────────────
// The load-bearing asymmetry (RFC-0006): a MISSED extraction costs a human one diff line; a
// WRONG extraction asserts metadata nobody approved (the leak govkit exists to prevent). So
// when in doubt, return null → the caller writes the sentinel. We never scan running text.

// A value from a DECLARED metadata shape, in this order:
//   1. bold-delimited ANYWHERE on a line — `**Key**: value` — the strong signal real docs use
//      for an inline row (`**Status**: Proposed · **Date**: … · **Owner**: Platform`), where
//      only the first item is line-leading; the bold markers are what make mid-line safe.
//   2. plain `Key: value` at the START of a line — a metadata line, not running prose.
// A value stops at a bold marker, an inline separator (· |), or newline. Returns null when
// neither shape is present (→ sentinel) — we never pull a word out of a sentence.
function lineValue(body: string, key: string): string | null {
  const bold = new RegExp(`\\*\\*\\s*${key}\\s*\\*\\*\\s*[:：]\\s*([^*\\n·|]+)`, "i");
  const plain = new RegExp(`^[ \\t>]*${key}\\s*[:：]\\s*([^\\n·|]+)`, "im");
  const m = bold.exec(body) ?? plain.exec(body);
  const v = (m?.[1] ?? "").trim();
  return v.length > 0 ? v : null;
}

// Title: the first ATX heading only. A heading is a high-confidence declared shape; the
// "first non-empty line" fallback is NOT used — it would guess a title from arbitrary prose.
function extractTitle(body: string): string | null {
  const m = /^#[ \t]+(.+?)[ \t]*$/m.exec(body);
  const v = (m?.[1] ?? "").trim();
  return v.length > 0 ? v : null;
}

// Date: a labeled `Date:` line whose value is a strict ISO date. A bare date floating in prose
// ("ship by 2026-01-01") is too ambiguous to trust, so it is deliberately NOT matched.
function extractDate(body: string): string | null {
  const labeled = lineValue(body, "date");
  return labeled && /^\d{4}-\d{2}-\d{2}$/.test(labeled) ? labeled : null;
}

// Id: derived from the filename ONLY when the type declares an idPrefix and the name carries it
// (e.g. `ADR-0001-foo.md` → `ADR-0001`). A repo whose files are not id-prefixed (the field-test
// specs, `2026-05-29-*.md`) yields null → sentinel → loud. We never invent an id.
function extractId(file: string, def: DocType): string | null {
  if (!def.idPrefix) return null;
  const m = new RegExp(`^(${def.idPrefix}-\\d+)`).exec(basename(file, ".md"));
  return m?.[1] ?? null;
}

function extractField(key: string, body: string, file: string, def: DocType): string | null {
  if (key === "title") return extractTitle(body);
  if (key === "id") return extractId(file, def);
  if (key === "date") return extractDate(body);
  const v = lineValue(body, key);
  // status is matched against the enum downstream; normalize case so `Proposed` → `proposed`.
  return key === "status" && v ? v.toLowerCase() : v;
}

// Always double-quote the value. A real heading is `# Connector: Secrets` — an unquoted
// `title: Connector: Secrets` is malformed YAML the tool itself would have corrupted. Quoting
// makes colons/specials safe and round-trips through parseFrontMatter.
function quote(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Hand-template the block (NOT yaml.stringify) so we control the trailing provenance comments
// per line — a wrongly-extracted value is only catchable because the diff says where it came
// from. The comment is YAML-legal (space before `#`) and is dropped on parse.
function serialize(fields: AdoptField[]): string {
  const lines = fields.map((f) => {
    const tag = f.source === "extracted" ? "# extracted from prose" : "# NEEDS REVIEW — not found";
    return `${f.key}: ${quote(f.value)} ${tag}`;
  });
  return `---\n${lines.join("\n")}\n---\n`;
}

// Migrate existing prose metadata into front-matter — RFC-0006. Two lanes:
//   1. docs that LACK front-matter → propose a block (extract declared shapes, sentinel the
//      rest), applied only under --apply, never rewriting a doc that already has a block.
//   2. docs that HAVE front-matter with a status outside the enum → report a suggested
//      govkit.yml patch (never written — the schema is the human's contract).
// Pure-fs/no-key/no-git: extraction is regex over file contents, same trust class as verify.
export function runAdopt(opts: AdoptOptions): AdoptResult {
  const config = opts.config ?? loadConfig(opts.root);
  const { base, types } = config.docs;
  const planned: AdoptDocPlan[] = [];
  const driftByType: Record<string, Set<string>> = {};
  // Shared with verify + audit-write: adopt must not scaffold a key the gate exempts via
  // `excludeBase` (it used to write a `<MISSING — fill in>` sentinel for one). Computed once
  // per type, the first time the walk reaches it.
  const requiredByType = new Map<string, string[]>();

  // The shared corpus walk (util.walkGovernedDocs), per-type `recursive` flag included. The
  // migrator is the one reader where a narrower walk is unrecoverable: a nested doc the gate
  // already flags for missing front-matter is never even offered a block here, so it can never
  // be adopted and stays red forever.
  walkGovernedDocs(opts.root, config, ({ file, typeName, def, content, fm }) => {
    // A malformed block already HAS a `---` block — adopt must not prepend a second one.
    // Leave it for the verify gate to report (US-0002); adopt only scaffolds missing blocks.
    if (isParseError(fm)) return;

    if (fm) {
      // Lane 2: a doc that already has a block — adopt does NOT touch it. Only collect
      // status-vocabulary drift so the human can decide whether to widen the enum.
      const status = str(fm.data.status);
      if (def.statuses && def.statuses.length > 0 && status && !def.statuses.includes(status)) {
        driftByType[typeName] ??= new Set();
        driftByType[typeName]?.add(status);
      }
      return;
    }

    // Lane 1: no block → propose one. Trigger predicate is exactly verify's "missing YAML
    // front-matter", so adopt targets precisely the docs verify flags — and is idempotent
    // (after --apply the doc has a block, so the next run skips it here).
    // Strip fenced code / comments before extraction (same as eval): a doc showing a
    // front-matter EXAMPLE in a fence must not have that example lifted as its real metadata.
    let required = requiredByType.get(typeName);
    if (!required) {
      required = effectiveRequired(base, def);
      requiredByType.set(typeName, required);
    }
    const prose = stripNonProse(content);
    const fields: AdoptField[] = required.map((key) => {
      const v = extractField(key, prose, file, def);
      return v
        ? { key, value: v, source: "extracted" as const }
        : { key, value: MISSING, source: "missing" as const };
    });
    const block = serialize(fields);
    planned.push({
      file,
      type: typeName,
      fields,
      block,
      hasMissing: fields.some((f) => f.source === "missing"),
    });

    if (opts.apply) writeFileSync(file, `${block}\n${content}`, "utf8");
  });

  const drift: AdoptConfigDrift[] = Object.entries(driftByType).map(([type, set]) => {
    const unknown = [...set].sort();
    const existing = types[type]?.statuses ?? [];
    return { type, key: "status", unknown, suggested: [...existing, ...unknown] };
  });

  return { applied: opts.apply === true, planned, drift };
}
