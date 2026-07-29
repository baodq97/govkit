import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runInit } from "../src/commands/init";
import { runVerify } from "../src/commands/verify";

// Every gate the SHIPPED default schema declares, driven end to end from a fresh `runInit`
// scaffold: induce the violation, assert verify rejects it.
//
// Why this file exists rather than more assertions on config keys: 0.10.0 shipped
// `terminalStatuses` on rfc/us/rel and a test asserting those keys were present, and chain
// coherence STILL did not fire — because it is checked across a *resolved* `refs:` edge that
// the default declared on `rel` only. A key being present proves nothing about whether the
// gate it belongs to can fire. Only inducing the violation does.
//
// Fallibility was measured, not assumed — each key deleted from templates/govkit.default.yml
// in turn, 2026-07-29:
//
//   drop us.refs                  -> 3 red  (both coherence edges AND the dangling-parent case)
//   drop adr.terminalStatuses     -> 1 red  (the ADR edge)
//   drop rfc.requiredSectionsByStatus -> 1 red
//   drop rel.requiredSectionsByStatus -> 1 red
//   drop `priority` from us.required  -> 1 red
//   drop domain.recursive         -> 1 red
//   drop domain.idFilenameConvention -> 1 red
//
// The first row is the whole lesson: `refs:` is the precondition for three separate gates, so
// its absence reads as "three features quietly off" rather than one config line missing. A
// test here that cannot be turned red this way is decoration and should be deleted.
describe("the scaffolded default schema — every declared gate actually fires", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "govkit-scaffold-gates-"));
    runInit({ root: dir });
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // Writes the doc AND its INDEX row. verify checks both, so a test that writes only the doc
  // fails on the missing row — the right verdict for the wrong reason, which is worse than no
  // test at all because it stays green when the gate under test breaks.
  function doc(
    typeDir: string,
    relPath: string,
    front: Record<string, string>,
    body: string,
  ): void {
    const path = join(dir, typeDir, relPath);
    mkdirSync(dirname(path), { recursive: true });
    const fm = Object.entries(front)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    writeFileSync(path, `---\n${fm}\n---\n\n${body}\n`);
    appendFileSync(
      join(dir, typeDir, "INDEX.md"),
      `| [${front.id}](./${relPath}) | ${front.title} | ${front.status} | ${front.owner} | ${front.date} |\n`,
    );
  }

  const base = (id: string, title: string, status: string) => ({
    id,
    title,
    status,
    owner: "TBD",
    date: "2026-07-29",
  });

  const failures = (): string[] => {
    const v = runVerify({ root: dir });
    return v.violations.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
  };

  // RFC-0008 across the US->RFC edge. The case that escaped 0.9.0 AND 0.10.0.
  it("rejects a US at `done` whose parent RFC is still `draft`", () => {
    doc(
      "docs/rfc",
      "RFC-0001-undecided.md",
      base("RFC-0001", "An undecided design", "draft"),
      "# RFC-0001\n\nStill argued about.",
    );
    doc(
      "docs/issues",
      "US-0001-shipped.md",
      { ...base("US-0001", "Shipped anyway", "done"), priority: "P1", parent: "RFC-0001" },
      "# US-0001\n\nDone under an undecided design.",
    );
    expect(runVerify({ root: dir }).ok).toBe(false);
    expect(failures().join("\n")).toContain("RFC-0001");
  });

  // Same gate over the OTHER decided-parent type. `terminalStatuses` on adr shipped in 0.10.1;
  // before that an ADR could be `proposed` forever with shipped children hanging off it.
  it("rejects a US at `done` whose parent ADR is still `proposed`", () => {
    doc(
      "docs/adr",
      "ADR-0001-choice.md",
      base("ADR-0001", "A choice", "proposed"),
      "# ADR-0001\n\n## Context\nSomething.\n\n## Decision\nThis.",
    );
    doc(
      "docs/issues",
      "US-0001-shipped.md",
      { ...base("US-0001", "Shipped anyway", "done"), priority: "P1", parent: "ADR-0001" },
      "# US-0001\n\nDone under an undecided choice.",
    );
    expect(runVerify({ root: dir }).ok).toBe(false);
  });

  // RFC-0003. Independent of coherence: a parent that names nothing real is a broken
  // declaration whatever the statuses say.
  it("rejects a `parent:` that resolves to no known id", () => {
    doc(
      "docs/issues",
      "US-0001-orphan.md",
      { ...base("US-0001", "An orphan", "open"), priority: "P1", parent: "RFC-9999" },
      "# US-0001\n\nAs a user I want a thing so that I benefit.",
    );
    expect(runVerify({ root: dir }).ok).toBe(false);
    expect(failures().join("\n")).toContain("RFC-9999");
  });

  // RFC-0010 on rfc. Inert until a doc reaches `implemented` — which is the point, but also
  // why nothing exercised it: a scaffold has no implemented RFC until someone writes one.
  it("rejects an RFC at `implemented` with no as-built / deviations sections", () => {
    doc(
      "docs/rfc",
      "RFC-0001-shipped.md",
      base("RFC-0001", "A shipped design", "implemented"),
      "# RFC-0001\n\n## Summary\nWe built it.",
    );
    expect(runVerify({ root: dir }).ok).toBe(false);
    const all = failures().join("\n");
    expect(all).toContain("As-built");
    expect(all).toContain("Deviations from design");
  });

  // RFC-0010 on rel, the same forcing function on the release record.
  it("rejects a REL at `released` that never says how to roll back", () => {
    doc(
      "docs/releases",
      "REL-0001-v1.md",
      base("REL-0001", "v1", "released"),
      "# REL-0001\n\n## What shipped\nThe thing.\n\n## Migration\nNone.",
    );
    expect(runVerify({ root: dir }).ok).toBe(false);
    expect(failures().join("\n")).toContain("Rollback");
  });

  // `us.required` carries `priority` on top of the base five.
  it("rejects a US missing the type-specific `priority` key", () => {
    doc(
      "docs/issues",
      "US-0001-x.md",
      base("US-0001", "A story", "open"),
      "# US-0001\n\nAs a user I want a thing so that I benefit.",
    );
    expect(runVerify({ root: dir }).ok).toBe(false);
    expect(failures().join("\n")).toContain("priority");
  });

  // domain carries `recursive: true` + `idFilenameConvention: false` — the ddd-flow tree nests
  // by context and names files after concepts, so BOTH must hold or the plugin's own output
  // fails the consumer's gate. This is the one case here asserting a pass: the risk is a false
  // positive, not a miss.
  it("accepts a nested, concept-named domain doc (recursive + no id-filename convention)", () => {
    doc(
      "docs/domain",
      "sales/order-lifecycle.md",
      base("DOMAIN-0001", "Order lifecycle", "draft"),
      "# Order lifecycle\n\nAn order moves from placed to fulfilled.",
    );
    const v = runVerify({ root: dir });
    expect(v.ok, failures().join("\n")).toBe(true);
    expect(v.checked, "the nested file must be discovered, not skipped").toBe(1);
  });
});
