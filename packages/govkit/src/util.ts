import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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
