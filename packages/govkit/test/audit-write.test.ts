import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { auditWrite, type HookInput } from "../src/commands/audit-write";
import { loadConfig } from "../src/config";

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
