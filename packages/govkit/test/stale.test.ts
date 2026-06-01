import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runStale } from "../src/commands/stale";
import type { GovkitConfig } from "../src/config";

// RFC-0009 staleness is the most operationally risky new code (it shells to git for COMMIT times,
// not mtime), so it is exercised against a REAL temp repo with controlled commit dates. %ct is the
// committer date, so each commit pins GIT_COMMITTER_DATE to order doc-vs-code deterministically.
const CONFIG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status"] },
    types: {
      rfc: { dir: "docs/rfc", required: ["id", "title", "status"], idPrefix: "RFC" },
    },
  },
};

const EARLY = "2026-01-01T00:00:00";
const LATE = "2026-02-01T00:00:00";

let root: string;
const g = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
const commitAt = (msg: string, iso: string) =>
  execFileSync("git", ["commit", "-m", msg], {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso },
  });

function writeRfc(name: string, governs: string | string[] | null): void {
  const g =
    governs === null
      ? ""
      : Array.isArray(governs)
        ? `governs:\n${governs.map((x) => `  - ${x}`).join("\n")}\n`
        : `governs: ${governs}\n`;
  writeFileSync(
    join(root, "docs", "rfc", name),
    `---\nid: RFC-0001\ntitle: x\nstatus: accepted\n${g}---\n\nbody\n`,
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-stale-"));
  g("init");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "Test");
  g("config", "commit.gpgsign", "false");
  mkdirSync(join(root, "docs", "rfc"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "README.md"), "# seed\n");
  g("add", "-A");
  commitAt("seed", EARLY);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("runStale — staleness advisory (RFC-0009)", () => {
  it("flags STALE when the governed code was committed AFTER the doc", () => {
    writeRfc("RFC-0001-x.md", "src/thing.ts");
    g("add", "docs/rfc/RFC-0001-x.md");
    commitAt("doc", EARLY);
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 1;\n");
    g("add", "src/thing.ts");
    commitAt("code later", LATE);

    const result = runStale({ root, config: CONFIG });
    expect(result.gitAvailable).toBe(true);
    expect(result.checked).toBe(1);
    const e = result.entries[0];
    expect(e?.status).toBe("stale");
    expect((e?.codeTime ?? 0) > (e?.docTime ?? 0)).toBe(true);
  });

  it("reports FRESH when the doc was committed AFTER the governed code", () => {
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 1;\n");
    g("add", "src/thing.ts");
    commitAt("code", EARLY);
    writeRfc("RFC-0001-x.md", "src/thing.ts");
    g("add", "docs/rfc/RFC-0001-x.md");
    commitAt("doc later", LATE);

    const result = runStale({ root, config: CONFIG });
    expect(result.entries[0]?.status).toBe("fresh");
  });

  it("surfaces a DANGLING governs glob (matches no tracked file) rather than calling it fresh", () => {
    writeRfc("RFC-0001-x.md", "src/does-not-exist.ts");
    g("add", "docs/rfc/RFC-0001-x.md");
    commitAt("doc", LATE);

    const result = runStale({ root, config: CONFIG });
    expect(result.entries[0]?.status).toBe("dangling");
  });

  it("does NOT silently call FRESH when governed code is staged but never committed", () => {
    // The masking case the dogfooded reviewer caught: ls-files finds the staged file (matchCount
    // > 0) but git log has no commit for it (codeTime null). RFC-0009 §3: never silently "fresh".
    writeRfc("RFC-0001-x.md", "src/staged.ts");
    g("add", "docs/rfc/RFC-0001-x.md");
    commitAt("doc", EARLY);
    writeFileSync(join(root, "src", "staged.ts"), "export const x = 1;\n");
    g("add", "src/staged.ts"); // staged, NOT committed → tracked-in-index, no history

    const result = runStale({ root, config: CONFIG });
    expect(result.entries[0]?.status).toBe("dangling");
    expect(result.entries[0]?.status).not.toBe("fresh");
  });

  it("skips an UNCOMMITTED doc (no commit time to compare) without crashing", () => {
    writeRfc("RFC-0001-x.md", "src/thing.ts"); // written, never added/committed
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 1;\n");
    g("add", "src/thing.ts");
    commitAt("code", LATE);

    const result = runStale({ root, config: CONFIG });
    expect(result.entries[0]?.status).toBe("uncommitted");
  });

  it("returns a note (checked 0) when no doc declares governs", () => {
    writeRfc("RFC-0001-x.md", null);
    g("add", "docs/rfc/RFC-0001-x.md");
    commitAt("doc", LATE);

    const result = runStale({ root, config: CONFIG });
    expect(result.checked).toBe(0);
    expect(result.note).toMatch(/no governed doc declares/i);
  });

  it("accepts a list-valued governs and uses the NEWEST governed commit", () => {
    writeRfc("RFC-0001-x.md", ["src/a.ts", "src/b.ts"]);
    g("add", "docs/rfc/RFC-0001-x.md");
    commitAt("doc", EARLY);
    writeFileSync(join(root, "src", "a.ts"), "a\n");
    g("add", "src/a.ts");
    commitAt("a", EARLY); // same time as doc → not newer on its own
    writeFileSync(join(root, "src", "b.ts"), "b\n");
    g("add", "src/b.ts");
    commitAt("b later", LATE); // newest governed → makes the doc stale

    const result = runStale({ root, config: CONFIG });
    expect(result.entries[0]?.status).toBe("stale");
  });
});

describe("runStale — degrades without git", () => {
  it("returns gitAvailable:false and a note in a non-git directory", () => {
    const bare = mkdtempSync(join(tmpdir(), "govkit-nogit-"));
    try {
      mkdirSync(join(bare, "docs", "rfc"), { recursive: true });
      const result = runStale({ root: bare, config: CONFIG });
      expect(result.gitAvailable).toBe(false);
      expect(result.note).toBeTruthy();
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});
