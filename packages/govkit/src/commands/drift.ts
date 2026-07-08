import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { type GovkitConfig, loadConfig } from "../config";
import { frontMatterSpan } from "../frontmatter";
import { gitAvailable, gitIndexManifest, gitMatchCount, scanGoverned, toPathspec } from "../util";

// The deterministic spec↔code drift GATE (RFC-0015, as amended) — the blocking sibling of
// RFC-0009's `stale` advisory. The move that makes a gate honest where the proxy could not
// be: stop asking git WHEN things changed and check the code STATE the author actually
// vouched for. A doc opts in by carrying BOTH `governs:` (RFC-0009) and
// `reconciled: sha256:<hex>` — the recorded claim "this doc is true as of this content
// state". The claim is a content-derived hash over the governed files' index manifest (git's
// own blob OIDs), NEVER a commit sha: squash merges rewrite every branch commit sha without
// changing a byte of content, which orphaned every pre-merge ack (the CI escape that forced
// the amendment). Drift = the governed CONTENT no longer matches the claim; the only exits
// are the two honest ones (update the doc, or `--ack` that the change didn't invalidate it —
// the gate NEVER acks itself). Git-gated like `stale`, so it lives outside the no-key
// pure-fs floor and `check` never calls it; git absent degrades to a note + exit 0, never a
// crash (a gate you cannot run is reported, not failed — only an evaluated mismatch blocks).
//
// The `reconciled:` value is read from — and rewritten in — the RAW front-matter block text
// (span located by frontmatter.ts's one block grammar), never through parsed YAML — the
// byte-exact claim is what gets judged and what the ack surgery replaces.

/** A checkable `reconciled` claim: `sha256:` + 8–64 hex chars (prefix of the full digest —
 *  the short-sha convention carried over; `--ack` writes the canonical 16). */
const CLAIM_RE = /^sha256:([0-9a-f]{8,64})$/i;
/** The pre-amendment claim shape (a bare commit sha) — recognized only to name the exact
 *  migration in the violation, never checked: commit shas are what squash merges orphan. */
const LEGACY_SHA_RE = /^[0-9a-f]{7,40}$/i;

