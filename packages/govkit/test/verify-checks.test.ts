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
        refs: [{ key: "parent" }],
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

describe("runVerify — chain referential-integrity (RFC-0003)", () => {
  it("resolves a real parent, flags a dangling one, skips an absent one", () => {
    write("ADR-0001-root.md", { id: "ADR-0001", status: "proposed", ...base }); // root, no parent
    write("ADR-0002-child.md", { id: "ADR-0002", status: "proposed", parent: "ADR-0001", ...base }); // resolves
    write("ADR-0003-bad.md", { id: "ADR-0003", status: "proposed", parent: "ADR-9999", ...base }); // dangling
    indexRows("ADR-0001", "ADR-0002", "ADR-0003");

    const result = runVerify({ root, config: CONFIG });
    const refs = result.violations.filter((v) => v.kind === "reference");
    expect(refs).toHaveLength(1);
    expect(refs[0]?.file).toContain("ADR-0003");
    expect(refs[0]?.problems.join(" ")).toContain("parent: ADR-9999");
    expect(refs[0]?.problems.join(" ")).toContain("does not resolve");
  });
});

describe("runVerify — --changed report scoping (RFC-0004)", () => {
  // Build the changed-set the CLI would derive from git — absolute paths under docs/adr.
  const changedSet = (...names: string[]) => ({
    files: new Set(names.map((n) => join(root, "docs", "adr", n))),
    ref: "origin/main",
  });

  it("scopes per-doc violations to the changed set, and records the scope", () => {
    write("ADR-0001-x.md", { id: "ADR-0001", status: "bogus", ...base }); // untouched, bad status
    write("ADR-0002-y.md", { id: "ADR-0002", status: "alsobad", ...base }); // changed, bad status
    indexRows("ADR-0001", "ADR-0002");

    const result = runVerify({ root, config: CONFIG, changed: changedSet("ADR-0002-y.md") });
    const status = result.violations.filter((v) => v.kind === "status");
    expect(status).toHaveLength(1);
    expect(status[0]?.file).toContain("ADR-0002"); // untouched ADR-0001's bad status is NOT reported
    expect(result.scoped).toEqual({ ref: "origin/main", changedDocs: 1 });
  });

  it("NO-MASK FLOOR: a new doc duplicating an UNTOUCHED doc's id is still reported", () => {
    // The duplicate violation's `file` is the alphabetically-first colliding doc — the
    // UNTOUCHED one — so a naive `changed.has(v.file)` filter would mask it. It must not.
    write("ADR-0001-original.md", { id: "ADR-0001", status: "proposed", ...base }); // untouched
    write("ADR-0001-sneaky.md", { id: "ADR-0001", status: "proposed", ...base }); // changed (new)
    indexRows("ADR-0001");

    const result = runVerify({ root, config: CONFIG, changed: changedSet("ADR-0001-sneaky.md") });
    const dup = result.violations.filter((v) => v.kind === "duplicate");
    expect(dup).toHaveLength(1);
    expect(dup[0]?.problems.join(" ")).toContain("ADR-0001");
  });

  it("NO-MASK FLOOR: a dangling reference in a changed doc is reported", () => {
    write("ADR-0001-root.md", { id: "ADR-0001", status: "proposed", ...base }); // untouched
    write("ADR-0002-bad.md", { id: "ADR-0002", status: "proposed", parent: "ADR-9999", ...base }); // changed, dangling
    indexRows("ADR-0001", "ADR-0002");

    const result = runVerify({ root, config: CONFIG, changed: changedSet("ADR-0002-bad.md") });
    const refs = result.violations.filter((v) => v.kind === "reference");
    expect(refs).toHaveLength(1);
    expect(refs[0]?.file).toContain("ADR-0002");
  });

  it("keeps an INDEX violation when a changed doc shares its type", () => {
    write("ADR-0001-x.md", { id: "ADR-0001", status: "proposed", ...base }); // changed, no INDEX row
    indexRows(); // empty INDEX → ADR-0001 has no row

    const result = runVerify({ root, config: CONFIG, changed: changedSet("ADR-0001-x.md") });
    expect(result.violations.some((v) => v.kind === "index")).toBe(true);
  });

  it("does NOT flood untouched docs' missing-row entries through the INDEX check", () => {
    // The adoption scenario: many legacy docs with ids but no INDEX rows. Touching ONE
    // must not surface the whole type's INDEX backlog (that backfill is the retrofit
    // --changed exists to defer). Only the changed doc's missing row is the PR's concern.
    write("ADR-0001-touched.md", { id: "ADR-0001", status: "proposed", ...base }); // changed
    write("ADR-0002-legacy.md", { id: "ADR-0002", status: "proposed", ...base }); // untouched
    write("ADR-0003-legacy.md", { id: "ADR-0003", status: "proposed", ...base }); // untouched
    indexRows(); // empty INDEX → all three lack rows

    const result = runVerify({ root, config: CONFIG, changed: changedSet("ADR-0001-touched.md") });
    const idx = result.violations.filter((v) => v.kind === "index");
    const problems = idx.flatMap((v) => v.problems).join("\n");
    expect(problems).toContain("ADR-0001"); // the touched doc's missing row IS reported
    expect(problems).not.toContain("ADR-0002"); // untouched legacy rows are NOT flooded
    expect(problems).not.toContain("ADR-0003");
  });

  it("ALWAYS-REPORT residue: a pre-existing duplicate among UNTOUCHED docs still surfaces", () => {
    // The accepted tradeoff of always-reporting global-integrity kinds: it cannot mask a NEW
    // collision (good), but it also cannot suppress a PRE-EXISTING one — so a repo carrying
    // legacy duplicate-ids can't get a green `check --changed` until it fixes that debt, even
    // on a PR that touched none of the colliding docs. Documented here, not hidden.
    write("ADR-0005-a.md", { id: "ADR-0005", status: "proposed", ...base }); // untouched dup
    write("ADR-0005-b.md", { id: "ADR-0005", status: "proposed", ...base }); // untouched dup
    write("ADR-0009-x.md", { id: "ADR-0009", status: "proposed", ...base }); // the only changed doc
    indexRows("ADR-0005", "ADR-0009");

    const result = runVerify({ root, config: CONFIG, changed: changedSet("ADR-0009-x.md") });
    expect(result.violations.some((v) => v.kind === "duplicate")).toBe(true); // flood-by-design
  });

  it("suppresses a per-doc violation when no doc in its type changed", () => {
    write("ADR-0001-x.md", { id: "ADR-0001", status: "bogus", ...base }); // untouched, bad status
    indexRows("ADR-0001");

    const result = runVerify({ root, config: CONFIG, changed: changedSet("nothing-here.md") });
    expect(result.violations.filter((v) => v.kind === "status")).toHaveLength(0);
    expect(result.ok).toBe(true);
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
