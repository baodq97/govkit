import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runVerify } from "../src/commands/verify";
import { loadConfig } from "../src/config";
import { parseFrontMatter } from "../src/frontmatter";

const here = fileURLToPath(new URL(".", import.meta.url));
const fixture = join(here, "fixtures", "repo");

describe("parseFrontMatter", () => {
  it("parses a CRLF front-matter block (Windows checkout)", () => {
    const fm = parseFrontMatter("---\r\nid: X\r\ntitle: T\r\n---\r\nbody");
    expect(fm).not.toBeNull();
    expect(fm?.data.id).toBe("X");
    expect(fm?.body).toBe("body");
  });

  it("returns null when there is no front-matter", () => {
    expect(parseFrontMatter("# just a heading")).toBeNull();
  });
});

describe("loadConfig", () => {
  it("loads the pluggable governance schema", () => {
    const cfg = loadConfig(fixture);
    expect(cfg.schemaVersion).toBe(1);
    expect(cfg.docs.types.adr?.dir).toBe("docs/adr");
  });
});

describe("runVerify", () => {
  it("flags the doc missing required keys and passes the complete one", () => {
    const result = runVerify({ root: fixture });
    expect(result.checked).toBe(2);
    expect(result.ok).toBe(false);

    const bad = result.violations.find((v) => v.file.includes("ADR-0002"));
    expect(bad).toBeDefined();
    expect(bad?.problems.join(" ")).toContain("owner");

    expect(result.violations.find((v) => v.file.includes("ADR-0001"))).toBeUndefined();
  });
});
