import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config";

const createdRoots: string[] = [];

function configRepo(yml: string): string {
  const root = mkdtempSync(join(tmpdir(), "govkit-generality-"));
  createdRoots.push(root);
  writeFileSync(join(root, "govkit.yml"), yml);
  return root;
}

afterEach(() => {
  for (const root of createdRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("loadConfig — RFC-0011 fields", () => {
  it("surfaces excludeBase and index on a type", () => {
    const root = configRepo(
      [
        "schemaVersion: 1",
        "docs:",
        "  ignore: [INDEX.md]",
        "  base: { required: [id, title, status, owner, date] }",
        "  types:",
        "    runbook:",
        "      dir: docs/runbooks",
        "      required: [id, title, service, severity, owner, date]",
        "      excludeBase: [status]",
        "      index: false",
        "    us:",
        "      dir: docs/issues",
        "      required: [id, title, status, owner, date]",
        "      index: { sync: [status, owner] }",
        "",
      ].join("\n"),
    );
    const cfg = loadConfig(root);
    expect(cfg.docs.types.runbook?.excludeBase).toEqual(["status"]);
    expect(cfg.docs.types.runbook?.index).toBe(false);
    expect(cfg.docs.types.us?.index).toEqual({ sync: ["status", "owner"] });
  });

  it("rejects excludeBase that drops id (breaks cross-doc checks)", () => {
    const root = configRepo(
      [
        "schemaVersion: 1",
        "docs:",
        "  ignore: [INDEX.md]",
        "  base: { required: [id, title, status, owner, date] }",
        "  types:",
        "    note:",
        "      dir: docs/notes",
        "      required: [title]",
        "      excludeBase: [id]",
        "",
      ].join("\n"),
    );
    expect(() => loadConfig(root)).toThrow(/excludeBase/);
  });

  it("rejects excludeBase that drops title (breaks display/index)", () => {
    const root = configRepo(
      [
        "schemaVersion: 1",
        "docs:",
        "  ignore: [INDEX.md]",
        "  base: { required: [id, title, status, owner, date] }",
        "  types:",
        "    note:",
        "      dir: docs/notes",
        "      required: [id]",
        "      excludeBase: [title]",
        "",
      ].join("\n"),
    );
    expect(() => loadConfig(root)).toThrow(/excludeBase/);
  });
});
