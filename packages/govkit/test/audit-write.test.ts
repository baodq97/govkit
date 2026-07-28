import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditWrite, type HookInput } from "../src/commands/audit-write";
import { type GovkitConfig, loadConfig } from "../src/config";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = join(here, "fixtures", "repo");
const config = loadConfig(root);

function write(file: string, content: string): HookInput {
  return { tool_name: "Write", tool_input: { file_path: join(root, file), content } };
}

const GOOD = `---
id: ADR-0009
title: New decision
status: proposed
owner: TBD
date: 2026-05-31
---

Body.
`;

const MISSING = `---
id: ADR-0010
title: Incomplete
status: proposed
---

Body.
`;

describe("auditWrite", () => {
  it("defers (does not block) a complete governed doc write", () => {
    expect(auditWrite(write("docs/adr/ADR-0009.md", GOOD), root, config).block).toBe(false);
  });

  it("blocks a governed doc missing required front-matter, naming the keys", () => {
    const d = auditWrite(write("docs/adr/ADR-0010.md", MISSING), root, config);
    expect(d.block).toBe(true);
    expect(d.reason).toContain("owner");
    expect(d.reason).toContain("date");
  });

  it("blocks a governed doc with no front-matter at all", () => {
    const d = auditWrite(write("docs/adr/ADR-0011.md", "# just a heading"), root, config);
    expect(d.block).toBe(true);
    expect(d.reason).toContain("front-matter");
  });

  it("blocks an unparseable front-matter block with the parser message, not a crash — US-0002", () => {
    const bad = `---\nid: ADR-0012\ntitle: T\nstatus: proposed\nowner: @baodq97\ndate: 2026-06-06\n---\n\nBody.\n`;
    const d = auditWrite(write("docs/adr/ADR-0012.md", bad), root, config);
    expect(d.block).toBe(true);
    expect(d.reason).toContain("invalid YAML front-matter");
    expect(d.reason).toMatch(/line \d+/);
  });

  it("defers a write outside any governed doc dir", () => {
    const d = auditWrite(write("src/whatever.ts", "export const x = 1;"), root, config);
    expect(d.block).toBe(false);
  });

  it("defers an Edit (partial content) — CI's full verify covers it", () => {
    const edit: HookInput = {
      tool_name: "Edit",
      tool_input: { file_path: join(root, "docs/adr/ADR-0009.md"), new_string: "x" },
    };
    expect(auditWrite(edit, root, config).block).toBe(false);
  });

  it("defers an unrelated tool", () => {
    expect(auditWrite({ tool_name: "Bash", tool_input: {} }, root, config).block).toBe(false);
  });
});

// RFC-0008 item 3: the non-blocking reconciliation nudge at a terminal-status write. Uses an
// inline config with terminalStatuses + a parent ref on the `adr` type (the fixture repo's only
// governed dir), so the write resolves under it.
const REMIND_CONFIG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status", "owner", "date"] },
    types: {
      adr: {
        dir: "docs/adr",
        required: ["id", "title", "status", "owner", "date"],
        idPrefix: "ADR",
        statuses: ["proposed", "accepted", "superseded"],
        terminalStatuses: ["accepted", "superseded"],
        refs: [{ key: "parent", type: "rfc" }],
      },
    },
  },
};

function adrDoc(status: string, extra = ""): string {
  return `---\nid: ADR-0009\ntitle: D\nstatus: ${status}\nowner: TBD\ndate: 2026-05-31\n${extra}---\n\nBody.\n`;
}

describe("auditWrite — reconciliation nudge (RFC-0008 item 3)", () => {
  it("nudges (never blocks) when a doc is written into a terminal status with a parent", () => {
    const d = auditWrite(
      write("docs/adr/ADR-0009.md", adrDoc("accepted", "parent: RFC-0003\n")),
      root,
      REMIND_CONFIG,
    );
    expect(d.block).toBe(false);
    expect(d.remind).toBeTruthy();
    expect(d.remind).toContain("RFC-0003");
    expect(d.remind).toContain("accepted");
  });

  it("does NOT nudge a terminal write that has no parent (nothing to reconcile)", () => {
    const d = auditWrite(write("docs/adr/ADR-0009.md", adrDoc("accepted")), root, REMIND_CONFIG);
    expect(d.block).toBe(false);
    expect(d.remind).toBeUndefined();
  });

  it("does NOT nudge a non-terminal write even with a parent (not shipped yet)", () => {
    const d = auditWrite(
      write("docs/adr/ADR-0009.md", adrDoc("proposed", "parent: RFC-0003\n")),
      root,
      REMIND_CONFIG,
    );
    expect(d.block).toBe(false);
    expect(d.remind).toBeUndefined();
  });
});

