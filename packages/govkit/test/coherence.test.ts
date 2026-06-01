import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runVerify } from "../src/commands/verify";
import type { GovkitConfig } from "../src/config";

// RFC-0008 chain-status coherence: a doc in a TERMINAL state whose `parent` resolves to a
// doc that is NOT in a terminal state is a structural inconsistency — you shipped a thing
// whose design was never decided. Two types: `us` (issues, terminal = done) carries a
// `parent` ref → `rfc` (terminal = accepted | superseded). The precision under test is
// "terminal, not equal": done-under-superseded is LEGITIMATE, done-under-draft is the bug.
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
        statuses: ["draft", "proposed", "accepted", "rejected", "superseded"],
        terminalStatuses: ["accepted", "superseded"],
      },
      us: {
        dir: "docs/issues",
        required: ["id", "title", "status"],
        idPrefix: "US",
        statuses: ["todo", "in-progress", "done"],
        terminalStatuses: ["done"],
        refs: [{ key: "parent", type: "rfc" }],
      },
    },
  },
};

// A config whose `us` type declares NO terminalStatuses — the non-breaking floor: coherence
// must be entirely dark for it.
const CONFIG_NO_TERMINAL: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status"] },
    types: {
      rfc: {
        dir: "docs/rfc",
        required: ["id", "title", "status"],
        idPrefix: "RFC",
        statuses: ["draft", "accepted"],
      },
      us: {
        dir: "docs/issues",
        required: ["id", "title", "status"],
        idPrefix: "US",
        statuses: ["todo", "done"],
        refs: [{ key: "parent", type: "rfc" }],
      },
    },
  },
};

// ASYMMETRIC opt-in: the CHILD type (`us`) declares terminalStatuses + a parent ref, but the
// PARENT type (`rfc`) does NOT. "Terminal" is undefined for the parent, so coherence cannot
// judge it and must fail SAFE (no-op). This is the incremental-adoption window — a residue
// named in RFC-0008 round 8: opting one type in does nothing until its parent type is in too.
const CONFIG_PARENT_NO_TERMINAL: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status"] },
    types: {
      rfc: {
        dir: "docs/rfc",
        required: ["id", "title", "status"],
        idPrefix: "RFC",
        statuses: ["draft", "accepted"],
        // no terminalStatuses → parent cannot be judged
      },
      us: {
        dir: "docs/issues",
        required: ["id", "title", "status"],
        idPrefix: "US",
        statuses: ["todo", "done"],
        terminalStatuses: ["done"],
        refs: [{ key: "parent", type: "rfc" }],
      },
    },
  },
};

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-coherence-"));
  mkdirSync(join(root, "docs", "rfc"), { recursive: true });
  mkdirSync(join(root, "docs", "issues"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeRfc(name: string, fields: Record<string, string>): void {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  writeFileSync(join(root, "docs", "rfc", name), `---\n${fm}\n---\n\nbody\n`);
}
function writeUs(name: string, fields: Record<string, string>): void {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  writeFileSync(join(root, "docs", "issues", name), `---\n${fm}\n---\n\nbody\n`);
}
function rfcIndex(...ids: string[]): void {
  const rows = ids.map((id) => `| ${id} |`).join("\n");
  writeFileSync(join(root, "docs", "rfc", "INDEX.md"), `# RFC\n\n${rows}\n`);
}
function usIndex(...ids: string[]): void {
  const rows = ids.map((id) => `| ${id} |`).join("\n");
  writeFileSync(join(root, "docs", "issues", "INDEX.md"), `# US\n\n${rows}\n`);
}

describe("runVerify — chain-status coherence (RFC-0008)", () => {
  it("flags a done issue whose parent RFC is still draft (shipped an undecided design)", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "draft" });
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "done", parent: "RFC-0001" });
    rfcIndex("RFC-0001");
    usIndex("US-0001");

    const result = runVerify({ root, config: CONFIG });
    const coh = result.violations.filter((v) => v.kind === "coherence");
    expect(coh).toHaveLength(1);
    expect(coh[0]?.file).toContain("US-0001");
    expect(coh[0]?.problems.join(" ")).toContain("RFC-0001");
    expect(coh[0]?.problems.join(" ")).toContain("draft");
  });

  it("flags a done issue whose parent RFC is rejected", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "rejected" });
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "done", parent: "RFC-0001" });
    rfcIndex("RFC-0001");
    usIndex("US-0001");

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "coherence")).toHaveLength(1);
  });

  it("passes a done issue under an ACCEPTED parent", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "accepted" });
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "done", parent: "RFC-0001" });
    rfcIndex("RFC-0001");
    usIndex("US-0001");

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "coherence")).toHaveLength(0);
  });

  it("passes a done issue under a SUPERSEDED parent (terminal, not equal — the precision case)", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "superseded" });
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "done", parent: "RFC-0001" });
    rfcIndex("RFC-0001");
    usIndex("US-0001");

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "coherence")).toHaveLength(0);
  });

  it("does NOT flag a non-terminal child (todo issue under a draft parent is fine)", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "draft" });
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "todo", parent: "RFC-0001" });
    rfcIndex("RFC-0001");
    usIndex("US-0001");

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "coherence")).toHaveLength(0);
  });

  it("is exempt for a type that declares no terminalStatuses (non-breaking floor)", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "draft" });
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "done", parent: "RFC-0001" });
    rfcIndex("RFC-0001");
    usIndex("US-0001");

    const result = runVerify({ root, config: CONFIG_NO_TERMINAL });
    expect(result.violations.filter((v) => v.kind === "coherence")).toHaveLength(0);
  });

  it("fails SAFE when the PARENT type has no terminalStatuses (asymmetric adoption — no-op)", () => {
    // done child under a draft parent — would be a violation IF rfc were opted in, but it isn't.
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "draft" });
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "done", parent: "RFC-0001" });
    rfcIndex("RFC-0001");
    usIndex("US-0001");

    const result = runVerify({ root, config: CONFIG_PARENT_NO_TERMINAL });
    // No coherence violation: "terminal" is undefined for the parent type, so the gate cannot
    // (and must not) judge it. This is the documented incremental-adoption blind spot.
    expect(result.violations.filter((v) => v.kind === "coherence")).toHaveLength(0);
  });

  it("does not double-fault a dangling parent (that is checkReferences' job, not coherence)", () => {
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "done", parent: "RFC-9999" });
    usIndex("US-0001");
    rfcIndex();

    const result = runVerify({ root, config: CONFIG });
    expect(result.violations.filter((v) => v.kind === "coherence")).toHaveLength(0);
    expect(result.violations.filter((v) => v.kind === "reference")).toHaveLength(1);
  });

  it("always-reports a coherence violation under --changed even when only the child changed", () => {
    writeRfc("RFC-0001-x.md", { id: "RFC-0001", title: "x", status: "draft" });
    writeUs("US-0001-y.md", { id: "US-0001", title: "y", status: "done", parent: "RFC-0001" });
    rfcIndex("RFC-0001");
    usIndex("US-0001");

    const changedFile = join(root, "docs", "issues", "US-0001-y.md");
    const result = runVerify({
      root,
      config: CONFIG,
      changed: { files: new Set([changedFile]), ref: "HEAD" },
    });
    // the parent RFC is UNTOUCHED, yet the inconsistency must still surface
    expect(result.violations.filter((v) => v.kind === "coherence")).toHaveLength(1);
  });
});
