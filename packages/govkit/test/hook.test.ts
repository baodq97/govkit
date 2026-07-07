// E2E for the --hook blocking-hook contract (RFC-0013) on the built dist/cli.js.
// The run under --hook is IDENTICAL to a plain run except at two edges, both pinned here:
//   1. exit-code mapping — any would-be exit 1 (gate failure OR operational error, the
//      fail-closed case) becomes exit 2, the code a blocking-hook harness treats as "block";
//   2. stream routing — the human report moves to stderr (the channel the harness feeds
//      back to the model) so stdout stays empty, or pure JSON under --json.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VerifyResult } from "../src/commands/verify";

const CLI = join(import.meta.dir, "../dist/cli.js");

// Same minimal fixture family as cli.test.ts: one adr type, no eval rubric.
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

// Missing required owner/date → a blocking frontmatter violation.
const INVALID_DOC = `---
id: ADR-0001
title: Missing required fields
status: proposed
---

Body without owner or date.
`;

const INVALID_INDEX = `# ADR Index

| ADR-0001 | Missing required fields | proposed |  |  |
`;

let root: string;

function buildFixture(docContent: string, indexContent: string): void {
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
  writeFileSync(join(root, "docs", "adr", "ADR-0001.md"), docContent);
  writeFileSync(join(root, "docs", "adr", "INDEX.md"), indexContent);
}

const cli = (args: string[]) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-hook-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("--hook (e2e on dist/cli.js)", () => {
  it("verify --hook on a failing repo: exit 2, report on stderr, stdout EMPTY", () => {
    buildFixture(INVALID_DOC, INVALID_INDEX);
    const r = cli(["verify", "--hook", "--root", root]);
    expect(r.status).toBe(2); // would-be exit 1 → 2 under --hook
    expect(r.stdout).toBe(""); // nothing on the machine channel without --json
    expect(r.stderr).toContain("govkit verify: FAIL");
    expect(r.stderr).toMatch(/owner|date/); // the violations the harness feeds back
  });

  it("verify --hook on a passing repo: exit 0, report routed to stderr", () => {
    buildFixture(VALID_DOC, VALID_INDEX);
    const r = cli(["verify", "--hook", "--root", root]);
    expect(r.status).toBe(0); // success is untouched by the mapping
    expect(r.stdout).toBe(""); // even the OK line moves off stdout under --hook
    expect(r.stderr).toContain("govkit verify: OK");
  });

  it("rejects --hook on a non-gate command (report) with exit 2 via the scope table", () => {
    buildFixture(VALID_DOC, VALID_INDEX);
    const r = cli(["report", "--hook", "--root", root]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--hook is only valid for verify, eval, check, drift, or ledger");
  });

  it("operational error (missing govkit.yml) under --hook exits 2 — fail closed", () => {
    // No fixture: `root` is an empty dir, so loadConfig throws the govkit: error. A broken
    // guardrail must BLOCK (2), not degrade to the non-blocking operational exit 1.
    const r = cli(["verify", "--hook", "--root", root]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("no govkit.yml");
  });

  it("--json --hook on a failing repo: stdout is pure parseable JSON, exit 2", () => {
    buildFixture(INVALID_DOC, INVALID_INDEX);
    const r = cli(["verify", "--json", "--hook", "--root", root]);
    expect(r.status).toBe(2);
    const parsed = JSON.parse(r.stdout) as VerifyResult; // throws if a summary leaked in
    expect(parsed.ok).toBe(false);
    expect(parsed.violations.length).toBeGreaterThan(0);
    expect(parsed.violations[0]?.tier).toBe("blocking"); // --json carries tiers naturally
  });

  it("check --hook on a failing repo maps the combined gate to exit 2", () => {
    buildFixture(INVALID_DOC, INVALID_INDEX);
    const r = cli(["check", "--hook", "--root", root]);
    expect(r.status).toBe(2);
    expect(r.stdout).toBe(""); // verify report AND the eval note both leave stdout
    expect(r.stderr).toContain("govkit verify: FAIL");
    expect(r.stderr).toContain("no eval rubric configured");
  });
});
