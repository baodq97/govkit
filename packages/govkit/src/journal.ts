import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { GovkitConfig } from "./config";
import { isInside } from "./util";

// The `--journal` SENSOR (append-only JSONL run records). It observes the gate, it is
// never part of it: the record is built from the already-computed results, written after
// printing, and a write failure warns without touching the exit code (cli.ts owns that
// contract). One JSON object per line so a consumer can tail/parse incrementally.

/** One journal line. The single record shape — cli.ts builds it inline from the command
 *  results; optional fields are OMITTED, never null, so every line stays minimal and
 *  forward-compatible. */
export interface JournalRecord {
  /** ISO timestamp of the run (new Date().toISOString()). */
  at: string;
  cmd: "verify" | "eval" | "check";
  root: string;
  /** HEAD sha when git is available — omitted (not null) otherwise. */
  gitSha?: string;
  /** The resolved `--changed` base ref — present only when the run was scoped, so a
   *  journal consumer can tell a full-corpus verdict from a changed-set one. */
  changed?: string;
  verify?: { docs: number; violations: Array<{ path: string; kind: string }> };
  eval?: {
    artifacts: number;
    floorPassRate: number;
    advisoryPassRate: number;
    averageScore: number;
  };
  ok: boolean;
  /** First line of the thrown error when the run ABORTED instead of returning a verdict
   *  (broken config, unresolvable ref) — the sensor records the gate's hardest failures too. */
  error?: string;
  durationMs: number;
}

/** Resolve the journal destination (config `journal.path`, default `.govkit/journal.jsonl`)
 *  and CONFINE it under `root` — the same escape guard init applies to scaffold writes and
 *  loadConfig applies to docs.root: a `../../x` path must error loudly, never write outside
 *  the repo the user pointed govkit at. */
export function resolveJournalPath(root: string, config: GovkitConfig): string {
  const rel = config.journal?.path ?? join(".govkit", "journal.jsonl");
  const target = resolve(root, rel);
  if (!isInside(root, target)) {
    throw new Error(
      `govkit: journal.path '${rel}' resolves outside the repo root — it must stay within --root`,
    );
  }
  return target;
}

/** Append one record as one JSON line, creating the parent directory on first write. */
export function appendJournal(path: string, record: JournalRecord): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
}
