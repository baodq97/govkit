import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The OPT-IN half of anchored citation resolution, pinned at the CLI boundary. The rule this
// file defends is not "the check works" (citations.test.ts owns that) but WHERE it is allowed to
// run: a check with no calibration history may not be reachable from the command CI invokes, and
// it must not silently under-report when combined with a scope it cannot honour. Both are
// exit-code contracts, so they are asserted against the built binary, not the library.

const CLI = join(import.meta.dir, "../dist/cli.js");

const GOVKIT_YML = `schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status, owner, date]
  types:
    adr:
      dir: docs/adr
      required: [id, title, status, owner, date]
      idPrefix: ADR
      statuses: [proposed, accepted]
      index: false
`;

let root: string;

function cli(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-cite-flag-"));
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
  // 40 filler lines, then the symbol: a citation to line 3 is the "+34 lines pushed the block
  // down" incident, and line 3 still exists — a positional checker would pass it.
  writeFileSync(
    join(root, "src", "widget.ts"),
    `${Array.from({ length: 40 }, (_, i) => `// filler ${i}`).join("\n")}\nexport function resolveWidget() {}\n`,
  );
  writeFileSync(
    join(root, "docs", "adr", "ADR-0001.md"),
    [
      "---",
      "id: ADR-0001",
      "title: t",
      "status: proposed",
      "owner: TBD",
      "date: 2026-07-28",
      "---",
      "",
      "The trim happens in `src/widget.ts:3` (resolveWidget).",
      "",
    ].join("\n"),
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("govkit verify --check-citations", () => {
  it("is OFF by default: the stale citation does not fail the gate", () => {
    const r = cli(["verify", "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("govkit verify: OK — 1 doc(s) checked, 0 violations.");
    // and the header says nothing about citations, so an unflagged run is byte-identical
    expect(r.stdout).not.toContain("citations:");
  });

  it("with the flag, the stale citation blocks and the failure is named by kind", () => {
    const r = cli(["verify", "--root", root, "--check-citations"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("govkit verify: FAIL");
    expect(r.stderr).toContain("anchor-not-found");
    expect(r.stderr).toContain("fix: [citation]");
  });

  it("the header states found / resolved / skipped / failed — the denominator is never dropped", () => {
    const r = cli(["verify", "--root", root, "--check-citations"]);
    expect(r.stderr).toContain("citations: 1 found in 1 file(s), 0 resolved, 0 skipped, 1 failed");
  });

  it("is refused on `check` — the no-API-key CI gate cannot reach an uncalibrated rule", () => {
    const r = cli(["check", "--root", root, "--check-citations"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--check-citations is only valid for verify");
  });

  it("is refused with --changed rather than silently under-reporting", () => {
    // The pass reads the governed TREE (a design tree's `model.yaml` carries most of a corpus's
    // citations); `--changed` resolves its scope for `.md` only. Combined, every non-markdown
    // citing file would drop out of the report with nothing said.
    const r = cli(["verify", "--root", root, "--check-citations", "--changed"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--check-citations cannot be combined with --changed");
  });

  it("the flag is documented on verify's own help page", () => {
    const r = cli(["verify", "--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("--check-citations");
    expect(r.stdout).toContain("OPT-IN, ANCHORED");
  });
});
