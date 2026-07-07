import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { type GovkitConfig, loadConfig } from "../config";
import { isParseError, parseFrontMatter } from "../frontmatter";
import {
  gitAvailable,
  gitLastShaFor,
  listMarkdown,
  normalizeGoverns,
  str,
  toPathspec,
  typeDir,
} from "../util";

// The deterministic spec↔code drift GATE (RFC-0015) — the blocking sibling of RFC-0009's
// `stale` advisory. The move that makes a gate honest where the proxy could not be: stop
// asking git WHEN things changed and check the code STATE the author actually vouched for.
// A doc opts in by carrying BOTH `governs:` (RFC-0009) and `reconciled: <sha>` — the recorded
// claim "this doc is true as of this commit". Drift = the newest commit touching any governs
// path no longer matches that claim; the only exits are the two honest ones (update the doc,
// or `--ack` that the change didn't invalidate it — the gate NEVER acks itself). Git-gated
// like `stale`, so it lives outside the no-key pure-fs floor and `check` never calls it; git
// absent degrades to a note + exit 0, never a crash (a gate you cannot run is reported, not
// failed — only an evaluated mismatch blocks).

/** A recorded `reconciled` value must look like a (possibly short) git sha to be checkable. */
const SHA_RE = /^[0-9a-f]{7,40}$/i;

export interface DriftEntry {
  /** Doc path relative to --root, forward slashes (the same spelling `--ack` accepts). */
  path: string;
  type: string;
  governs: string[];
  /** The doc's recorded claim, verbatim — possibly garbage, which is its own violation. */
  reconciled: string;
  /** Newest commit sha touching any governs path; null when none has commit history. */
  currentSha: string | null;
  /** Human-readable reason this entry is a violation. */
  problem: string;
}

export interface DriftResult {
  /** False ⇒ the whole command degraded to a note (git absent). Exit 0, never a crash. */
  gitAvailable: boolean;
  /** Docs that opted in (both `governs:` and a `reconciled:` key). */
  checked: number;
  drifted: DriftEntry[];
  /** Docs with `governs:` but no `reconciled:` key — covered by `stale`, not by this gate. */
  skipped: number;
  ok: boolean;
  /** Set when there is nothing to evaluate (no git, or no doc opted in). */
  note?: string;
}

export interface DriftOptions {
  root: string;
  config?: GovkitConfig;
}

/** One governed doc as the drift scanner sees it — the shared substrate of check and ack. */
interface GovernedDoc {
  file: string;
  path: string;
  type: string;
  governs: string[];
  /** Key PRESENCE, not value: `reconciled:` with an empty value is a violation, absence is
   *  merely not-opted-in — the two must never be conflated (empty ≠ unclaimed). */
  hasReconciled: boolean;
  reconciled: string;
}

/** Pure-fs scan of every governed doc that declares `governs:`. Unparseable front-matter is
 *  the verify gate's job, not drift's — skipped here exactly as `stale` skips it. */
function scanGoverned(root: string, config: GovkitConfig): GovernedDoc[] {
  const { ignore, types, root: docsRoot = "." } = config.docs;
  const docs: GovernedDoc[] = [];
  for (const [typeName, def] of Object.entries(types)) {
    for (const file of listMarkdown(typeDir(root, docsRoot, def.dir), ignore)) {
      const fm = parseFrontMatter(readFileSync(file, "utf8"));
      if (!fm || isParseError(fm)) continue; // unparseable front-matter is the gate's job
      const governs = normalizeGoverns(fm.data.governs);
      if (governs.length === 0) continue; // opt-in at the doc level, same as stale
      docs.push({
        file,
        path: toPathspec(root, file),
        type: typeName,
        governs,
        hasReconciled: "reconciled" in fm.data,
        reconciled: str(fm.data.reconciled),
      });
    }
  }
  return docs;
}

/** The verdict for one opted-in doc: null = in sync, else the violation entry. A recorded
 *  short sha matches when the full current sha starts with it (7–40 hex chars). */
function judge(doc: GovernedDoc, currentSha: string | null): DriftEntry | null {
  const base = {
    path: doc.path,
    type: doc.type,
    governs: doc.governs,
    reconciled: doc.reconciled,
    currentSha,
  };
  // An empty or non-sha `reconciled` is a VIOLATION naming the doc, never a crash: the doc
  // claimed a code state it cannot be checked against, which is exactly a broken claim.
  if (!SHA_RE.test(doc.reconciled)) {
    return {
      ...base,
      problem:
        doc.reconciled === ""
          ? "reconciled: is empty — record the sha you vouch for (or drop the key to opt out)"
          : `reconciled '${doc.reconciled}' is not a git sha (expected 7–40 hex chars)`,
    };
  }
  // The claim is well-formed but the governed paths have no commit history (untracked, or a
  // glob matching nothing) — an unverifiable claim fails loud, never silently green.
  if (currentSha === null) {
    return {
      ...base,
      problem: `governs paths have no commit history — the reconciled claim cannot be checked (${doc.governs.join(", ")})`,
    };
  }
  if (!currentSha.toLowerCase().startsWith(doc.reconciled.toLowerCase())) {
    return {
      ...base,
      problem: `governed code moved: reconciled ${doc.reconciled.slice(0, 12)} but the newest governed commit is ${currentSha.slice(0, 12)}`,
    };
  }
  return null;
}

