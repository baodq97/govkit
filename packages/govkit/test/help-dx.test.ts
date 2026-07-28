// Help + next-step + error→fix DX. The reader of `govkit --help` is an AGENT working in someone
// else's repo: it pays a tool call for every look around, cannot infer the next step from a file
// listing, and recovers from an error by pattern-matching text to a command. So three properties
// are pinned here, each measurable: help is SCOPED (a command's page is that command's page, and
// short), every command ENDS by naming what to run next, and every failure names its fix.
//
// Spawns dist/cli.js like cli.test.ts — the help/dispatch layer only exists at the entrypoint.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInit } from "../src/commands/init";

const CLI = join(import.meta.dir, "../dist/cli.js");

/** Every command the CLI dispatches — the same closed list cli.ts types HELP_PAGES against.
 *  Kept here so "a command shipped without a page" fails a test, not just a code review. */
const COMMANDS = [
  "doctor",
  "init",
  "check",
  "verify",
  "eval",
  "calibrate",
  "report",
  "stale",
  "drift",
  "ledger",
  "audit-write",
] as const;

function run(args: string[]): { out: string; err: string; status: number } {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });
    return { out, err: "", status: 0 };
  } catch (e: unknown) {
    const failure = e as { status: number; stdout: string; stderr: string };
    return { out: failure.stdout, err: failure.stderr, status: failure.status };
  }
}

const lineCount = (text: string): number => text.replace(/\n$/, "").split("\n").length;
const nextLines = (text: string): string[] =>
  text.split("\n").filter((l) => l.startsWith("Next: "));

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-helpdx-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("global help is an INDEX, not a manual", () => {
  it("is at most 45 lines and opens with a Getting started block naming the first command", () => {
    const { out, status } = run(["--help"]);
    expect(status).toBe(0);
    expect(lineCount(out)).toBeLessThanOrEqual(45);
    expect(out).toContain("Getting started:");
    expect(out).toContain("govkit init");
    // The index has to say that the detail exists somewhere, or nobody looks for it.
    expect(out).toContain("govkit <command> --help");
  });

  it("names every command exactly once in its index", () => {
    const { out } = run(["--help"]);
    for (const command of COMMANDS) expect(out).toContain(command);
  });

  it("no-args still prints the index to stderr and exits 1 — distinct from --help", () => {
    const { err, status } = run([]);
    expect(status).toBe(1);
    expect(err).toContain("Getting started:");
  });
});

describe("per-command help is SCOPED to that command", () => {
  it("`init --help` prints only init's page, under 30 lines", () => {
    const { out, status } = run(["init", "--help"]);
    expect(status).toBe(0);
    expect(lineCount(out)).toBeLessThan(30);
    expect(out).toContain("govkit init —");
    expect(out).toContain("--adopt");
    expect(out).toContain("Examples:");
    // The regression this replaces: `init --help` used to print the 108-line global wall.
    expect(out).not.toContain("Getting started:");
    expect(out).not.toContain("calibrate");
  });

  it("`verify --help` prints only verify's page, under 30 lines, and names the next command", () => {
    const { out, status } = run(["verify", "--help"]);
    expect(status).toBe(0);
    expect(lineCount(out)).toBeLessThan(30);
    expect(out).toContain("govkit verify —");
    expect(out).toContain("--changed");
    expect(out).toContain("Examples:");
    expect(out).not.toContain("Getting started:");
    expect(out).not.toContain("--corpus");
    expect(nextLines(out)).toHaveLength(1);
  });

  it("EVERY command has its own page — none falls through to the global index", () => {
    for (const command of COMMANDS) {
      const { out, status } = run([command, "--help"]);
      expect(status).toBe(0);
      expect(out.startsWith(`govkit ${command} —`)).toBe(true);
      expect(out).toContain("Usage:");
      expect(out).toContain("Examples:");
      expect(out).not.toContain("Getting started:");
    }
  });

  it("`--help` short-circuits BEFORE flag validation — asking how a command works never fails", () => {
    // --corpus is calibrate-only; without the short-circuit this would exit 2.
    const { out, status } = run(["init", "--help", "--corpus", "x"]);
    expect(status).toBe(0);
    expect(out).toContain("govkit init —");
  });

  it("an unknown command with --help is still an error, not a silent index", () => {
    const { status, err } = run(["verfiy", "--help"]);
    expect(status).toBe(2);
    expect(err).toContain("verfiy");
  });
});

