import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GovkitConfig } from "../src/config";
import { appendJournal, type JournalRecord, resolveJournalPath } from "../src/journal";
import { baseConfig, git, gitInit, rmRepo, runCli, tmpRepo, writeDoc } from "./helpers";

// The --journal sensor's two contracts, each pinned here:
//   1. the record/writer layer is correct (JSONL append, path confinement), and
//   2. at the CLI it is PURELY observational — it records the gate's verdict (including a
//      THROWN run) and a broken journal (unwritable path) warns without ever changing the
//      exit code. The record shape itself is built inline by cli.ts, so its projection
//      (docs/violations, artifact counts, omitted-not-null optionals) is pinned e2e below.

const CFG: GovkitConfig = {
  schemaVersion: 1,
  docs: { ignore: [], base: { required: [] }, types: {} },
};

// A minimal record literal for the writer tests — the collapsed JournalRecord shape.
function record(overrides: Partial<JournalRecord>): JournalRecord {
  return {
    at: new Date().toISOString(),
    cmd: "verify",
    root: "/r",
    ok: true,
    durationMs: 1,
    ...overrides,
  };
}

describe("resolveJournalPath — default + confinement", () => {
  it("defaults to .govkit/journal.jsonl under root", () => {
    expect(resolveJournalPath("/repo", CFG)).toBe(join("/repo", ".govkit", "journal.jsonl"));
  });

  it("honours journal.path from config", () => {
    const cfg = { ...CFG, journal: { path: "logs/runs.jsonl" } };
    expect(resolveJournalPath("/repo", cfg)).toBe(join("/repo", "logs", "runs.jsonl"));
  });

  it("throws the govkit: operational error when journal.path escapes root", () => {
    const cfg = { ...CFG, journal: { path: "../../x" } };
    expect(() => resolveJournalPath("/repo/nested", cfg)).toThrow(
      /^govkit: journal\.path .* outside the repo root/,
    );
  });
});

describe("appendJournal — JSONL writer", () => {
  let dir: string;
  beforeEach(() => {
    dir = tmpRepo("govkit-journal-");
  });
  afterEach(() => {
    rmRepo(dir);
  });

  it("creates the parent dir and appends one parseable line per run", () => {
    const path = join(dir, ".govkit", "journal.jsonl");
    appendJournal(path, record({ cmd: "verify", root: dir, durationMs: 5 }));
    appendJournal(path, record({ cmd: "eval", root: dir, ok: false, durationMs: 7 }));
    const lines = readFileSync(path, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const parsed = lines.map((l) => JSON.parse(l) as JournalRecord);
    expect(parsed[0]?.cmd).toBe("verify");
    expect(parsed[1]?.cmd).toBe("eval");
    expect(parsed[1]?.ok).toBe(false);
  });
});

// ── E2E: the built CLI in a temp git repo (cli.test.ts fixture + stale.test.ts git setup) ──

// baseConfig() is byte-compatible with the YAML this suite used to inline (adr, five keys).
const GOVKIT_YML = baseConfig();

const VALID_DOC = `---
id: ADR-0001
title: A decision record
status: proposed
owner: alice
date: 2026-01-01
---

Background and decision.
`;

const VALID_INDEX = `# ADR Index

| ID | Title | Status | Owner | Date |
|---|---|---|---|---|
| ADR-0001 | A decision record | proposed | alice | 2026-01-01 |
`;

describe("CLI --journal (e2e on dist/cli.js)", () => {
  let root: string;
  const cli = (args: string[]) => runCli(root, args);

  beforeEach(() => {
    root = tmpRepo("govkit-journal-cli-");
    writeDoc(root, "govkit.yml", GOVKIT_YML);
    writeDoc(root, join("docs", "adr", "ADR-0001.md"), VALID_DOC);
    writeDoc(root, join("docs", "adr", "INDEX.md"), VALID_INDEX);
    gitInit(root);
    git(root, "add", "-A");
    git(root, "commit", "-m", "seed");
  });

  afterEach(() => {
    rmRepo(root);
  });

  it("verify --journal exits 0 and writes a verify record; check --journal appends", () => {
    const journal = join(root, ".govkit", "journal.jsonl");

    const verify = cli(["verify", "--journal"]);
    expect(verify.status).toBe(0);
    expect(existsSync(journal)).toBe(true);

    const check = cli(["check", "--journal"]);
    expect(check.status).toBe(0);

    const lines = readFileSync(journal, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0] as string) as JournalRecord;
    expect(first.cmd).toBe("verify");
    expect(first.ok).toBe(true);
    expect(first.verify?.docs).toBe(1);
    expect(first.verify?.violations).toEqual([]);
    // the temp repo has a commit, so the sha is recorded
    expect(first.gitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(first.durationMs).toBeGreaterThanOrEqual(0);

    const second = JSON.parse(lines[1] as string) as JournalRecord;
    expect(second.cmd).toBe("check");
    expect(second.ok).toBe(true);
    expect(second.verify).toBeDefined();
    expect(second.eval).toBeDefined();
    // Optional fields are OMITTED, never null: an unscoped, non-throwing run has neither.
    expect("changed" in second).toBe(false);
    expect("error" in second).toBe(false);
  });

  it("records the resolved --changed base ref in the `changed` field", () => {
    const r = cli(["check", "--journal", "--changed", "--base", "HEAD"]);
    expect(r.status).toBe(0);
    const journal = join(root, ".govkit", "journal.jsonl");
    const line = JSON.parse(readFileSync(journal, "utf8").trim()) as JournalRecord;
    expect(line.cmd).toBe("check");
    expect(line.changed).toBe("HEAD");
  });

  it("a THROWN run (broken govkit.yml) still appends ok:false + error, exit code unchanged", () => {
    // Unclosed flow sequence → parseYaml throws → loadConfig throws before any verdict
    // exists. The sensor must not go blind on exactly this failure.
    writeDoc(root, "govkit.yml", "docs: [\n");
    const r = cli(["verify", "--journal"]);
    expect(r.status).toBe(1); // the top-level operational-error handler, unchanged
    expect(r.stderr).toContain("govkit:");
    const journal = join(root, ".govkit", "journal.jsonl");
    const line = JSON.parse(readFileSync(journal, "utf8").trim()) as JournalRecord;
    expect(line.cmd).toBe("verify");
    expect(line.ok).toBe(false);
    expect(line.error).toBeTruthy();
    expect(line.error).not.toContain("\n"); // first line only
    expect("verify" in line).toBe(false); // the run threw before a verdict existed
  });

  it("rejects --journal on a non-gate command (report) with exit 2", () => {
    const r = cli(["report", "--journal"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--journal is only valid for verify, eval, check, drift, or ledger");
  });

  it("a journal WRITE failure warns on stderr and does NOT change the exit code", () => {
    // Make the default journal path a directory so appendFileSync fails (EISDIR).
    mkdirSync(join(root, ".govkit", "journal.jsonl"), { recursive: true });
    const r = cli(["verify", "--journal"]);
    expect(r.status).toBe(0); // the gate's verdict survives the broken sensor
    expect(r.stdout).toContain("govkit verify: OK");
    expect(r.stderr).toContain("govkit: journal write failed:");
  });
});
