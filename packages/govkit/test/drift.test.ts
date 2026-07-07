import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DriftAckResult, DriftResult } from "../src/commands/drift";
import type { JournalRecord } from "../src/journal";

// The RFC-0015 drift gate, e2e on the built dist/cli.js against a REAL temp git repo (the
// stale.test.ts posture: the risky part is the git plumbing, so it is exercised for real).
// Pinned here: the gate's verdict + exit codes (1, --hook 2), the short-sha prefix match, the
// skip/violation split for missing vs garbage `reconciled:`, the no-git degrade to exit 0,
// the --ack surgery (ONLY the sha value changes — byte-identical rest, CRLF included), and
// the --journal record shape.

const CLI = join(import.meta.dir, "../dist/cli.js");

const GOVKIT_YML = `schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status]
  types:
    rfc:
      dir: docs/rfc
      required: [id, title, status]
`;

let root: string;
const g = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
const cli = (args: string[]) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });
const headSha = (): string =>
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

/** A doc opting in (or not) to the drift gate. `reconciled: null` omits the key entirely —
 *  the not-opted-in case, distinct from an empty value (a violation). */
function rfcDoc(opts: { governs?: string; reconciled?: string | null }): string {
  const governs = opts.governs !== undefined ? `governs:\n  - ${opts.governs}\n` : "";
  const reconciled =
    opts.reconciled === undefined || opts.reconciled === null
      ? ""
      : `reconciled: ${opts.reconciled}\n`;
  return `---\nid: RFC-0001\ntitle: x\nstatus: accepted\n${governs}${reconciled}---\n\nbody prose\n`;
}

const DOC = join("docs", "rfc", "RFC-0001-x.md");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-drift-"));
  g("init");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "Test");
  g("config", "commit.gpgsign", "false");
  mkdirSync(join(root, "docs", "rfc"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
  writeFileSync(join(root, "src", "thing.ts"), "export const x = 1;\n");
  g("add", "-A");
  g("commit", "-m", "seed");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Commit the governed code, then write the doc reconciled at that exact sha. */
function reconcileAtHead(reconciled?: string): string {
  const sha = headSha();
  writeFileSync(
    join(root, DOC),
    rfcDoc({ governs: "src/thing.ts", reconciled: reconciled ?? sha }),
  );
  return sha;
}

describe("govkit drift — the RFC-0015 gate (e2e)", () => {
  it("passes (exit 0) when the opted-in doc's reconciled sha matches the governed code", () => {
    reconcileAtHead();
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("govkit drift: OK — 1 opted-in doc(s) in sync");
  });

  it("matches a SHORT reconciled sha by prefix (7–40 hex chars)", () => {
    const sha = headSha();
    reconcileAtHead(sha.slice(0, 7));
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(0);
  });

  it("fails (exit 1) naming both shas when the governed code moved past the claim; --hook exits 2", () => {
    const vouched = reconcileAtHead();
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "code moved");
    const current = headSha();

    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("govkit drift: FAIL");
    expect(r.stderr).toContain(vouched.slice(0, 12));
    expect(r.stderr).toContain(current.slice(0, 12));
    expect(r.stderr).toContain("governs: src/thing.ts");

    const hook = cli(["drift", "--hook", "--root", root]);
    expect(hook.status).toBe(2);
    expect(hook.stdout).toBe(""); // the report moves to stderr under --hook
    expect(hook.stderr).toContain("govkit drift: FAIL");
  });

  it("SKIPS (exit 0) a doc with governs but no reconciled key — stale's turf, not drift's", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: null }));
    const r = cli(["drift", "--root", root, "--json"]);
    expect(r.status).toBe(0);
    const result = JSON.parse(r.stdout) as DriftResult;
    expect(result.checked).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.ok).toBe(true);
  });

  it("flags a GARBAGE reconciled value as a violation naming the doc, never a crash", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: "not-a-sha" }));
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("docs/rfc/RFC-0001-x.md");
    expect(r.stderr).toContain("'not-a-sha' is not a git sha");
  });

  it("flags an EMPTY reconciled value as a violation (empty ≠ unclaimed)", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: "" }));
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("reconciled: is empty");
  });

  it("flags a well-formed claim whose governs paths have NO commit history — never silently green", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/ghost.ts", reconciled: headSha() }));
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("no commit history");
  });

  it("degrades to a note + exit 0 without git — advisory posture, never a crash", () => {
    const bare = mkdtempSync(join(tmpdir(), "govkit-drift-nogit-"));
    try {
      mkdirSync(join(bare, "docs", "rfc"), { recursive: true });
      writeFileSync(join(bare, "govkit.yml"), GOVKIT_YML);
      writeFileSync(
        join(bare, "docs", "rfc", "RFC-0001-x.md"),
        rfcDoc({ governs: "src/thing.ts", reconciled: "abcdef1" }),
      );
      const r = cli(["drift", "--root", bare]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("git unavailable, 1 opted-in doc(s) skipped");
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });

  it("writes a --journal record { cmd: drift, drift: { checked, drifted, skipped } }", () => {
    reconcileAtHead();
    const r = cli(["drift", "--journal", "--root", root]);
    expect(r.status).toBe(0);
    const line = readFileSync(join(root, ".govkit", "journal.jsonl"), "utf8").trim();
    const record = JSON.parse(line) as JournalRecord;
    expect(record.cmd).toBe("drift");
    expect(record.ok).toBe(true);
    expect(record.drift).toEqual({ checked: 1, drifted: 0, skipped: 0 });
    expect("verify" in record).toBe(false); // additive: gate fields stay omitted
  });
});

