// Integration tests for the CLI entrypoint (packages/govkit/dist/cli.js).
// These tests spawn the built binary via execFileSync so the full
// command-dispatch / arg-parsing / exit-code layer is exercised, not just
// the library internals. Each test builds a minimal temp fixture and tears it
// down in afterEach — the same pattern as stale.test.ts / changed-git.test.ts.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Resolve the built entrypoint relative to this test file.
// import.meta.dir is the directory of this file under bun:test.
const CLI = join(import.meta.dir, "../dist/cli.js");

// Helper: run the CLI and return stdout. Throws (with .status / .stdout /
// .stderr on the error object) when the process exits non-zero.
// Under `bun test`, process.execPath is the bun binary, so this spawns
// `bun dist/cli.js` — the same way the repo runs the CLI (ADR-0002); the bundled
// dist is runtime-identical under bun and node, so the dispatch behavior asserted
// here holds for the published `node`/`npx` entrypoint too.
function cli(args: string[], opts: { cwd?: string; input?: string } = {}): string {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd: opts.cwd ?? process.cwd(),
    encoding: "utf8",
    // Force all three fds to pipe so err.stderr is always a string (not null)
    // in the non-zero catch blocks. Without this, the default may inherit stderr
    // to the parent process instead of capturing it.
    stdio: "pipe",
    input: opts.input,
  });
}

// ── Fixture helpers ────────────────────────────────────────────────────────

// govkit.yml with one governed type (adr) and no eval rubric.
// No eval rubric → eval returns ok:true with a note (the "no rubric" short-
// circuit in runEval). That makes a minimal fixture pass both verify and check
// without any quality-rubric complexity.
const GOVKIT_YML = `schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status, owner, date]
  types:
    adr:
      dir: docs/adr
      required: [id, title, status, owner, date]
      startStatus: proposed
`;

// A single doc with fully complete front-matter — verify must pass it.
const VALID_DOC = `---
id: ADR-0001
title: A decision record
status: proposed
owner: alice
date: 2026-01-01
---

Background and decision.
`;

// INDEX.md that is in sync with the single valid doc above.
const VALID_INDEX = `# ADR Index

| ID | Title | Status | Owner | Date |
|---|---|---|---|---|
| ADR-0001 | A decision record | proposed | alice | 2026-01-01 |
`;

// A doc that is missing the required `owner` and `date` keys.
const INVALID_DOC = `---
id: ADR-0001
title: Missing required fields
status: proposed
---

Body without owner or date.
`;

// INDEX that matches the invalid doc so the INDEX-sync check doesn't add noise.
const INVALID_INDEX = `# ADR Index

| ID | Title | Status | Owner | Date |
|---|---|---|---|---|
| ADR-0001 | Missing required fields | proposed |  |  |
`;

// ── Fixture lifecycle ──────────────────────────────────────────────────────

let root: string;

function buildFixture(docContent: string, indexContent: string): void {
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
  writeFileSync(join(root, "docs", "adr", "ADR-0001.md"), docContent);
  writeFileSync(join(root, "docs", "adr", "INDEX.md"), indexContent);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-cli-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CLI entrypoint — govkit dist/cli.js", () => {
  // (a) verify against a VALID fixture → exit 0, stdout contains "OK"
  it("verify: exits 0 and prints OK for a fully valid fixture", () => {
    buildFixture(VALID_DOC, VALID_INDEX);
    const out = cli(["verify", "--root", root]);
    expect(out).toContain("govkit verify: OK");
  });

  // (b) verify against a fixture with a missing required key → exit 1, stderr
  //     names the violation. execFileSync throws on non-zero; catch and inspect.
  it("verify: exits 1 and reports the violation for a doc missing required keys", () => {
    buildFixture(INVALID_DOC, INVALID_INDEX);
    let threw = false;
    try {
      cli(["verify", "--root", root]);
    } catch (e: unknown) {
      threw = true;
      const err = e as { status: number; stderr: string };
      expect(err.status).toBe(1);
      // The FAIL line and violation detail go to stderr (printVerify writes there).
      expect(err.stderr).toContain("FAIL");
      // Missing `owner` (and `date`) should appear in the problem list.
      expect(err.stderr).toMatch(/owner|date/);
    }
    expect(threw).toBe(true);
  });

  // (c) unknown command → exit 2, stderr contains the command name and usage
  it("unknown command: exits 2 and prints the command name + usage to stderr", () => {
    buildFixture(VALID_DOC, VALID_INDEX);
    let threw = false;
    try {
      cli(["bogus", "--root", root]);
    } catch (e: unknown) {
      threw = true;
      const err = e as { status: number; stderr: string };
      expect(err.status).toBe(2);
      expect(err.stderr).toContain("bogus");
      // Usage header must appear (from the HELP constant appended to the error line).
      expect(err.stderr).toContain("govkit");
    }
    expect(threw).toBe(true);
  });

  // (d-i) --help → exit 0, usage printed to STDOUT (not stderr).
  //        cli.ts: if (values.help) { process.stdout.write(HELP); return 0; }
  it("--help: exits 0 and prints usage to stdout", () => {
    // Does NOT throw because exit is 0.
    const out = cli(["--help"]);
    expect(out).toContain("govkit");
    expect(out).toContain("verify");
    expect(out).toContain("check");
    expect(out).toContain("calibrate");
    expect(out).toContain("--journal");
  });

  // (d-ii) no args → exit 1, HELP printed to STDERR.
  //         cli.ts: if (!command) { process.stderr.write(HELP); return 1; }
  //         This is distinct from --help (exit 0 / stdout vs exit 1 / stderr).
  it("no-args: exits 1 and prints usage to stderr", () => {
    let threw = false;
    try {
      cli([]);
    } catch (e: unknown) {
      threw = true;
      const err = e as { status: number; stderr: string };
      expect(err.status).toBe(1);
      expect(err.stderr).toContain("govkit");
      expect(err.stderr).toContain("verify");
    }
    expect(threw).toBe(true);
  });

  // (d-iii) missing govkit.yml → exit non-zero with a CLEAN one-line error, no stack
  //          trace. Regression for US-0003: loadConfig throws and the unhandled rejection
  //          used to dump a Node stack trace. `root` is an empty mkdtemp dir (no buildFixture).
  it("verify: missing govkit.yml prints a clean error, no stack trace — US-0003", () => {
    let threw = false;
    try {
      cli(["verify", "--root", root]);
    } catch (e: unknown) {
      threw = true;
      const err = e as { status: number; stderr: string };
      expect(err.status).not.toBe(0);
      expect(err.stderr).toContain("no govkit.yml");
      expect(err.stderr).toContain("govkit init"); // the actionable hint survives
      // No raw Node/bun stack trace leaked: no "    at …" frames, no throw-site reference.
      expect(err.stderr).not.toMatch(/^\s+at /m);
      expect(err.stderr).not.toContain("loadConfig (");
    }
    expect(threw).toBe(true);
  });

  // (e) check (verify + eval) on a valid fixture → exit 0.
  //     No eval rubric in govkit.yml → eval returns ok:true with a note
  //     (the "no rubric" short-circuit in runEval), so the combined gate passes.
  it("check: exits 0 and prints OK + eval note for a valid fixture with no rubric", () => {
    buildFixture(VALID_DOC, VALID_INDEX);
    const out = cli(["check", "--root", root]);
    // verify half must say OK
    expect(out).toContain("govkit verify: OK");
    // eval half must say "no eval rubric configured"
    expect(out).toContain("no eval rubric configured");
  });
});
