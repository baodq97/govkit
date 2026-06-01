import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAdopt } from "../src/commands/adopt";
import { auditWrite } from "../src/commands/audit-write";
import { runInit } from "../src/commands/init";
import { runReport } from "../src/commands/report";
import { runVerify } from "../src/commands/verify";
import { type GovkitConfig, loadConfig } from "../src/config";

// RFC-0007: docs.root prepends a single configurable parent to every type.dir, default ".".
// One type (`rfc`) keeps it minimal; the tests vary docs.root and assert every reader + the
// per-write hook resolve through the SAME root.
function cfg(root: string): GovkitConfig {
  return {
    schemaVersion: 1,
    docs: {
      root,
      ignore: ["INDEX.md", "_TEMPLATE.md"],
      base: { required: ["id", "title", "status"] },
      types: {
        rfc: {
          dir: "docs/rfc",
          required: ["id", "title", "status"],
          idPrefix: "RFC",
          statuses: ["draft", "accepted"],
        },
      },
    },
  };
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-docsroot-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeDoc(relDir: string, name: string, body: string): void {
  const dir = join(root, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), body);
}
const GOOD = "---\nid: RFC-0001\ntitle: x\nstatus: draft\n---\n\nbody\n";
const INDEX = "# RFC\n\n| RFC-0001 | draft |\n";

describe("docs.root resolution (RFC-0007)", () => {
  it("default '.' resolves under docs/rfc exactly as before (non-breaking floor)", () => {
    writeDoc("docs/rfc", "RFC-0001-x.md", GOOD);
    writeDoc("docs/rfc", "INDEX.md", INDEX);

    const result = runVerify({ root, config: cfg(".") });
    expect(result.checked).toBe(1);
    expect(result.ok).toBe(true);
  });

  it("docs.root '.govkit' makes verify + report read under .govkit/docs/rfc, NOT docs/rfc", () => {
    writeDoc(".govkit/docs/rfc", "RFC-0001-x.md", GOOD);
    writeDoc(".govkit/docs/rfc", "INDEX.md", INDEX);
    // a decoy at the OLD location must be ignored when root is .govkit
    writeDoc("docs/rfc", "RFC-9999-decoy.md", "no front-matter here");

    const verify = runVerify({ root, config: cfg(".govkit") });
    expect(verify.checked).toBe(1); // only the rooted doc, not the decoy
    expect(verify.ok).toBe(true);

    const report = runReport({ root, config: cfg(".govkit") });
    expect(report.total).toBe(1);
  });

  it("adopt honors docs.root — finds a doc lacking front-matter under the rooted dir", () => {
    writeDoc(".govkit/docs/rfc", "RFC-0002-y.md", "# A heading\n\nstatus: draft\n");

    const result = runAdopt({ root, config: cfg(".govkit") });
    expect(result.planned).toHaveLength(1);
    expect(result.planned[0]?.file).toContain(".govkit");
  });

  it("audit-write honors docs.root — governs the rooted dir, defers the old one", () => {
    const rootedPath = join(root, ".govkit", "docs", "rfc", "RFC-0003-z.md");
    const oldPath = join(root, "docs", "rfc", "RFC-0003-z.md");
    const naked = { tool_name: "Write", tool_input: { file_path: "", content: "# no fm" } };

    // under .govkit → governed → blocks the front-matter-less write
    const inRoot = auditWrite(
      { ...naked, tool_input: { file_path: rootedPath, content: "# no fm" } },
      root,
      cfg(".govkit"),
    );
    expect(inRoot.block).toBe(true);

    // the same doc at the OLD docs/rfc path is NOT under the configured root → deferred
    const inOld = auditWrite(
      { ...naked, tool_input: { file_path: oldPath, content: "# no fm" } },
      root,
      cfg(".govkit"),
    );
    expect(inOld.block).toBe(false);
  });

  it("loadConfig throws when docs.root escapes the repo root (fail loud, not fail open)", () => {
    writeFileSync(
      join(root, "govkit.yml"),
      'schemaVersion: 1\ndocs:\n  root: "../evil"\n  ignore: [INDEX.md]\n  base:\n    required: [id]\n  types: {}\n',
    );
    expect(() => loadConfig(root)).toThrow(/outside the repo root/);
  });

  it("init --docs-root writes docs.root into govkit.yml and scaffolds under it", () => {
    const result = runInit({ root, docsRoot: ".govkit" });
    expect(result.created).toContain(".govkit/docs/rfc/INDEX.md");
    const yml = readFileSync(join(root, "govkit.yml"), "utf8");
    expect(yml).toMatch(/root:\s*"\.govkit"/);
    // and the scaffolded config round-trips through loadConfig with the root applied
    expect(loadConfig(root).docs.root).toBe(".govkit");
  });

  it("init without --docs-root scaffolds the classic docs/* layout (default unchanged)", () => {
    const result = runInit({ root });
    expect(result.created).toContain("docs/rfc/INDEX.md");
    const yml = readFileSync(join(root, "govkit.yml"), "utf8");
    expect(yml).not.toMatch(/^\s*root:/m);
  });
});
