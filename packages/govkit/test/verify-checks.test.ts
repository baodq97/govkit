import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runVerify } from "../src/commands/verify";
import type { GovkitConfig } from "../src/config";

// A minimal config exercising the new structural checks: a status enum and an
// id-prefix convention on a single `adr` type.
const CONFIG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status", "owner", "date"] },
    types: {
      adr: {
        dir: "docs/adr",
        required: ["id", "title", "status", "owner", "date"],
        idPrefix: "ADR",
        statuses: ["proposed", "accepted", "rejected", "superseded"],
      },
    },
  },
};

function doc(fields: Record<string, string>, body = "body text"): string {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `---\n${fm}\n---\n\n${body}\n`;
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-verify-"));
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(name: string, fields: Record<string, string>, body?: string): void {
  writeFileSync(join(root, "docs", "adr", name), doc(fields, body));
}

function indexRows(...ids: string[]): void {
  const rows = ids.map((id) => `| ${id} | t | proposed | TBD | 2026-05-31 |`).join("\n");
  writeFileSync(join(root, "docs", "adr", "INDEX.md"), `# ADR Index\n\n${rows}\n`);
}

const base = { title: "t", owner: "TBD", date: "2026-05-31" };

describe("runVerify — status enum", () => {
  it("flags a status outside the configured set, passes a valid one", () => {
    write("ADR-0001-x.md", { id: "ADR-0001", status: "proposed", ...base });
    write("ADR-0002-y.md", { id: "ADR-0002", status: "bogus", ...base });
    indexRows("ADR-0001", "ADR-0002");

    const result = runVerify({ root, config: CONFIG });
    const status = result.violations.filter((v) => v.kind === "status");
    expect(status).toHaveLength(1);
    expect(status[0]?.file).toContain("ADR-0002");
    expect(status[0]?.problems.join(" ")).toContain("bogus");
  });
});

describe("runVerify — id convention", () => {
  it("flags a bad id prefix and a filename that doesn't match the id", () => {
    write("ADR-0001-x.md", { id: "FOO-0001", status: "proposed", ...base }); // bad prefix
    write("wrong-name.md", { id: "ADR-0002", status: "proposed", ...base }); // filename mismatch
    indexRows("FOO-0001", "ADR-0002");

    const result = runVerify({ root, config: CONFIG });
    const id = result.violations.filter((v) => v.kind === "id");
    expect(id).toHaveLength(2);
    expect(id.find((v) => v.file.includes("ADR-0001-x"))?.problems.join(" ")).toContain("ADR-");
    expect(id.find((v) => v.file.includes("wrong-name"))?.problems.join(" ")).toContain("filename");
  });
});

describe("runVerify — duplicate ids", () => {
  it("flags the same id declared in two docs", () => {
    write("ADR-0001-a.md", { id: "ADR-0001", status: "proposed", ...base });
    write("ADR-0001-b.md", { id: "ADR-0001", status: "proposed", ...base });
    indexRows("ADR-0001");

    const result = runVerify({ root, config: CONFIG });
    const dup = result.violations.filter((v) => v.kind === "duplicate");
    expect(dup).toHaveLength(1);
    expect(dup[0]?.problems.join(" ")).toContain("ADR-0001");
  });
});

describe("runVerify — placeholder", () => {
  it("flags an angle-bracket / token placeholder but NOT owner: TBD", () => {
    write("ADR-0001-x.md", {
      id: "ADR-0001",
      status: "proposed",
      title: "t",
      owner: "<your-name>",
      date: "2026-05-31",
    });
    write("ADR-0002-y.md", {
      id: "ADR-0002",
      status: "proposed",
      title: "t",
      owner: "REPLACE_ME",
      date: "2026-05-31",
    });
    write("ADR-0003-z.md", { id: "ADR-0003", status: "proposed", ...base }); // owner: TBD — must pass
    indexRows("ADR-0001", "ADR-0002", "ADR-0003");

    const result = runVerify({ root, config: CONFIG });
    const ph = result.violations.filter((v) => v.kind === "placeholder");
    expect(ph).toHaveLength(2);
    expect(ph.map((v) => v.file).join(" ")).not.toContain("ADR-0003"); // TBD is legal
  });
});
