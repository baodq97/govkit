import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { type GovkitConfig, loadConfig } from "../config";
import { collectGovernedIds, gitShowHead, isInside, str, toPathspec } from "../util";

// The machine-checkable feature ledger (RFC-0016): a committed JSON list of done-ness claims
// — { id, title, spec, passes, check? } — gated so the EVIDENCE cannot vanish even though the
// claims may move honestly. Four layers, in order: (1) parse + schema fail loud naming the
// offender; (2) unique ids; (3) every `spec` resolves to a governed doc id (RFC-0003 extended
// to the ledger); (4) append-only vs `git show HEAD:` — a removed entry, or a removed `check`
// on a surviving entry, is a violation, while `passes` flips both ways and new entries stay
// legal. Layer 4 is git-backed, so like `stale`/`drift` this command lives outside the no-key
// pure-fs floor and `check` never calls it; a missing HEAD baseline (new file, fresh repo, no
// git) degrades to a surfaced skip note while layers 1–3 still run. The `N/M passing` summary
// is advisory only — a ledger full of honest `false` is a passing gate.

export interface LedgerEntry {
  id: string;
  title: string;
  /** A governed doc id (US/RFC) this claim is specified by — MUST resolve into the chain. */
  spec: string;
  passes: boolean;
  /** Optional provenance: the human-readable command that earned `passes`. */
  check?: string;
}

export type LedgerViolationKind =
  | "schema"
  | "duplicate"
  | "spec"
  | "entry-removed"
  | "check-removed"
  | "path-moved";

export interface LedgerViolation {
  /** The offending entry's id when it has one — a schema violation may not. */
  id?: string;
  kind: LedgerViolationKind;
  message: string;
}

export interface LedgerResult {
  ok: boolean;
  /** Total entries in the current ledger (valid or not — the file's own count). */
  entries: number;
  /** Advisory only: entries with `passes: true`. Never affects the exit code. */
  passing: number;
  violations: LedgerViolation[];
  /** Set when the git-backed append-only layer could not run — surfaced, never silent. */
  headNote?: string;
}

export interface LedgerOptions {
  root: string;
  config?: GovkitConfig;
}

const DEFAULT_LEDGER_PATH = "docs/ledger.json";

/** Resolve the ledger location (config `ledger.path`, default `docs/ledger.json`) and CONFINE
 *  it under `root` — the exact escape guard `resolveJournalPath` applies: a `../../x` path
 *  must error loudly, never read (or later gate) a file outside the repo. */
function resolveLedgerPath(root: string, config: GovkitConfig): string {
  const rel = config.ledger?.path ?? DEFAULT_LEDGER_PATH;
  if (typeof rel !== "string" || rel.trim() === "") {
    throw new Error("govkit: ledger.path must be a non-empty string path within --root");
  }
  const target = resolve(root, rel);
  if (!isInside(root, target)) {
    throw new Error(
      `govkit: ledger.path '${rel}' resolves outside the repo root — it must stay within --root`,
    );
  }
  return target;
}

/** Parse a ledger document into entries, throwing the loud operational error on malformed
 *  JSON or a broken top-level shape — a gate whose input cannot be read fails closed, naming
 *  the offender (`where` distinguishes the working copy from the HEAD baseline). */
