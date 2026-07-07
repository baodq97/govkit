import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GovkitConfig } from "../src/config";
import {
  appendJournal,
  buildJournalRecord,
  type JournalRecord,
  resolveJournalPath,
} from "../src/journal";

// The --journal sensor's two contracts, each pinned here:
//   1. the record/writer layer is correct (shape, JSONL append, path confinement), and
//   2. at the CLI it is PURELY observational — it records the gate's verdict and a broken
//      journal (unwritable path) warns without ever changing the exit code.

const CLI = join(import.meta.dir, "../dist/cli.js");

const CFG: GovkitConfig = {
  schemaVersion: 1,
  docs: { ignore: [], base: { required: [] }, types: {} },
};

describe("buildJournalRecord — shape", () => {
  it("builds the full record with optional parts present", () => {
    const record = buildJournalRecord({
      cmd: "check",
      root: "/repo",
      gitSha: "abc123",
      verify: {
        ok: false,
        checked: 3,
        violations: [
          { file: "/repo/docs/adr/ADR-0001.md", type: "adr", kind: "frontmatter", problems: ["x"] },
        ],
      },
      eval: {
        ok: true,
        threshold: 70,
        scored: 2,
        averageScore: 90,
        floorPassRate: 1,
        advisoryPassRate: 0.5,
        artifacts: [],
      },
      ok: false,
      durationMs: 12,
    });
    expect(record.cmd).toBe("check");
    expect(record.root).toBe("/repo");
    expect(record.gitSha).toBe("abc123");
    expect(record.ok).toBe(false);
    expect(record.durationMs).toBe(12);
    // ISO timestamp round-trips through Date.
    expect(new Date(record.at).toISOString()).toBe(record.at);
    expect(record.verify).toEqual({
      docs: 3,
      violations: [{ path: "/repo/docs/adr/ADR-0001.md", kind: "frontmatter" }],
    });
    expect(record.eval).toEqual({
      artifacts: 2,
      floorPassRate: 1,
      advisoryPassRate: 0.5,
      averageScore: 90,
    });
  });

  it("OMITS gitSha/verify/eval when absent (never null keys)", () => {
    const record = buildJournalRecord({ cmd: "verify", root: "/r", ok: true, durationMs: 1 });
    expect("gitSha" in record).toBe(false);
    expect("verify" in record).toBe(false);
    expect("eval" in record).toBe(false);
  });
});

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
    dir = mkdtempSync(join(tmpdir(), "govkit-journal-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the parent dir and appends one parseable line per run", () => {
    const path = join(dir, ".govkit", "journal.jsonl");
    const record = buildJournalRecord({ cmd: "verify", root: dir, ok: true, durationMs: 5 });
    appendJournal(path, record);
    appendJournal(path, buildJournalRecord({ cmd: "eval", root: dir, ok: false, durationMs: 7 }));
    const lines = readFileSync(path, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const parsed = lines.map((l) => JSON.parse(l) as JournalRecord);
    expect(parsed[0]?.cmd).toBe("verify");
    expect(parsed[1]?.cmd).toBe("eval");
    expect(parsed[1]?.ok).toBe(false);
  });
});

// ── E2E: the built CLI in a temp git repo (cli.test.ts fixture + stale.test.ts git setup) ──

const GOVKIT_YML = `schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status, owner, date]
  types:
    adr:
      dir: docs/adr
      required: [id, title, status, owner, date]
`;

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
  const g = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  const cli = (args: string[]) =>
    spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "govkit-journal-cli-"));
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
    writeFileSync(join(root, "docs", "adr", "ADR-0001.md"), VALID_DOC);
    writeFileSync(join(root, "docs", "adr", "INDEX.md"), VALID_INDEX);
    g("init");
    g("config", "user.email", "t@example.com");
    g("config", "user.name", "Test");
    g("config", "commit.gpgsign", "false");
    g("add", "-A");
    g("commit", "-m", "seed");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("verify --journal exits 0 and writes a verify record; check --journal appends", () => {
    const journal = join(root, ".govkit", "journal.jsonl");

    const verify = cli(["verify", "--journal", "--root", root]);
    expect(verify.status).toBe(0);
    expect(existsSync(journal)).toBe(true);

    const check = cli(["check", "--journal", "--root", root]);
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
  });

  it("rejects --journal on a non-gate command (report) with exit 2", () => {
    const r = cli(["report", "--journal", "--root", root]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--journal is only valid for verify, eval, or check");
  });

  it("a journal WRITE failure warns on stderr and does NOT change the exit code", () => {
    // Make the default journal path a directory so appendFileSync fails (EISDIR).
    mkdirSync(join(root, ".govkit", "journal.jsonl"), { recursive: true });
    const r = cli(["verify", "--journal", "--root", root]);
    expect(r.status).toBe(0); // the gate's verdict survives the broken sensor
    expect(r.stdout).toContain("govkit verify: OK");
    expect(r.stderr).toContain("govkit: journal write failed:");
  });
});