describe("govkit drift --ack — the reconciliation ritual (e2e)", () => {
  it("rewrites ONLY the reconciled sha value (byte-identical rest) and a rerun is green", () => {
    const vouched = reconcileAtHead();
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "code moved");
    const current = headSha();
    const before = readFileSync(join(root, DOC), "utf8");

    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`${vouched} → ${current}`);

    const after = readFileSync(join(root, DOC), "utf8");
    // Surgical: the file after the ack is EXACTLY the file before with one sha substituted.
    expect(after).toBe(before.replace(vouched, current));

    const rerun = cli(["drift", "--root", root]);
    expect(rerun.status).toBe(0);
  });

  it("preserves CRLF line endings byte-for-byte through the ack", () => {
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "code moved");
    const current = headSha();
    const stale = "a".repeat(40);
    const crlf =
      `---\r\nid: RFC-0001\r\ntitle: x\r\nstatus: accepted\r\ngoverns:\r\n  - src/thing.ts\r\n` +
      `reconciled: ${stale}\r\n---\r\n\r\nbody prose\r\n`;
    writeFileSync(join(root, DOC), crlf);

    const r = cli(["drift", "--ack", "--root", root]); // no path → all opted-in docs
    expect(r.status).toBe(0);
    const after = readFileSync(join(root, DOC), "utf8");
    expect(after).toBe(crlf.replace(stale, current)); // every \r\n survives, only the sha moved
  });

  it("is a said-out-loud NO-OP when the doc is already in sync (nothing written)", () => {
    reconcileAtHead();
    const before = readFileSync(join(root, DOC), "utf8");
    const r = cli(["drift", "--ack", "--root", root, "--json"]);
    expect(r.status).toBe(0);
    const result = JSON.parse(r.stdout) as DriftAckResult;
    expect(result.acked).toEqual([]);
    expect(result.upToDate).toHaveLength(1);
    expect(readFileSync(join(root, DOC), "utf8")).toBe(before);
  });

  it("errors operationally when the named doc declares no governs", () => {
    writeFileSync(join(root, DOC), rfcDoc({ reconciled: "abcdef1" })); // reconciled, no governs
    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("not a governed doc declaring 'governs:'");
  });

  it("errors operationally when the named doc has governs but never opted in (no reconciled key)", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: null }));
    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("has no 'reconciled:' front-matter key");
  });

  it("rejects --ack outside drift (scope table) and a doc path without --ack", () => {
    const scope = cli(["verify", "--ack", "--root", root]);
    expect(scope.status).toBe(2);
    expect(scope.stderr).toContain("--ack is only valid for drift");

    reconcileAtHead();
    const stray = cli(["drift", DOC, "--root", root]);
    expect(stray.status).toBe(2);
    expect(stray.stderr).toContain("only valid with --ack");
  });
});