// RFC-0010: when the terminal status being written ALSO keys required as-built sections, the nudge
// folds in a reminder to fill them — same flip, same moment to record what diverged.
const ASBUILT_CONFIG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: ["id", "title", "status", "owner", "date"] },
    types: {
      adr: {
        dir: "docs/adr",
        required: ["id", "title", "status", "owner", "date"],
        idPrefix: "ADR",
        statuses: ["proposed", "accepted", "implemented", "superseded"],
        terminalStatuses: ["accepted", "implemented", "superseded"],
        requiredSectionsByStatus: { implemented: ["As-built", "Deviations from design"] },
        refs: [{ key: "parent", type: "rfc" }],
      },
    },
  },
};

describe("auditWrite — as-built nudge extension (RFC-0010)", () => {
  it("folds an as-built reminder into the nudge when the status keys required sections", () => {
    const d = auditWrite(
      write("docs/adr/ADR-0009.md", adrDoc("implemented", "parent: RFC-0003\n")),
      root,
      ASBUILT_CONFIG,
    );
    expect(d.block).toBe(false);
    expect(d.remind).toContain("As-built");
    expect(d.remind).toContain("RFC-0010");
  });

  it("does not mention as-built for a terminal status that keys no required sections", () => {
    // `accepted` is terminal but not keyed → the RFC-0008 nudge fires WITHOUT the RFC-0010 tail.
    const d = auditWrite(
      write("docs/adr/ADR-0009.md", adrDoc("accepted", "parent: RFC-0003\n")),
      root,
      ASBUILT_CONFIG,
    );
    expect(d.remind).toBeTruthy();
    expect(d.remind).not.toContain("As-built");
  });
});

// RFC-0024: born-at-non-startStatus provenance nudge. A Write that CREATES a governed doc (no
// file on disk yet) at a status other than its type's startStatus skipped the draft→accept
// provenance an agent must follow (author at startStatus; a human owner flips it forward in a
// separate accept). Non-blocking by design — provenance is honor-system, the hook sees only
// Writes (not Edits/Bash), so this is a courtesy nudge, never a gate. It requires the type to
// declare a startStatus, and an overwrite (file already on disk) is left alone: that is an edit
// whose status transition a stateless hook cannot judge — verify / the human own it.
describe("auditWrite — born-at-non-startStatus provenance nudge (RFC-0024)", () => {
  // The fixture `config` declares adr.startStatus: proposed and no terminalStatuses.
  const absent = "docs/adr/ADR-0009.md"; // not on disk → a creation
  const present = "docs/adr/ADR-0001-good.md"; // on disk → an overwrite

  it("nudges (never blocks) a new doc created at a non-start status", () => {
    const d = auditWrite(write(absent, adrDoc("accepted")), root, config);
    expect(d.block).toBe(false);
    expect(d.remind).toBeTruthy();
    expect(d.remind).toContain("proposed"); // the start status it should have begun at
    expect(d.remind).toContain("RFC-0024");
  });

  it("does NOT nudge a new doc created at its start status", () => {
    const d = auditWrite(write(absent, adrDoc("proposed")), root, config);
    expect(d.block).toBe(false);
    expect(d.remind).toBeUndefined();
  });

  it("does NOT nudge a full-content overwrite of an existing doc (a transition it cannot judge)", () => {
    const d = auditWrite(write(present, adrDoc("accepted")), root, config);
    expect(d.block).toBe(false);
    expect(d.remind).toBeUndefined();
  });

  it("does NOT nudge when the type declares no startStatus (nothing to compare against)", () => {
    // REMIND_CONFIG.adr has terminalStatuses but no startStatus; an accepted, parent-less born
    // write falls through the reconciliation branch and must not invent a provenance nudge.
    const d = auditWrite(write(absent, adrDoc("accepted")), root, REMIND_CONFIG);
    expect(d.block).toBe(false);
    expect(d.remind).toBeUndefined();
  });
});
