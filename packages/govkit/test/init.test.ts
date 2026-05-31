import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runEval } from "../src/commands/eval";
import { runInit } from "../src/commands/init";
import { runVerify } from "../src/commands/verify";
import { loadConfig } from "../src/config";

describe("runInit", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "govkit-init-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("scaffolds the governance files into an empty repo", () => {
    const r = runInit({ root: dir });
    expect(r.created).toContain("govkit.yml");
    expect(r.created).toContain(".claude/settings.json");
    expect(r.skipped).toHaveLength(0);
    expect(existsSync(join(dir, "docs/adr/INDEX.md"))).toBe(true);
    expect(readFileSync(join(dir, "govkit.yml"), "utf8")).toContain("schemaVersion: 1");
    // the hook uses the verified deny-path binary via npx (consumer-appropriate)
    expect(readFileSync(join(dir, ".claude/settings.json"), "utf8")).toContain(
      "npx --yes govkit audit-write",
    );
  });

  it("is idempotent — a second run skips everything", () => {
    runInit({ root: dir });
    const r = runInit({ root: dir });
    expect(r.created).toHaveLength(0);
    expect(r.skipped.length).toBeGreaterThan(0);
  });

  it("overwrites with --force", () => {
    runInit({ root: dir });
    const r = runInit({ root: dir, force: true });
    expect(r.created.length).toBeGreaterThan(0);
    expect(r.skipped).toHaveLength(0);
  });

  it("produces a repo that passes govkit verify (no docs yet)", () => {
    runInit({ root: dir });
    const v = runVerify({ root: dir });
    expect(v.ok).toBe(true);
    expect(v.checked).toBe(0);
  });

  // Drift guard: init must scaffold the SAME full schema the engine ships — the gate
  // lifecycle config (statuses/idPrefix) AND the eval rubric (incl. a required floor).
  // If the canonical templates/govkit.default.yml is lost or truncated, this goes red.
  it("scaffolds the full hardened schema (statuses + idPrefix + eval required floor)", () => {
    runInit({ root: dir });
    const cfg = loadConfig(dir);
    expect(cfg.docs.types.adr?.idPrefix).toBe("ADR");
    expect(cfg.docs.types.adr?.statuses).toContain("accepted");
    for (const type of ["prd", "rfc", "adr", "us"]) {
      const rubric = cfg.eval?.rubrics[type] ?? [];
      expect(rubric.length, `${type} rubric`).toBeGreaterThan(0);
      expect(
        rubric.some((r) => r.required === true),
        `${type} has a required floor rule`,
      ).toBe(true);
    }
    // a freshly-scaffolded repo has no docs, so eval is green (nothing to grade)
    expect(runEval({ root: dir }).ok).toBe(true);
  });
});
