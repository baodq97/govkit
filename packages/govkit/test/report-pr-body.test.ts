// RFC-0021 — `govkit report --pr-body`: the lifecycle view rendered as a marker-fenced
// GitHub-markdown block for idempotent PR-body injection. Two layers under test, mirroring
// the repo's split: renderReportPrBody + runReport are exercised via src (like
// docs-root.test.ts), and the CLI dispatch/exit-code layer is exercised by spawning the
// built binary (same pattern and helper as cli.test.ts).
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PR_BODY_BEGIN, PR_BODY_END, renderReportPrBody, runReport } from "../src/commands/report";
import type { GovkitConfig } from "../src/config";

const CLI = join(import.meta.dir, "../dist/cli.js");

// Helper: run the CLI and return stdout. Throws (with .status / .stdout / .stderr on the
// error object) when the process exits non-zero — same contract as cli.test.ts.
function cli(args: string[], opts: { cwd?: string } = {}): string {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd: opts.cwd ?? process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
}

// ── Fixture ────────────────────────────────────────────────────────────────

// One governed type with terminalStatuses so the ✔ marking is exercised; two statuses with
// the draft bucket holding TWO ids so sortedness inside a row is observable.
const GOVKIT_YML = `schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status]
  types:
    rfc:
      dir: docs/rfc
      required: [id, title, status]
      terminalStatuses: [accepted]
`;

const CONFIG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status"] },
    types: {
      rfc: {
        dir: "docs/rfc",
        required: ["id", "title", "status"],
        terminalStatuses: ["accepted"],
      },
    },
  },
};

const doc = (id: string, status: string): string =>
  `---\nid: ${id}\ntitle: x\nstatus: ${status}\n---\n\nbody\n`;

let root: string;

// Docs written in DESCENDING id order so sorted output cannot be an accident of write order.
function buildFixture(): void {
  mkdirSync(join(root, "docs", "rfc"), { recursive: true });
  writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
  writeFileSync(join(root, "docs", "rfc", "RFC-0003-c.md"), doc("RFC-0003", "draft"));
  writeFileSync(join(root, "docs", "rfc", "RFC-0002-b.md"), doc("RFC-0002", "draft"));
  writeFileSync(join(root, "docs", "rfc", "RFC-0001-a.md"), doc("RFC-0001", "accepted"));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-prbody-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ── Rendering (src) ────────────────────────────────────────────────────────

describe("renderReportPrBody (RFC-0021)", () => {
  it("fences the block with the exact stable markers, first and last lines", () => {
    buildFixture();
    const block = renderReportPrBody(runReport({ root, config: CONFIG }));
    const lines = block.split("\n");
    // The marker strings are the idempotency API — pinned byte-for-byte, not matched loosely.
    expect(lines[0]).toBe("<!-- govkit:report:begin -->");
    expect(lines.at(-2)).toBe("<!-- govkit:report:end -->"); // block ends with one "\n"
    expect(lines.at(-1)).toBe("");
    expect(lines[1]).toBe("### govkit governance report");
    // The exported constants must equal the RFC's pinned strings (a rename would silently
    // break every injector locating the span).
    expect(PR_BODY_BEGIN).toBe("<!-- govkit:report:begin -->");
    expect(PR_BODY_END).toBe("<!-- govkit:report:end -->");
  });

  it("is deterministic: two runs on the same tree are byte-identical", () => {
    buildFixture();
    const first = renderReportPrBody(runReport({ root, config: CONFIG }));
    const second = renderReportPrBody(runReport({ root, config: CONFIG }));
    expect(second).toBe(first);
    // No timestamp/run-id/absolute-path leak — the block may only change when state does.
    expect(first).not.toContain(root);
    expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("sorts statuses across rows and ids within a row; terminal statuses are marked ✔", () => {
    buildFixture();
    const block = renderReportPrBody(runReport({ root, config: CONFIG }));
    // Statuses sorted: the accepted row precedes the draft row.
    expect(block.indexOf("| rfc | accepted ✔ | 1 | RFC-0001 |")).toBeGreaterThan(-1);
    expect(block).toContain("| rfc | draft | 2 | RFC-0002, RFC-0003 |");
    expect(block.indexOf("accepted ✔")).toBeLessThan(block.indexOf("draft"));
  });

  it("degenerate empty doc tree still yields a well-formed fenced block", () => {
    mkdirSync(join(root, "docs", "rfc"), { recursive: true });
    writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
    const block = renderReportPrBody(runReport({ root, config: CONFIG }));
    expect(block.startsWith(PR_BODY_BEGIN)).toBe(true);
    expect(block.endsWith(`${PR_BODY_END}\n`)).toBe(true);
  });
});

// ── CLI dispatch (dist, like cli.test.ts) ──────────────────────────────────

describe("CLI — govkit report --pr-body", () => {
  it("exits 0 and prints the fenced block to stdout", () => {
    buildFixture();
    // cli() throws on a non-zero exit, so reaching the assertions IS the exit-0 check —
    // report stays advisory by construction (RFC-0008), --pr-body must not change that.
    const out = cli(["report", "--pr-body", "--root", root]);
    expect(out).toContain(PR_BODY_BEGIN);
    expect(out).toContain(PR_BODY_END);
    expect(out).toContain("| rfc | draft | 2 | RFC-0002, RFC-0003 |");
  });

  it("exits 0 even on an empty doc tree (advisory posture holds on degenerate input)", () => {
    mkdirSync(join(root, "docs", "rfc"), { recursive: true });
    writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
    const out = cli(["report", "--pr-body", "--root", root]);
    expect(out).toContain(PR_BODY_BEGIN);
  });

  it("two CLI runs on the same tree emit byte-identical stdout", () => {
    buildFixture();
    const first = cli(["report", "--pr-body", "--root", root]);
    const second = cli(["report", "--pr-body", "--root", root]);
    expect(second).toBe(first);
  });

  it("--pr-body with --json is a usage error (exit 2, stderr names both flags)", () => {
    buildFixture();
    let threw = false;
    try {
      cli(["report", "--pr-body", "--json", "--root", root]);
    } catch (e: unknown) {
      threw = true;
      const err = e as { status: number; stderr: string };
      expect(err.status).toBe(2);
      expect(err.stderr).toContain("--pr-body");
      expect(err.stderr).toContain("--json");
    }
    expect(threw).toBe(true);
  });

  it("--pr-body on a non-report command is rejected by the scoped-flag table (exit 2)", () => {
    buildFixture();
    let threw = false;
    try {
      cli(["verify", "--pr-body", "--root", root]);
    } catch (e: unknown) {
      threw = true;
      const err = e as { status: number; stderr: string };
      expect(err.status).toBe(2);
      expect(err.stderr).toContain("--pr-body is only valid for report");
    }
    expect(threw).toBe(true);
  });

  it("plain report output is unchanged — no markers, same human header (no regression)", () => {
    buildFixture();
    const out = cli(["report", "--root", root]);
    expect(out).toContain("govkit report — lifecycle of 3 governed doc(s)");
    expect(out).toContain("accepted ×1 ✓ decided");
    expect(out).not.toContain(PR_BODY_BEGIN);
    expect(out).not.toContain(PR_BODY_END);
  });
});