function parseLedger(text: string, where: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`govkit: ${where} is not valid JSON: ${detail}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`govkit: ${where} must be a JSON object of shape { "entries": [...] }`);
  }
  const entries = (parsed as Record<string, unknown>).entries;
  if (!Array.isArray(entries)) {
    throw new Error(`govkit: ${where} is missing its "entries" array`);
  }
  return entries;
}

/** Per-entry schema problems (empty = valid). Kept per-field so the violation names exactly
 *  what is wrong instead of a generic "bad entry". */
function entryProblems(raw: unknown): string[] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return ["must be an object { id, title, spec, passes, check? }"];
  }
  const e = raw as Record<string, unknown>;
  const problems: string[] = [];
  for (const key of ["id", "title", "spec"] as const) {
    if (typeof e[key] !== "string" || e[key].trim() === "") {
      problems.push(`'${key}' must be a non-empty string`);
    }
  }
  if (typeof e.passes !== "boolean") problems.push("'passes' must be a boolean");
  if (e.check !== undefined && (typeof e.check !== "string" || e.check.trim() === "")) {
    problems.push("'check' must be a non-empty string when present");
  }
  return problems;
}

/** The ledger path HEAD's committed govkit.yml declares (explicit `ledger.path`, else the
 *  default), normalized to a root-relative pathspec — or null when it cannot be established
 *  (no committed config, unparseable committed YAML, or a path escaping the root). Tolerant
 *  on purpose: this feeds the path-continuity GUARD below; a baseline that cannot be
 *  determined degrades to the surfaced skip note, it never invents a violation. */
function committedLedgerRel(root: string): string | null {
  const text = gitShowHead(root, "govkit.yml");
  if (text === null) return null;
  let declared: unknown;
  try {
    declared = (parseYaml(text) as { ledger?: { path?: unknown } } | null)?.ledger?.path;
  } catch {
    // safe to degrade: an unparseable COMMITTED config pins no path — continuity is unknowable.
    return null;
  }
  const rel =
    typeof declared === "string" && declared.trim() !== "" ? declared : DEFAULT_LEDGER_PATH;
  const target = resolve(root, rel);
  return isInside(root, target) ? toPathspec(root, target) : null;
}

export function runLedger(opts: LedgerOptions): LedgerResult {
  const config = opts.config ?? loadConfig(opts.root);
  const path = resolveLedgerPath(opts.root, config);
  const rel = toPathspec(opts.root, path);
  // An opt-in command pointed at an absent file is an operational error, not silence: the
  // user (or CI) asked to gate a ledger that does not exist — name the expected path.
  if (!existsSync(path)) {
    throw new Error(
      `govkit: no ledger at ${path} — create it as { "entries": [] } (or set ledger.path in govkit.yml)`,
    );
  }

  const raw = parseLedger(readFileSync(path, "utf8"), `ledger ${rel}`);
  const violations: LedgerViolation[] = [];
  const valid: LedgerEntry[] = [];
  raw.forEach((entry, i) => {
    const problems = entryProblems(entry);
    if (problems.length > 0) {
      const id = str((entry as Record<string, unknown>)?.id);
      violations.push({
        ...(id ? { id } : {}),
        kind: "schema",
        message: `entry #${i + 1}${id ? ` ('${id}')` : ""}: ${problems.join("; ")}`,
      });
      return;
    }
    valid.push(entry as unknown as LedgerEntry);
  });

  // Layer 2: unique ids — a duplicated claim id makes both the spec link and the append-only
  // diff ambiguous, so it is flagged once per colliding id (the checkDuplicateIds discipline).
  const seen = new Map<string, number>();
  for (const e of valid) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
  for (const [id, count] of seen) {
    if (count > 1) {
      violations.push({ id, kind: "duplicate", message: `duplicate entry id '${id}' (×${count})` });
    }
  }

  // Layer 3: chain referential-integrity (RFC-0003 extended to the ledger) — every claim must
  // point at a real governed doc, else the ledger asserts done-ness of nothing. The id
  // universe is the SHARED collector verify's reference check resolves against, so the two
  // can never disagree on what ids exist.
  const ids = collectGovernedIds(opts.root, config);
  for (const e of valid) {
    if (!ids.has(e.spec)) {
      violations.push({
        id: e.id,
        kind: "spec",
        message: `'${e.id}' spec '${e.spec}' does not resolve to any governed doc id`,
      });
    }
  }

  // Layer 4: append-only vs the last COMMITTED ledger — the anti-gaming core. Evidence may
  // not vanish: an id present in HEAD must survive, and a `check` recorded in HEAD may not be
  // dropped from a surviving entry. `passes` flips both ways stay legal (false→true is done,
  // true→false is an honest regression), as do new entries and title/check edits.
  let headNote: string | undefined;
  const headText = gitShowHead(opts.root, rel);
  if (headText === null) {
    // Path-continuity guard: a missing HEAD baseline is legal for a FIRST-ever ledger, but it
    // is also exactly what a rename bypass produces — point `ledger.path` at a fresh file and
    // the append-only layer would never see the committed evidence again. So before degrading,
    // ask HEAD's own govkit.yml which ledger path IT declared (explicit or defaulted): when
    // that committed path has a baseline and differs from the current path, evidence was
    // abandoned, not bootstrapped — a violation, never a skip note.
    const committedRel = committedLedgerRel(opts.root);
    if (
      committedRel !== null &&
      committedRel !== rel &&
      gitShowHead(opts.root, committedRel) !== null
    ) {
      violations.push({
        kind: "path-moved",
        message:
          `ledger path changed from ${committedRel} to ${rel} — append-only continuity ` +
          `broken; migrate by keeping the committed path in the same change`,
      });
    } else {
      headNote = `no committed baseline for ${rel} (new file, or git unavailable) — append-only checks skipped this run.`;
    }
  } else {
    let headEntries: unknown[];
    try {
      headEntries = parseLedger(headText, `committed ledger HEAD:${rel}`);
    } catch {
      // A malformed COMMITTED baseline cannot be diffed against; the honest verdict is the
      // same surfaced skip as a missing baseline — the pure layers above still gate the file.
      headEntries = [];
      headNote = `committed baseline HEAD:${rel} is unparseable — append-only checks skipped this run.`;
    }
    const now = new Map(valid.map((e) => [e.id, e]));
    for (const rawHead of headEntries) {
      if (entryProblems(rawHead).length > 0) continue; // a malformed HEAD entry pins nothing
      const head = rawHead as unknown as LedgerEntry;
      const current = now.get(head.id);
      if (!current) {
        violations.push({
          id: head.id,
          kind: "entry-removed",
          message: `entry '${head.id}' exists in HEAD but was removed — ledger entries are append-only`,
        });
        continue;
      }
      if (head.check !== undefined && current.check === undefined) {
        violations.push({
          id: head.id,
          kind: "check-removed",
          message: `entry '${head.id}' had check '${head.check}' in HEAD but it was removed — provenance may not vanish`,
        });
      }
    }
  }

  return {
    ok: violations.length === 0,
    entries: raw.length,
    passing: valid.filter((e) => e.passes).length,
    violations,
    ...(headNote ? { headNote } : {}),
  };
}
