// Error-DX audit (teaching errors): a failing gate must (a) name the exact file and
// what disagreed, (b) enumerate the valid options when an enum/value is rejected, and
// (c) say how to fix it — never a bare score or a bare "invalid X". Pins the improved
// verify/config messages plus the best pre-existing ones (US-0002/US-0003 house style)
// so a future rewrite cannot regress a message back to unteaching.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runVerify } from "../src/commands/verify";
import { type GovkitConfig, loadConfig, VIOLATION_KINDS } from "../src/config";

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

function doc(fields: Record<string, string>): string {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `---\n${fm}\n---\n\nbody text\n`;
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-errordx-"));
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(name: string, fields: Record<string, string>): void {
  writeFileSync(join(root, "docs", "adr", name), doc(fields));
}

const base = { title: "t", owner: "TBD", date: "2026-07-08" };
const problems = (v: { problems: string[] } | undefined): string => v?.problems.join(" ") ?? "";

describe("error DX — verify violations teach the fix", () => {
  it("status enum rejection names the value AND enumerates the full valid set", () => {
    write("ADR-0001-x.md", { id: "ADR-0001", status: "bogus", ...base });
    const v = runVerify({ root, config: CONFIG }).violations.find((x) => x.kind === "status");
    expect(v?.file).toContain("ADR-0001-x.md"); // (a) the exact file
    expect(problems(v)).toContain("'bogus'"); // (a) what disagreed
    // (b) every valid option, not a truncated hint
    expect(problems(v)).toContain("[proposed, accepted, rejected, superseded]");
  });

  it("missing required key says how to fix — add `key: <value>` to the `---` block", () => {
    write("ADR-0001-x.md", { id: "ADR-0001", status: "proposed", title: "t", date: "2026-07-08" });
    const v = runVerify({ root, config: CONFIG }).violations.find((x) => x.kind === "frontmatter");
    expect(problems(v)).toContain("owner");
    expect(problems(v)).toContain("add `owner: <value>` to the leading `---` block");
  });

  it("placeholder rejection says to replace it and names the one legal sentinel", () => {
    write("ADR-0001-x.md", { id: "ADR-0001", status: "proposed", ...base, title: "CHANGEME" });
    const v = runVerify({ root, config: CONFIG }).violations.find((x) => x.kind === "placeholder");
    expect(problems(v)).toContain("'title': CHANGEME");
    expect(problems(v)).toContain("replace it with a real value");
    expect(problems(v)).toContain("owner: TBD");
  });

  it("INDEX violations carry the repair, keeping the scoping-load-bearing prefixes", () => {
    write("ADR-0001-x.md", { id: "ADR-0001", status: "accepted", ...base });
    write("ADR-0002-y.md", { id: "ADR-0002", status: "proposed", ...base });
    writeFileSync(
      join(root, "docs", "adr", "INDEX.md"),
      "# ADR Index\n\n| ADR-0001 | t | proposed | TBD | 2026-07-08 |\n",
    );
    const v = runVerify({ root, config: CONFIG }).violations.find((x) => x.kind === "index");
    // stale row: front-matter is the source of truth and the row must move to it
    expect(problems(v)).toContain("ADR-0001 INDEX row status is stale");
    expect(problems(v)).toContain("update the row to 'accepted'");
    // missing row: scopeToChanged keys on the leading id, so the id must stay first
    expect(v?.problems.some((p) => p.startsWith("ADR-0002 "))).toBe(true);
    expect(problems(v)).toContain("add a row carrying the id and its status");
  });
});

describe("error DX — config errors name govkit.yml and the valid vocabulary", () => {
  const writeYml = (body: string): void => {
    writeFileSync(join(root, "govkit.yml"), `schemaVersion: 1\n${body}docs:\n  types: {}\n`);
  };

  it("unknown tiers kind names govkit.yml and enumerates ALL canonical kinds", () => {
    writeYml("tiers:\n  indx: advisory\n");
    let message = "";
    try {
      loadConfig(root);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("'indx'");
    expect(message).toContain(join(root, "govkit.yml")); // (a) the exact file
    for (const kind of VIOLATION_KINDS) expect(message).toContain(kind); // (b) every option
  });

  it("bad tier value names the offender, both valid values, and govkit.yml", () => {
    writeYml("tiers:\n  index: warn\n");
    expect(() => loadConfig(root)).toThrow(/tiers\.index must be 'blocking' or 'advisory'/);
    expect(() => loadConfig(root)).toThrow(/got 'warn'/);
    expect(() => loadConfig(root)).toThrow(/govkit\.yml/);
  });

  it("escaping docs.root names govkit.yml and states the constraint", () => {
    writeFileSync(
      join(root, "govkit.yml"),
      'schemaVersion: 1\ndocs:\n  root: "../evil"\n  types: {}\n',
    );
    expect(() => loadConfig(root)).toThrow(/docs\.root '\.\.\/evil' in .*govkit\.yml/);
    expect(() => loadConfig(root)).toThrow(/must stay within --root/);
  });

  it("missing govkit.yml keeps the US-0003 house message: path + `govkit init` fix", () => {
    expect(() => loadConfig(root)).toThrow(/no govkit\.yml at .*govkit\.yml/);
    expect(() => loadConfig(root)).toThrow(/run `govkit init` first/);
  });
});

describe("error DX — the US-0002 house standard holds for invalid YAML", () => {
  it("unparseable front-matter is one violation naming file + parser detail, no throw", () => {
    writeFileSync(
      join(root, "docs", "adr", "ADR-0001-x.md"),
      "---\nid: ADR-0001\nowner: @handle\n---\n\nbody\n",
    );
    const result = runVerify({ root, config: CONFIG });
    const v = result.violations.find((x) => x.kind === "frontmatter");
    expect(v?.file).toContain("ADR-0001-x.md");
    expect(problems(v)).toContain("invalid YAML front-matter");
    expect(problems(v)).toMatch(/line \d+/); // the parser's position survives into the report
  });
});
