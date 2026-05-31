import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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