export interface DriftEntry {
  /** Doc path relative to --root, forward slashes (the same spelling `--ack` accepts). */
  path: string;
  type: string;
  governs: string[];
  /** The doc's recorded claim, verbatim from the raw block text — possibly garbage, which is
   *  its own violation. */
  reconciled: string;
  /** Canonical claim for the CURRENT governed content (`sha256:<16 hex>`); null when the
   *  governs paths match no tracked file. Also what `--ack` writes. */
  currentSha: string | null;
  /** Governs pathspecs matching NO tracked file (RFC-0018) — a broken declaration `--ack`
   *  can never vouch past; absent for claim-mismatch entries. */
  ghost?: string[];
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
interface DriftDoc {
  file: string;
  path: string;
  type: string;
  governs: string[];
  /** Key PRESENCE, not value: a `reconciled:` line with an empty value is a violation,
   *  absence is merely not-opted-in — the two must never be conflated (empty ≠ unclaimed). */
  hasReconciled: boolean;
  reconciled: string;
}

/** Where the `reconciled:` value token lives in the raw text: its [start, end) span and its
 *  text. null when the front-matter block has no `reconciled:` line at all. A same-line
 *  `  # comment` after the value is NOT part of the token, so an ack rewrite preserves it. */
interface ReconciledToken {
  start: number;
  end: number;
  /** Raw value text (one surrounding quote pair stripped for reading); "" when the line
   *  carries no same-line value (bare key, or a continuation-line scalar). */
  value: string;
}

function locateReconciled(content: string): ReconciledToken | null {
  const span = frontMatterSpan(content);
  if (span === null) return null;
  const block = content.slice(span.start, span.end);
  const line = /^reconciled:([ \t]*)([^\r\n]*)/m.exec(block);
  if (line === null) return null;
  const tail = line[2] ?? "";
  // YAML starts a same-line comment only at a `#` in value position or preceded by blank —
  // everything before it (right-trimmed) is the value token; the comment stays untouched.
  const commentAt = tail.search(/(?:^|[ \t])#/);
  const value = (commentAt >= 0 ? tail.slice(0, commentAt) : tail).trimEnd();
  const start = span.start + line.index + "reconciled:".length + (line[1] ?? "").length;
  // A quoted claim (`"sha256:abc…"`) is a legal YAML spelling of the same claim: strip ONE
  // matching quote pair for the read; a rewrite replaces the whole token (needs no quoting).
  const unquoted = /^(['"])(.*)\1$/.exec(value);
  return { start, end: start + value.length, value: unquoted ? (unquoted[2] ?? "") : value };
}

/** The drift view of every governed doc: the shared scan (util.scanGoverned) plus the raw
 *  `reconciled:` token read from the block text (see the module note on YAML coercion). */
function scanDrift(root: string, config: GovkitConfig): DriftDoc[] {
  return scanGoverned(root, config).map((d) => {
    const token = locateReconciled(d.content);
    return {
      file: d.file,
      path: d.rel,
      type: d.type,
      governs: d.governs,
      hasReconciled: token !== null,
      reconciled: token?.value ?? "",
    };
  });
}

/** The pathspecs a doc's drift is judged against: its governs, with the doc's OWN path always
 *  excluded — a doc can never drift ITSELF. Without the exclusion, a doc whose governs globs
 *  match its own path (e.g. `governs: docs/**`) re-drifts on every ack commit forever: the
 *  ack edit itself changes the doc's governed content past the claim it just recorded (once
 *  staged), so the ritual could never converge. */
function governedPathspecs(doc: DriftDoc): string[] {
  return [...doc.governs, `:(exclude)${doc.path}`];
}

/** The verdict for one opted-in doc: null = in sync, else the violation entry. A short claim
 *  matches when the full 64-hex digest starts with its hex (8–64 chars, the short-sha
 *  convention). `manifest` is the governed index manifest; null ⇒ nothing tracked matches. */
function judge(doc: DriftDoc, manifest: string | null): DriftEntry | null {
  const digest = manifest === null ? null : createHash("sha256").update(manifest).digest("hex");
  // Canonical claim token: `sha256:` + the digest's first 16 hex — what `--ack` writes.
  const currentSha = digest === null ? null : `sha256:${digest.slice(0, 16)}`;
  const base = {
    path: doc.path,
    type: doc.type,
    governs: doc.governs,
    reconciled: doc.reconciled,
    currentSha,
  };
  // An empty or malformed `reconciled` is a VIOLATION naming the doc, never a crash: the doc
  // claimed a content state it cannot be checked against, which is exactly a broken claim.
  // A pre-amendment commit-sha claim gets the exact migration named — squash merges rewrite
  // commit shas without changing content, so that claim shape is uncheckable by design.
  if (!CLAIM_RE.test(doc.reconciled)) {
    return {
      ...base,
      problem:
        doc.reconciled === ""
          ? "reconciled: is empty — record the content hash you vouch for (or drop the key to opt out)"
          : LEGACY_SHA_RE.test(doc.reconciled)
            ? `reconciled '${doc.reconciled.slice(0, 12)}' is a legacy commit-sha claim — squash merges rewrite commit shas and orphan the ack; re-vouch with \`govkit drift --ack\` (writes a content hash)`
            : `reconciled '${doc.reconciled}' is not a content-hash claim (expected sha256:<8–64 hex chars>)`,
    };
  }
  // The claim is well-formed but the governed paths match no tracked file (untracked, or a
  // glob matching nothing) — an unverifiable claim fails loud, never silently green.
  if (digest === null || currentSha === null) {
    return {
      ...base,
      problem: `governs paths match no tracked file — the reconciled claim cannot be checked (${doc.governs.join(", ")})`,
    };
  }
  const claimHex = doc.reconciled.slice("sha256:".length).toLowerCase();
  if (!digest.startsWith(claimHex)) {
    return {
      ...base,
      problem: `governed content moved: reconciled ${doc.reconciled.slice(0, 23)} but the current governed content is ${currentSha}`,
    };
  }
  return null;
}

export function runDrift(opts: DriftOptions): DriftResult {
  const config = opts.config ?? loadConfig(opts.root);
  const governed = scanDrift(opts.root, config);
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
      note: `git unavailable, ${opted.length} opted-in doc(s) skipped — drift needs the git index.`,
    };
  }
  const drifted: DriftEntry[] = [];
  for (const doc of governed) {
    // Governs-existence check (RFC-0018), EVERY governed doc — opted in or not: a `governs:`
    // pathspec matching no tracked file is a broken declaration on its own (a moved/renamed
    // file, a typo), and it silently shrinks what drift AND stale cover. Not fixable by ack —
    // the governs list itself needs the hand edit.
    const ghost = doc.governs.filter((g) => gitMatchCount(opts.root, [g]) === 0);
    if (ghost.length > 0) {
      drifted.push({
        path: doc.path,
        type: doc.type,
        governs: doc.governs,
        reconciled: doc.reconciled,
        currentSha: null,
        ghost,
        problem: `governs pathspec(s) match no tracked file: ${ghost.join(", ")} — fix or remove them (a ghost path silently shrinks drift/stale coverage)`,
      });
      continue;
    }
    if (!doc.hasReconciled) continue; // existence-checked only; the claim check is opt-in
    const entry = judge(doc, gitIndexManifest(opts.root, governedPathspecs(doc)));
    if (entry) drifted.push(entry);
  }
  return {
    gitAvailable: true,
    checked: opted.length,
    drifted,
    skipped,
    ok: drifted.length === 0,
    ...(governed.length === 0
      ? { note: "no governed doc declares a `governs:` key — nothing to check." }
      : {}),
  };
}

// ── the ack ritual ───────────────────────────────────────────────────────────

export interface DriftAckResult {
  gitAvailable: boolean;
  /** The drift computation the ack ran FIRST — acks only write where this found drift. */
  check: DriftResult;
  /** Docs whose `reconciled:` was rewritten, old claim → new claim. */
  acked: Array<{ path: string; from: string; to: string }>;
  /** Already in sync — deliberately reported so a no-op ack says so instead of staying mute. */
  upToDate: Array<{ path: string; reconciled: string }>;
  /** Drifted but with no current claim to write (governs matches no tracked file) — an ack
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

/** Surgical front-matter rewrite: replace ONLY the `reconciled:` VALUE token inside the
 *  leading front-matter block, preserving every other byte (CRLF line endings, BOM, spacing,
 *  a trailing same-line `# comment`, the whole body). Returns null when the block has no
 *  `reconciled:` line OR the line carries no same-line value token (e.g. the value lives on a
 *  continuation line — writing a sha onto the key line would corrupt it into a two-line
 *  scalar); the caller turns null into the rewrite-by-hand operational error, never a silent
 *  skip. */
export function rewriteReconciled(content: string, sha: string): string | null {
  const token = locateReconciled(content);
  if (token === null || token.value === "") return null;
  return content.slice(0, token.start) + sha + content.slice(token.end);
}

export function runDriftAck(opts: DriftAckOptions): DriftAckResult {
  const config = opts.config ?? loadConfig(opts.root);
  const check = runDrift({ root: opts.root, config });
  const empty = { acked: [], upToDate: [], unackable: [] };
  if (!check.gitAvailable) {
    // Nothing to write without git: an ack records the CURRENT content state, which does not exist.
    return {
      gitAvailable: false,
      check,
      ...empty,
      ok: true,
      note: "git unavailable — an ack records the current governed content hash, so there is nothing to write.",
    };
  }

  const governed = scanDrift(opts.root, config);
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
          `add one (any value) to opt the doc into the drift gate, then re-run --ack`,
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
      // The key line exists but carries no same-line value the surgery can safely replace
      // (bare key, or a continuation-line scalar) — fail loud rather than corrupt the doc
      // or silently leave it red.
      throw new Error(
        `govkit: --ack could not rewrite ${doc.path} — its 'reconciled:' line carries no ` +
          `same-line value token; rewrite it by hand`,
      );
    }
    writeFileSync(doc.file, rewritten, "utf8");
    result.acked.push({ path: doc.path, from: doc.reconciled, to: entry.currentSha });
  }
  if (opts.docPath === undefined) {
    // Ack-all promises "green afterwards, or told why not": a governs-only doc failing the
    // RFC-0018 ghost-path check is never a rewrite target (no claim to rewrite, and an ack
    // could not vouch past a broken governs list anyway) — surface it instead of exiting 0
    // while the very next `drift` run stays red.
    const targeted = new Set(targets.map((d) => d.path));
    for (const entry of check.drifted) {
      if (!targeted.has(entry.path)) {
        result.unackable.push({ path: entry.path, problem: entry.problem });
      }
    }
  }
  // An unackable doc stays a live violation after the ack, so the ack cannot report success.
  result.ok = result.unackable.length === 0;
  return result;
}
