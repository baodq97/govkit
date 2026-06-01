import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runVerify } from "../src/commands/verify";
import type { GovkitConfig } from "../src/config";

// RFC-0010 status-conditional required sections: a doc must carry the configured `## As-built`
// sections ONLY when its status is the keyed post-implementation status (`implemented`) — NOT at
// `accepted` (which precedes implementation), NOT at every terminal status. The required-section
// trigger reads `requiredSectionsByStatus`, deliberately DECOUPLED from `terminalStatuses` — the
// decoupling is the fix for the caught flaw (keying to terminalStatuses fired at accept-time,
// before any divergence could exist, then never again).
const CONFIG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status"] },
    types: {
      rfc: {
        dir: "docs/rfc",
        required: ["id", "title", "status"],
        idPrefix: "RFC",
        statuses: ["draft", "accepted", "implemented", "superseded"],
        terminalStatuses: ["accepted", "implemented", "superseded"],
        requiredSectionsByStatus: {
          implemented: ["As-built", "Deviations from design"],
        },
      },
    },
  },
};

// A type that declares NO requiredSectionsByStatus — the non-breaking floor: the check must be
// entirely dark for it, even at the would-be-keyed status.
const CONFIG_NO_SECTIONS: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status"] },
    types: {
      rfc: {
        dir: "docs/rfc",
        required: ["id", "title", "status"],
        idPrefix: "RFC",
        statuses: ["draft", "accepted", "implemented", "superseded"],
      },
    },
  },
};

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-sections-"));
  mkdirSync(join(root, "docs", "rfc"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeRfc(name: string, fields: Record<string, string>, body: string): void {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  writeFileSync(join(root, "docs", "rfc", name), `---\n${fm}\n---\n\n${body}\n`);
}
function rfcIndex(...ids: string[]): void {
  const rows = ids.map((id) => `| ${id} | implemented |`).join("\n");
  writeFileSync(join(root, "docs", "rfc", "INDEX.md"), `# RFC\n\n${rows}\n`);
}

const BOTH = "## As-built\n\nIt shipped as designed.\n\n## Deviations from design\n\nNone.\n";

describe("runVerify — status-conditional required sections (RFC-0010)", () => {
  it("flags an implemented doc missing the required As-built section", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "implemented" }, "just prose");
    rfcIndex("RFC-0001");

    const result = runVerify({ root, config: CONFIG });
    const sec = result.violations.filter((v) => v.kind === "section");
    expect(sec).toHaveLength(1);
    expect(sec[0]?.file).toContain("RFC-0001");
    expect(sec[0]?.problems.join(" ")).toContain("As-built");
    expect(sec[0]?.problems.join(" ")).toContain("implemented");
  });

  it("passes an implemented doc carrying both required sections", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "implemented" }, BOTH);
    rfcIndex("RFC-0001");

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "section")).toHaveLength(0);
  });

  it("does NOT require the sections at `accepted` — the regression test for the caught flaw", () => {
    // accepted precedes implementation: demanding As-built here is the false-positive-at-accept
    // bug that keying to terminalStatuses would have produced. It must be silent.
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "accepted" }, "no sections");
    rfcIndex("RFC-0001");

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "section")).toHaveLength(0);
  });

  it("does NOT require the sections at `superseded` (only the keyed status requires them)", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "superseded" }, "no sections");
    rfcIndex("RFC-0001");

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "section")).toHaveLength(0);
  });

  it("names the specific missing section when only one of several is present", () => {
    writeRfc(
      "RFC-0001-x.md",
      { id: "RFC-0001", title: "x", status: "implemented" },
      "## As-built\n\nshipped\n",
    );
    rfcIndex("RFC-0001");

    const result = runVerify({ root, config: CONFIG });
    const sec = result.violations.filter((v) => v.kind === "section");
    expect(sec).toHaveLength(1);
    expect(sec[0]?.problems.join(" ")).toContain("Deviations from design");
    expect(sec[0]?.problems.join(" ")).not.toContain("As-built");
  });

  it("is exempt for a type that declares no requiredSectionsByStatus (non-breaking floor)", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "implemented" }, "no sections");
    rfcIndex("RFC-0001");

    const result = runVerify({ root, config: CONFIG_NO_SECTIONS });
    expect(result.violations.filter((v) => v.kind === "section")).toHaveLength(0);
  });

  it("does not match a section heading hidden inside a fenced code block", () => {
    // stripNonProse must run first: a `## As-built` inside a fence is not a real section.
    const fenced = "```md\n## As-built\n## Deviations from design\n```\n\nreal prose\n";
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "implemented" }, fenced);
    rfcIndex("RFC-0001");

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "section")).toHaveLength(1);
  });

  it("scopes a section violation to the changed doc (per-doc, not always-reported)", () => {
    // Two implemented docs both missing sections; only one changed. Unlike coherence, a missing
    // section is a per-doc concern — the unchanged doc's gap must NOT surface under --changed.
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "implemented" }, "none");
    writeRfc("RFC-0002-y.md", { id: "RFC-0002", title: "y", status: "implemented" }, "none");
    rfcIndex("RFC-0001", "RFC-0002");

    const changedFile = join(root, "docs", "rfc", "RFC-0001-x.md");
    const result = runVerify({
      root,
      config: CONFIG,
      changed: { files: new Set([changedFile]), ref: "HEAD" },
    });
    const sec = result.violations.filter((v) => v.kind === "section");
    expect(sec).toHaveLength(1);
    expect(sec[0]?.file).toContain("RFC-0001");
  });
});
