import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { GovkitConfig } from "./config";
import { type FrontMatter, isParseError, parseFrontMatter } from "./frontmatter";

/** Root-confinement check shared by every path the engine is handed from outside (a hook's
 *  file_path, a config `journal.path`): true only when `file` resolves STRICTLY inside `dir`.
 *  The `rel === ""` self-reference (file IS the dir) is deliberately not-inside — a governed
 *  dir is a container, never its own member, and a confined write target must be a child. */
export function isInside(dir: string, file: string): boolean {
  const rel = relative(resolve(dir), resolve(file));
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/** Resolve a governed-doc type's directory (RFC-0007): the ONE place that prepends the
 *  configurable `docs.root` to a type's `dir`. Every reader (verify, eval, adopt, report) and
 *  the per-write `audit-write` hook MUST route through this so they cannot drift — a non-`.`
 *  root honored by some readers but not others is the exact "looks-governed-but-isn't" leak.
 *  `docsRoot` defaults to `"."`, so `typeDir(root, ".", "docs/rfc")` === `join(root, "docs/rfc")`
 *  bit-for-bit (join normalizes the `.` segment away). */
export function typeDir(root: string, docsRoot: string, dir: string): string {
  return join(root, docsRoot, dir);
}

/** Markdown docs in a directory, minus the ignore list. Non-recursive by design —
 *  governed docs live flat in their type dir. Shared by `verify` and `eval`. */
export function listMarkdown(dir: string, ignore: string[]): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md") && !ignore.includes(entry.name)) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

/** Front-matter values are `unknown` (YAML may yield numbers/dates); normalize to a
 *  trimmed string for presence + comparison checks. */
export function str(value: unknown): string {
  return value != null ? String(value).trim() : "";
}

/** Strip non-prose (fenced code, HTML comments) before any content match. Shared by `eval`
 *  (so rubric regex/minWords measure prose, not a pasted table, and can't be gamed by signal
 *  words hidden in a fence) and by `adopt` (so a front-matter EXAMPLE shown in a code fence is
 *  not lifted as the doc's real metadata — the same "never assert a wrong value" floor).
 *  Front-matter itself is already removed upstream by parseFrontMatter. */
export function stripNonProse(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

/** Heading lines (`#`..`######`) of already-prose-stripped text. Shared by `eval` (section
 *  rubric) and `verify` (RFC-0010 required sections) so both judge a "section" the same way —
 *  a real markdown heading, not a `## In-fence` line. Run `stripNonProse` first. */
export function headingLines(prose: string): string[] {
  return prose.split(/\r?\n/).filter((line) => /^#{1,6}\s+\S/.test(line));
}

/** Compile + test a user-supplied pattern; a malformed pattern is treated as "no match" (the
 *  rule simply fails) rather than crashing. Multiline + case-insensitive so `^`/`$` anchor to
 *  line starts. Shared by `eval` and `verify` so a "does this text match" judgement is identical
 *  across the two trust layers. */
export function matches(pattern: string, text: string): boolean {
  try {
    return new RegExp(pattern, "im").test(text);
  } catch {
    // safe to ignore: a bad pattern fails its check (surfaced to the caller), never a crash.
    return false;
  }
}

/** A `governs` front-matter value may be a single glob or a list; normalize to a trimmed,
 *  non-empty string[]. Anything else (a number, an object) yields []. Shared by `stale`
 *  (RFC-0009) and `drift` (RFC-0015) so the two governs-readers can never disagree on what
 *  a doc actually declared. */
export function normalizeGoverns(value: unknown): string[] {
  if (typeof value === "string") {
    const s = value.trim();
    return s === "" ? [] : [s];
  }
  if (Array.isArray(value)) {
    return value.map((v) => str(v)).filter((v) => v !== "");
  }
  return [];
}

/** Git pathspecs are relative to the repo root and want forward slashes on every platform.
 *  Shared by `stale` and `drift` — the same doc must produce the same pathspec in both. */
export function toPathspec(root: string, file: string): string {
  return relative(root, file).split(/[/\\]/).join("/");
}

/** One governed doc as the git-backed readers see it: parseable front-matter declaring a
 *  non-empty `governs:`. */
export interface GovernedDoc {
  /** Absolute file path. */
  file: string;
  /** Root-relative forward-slash pathspec — the spelling git and `drift --ack` use. */
  rel: string;
  type: string;
  governs: string[];
  fm: FrontMatter;
  /** Raw file text — `drift` reads/rewrites the `reconciled:` token in the raw block text,
   *  never through parsed YAML (which would number-coerce an unquoted all-digit sha). */
  content: string;
}

/** The one walk over every configured type dir yielding each doc whose front-matter PARSES.
 *  Unparseable front-matter is the verify gate's job to surface, not the git-backed
 *  siblings' — skipped here exactly as `stale` always skipped it. */
function scanParsedDocs(root: string, config: GovkitConfig): Omit<GovernedDoc, "governs">[] {
  const { ignore, types, root: docsRoot = "." } = config.docs;
  const docs: Omit<GovernedDoc, "governs">[] = [];
  for (const [typeName, def] of Object.entries(types)) {
    for (const file of listMarkdown(typeDir(root, docsRoot, def.dir), ignore)) {
      const content = readFileSync(file, "utf8");
      const fm = parseFrontMatter(content);
      if (!fm || isParseError(fm)) continue;
      docs.push({ file, rel: toPathspec(root, file), type: typeName, fm, content });
    }
  }
  return docs;
}

/** The governed-doc scan shared by `stale` (RFC-0009) and `drift` (RFC-0015): every parseable
 *  doc declaring a non-empty `governs:`. ONE scanner so the two governs-readers can never
 *  disagree on which docs are governed; per-caller filtering (e.g. drift's `reconciled:`
 *  presence) stays at the call site. */
export function scanGoverned(root: string, config: GovkitConfig): GovernedDoc[] {
  return scanParsedDocs(root, config)
    .map((d) => ({ ...d, governs: normalizeGoverns(d.fm.data.governs) }))
    .filter((d) => d.governs.length > 0);
}

/** Every governed doc id across the configured type dirs — the id universe that BOTH
 *  verify's reference check (RFC-0003) and the ledger's spec resolution (RFC-0016) resolve
 *  into. One collector so the two can never disagree on which ids exist. */
export function collectGovernedIds(root: string, config: GovkitConfig): Set<string> {
  const ids = new Set<string>();
  for (const doc of scanParsedDocs(root, config)) {
    const id = str(doc.fm.data.id);
    if (id) ids.add(id);
  }
  return ids;
}

/** True when `root` is inside a git work tree. Staleness (RFC-0009) needs git history; when this
 *  is false the `stale` command degrades to an advisory note rather than erroring — git absence is
 *  not a failure for an advisory, opt-in tool (it never runs in the no-key floor). */
export function gitAvailable(root: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Last-commit time (epoch seconds) of the most recently committed path among `pathspecs`, or
 *  null when none of them has any commit (untracked, or a glob matching no tracked file).
 *  COMMIT time, NEVER filesystem mtime — mtime is the checkout instant on a fresh clone, pure
 *  noise in the CI environment the staleness check exists for (RFC-0009). `git log -1 --format=%ct`
 *  over multiple pathspecs returns the single newest commit touching any of them. */
export function gitCommitTime(root: string, pathspecs: string[]): number | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", ...pathspecs], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out === "") return null;
    const t = Number.parseInt(out, 10);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

/** Index manifest of the tracked files matching `pathspecs` — one `<mode> <blobOid> <stage>\t<path>`
 *  record per file (git ls-files -s), NUL-separated for byte-exact paths, or null when nothing
 *  matches. The drift gate's (RFC-0015, as amended) ground truth: blob OIDs are git's OWN
 *  content hashes, so the manifest names the exact CONTENT state a doc's `reconciled:` claim
 *  is checked against — stable across squash/rebase (which rewrite commit shas but never blob
 *  OIDs) and across CRLF working trees (the index blob is what's committed on every platform).
 *  Same single-spawn try/catch degrade as `gitCommitTime` (null, never a throw). */
export function gitIndexManifest(root: string, pathspecs: string[]): string | null {
  try {
    const out = execFileSync("git", ["ls-files", "-s", "-z", "--", ...pathspecs], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const records = out.split("\0").filter((r) => r !== "");
    return records.length === 0 ? null : records.join("\n");
  } catch {
    // safe to degrade: no git / no index — the caller surfaces the skip, never a crash.
    return null;
  }
}

/** Content of `relPath` (forward-slash, repo-root-relative) as of HEAD, or null when it cannot
 *  be read (no git, no commits, or the path absent from HEAD). Feeds the ledger's append-only
 *  diff (RFC-0016): null means "no committed baseline yet", which the caller reports as a
 *  skipped layer — degrade-and-say-so, never an error, never silently green. */
export function gitShowHead(root: string, relPath: string): string | null {
  try {
    // `HEAD:<path>` resolves from the repo TOP LEVEL, not the cwd — with a --root that is a
    // subdirectory of the repo the bare form always misses and the caller silently degrades.
    // `HEAD:./<path>` is git's documented cwd-relative spelling, matching how every other
    // pathspec here is resolved (cwd = root).
    return execFileSync("git", ["show", `HEAD:./${relPath}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // safe to degrade: a missing HEAD version is a legal state (new file / fresh repo).
    return null;
  }
}

/** Count of TRACKED files matching `pathspecs` (git glob semantics). Lets `stale` tell a dangling
 *  `governs:` glob (matches nothing → its own advisory line, never silently "fresh") from a glob
 *  that genuinely resolves (RFC-0009). */
export function gitMatchCount(root: string, pathspecs: string[]): number {
  try {
    const out = execFileSync("git", ["ls-files", "--", ...pathspecs], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out === "" ? 0 : out.split(/\r?\n/).length;
  } catch {
    return 0;
  }
}

/** Current HEAD commit sha, or undefined when git (or any commit) is absent. Feeds the
 *  `--journal` sensor's `gitSha` field — a sensor annotation, so absence is NOT an error:
 *  the field is simply omitted (same degrade-not-fail posture as `stale`). One direct spawn
 *  (the `gitCommitTime` pattern), NOT the `git()` wrapper — its thrown "govkit --changed:"
 *  errors are the wrong contract for a field whose absence is legal. */
export function gitHeadSha(root: string): string | undefined {
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return sha === "" ? undefined : sha;
  } catch {
    // safe to omit: no git, or a repo with no commits has no HEAD — the journal drops the field.
    return undefined;
  }
}

function git(root: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`govkit --changed: git command failed (${args.join(" ")}): ${detail}`);
  }
}

/** Resolve the base ref for `--changed`. An explicit ref must resolve (else a clear
 *  error — never a silent full-scan fallback, which would re-introduce the avalanche
 *  the flag exists to prevent). With no explicit ref: prefer `origin/main`, else fall
 *  back to `HEAD` — but report that fallback (`implicitFallback`) so the caller can warn:
 *  on a shallow CI clone where `origin/main` was never fetched, an unwarned `HEAD` fallback
 *  scopes to nothing and the gate passes green having checked nothing — failing open, worse
 *  than the avalanche. The caller surfaces it; passing `--base` explicitly silences it. */
export function resolveChangedBase(
  root: string,
  requested?: string,
): { ref: string; implicitFallback: boolean } {
  const resolves = (ref: string): boolean => {
    try {
      execFileSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
        cwd: root,
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  };
  if (requested && requested.length > 0) {
    if (!resolves(requested)) {
      throw new Error(`govkit --changed: base ref '${requested}' does not resolve to a commit`);
    }
    return { ref: requested, implicitFallback: false };
  }
  return resolves("origin/main")
    ? { ref: "origin/main", implicitFallback: false }
    : { ref: "HEAD", implicitFallback: true };
}

/** The set of governed-doc candidate paths (absolute) that are new-or-modified relative
 *  to `ref`: tracked changes between `ref` and the working tree (`git diff`), plus new
 *  untracked files (`git ls-files --others`). Only `.md` paths are returned; callers
 *  intersect this with the actually-governed docs. Used solely by `verify --changed` —
 *  the default gate never invokes git, preserving the no-key/no-git core invariant. */
export function gitChangedDocs(root: string, ref: string): Set<string> {
  const lines = [
    ...git(root, ["diff", "--name-only", ref, "--"]).split(/\r?\n/),
    ...git(root, ["ls-files", "--others", "--exclude-standard", "--"]).split(/\r?\n/),
  ];
  const out = new Set<string>();
  for (const line of lines) {
    const rel = line.trim();
    if (rel.endsWith(".md")) out.add(resolve(root, rel));
  }
  return out;
}