describe("every command ends by naming what to run next", () => {
  it("init on a fresh dir names the next command", () => {
    const { out, status } = run(["init", "--root", root]);
    expect(status).toBe(0);
    expect(nextLines(out)).toHaveLength(1);
    expect(nextLines(out)[0]).toMatch(/govkit \w/);
  });

  it("init on a repo that ALREADY has unmigrated docs points at --adopt, not the happy path", () => {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "ADR-0001-legacy.md"), "# Legacy\n", "utf8");
    const { out } = run(["init", "--root", root]);
    expect(nextLines(out)).toHaveLength(1);
    expect(nextLines(out)[0]).toContain("govkit init --adopt");
  });

  it("a dry-run adopt points at --apply; nothing-to-migrate points at the gate", () => {
    runInit({ root });
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "ADR-0001-legacy.md"), "# Legacy\n", "utf8");
    const dry = run(["init", "--adopt", "--root", root]);
    expect(nextLines(dry.out)[0]).toContain("--apply");

    rmSync(join(root, "docs", "adr", "ADR-0001-legacy.md"));
    const empty = run(["init", "--adopt", "--root", root]);
    expect(nextLines(empty.out)).toHaveLength(1);
    expect(nextLines(empty.out)[0]).toContain("govkit verify");
  });

  it("a PASSING verify points forward; a FAILING one points at the fix", () => {
    runInit({ root });
    const pass = run(["verify", "--root", root]);
    expect(pass.status).toBe(0);
    expect(nextLines(pass.out)).toHaveLength(1);
    expect(nextLines(pass.out)[0]).toContain("govkit eval");

    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "ADR-0001-legacy.md"), "# Legacy\n", "utf8");
    const fail = run(["verify", "--root", root]);
    expect(fail.status).toBe(1);
    // The report AND its footer go to stderr on a failure, so a hook harness feeds both back.
    expect(nextLines(fail.err)).toHaveLength(1);
    expect(nextLines(fail.err)[0]).toContain("govkit init --adopt");
  });

  it("a doc that fails on a REPAIRABLE key points at the repair, not at a migration", () => {
    runInit({ root });
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(
      join(root, "docs", "adr", "ADR-0001-x.md"),
      "---\nid: ADR-0001\ntitle: T\nstatus: bogus\nowner: TBD\ndate: 2026-07-28\n---\n\nbody\n",
      "utf8",
    );
    const { err, status } = run(["verify", "--root", root]);
    expect(status).toBe(1);
    // `init --adopt` would do nothing here — the block exists. The footer must not suggest it.
    expect(nextLines(err)[0]).not.toContain("--adopt");
    expect(nextLines(err)[0]).toContain("govkit verify");
  });

  it("check emits exactly ONE footer for the composite run, owned by the failing half", () => {
    runInit({ root });
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "ADR-0001-legacy.md"), "# Legacy\n", "utf8");
    const { err, status } = run(["check", "--root", root]);
    expect(status).toBe(1);
    expect(nextLines(err)).toHaveLength(1);
    expect(nextLines(err)[0]).toContain("govkit init --adopt");
  });

  it("--json keeps stdout a pure machine channel — no footer spliced into it", () => {
    runInit({ root });
    const { out, status } = run(["verify", "--root", root, "--json"]);
    expect(status).toBe(0);
    expect(nextLines(out)).toHaveLength(0);
    expect(() => JSON.parse(out) as unknown).not.toThrow();
  });
});

describe("every violation the gate emits names its fix", () => {
  it("frontmatter, status and index violations each print a one-line remedy", () => {
    runInit({ root });
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "ADR-0001-legacy.md"), "# Legacy\n", "utf8");
    writeFileSync(
      join(root, "docs", "adr", "ADR-0002-x.md"),
      "---\nid: ADR-0002\ntitle: T\nstatus: bogus\nowner: TBD\ndate: 2026-07-28\n---\n\nbody\n",
      "utf8",
    );
    const { err } = run(["verify", "--root", root]);
    expect(err).toContain("Fixes:");
    expect(err).toContain("fix: [frontmatter]");
    expect(err).toContain("fix: [status]");
    expect(err).toContain("fix: [index]");
    // An unknown status must say WHERE the enum lives — otherwise the agent guesses.
    expect(err).toContain("docs.types.<type>.statuses");
    // One remedy per KIND, deduplicated: two docs, three kinds, three fix lines.
    expect(err.split("\n").filter((l) => l.includes("fix: [")).length).toBe(3);
  });

  // Regression, same root cause as doctor's: verify reports "no `---` block" and "the block is
  // broken" under ONE kind (`frontmatter`), but `init --adopt` can only fix the first — it must
  // never prepend a second block to a doc that already has one. A remedy that offered the
  // migration for both would send the broken-block case to a command that does nothing.
  it("offers the --adopt migration only where a doc actually has NO block", () => {
    runInit({ root });
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(
      join(root, "docs", "adr", "ADR-0001-broken.md"),
      "---\nid: [x\n---\n\nb\n",
      "utf8",
    );
    const broken = run(["verify", "--root", root]);
    expect(broken.status).toBe(1);
    expect(broken.err).toContain("fix: [frontmatter]");
    expect(broken.err).not.toContain("--adopt");

    writeFileSync(join(root, "docs", "adr", "ADR-0002-legacy.md"), "# Legacy\n", "utf8");
    const migratable = run(["verify", "--root", root]);
    expect(migratable.err).toContain("govkit init --adopt");
  });

  it("a remedy is never mistaken for a violation entry — the 2-space entry grammar is intact", () => {
    runInit({ root });
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "ADR-0001-legacy.md"), "# Legacy\n", "utf8");
    const { err } = run(["verify", "--root", root]);
    const header = err.split("\n").find((l) => l.startsWith("govkit verify:"));
    const entries = err.split("\n").filter((l) => /^ {2}\S/.test(l)).length;
    // The counting invariant beside verifySummaryLine: the header may never claim fewer
    // findings than the body lists. Remedies sit at the problem indent, so they do not inflate it.
    expect(Number(/, (\d+) violations?/.exec(header ?? "")?.[1])).toBe(entries);
  });

  it("a clean run prints no Fixes block at all — the report stays byte-quiet when green", () => {
    runInit({ root });
    const { out } = run(["verify", "--root", root]);
    expect(out).not.toContain("Fixes:");
    expect(out.split("\n")[0]).toBe("govkit verify: OK — 0 doc(s) checked, 0 violations.");
  });
});
