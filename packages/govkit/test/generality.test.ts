import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type GovkitConfig, loadConfig } from "../src/config";
import { runVerify } from "../src/commands/verify";

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

// A repo with a single lifecycle-less `runbook` type: no `status`, INDEX opted out.
function runbookConfig(): GovkitConfig {
  return {
    schemaVersion: 1,
    docs: {
      ignore: ["INDEX.md", "_TEMPLATE.md"],
      base: { required: ["id", "title", "status", "owner", "date"] },
      types: {
        runbook: {
          dir: "docs/runbooks",
          required: ["id", "title", "service", "severity", "owner", "date"],
          idPrefix: "RB",
          excludeBase: ["status"],
          index: false,
        },
      },
    },
  };
}

function writeDoc(root: string, rel: string, fields: Record<string, string>): void {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  writeFileSync(join(root, rel), `---\n${fm}\n---\n\nbody text here\n`);
}

describe("runVerify — G1 excludeBase", () => {
  it("passes a status-less runbook (status dropped from required)", () => {
    const root = mkdtempSync(join(tmpdir(), "govkit-g1-"));
    createdRoots.push(root);
    mkdirSync(join(root, "docs", "runbooks"), { recursive: true });
    writeDoc(root, "docs/runbooks/RB-0001-stuck.md", {
      id: "RB-0001",
      title: "Worker job stuck",
      service: "worker",
      severity: "high",
      owner: "TBD",
      date: "2026-06-09",
    });
    const result = runVerify({ root, config: runbookConfig() });
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

describe("runVerify — G1 index:false", () => {
  it("does not require an INDEX.md for an index:false type", () => {
    const root = mkdtempSync(join(tmpdir(), "govkit-g1idx-"));
    createdRoots.push(root);
    mkdirSync(join(root, "docs", "runbooks"), { recursive: true });
    // NOTE: no INDEX.md written on purpose.
    writeDoc(root, "docs/runbooks/RB-0001-stuck.md", {
      id: "RB-0001",
      title: "Worker job stuck",
      service: "worker",
      severity: "high",
      owner: "TBD",
      date: "2026-06-09",
    });
    const result = runVerify({ root, config: runbookConfig() });
    expect(result.violations.filter((v) => v.kind === "index")).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

// Single `us` type, status-only sync (legacy default), used by G2/G3 tests.
function usConfig(index?: GovkitConfig["docs"]["types"][string]["index"]): GovkitConfig {
  return {
    schemaVersion: 1,
    docs: {
      ignore: ["INDEX.md", "_TEMPLATE.md"],
      base: { required: ["id", "title", "status", "owner", "date"] },
      types: {
        us: {
          dir: "docs/issues",
          required: ["id", "title", "status", "owner", "date"],
          idPrefix: "US",
          statuses: ["open", "done"],
          ...(index !== undefined ? { index } : {}),
        },
      },
    },
  };
}

function setupUs(prefix: string, indexBody: string, docs: Record<string, string>[]): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  createdRoots.push(root);
  mkdirSync(join(root, "docs", "issues"), { recursive: true });
  writeFileSync(join(root, "docs", "issues", "INDEX.md"), indexBody);
  for (const d of docs) writeDoc(root, `docs/issues/${d.id}-x.md`, d);
  return root;
}

describe("runVerify — G2 bounded id lookup", () => {
  it("flags US-1 as unindexed when only US-10 has a row", () => {
    const root = setupUs(
      "govkit-g2id-",
      "# US Index\n\n| ID | Title | Status |\n|---|---|---|\n| [US-10](./US-10-x.md) | t | done |\n",
      [{ id: "US-1", title: "t", status: "open", owner: "TBD", date: "2026-06-09" }],
    );
    const result = runVerify({ root, config: usConfig() });
    const idx = result.violations.find((v) => v.kind === "index");
    expect(idx?.problems.join(" ")).toContain("US-1");
    expect(idx?.problems.join(" ")).toContain("no row");
  });
});
