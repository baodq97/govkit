import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { EvalResult } from "./commands/eval";
import type { VerifyResult } from "./commands/verify";
import type { GovkitConfig } from "./config";

// The `--journal` SENSOR (append-only JSONL run records). It observes the gate, it is
// never part of it: the record is built from the already-computed results, written after
// printing, and a write failure warns without touching the exit code (cli.ts owns that
// contract). One JSON object per line so a consumer can tail/parse incrementally.

export interface JournalRecord {
  /** ISO timestamp of the run (new Date().toISOString()). */
  at: string;
  cmd: "verify" | "eval" | "check";
  root: string;
  /** HEAD sha when git is available — omitted (not null) otherwise. */
  gitSha?: string;
  verify?: { docs: number; violations: Array<{ path: string; kind: string }> };
  eval?: {
    artifacts: number;
    floorPassRate: number;
    advisoryPassRate: number;
    averageScore: number;
  };
  ok: boolean;
  durationMs: number;
}

export interface JournalInput {
  cmd: "verify" | "eval" | "check";
  root: string;
  gitSha?: string;
  verify?: VerifyResult;
  eval?: EvalResult;
  ok: boolean;
  durationMs: number;
}

/** Project the full command results down to the compact journal shape. Pure w.r.t. its
 *  inputs (only the `at` timestamp is read from the clock); optional fields are OMITTED,
 *  never null, so every line stays minimal and forward-compatible. */
export function buildJournalRecord(input: JournalInput): JournalRecord {
  return {
    at: new Date().toISOString(),
    cmd: input.cmd,
    root: input.root,
    ...(input.gitSha ? { gitSha: input.gitSha } : {}),
    ...(input.verify
      ? {
          verify: {
            docs: input.verify.checked,
            violations: input.verify.violations.map((v) => ({ path: v.file, kind: v.kind })),
          },
        }
      : {}),
    ...(input.eval
      ? {
          eval: {
            artifacts: input.eval.scored,
            floorPassRate: input.eval.floorPassRate,
            advisoryPassRate: input.eval.advisoryPassRate,
            averageScore: input.eval.averageScore,
          },
        }
      : {}),
    ok: input.ok,
    durationMs: input.durationMs,
  };
}

/** Resolve the journal destination (config `journal.path`, default `.govkit/journal.jsonl`)
 *  and CONFINE it under `root` — the same escape guard init applies to scaffold writes and
 *  loadConfig applies to docs.root: a `../../x` path must error loudly, never write outside
 *  the repo the user pointed govkit at. */
export function resolveJournalPath(root: string, config: GovkitConfig): string {
  const rel = config.journal?.path ?? join(".govkit", "journal.jsonl");
  const target = resolve(root, rel);
  const escaped = relative(resolve(root), target);
  if (escaped.startsWith("..") || isAbsolute(escaped)) {
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
