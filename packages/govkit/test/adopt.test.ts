import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runAdopt } from "../src/commands/adopt";
import { runVerify } from "../src/commands/verify";
import type { GovkitConfig } from "../src/config";
import { parseFrontMatter } from "../src/frontmatter";

// adopt operates on docs that LACK front-matter (the field-test avalanche: metadata present
// in prose, invisible to the YAML-only gate). The load-bearing rule (RFC-0006): extract and
// surface, NEVER assert — a missing OR uncertain field becomes a gate-failing sentinel, and
// nothing is written without --apply.
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

let root: string;
const adrDir = () => join(root, "docs", "adr");
const write = (name: string, content: string) => writeFileSync(join(adrDir(), name), content);
const read = (name: string) => readFileSync(join(adrDir(), name), "utf8");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-adopt-"));
  mkdirSync(adrDir(), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("runAdopt — Lane 1 front-matter migration", () => {
  it("extracts declared prose metadata into a front-matter block, tagged by provenance", () => {
    // The a-real-repo-style doc the field test surfaced: full metadata, in prose, no YAML block.
    write(
      "ADR-0001-secrets.md",
      "# Secrets Encryption\n\n**Status**: Proposed · **Date**: 2026-05-29 · **Owner**: Platform\n\nbody\n",
    );
    const result = runAdopt({ root, config: CONFIG });
    expect(result.applied).toBe(false);
    const plan = result.planned.find((p) => p.file.includes("ADR-0001-secrets"));
    expect(plan).toBeDefined();
    const f = (k: string) => plan?.fields.find((x) => x.key === k);
    expect(f("title")).toMatchObject({ value: "Secrets Encryption", source: "extracted" });
    expect(f("status")).toMatchObject({ value: "proposed", source: "extracted" }); // lowercased
    expect(f("owner")).toMatchObject({ value: "Platform", source: "extracted" });
    expect(f("date")).toMatchObject({ value: "2026-05-29", source: "extracted" });
    expect(f("id")).toMatchObject({ value: "ADR-0001", source: "extracted" }); // from filename
  });

  it("CONSERVATISM FLOOR: a status word in BODY PROSE (no `Status:` line) is NOT extracted — it is the sentinel", () => {
    // The real leak this RFC is drawn around is a WRONG extraction silently passing the gate.
    // Guard: extract ONLY from anchored declared line shapes, never free prose. Here "proposed"
    // appears in a sentence; there is no `Status:` line; status MUST come out as missing.
    write(
      "ADR-0002-prose.md",
      "# A Design\n\nWe evaluated options and chose the proposed approach for now.\n",
    );
    const result = runAdopt({ root, config: CONFIG });
    const plan = result.planned.find((p) => p.file.includes("ADR-0002-prose"));
    const status = plan?.fields.find((x) => x.key === "status");
    expect(status?.source).toBe("missing"); // NOT "extracted: proposed"
  });

  it("VALUE-QUOTING + END-TO-END: a colon-in-title doc round-trips; a missing field fails verify after --apply", () => {
    // Two real hazards in one: (1) `# Connector: Secrets` must serialize as quoted YAML or the
    // tool corrupts its own output; (2) the missing-field sentinel must survive YAML parse and
    // trip checkPlaceholder. This is the linchpin — it proves "never assert" end to end.
    write("ADR-0003-colon.md", "# Connector: Secrets\n\n**Status**: accepted\n\nbody text here\n");
    runAdopt({ root, config: CONFIG, apply: true });

    const migrated = read("ADR-0003-colon.md");
    const fm = parseFrontMatter(migrated);
    expect(fm).not.toBeNull(); // serialized a parseable block despite the colon
    expect(fm?.data.title).toBe("Connector: Secrets"); // colon preserved, not mis-parsed
    expect(fm?.data.status).toBe("accepted");

    // owner + date were not in prose → sentinel → verify must still FAIL (loud, not masked).
    const v = runVerify({ root, config: CONFIG });
    const ph = v.violations.filter((x) => x.kind === "placeholder");
    expect(ph.some((x) => x.file.includes("ADR-0003-colon"))).toBe(true);
    expect(v.ok).toBe(false);
  });

  it("a fully-extractable doc passes verify after --apply (the migration actually works)", () => {
    write(
      "ADR-0004-full.md",
      "# Full Doc\n\n**Status**: accepted · **Owner**: Bao · **Date**: 2026-05-31\n\nplenty of body\n",
    );
    runAdopt({ root, config: CONFIG, apply: true });
    const v = runVerify({ root, config: CONFIG });
    expect(v.violations.some((x) => x.file.includes("ADR-0004-full"))).toBe(false);
  });

  it("NON-DESTRUCTION: a doc that already has front-matter is left byte-identical and out of the plan", () => {
    const original =
      "---\nid: ADR-0009\ntitle: Existing\nstatus: proposed\nowner: TBD\ndate: 2026-05-31\n---\n\nbody\n";
    write("ADR-0009-existing.md", original);
    const result = runAdopt({ root, config: CONFIG, apply: true });
    expect(result.planned.some((p) => p.file.includes("ADR-0009"))).toBe(false);
    expect(read("ADR-0009-existing.md")).toBe(original); // untouched
  });

  it("DRY-RUN DEFAULT: without --apply, nothing on disk changes", () => {
    const original = "# Dry\n\n**Status**: proposed\n\nbody\n";
    write("ADR-0005-dry.md", original);
    const result = runAdopt({ root, config: CONFIG });
    expect(result.applied).toBe(false);
    expect(result.planned.length).toBeGreaterThan(0); // it planned
    expect(read("ADR-0005-dry.md")).toBe(original); // but wrote nothing
  });

  it("IDEMPOTENT: a second --apply run is a no-op (the block now exists)", () => {
    write(
      "ADR-0006-idem.md",
      "# Idem\n\n**Status**: proposed · **Owner**: Bao · **Date**: 2026-05-31\n\nbody\n",
    );
    runAdopt({ root, config: CONFIG, apply: true });
    const afterFirst = read("ADR-0006-idem.md");
    const second = runAdopt({ root, config: CONFIG, apply: true });
    expect(second.planned.some((p) => p.file.includes("ADR-0006"))).toBe(false);
    expect(read("ADR-0006-idem.md")).toBe(afterFirst);
  });
});

describe("runAdopt — Lane 2 vocabulary / config drift (report-only)", () => {
  it("reports a status value outside the enum as a suggested patch, and NEVER writes govkit.yml", () => {
    // us-4870/4871 in the field test: front-matter present, `status: shipped` outside the enum.
    write(
      "ADR-0007-shipped.md",
      "---\nid: ADR-0007\ntitle: Shipped\nstatus: shipped\nowner: TBD\ndate: 2026-05-31\n---\n\nbody\n",
    );
    writeFileSync(join(root, "govkit.yml"), "schemaVersion: 1\n"); // a sentinel file to prove non-mutation
    const before = readFileSync(join(root, "govkit.yml"), "utf8");

    const result = runAdopt({ root, config: CONFIG });
    const drift = result.drift.find((d) => d.type === "adr" && d.key === "status");
    expect(drift?.unknown).toContain("shipped");
    expect(drift?.suggested).toContain("shipped"); // suggested enum includes it
    expect(readFileSync(join(root, "govkit.yml"), "utf8")).toBe(before); // govkit.yml untouched
  });
});
