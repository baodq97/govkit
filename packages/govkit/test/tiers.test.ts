// Risk-tiered verify checks (RFC-0014): `tiers:` maps a violation kind to
// blocking|advisory. Pinned here:
//   • library — an advisory kind is still REPORTED (tier field on the one violations
//     list) but no longer fails the gate; absent config = all blocking (zero change);
//   • loadConfig — an unknown kind or a bad tier value is a loud operational error
//     naming the offender and the valid vocabulary (fail loud, never silently ignored);
//   • e2e — an advisory-only repo exits 0, the summary counts advisories, and the
//     --journal record carries the tier.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runVerify } from "../src/commands/verify";
import { type GovkitConfig, loadConfig } from "../src/config";
import type { JournalRecord } from "../src/journal";

const CLI = join(import.meta.dir, "../dist/cli.js");

const CONFIG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status", "owner", "date"] },
    types: {
      adr: { dir: "docs/adr", required: ["id", "title", "status", "owner", "date"] },
    },
  },
};

const VALID_DOC = `---
id: ADR-0001
title: A decision record
status: proposed
owner: alice
date: 2026-01-01
---

Background and decision.
`;

// The row's status says `accepted` while the doc says `proposed` → the fixture's ONLY
// violation is an index (stale-row) one, so demoting `index` flips the whole verdict.
const STALE_INDEX = `# ADR Index

| ADR-0001 | A decision record | accepted | alice | 2026-01-01 |
`;

let root: string;

function buildFixture(): void {
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "docs", "adr", "ADR-0001.md"), VALID_DOC);
  writeFileSync(join(root, "docs", "adr", "INDEX.md"), STALE_INDEX);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-tiers-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("runVerify — risk tiers (RFC-0014)", () => {
  it("an advisory-tier violation is reported but does not fail the gate", () => {
    buildFixture();
    const result = runVerify({ root, config: { ...CONFIG, tiers: { index: "advisory" } } });
    expect(result.ok).toBe(true); // zero BLOCKING violations
    expect(result.violations).toHaveLength(1); // …but the finding is still on the one list
    expect(result.violations[0]?.kind).toBe("index");
    expect(result.violations[0]?.tier).toBe("advisory");
  });

  it("the same repo without tiers fails — absent key means all blocking", () => {
    buildFixture();
    const result = runVerify({ root, config: CONFIG });
    expect(result.ok).toBe(false);
    expect(result.violations[0]?.kind).toBe("index");
    expect(result.violations[0]?.tier).toBe("blocking"); // the default, stamped explicitly
  });
});

describe("loadConfig — tiers validation", () => {
  const writeYml = (tiersBlock: string): void => {
    writeFileSync(join(root, "govkit.yml"), `schemaVersion: 1\n${tiersBlock}docs:\n  types: {}\n`);
  };

  it("accepts every canonical kind and passes the map through", () => {
    writeYml("tiers:\n  index: advisory\n  coherence: blocking\n");
    expect(loadConfig(root).tiers).toEqual({ index: "advisory", coherence: "blocking" });
  });

  it("throws the govkit: operational error naming an unknown kind", () => {
    writeYml("tiers:\n  indx: advisory\n"); // the classic typo the loud error exists for
    expect(() => loadConfig(root)).toThrow(/govkit: tiers names unknown verify kind 'indx'/);
    expect(() => loadConfig(root)).toThrow(/frontmatter/); // the valid-kinds list is shown
  });

  it("throws on a tier value outside blocking|advisory", () => {
    writeYml("tiers:\n  index: warn\n");
    expect(() => loadConfig(root)).toThrow(/govkit: tiers\.index must be 'blocking' or 'advisory'/);
  });

  it("throws when tiers is not a map at all", () => {
    writeYml("tiers: advisory\n");
    expect(() => loadConfig(root)).toThrow(/govkit: tiers must be a map/);
  });
});

describe("tiers (e2e on dist/cli.js)", () => {
  const cli = (args: string[]) =>
    spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });

  const YML_WITH_TIERS = `schemaVersion: 1
tiers:
  index: advisory
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status, owner, date]
  types:
    adr:
      dir: docs/adr
      required: [id, title, status, owner, date]
`;

  it("an advisory-only repo exits 0, prints the advisory count + warn entry", () => {
    buildFixture();
    writeFileSync(join(root, "govkit.yml"), YML_WITH_TIERS);
    const r = cli(["verify", "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("govkit verify: OK");
    expect(r.stdout).toContain("0 violations, 1 advisory"); // both counts in the summary
    expect(r.stdout).toContain("warn "); // the demoted finding is prefixed, not hidden
    expect(r.stdout).toContain("INDEX row status is stale");
  });

  it("the --journal record carries the tier on each violation entry", () => {
    buildFixture();
    writeFileSync(join(root, "govkit.yml"), YML_WITH_TIERS);
    const r = cli(["verify", "--journal", "--root", root]);
    expect(r.status).toBe(0);
    const journal = join(root, ".govkit", "journal.jsonl");
    expect(existsSync(journal)).toBe(true);
    const line = JSON.parse(readFileSync(journal, "utf8").trim()) as JournalRecord;
    expect(line.ok).toBe(true); // the journal records the gate's verdict, tiers included
    expect(line.verify?.violations).toHaveLength(1);
    expect(line.verify?.violations[0]?.kind).toBe("index");
    expect(line.verify?.violations[0]?.tier).toBe("advisory");
  });
});
