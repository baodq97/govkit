import { type GovkitConfig, loadConfig } from "../config";
import { gitAvailable, gitCommitTime, gitMatchCount, scanGoverned } from "../util";

// The outcome for one doc that declares `governs`. `stale`/`fresh` are the recency verdict;
// `dangling` (the glob matched no tracked file) and `uncommitted` (the doc itself has no commit
// yet) are the skip-cases surfaced honestly rather than silently read as "fresh" (RFC-0009).
export type StaleStatus = "stale" | "fresh" | "dangling" | "uncommitted";

export interface StaleEntry {
  file: string;
  type: string;
  governs: string[];
  status: StaleStatus;
  /** Doc's last-commit time (epoch seconds), when known. */
  docTime?: number;
  /** Newest commit time across the governed paths (epoch seconds), when known. */
  codeTime?: number;
}

export interface StaleResult {
  /** False ⇒ the whole command degraded to a note (git absent). Advisory: never an error. */
  gitAvailable: boolean;
  /** Number of governed docs that declare a non-empty `governs:`. */
  checked: number;
  entries: StaleEntry[];
  /** Set when there is nothing to say (no git, or no doc declares governs). */
  note?: string;
}

export interface StaleOptions {
  root: string;
  config?: GovkitConfig;
}

// The staleness advisory (RFC-0009): the ADVISORY sibling of RFC-0008's gate-class coherence
// check. For every governed doc that declares `governs: [glob]`, compare the doc's last-commit
// time against the newest commit time of the code it governs; code-newer ⇒ "the governed code
// moved since this doc was last touched — reconcile or supersede." It is a PROXY, never a truth:
// "code moved" is not "doc wrong" (a rename or lint autofix trips it), which is exactly why it is
// advisory and `runStale` NEVER affects an exit code, and why `check` never calls it. It is also
// the only git-touching read besides `--changed`, so it lives OUTSIDE the no-key pure-fs floor by
// construction (the invariant the README pins). git absent / doc uncommitted / glob-matches-nothing
// all degrade to a surfaced skip, never an error.
export function runStale(opts: StaleOptions): StaleResult {
  const config = opts.config ?? loadConfig(opts.root);
  if (!gitAvailable(opts.root)) {
    return {
      gitAvailable: false,
      checked: 0,
      entries: [],
      note: "git is not available here — staleness needs commit history, so there is nothing to check.",
    };
  }

  const entries: StaleEntry[] = [];
  // The governed-doc scan is shared with `drift` (util.scanGoverned) — unparseable
  // front-matter is the gate's job (skipped), `governs:` is the per-doc opt-in.
  for (const doc of scanGoverned(opts.root, config)) {
    const { file, type, governs } = doc;
    const docTime = gitCommitTime(opts.root, [doc.rel]);
    if (docTime === null) {
      // The doc itself has no commit (new/untracked) — nothing to compare against. Surface it
      // as a skip rather than guessing.
      entries.push({ file, type, governs, status: "uncommitted" });
      continue;
    }
    const codeTime = gitCommitTime(opts.root, governs);
    // "Can't evaluate the governed code" → surface as dangling, NEVER silently "fresh"
    // (RFC-0009 §3). Two ways to land here: the glob matches no tracked file (a typo, or code
    // moved/renamed), OR it matches staged-but-never-committed files so there is no commit time.
    // Both mean the governs link cannot be evaluated for recency — the honest verdict is the
    // same skip, not a green "fresh". (Reported by the dogfooded swe-flow reviewer.)
    if (gitMatchCount(opts.root, governs) === 0 || codeTime === null) {
      entries.push({ file, type, governs, status: "dangling", docTime });
      continue;
    }
    entries.push({
      file,
      type,
      governs,
      status: codeTime > docTime ? "stale" : "fresh",
      docTime,
      codeTime,
    });
  }

  const checked = entries.length;
  return {
    gitAvailable: true,
    checked,
    entries,
    ...(checked === 0
      ? { note: "no governed doc declares a `governs:` glob — nothing to check for staleness." }
      : {}),
  };
}
