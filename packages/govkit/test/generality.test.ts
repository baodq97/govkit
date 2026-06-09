import { afterEach, describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type GovkitConfig, loadConfig } from "../src/config";
import { runVerify } from "../src/commands/verify";

const here = fileURLToPath(new URL(".", import.meta.url));

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

describe("runVerify — G2 bounded status cell", () => {
  it("does not accept a status that only appears inside the title cell", () => {
    const root = setupUs(
      "govkit-g2st-",
      "# US Index\n\n| ID | Title | Status |\n|---|---|---|\n| [US-1](./US-1-x.md) | mark as done | open |\n",
      [{ id: "US-1", title: "mark as done", status: "done", owner: "TBD", date: "2026-06-09" }],
    );
    const result = runVerify({ root, config: usConfig() });
    const idx = result.violations.find((v) => v.kind === "index");
    expect(idx?.problems.join(" ")).toContain("status");
  });
});

describe("runVerify — G3 multi-key sync (owner)", () => {
  it("flags an owner-column drift when sync includes owner", () => {
    const root = setupUs(
      "govkit-g3-",
      "# US Index\n\n| ID | Title | Status | Owner |\n|---|---|---|---|\n| [US-1](./US-1-x.md) | t | open | alice |\n",
      [{ id: "US-1", title: "t", status: "open", owner: "bob", date: "2026-06-09" }],
    );
    const result = runVerify({ root, config: usConfig({ sync: ["status", "owner"] }) });
    const idx = result.violations.find((v) => v.kind === "index");
    expect(idx?.problems.join(" ")).toContain("owner");
  });

  it("default sync stays status-only (owner drift ignored without config)", () => {
    const root = setupUs(
      "govkit-g3def-",
      "# US Index\n\n| ID | Title | Status | Owner |\n|---|---|---|---|\n| [US-1](./US-1-x.md) | t | open | alice |\n",
      [{ id: "US-1", title: "t", status: "open", owner: "bob", date: "2026-06-09" }],
    );
    const result = runVerify({ root, config: usConfig() });
    expect(result.violations.find((v) => v.kind === "index")).toBeUndefined();
  });
});

describe("runVerify — G3 null sync is fail-soft (US-0003)", () => {
  it("treats an empty YAML sync: as status-only, never crashes", () => {
    const root = mkdtempSync(join(tmpdir(), "govkit-g3null-"));
    createdRoots.push(root);
    mkdirSync(join(root, "docs", "issues"), { recursive: true });
    writeFileSync(
      join(root, "govkit.yml"),
      [
        "schemaVersion: 1",
        "docs:",
        "  ignore: [INDEX.md, _TEMPLATE.md]",
        "  base: { required: [id, title, status, owner, date] }",
        "  types:",
        "    us:",
        "      dir: docs/issues",
        "      required: [id, title, status, owner, date]",
        "      idPrefix: US",
        "      statuses: [open, done]",
        "      index:",
        "        sync:",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(root, "docs", "issues", "INDEX.md"),
      "# US Index\n\n| ID | Title | Status |\n|---|---|---|\n| [US-1](./US-1-x.md) | t | open |\n",
    );
    writeDoc(root, "docs/issues/US-1-x.md", {
      id: "US-1",
      title: "t",
      status: "open",
      owner: "TBD",
      date: "2026-06-09",
    });
    const config = loadConfig(root);
    expect(() => runVerify({ root, config })).not.toThrow();
    const result = runVerify({ root, config });
    expect(result.violations.find((v) => v.kind === "index")).toBeUndefined();
  });
});

describe("runVerify — n=3 generality fixture (customs-shaped)", () => {
  it("passes a status-less runbook type alongside owner-synced issues", () => {
    const root = join(here, "fixtures", "generality-repo");
    const result = runVerify({ root });
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