export function runDrift(opts: DriftOptions): DriftResult {
  const config = opts.config ?? loadConfig(opts.root);
  const governed = scanGoverned(opts.root, config);
  const opted = governed.filter((d) => d.hasReconciled);
  const skipped = governed.length - opted.length;
  if (!gitAvailable(opts.root)) {
    // Same degrade posture as stale: git absence is not a failure for a git-gated sibling —
    // report exactly what could not be checked and exit 0 (the caller keeps ok = true).
    return {
      gitAvailable: false,
      checked: 0,
      drifted: [],
      skipped,
      ok: true,
      note: `git unavailable, ${opted.length} opted-in doc(s) skipped — drift needs commit history.`,
    };
  }
  const drifted: DriftEntry[] = [];
  for (const doc of opted) {
    const entry = judge(doc, gitLastShaFor(opts.root, doc.governs));
    if (entry) drifted.push(entry);
  }
  return {
    gitAvailable: true,
    checked: opted.length,
    drifted,
    skipped,
    ok: drifted.length === 0,
    ...(opted.length === 0
      ? { note: "no governed doc declares both `governs:` and `reconciled:` — nothing opted in." }
      : {}),
  };
}

// ── the ack ritual ───────────────────────────────────────────────────────────

export interface DriftAckResult {
  gitAvailable: boolean;
  /** The drift computation the ack ran FIRST — acks only write where this found drift. */
  check: DriftResult;
  /** Docs whose `reconciled:` was rewritten, old claim → new sha. */
  acked: Array<{ path: string; from: string; to: string }>;
  /** Already in sync — deliberately reported so a no-op ack says so instead of staying mute. */
  upToDate: Array<{ path: string; reconciled: string }>;
  /** Drifted but with no current sha to write (governs has no commit history) — an ack
   *  cannot vouch for a state that does not exist, so these stay red. */
  unackable: Array<{ path: string; problem: string }>;
  ok: boolean;
  note?: string;
}

export interface DriftAckOptions {
  root: string;
  config?: GovkitConfig;
  /** Ack ONE doc (path relative to root, or absolute). Absent ⇒ all opted-in docs. */
  docPath?: string;
}

/** Surgical front-matter rewrite: replace ONLY the `reconciled:` line's value inside the
 *  leading front-matter block, preserving every other byte (CRLF line endings, BOM, spacing,
 *  the whole body). Returns null when no such line exists in the block — the caller turns
 *  that into an operational error, never a silent skip. */
export function rewriteReconciled(content: string, sha: string): string | null {
  // Preserve a UTF-8 BOM by slicing around it rather than stripping it.
  const bom = content.charCodeAt(0) === 0xfeff ? 1 : 0;
  const block = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(content.slice(bom));
  if (!block) return null;
  const lineRe = /^(reconciled:)([ \t]*)[^\r\n]*/m;
  if (!lineRe.test(block[0])) return null;
  const next = block[0].replace(
    lineRe,
    // Keep the author's own spacing after the colon; a bare `reconciled:` gains the one
    // space YAML needs for a scalar value.
    (_, key: string, ws: string) => `${key}${ws === "" ? " " : ws}${sha}`,
  );
  return content.slice(0, bom) + next + content.slice(bom + block[0].length);
}

export function runDriftAck(opts: DriftAckOptions): DriftAckResult {
  const config = opts.config ?? loadConfig(opts.root);
  const check = runDrift({ root: opts.root, config });
  const empty = { acked: [], upToDate: [], unackable: [] };
  if (!check.gitAvailable) {
    // Nothing to write without git: an ack records the CURRENT sha, which does not exist.
    return {
      gitAvailable: false,
      check,
      ...empty,
      ok: true,
      note: "git unavailable — an ack records the current governed sha, so there is nothing to write.",
    };
  }

  const governed = scanGoverned(opts.root, config);
  let targets = governed.filter((d) => d.hasReconciled);
  if (opts.docPath !== undefined) {
    // A NAMED doc gets operational errors, not skips: the user pointed at this exact file,
    // so "it cannot be acked" must say why and fail, never quietly ack nothing.
    const wanted = toPathspec(opts.root, resolve(opts.root, opts.docPath));
    const doc = governed.find((d) => d.path === wanted);
    if (!doc) {
      throw new Error(
        `govkit: --ack '${opts.docPath}' is not a governed doc declaring 'governs:' ` +
          `(looked for ${wanted} under the configured type dirs)`,
      );
    }
    if (!doc.hasReconciled) {
      throw new Error(
        `govkit: --ack '${opts.docPath}' has no 'reconciled:' front-matter key — ` +
          `add one (any sha) to opt the doc into the drift gate, then re-run --ack`,
      );
    }
    targets = [doc];
  }

  const driftedByPath = new Map(check.drifted.map((e) => [e.path, e]));
  const result: DriftAckResult = { gitAvailable: true, check, ...empty, ok: true };
  for (const doc of targets) {
    const entry = driftedByPath.get(doc.path);
    if (!entry) {
      result.upToDate.push({ path: doc.path, reconciled: doc.reconciled });
      continue;
    }
    if (entry.currentSha === null) {
      result.unackable.push({ path: doc.path, problem: entry.problem });
      continue;
    }
    const rewritten = rewriteReconciled(readFileSync(doc.file, "utf8"), entry.currentSha);
    if (rewritten === null) {
      // The parsed front-matter said the key exists but the line surgery cannot find it
      // (e.g. an exotic YAML spelling) — fail loud rather than silently leave the doc red.
      throw new Error(
        `govkit: --ack could not locate the 'reconciled:' line in ${doc.path} — rewrite it by hand`,
      );
    }
    writeFileSync(doc.file, rewritten, "utf8");
    result.acked.push({ path: doc.path, from: doc.reconciled, to: entry.currentSha });
  }
  // An unackable doc stays a live violation after the ack, so the ack cannot report success.
  result.ok = result.unackable.length === 0;
  return result;
}
