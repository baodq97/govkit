import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerify } from "../src/commands/verify";
import { loadConfig } from "../src/config";
import { isParseError, parseFrontMatter } from "../src/frontmatter";

const here = fileURLToPath(new URL(".", import.meta.url));
const fixture = join(here, "fixtures", "repo");
const indexRepo = join(here, "fixtures", "index-repo");
const badYamlRepo = join(here, "fixtures", "bad-yaml-repo");

describe("parseFrontMatter", () => {
  it("parses a CRLF front-matter block (Windows checkout)", () => {
    const fm = parseFrontMatter("---\r\nid: X\r\ntitle: T\r\n---\r\nbody");
    expect(fm).not.toBeNull();
    expect(isParseError(fm)).toBe(false);
    if (fm && !isParseError(fm)) {
      expect(fm.data.id).toBe("X");
      expect(fm.body).toBe("body");
    }
  });

  it("returns null when there is no front-matter", () => {
    expect(parseFrontMatter("# just a heading")).toBeNull();
  });

  it("returns a parse error (not a throw) for an unparseable block — US-0002", () => {
    const fm = parseFrontMatter("---\nid: X\nowner: @baodq97\n---\nbody");
    expect(fm).not.toBeNull();
    expect(isParseError(fm)).toBe(true);
    if (isParseError(fm)) {
      expect(fm.error).toContain("@");
      expect(fm.error).toMatch(/line \d+/);
    }
  });
});

describe("runVerify — unparseable front-matter (US-0002)", () => {
  it("reports one frontmatter violation and keeps checking the rest, no crash", () => {
    const result = runVerify({ root: badYamlRepo });
    expect(result.checked).toBe(2); // the valid sibling was still scanned
    expect(result.ok).toBe(false);

    const bad = result.violations.filter(
      (v) => v.kind === "frontmatter" && v.file.includes("ADR-0002"),
    );
    expect(bad).toHaveLength(1);
    expect(bad[0]?.problems.join(" ")).toMatch(/line \d+/);

    expect(
      result.violations.find((v) => v.kind === "frontmatter" && v.file.includes("ADR-0001")),
    ).toBeUndefined();
  });
});

describe("loadConfig", () => {
  it("loads the pluggable governance schema", () => {
    const cfg = loadConfig(fixture);
    expect(cfg.schemaVersion).toBe(1);
    expect(cfg.docs.types.adr?.dir).toBe("docs/adr");
  });
});

describe("runVerify — front-matter", () => {
  it("flags the doc missing required keys and passes the complete one", () => {
    const result = runVerify({ root: fixture });
    expect(result.checked).toBe(2);
    expect(result.ok).toBe(false);

    const bad = result.violations.find(
      (v) => v.kind === "frontmatter" && v.file.includes("ADR-0002"),
    );
    expect(bad).toBeDefined();
    expect(bad?.problems.join(" ")).toContain("owner");

    expect(
      result.violations.find((v) => v.kind === "frontmatter" && v.file.includes("ADR-0001")),
    ).toBeUndefined();
  });
});

describe("runVerify — INDEX sync", () => {
  it("flags a stale INDEX row and a missing INDEX row", () => {
    const result = runVerify({ root: indexRepo });
    const idx = result.violations.find((v) => v.kind === "index");
    expect(idx).toBeDefined();
    const text = idx?.problems.join(" ") ?? "";
    expect(text).toContain("ADR-0002"); // no row at all
    expect(text).toContain("stale"); // ADR-0001 row status disagrees with front-matter
  });
});
