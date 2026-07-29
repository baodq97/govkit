import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  // The gap 0.10.0 shipped with: `terminalStatuses` was present but `refs:` was declared on
  // `rel` only, so a US's `parent` was inert front-matter — RFC-0003 never resolved it and
  // RFC-0008 could not see the US->RFC edge at all. Asserting the config keys is not enough,
  // because the two must be wired TOGETHER to fire; this drives the scaffold end to end and
  // fails if either half goes missing again.
  it("scaffolds a schema where coherence actually fires on the US->RFC edge (RFC-0003/0008)", () => {
    runInit({ root: dir });
    const fm = (lines: string[]) => `---\n${lines.join("\n")}\n---\n`;
    writeFileSync(
      join(dir, "docs/rfc/RFC-0001-undecided.md"),
      `${fm([
        "id: RFC-0001",
        "title: An undecided design",
        "status: draft",
        "owner: TBD",
        "date: 2026-07-29",
      ])}\n# RFC-0001\n\nStill being argued about.\n`,
    );
    writeFileSync(
      join(dir, "docs/rfc/INDEX.md"),
      "# RFC Index\n\n| ID | Title | Status | Owner | Date |\n|---|---|---|---|---|\n" +
        "| [RFC-0001](./RFC-0001-undecided.md) | An undecided design | draft | TBD | 2026-07-29 |\n",
    );
    writeFileSync(
      join(dir, "docs/issues/US-0001-shipped-anyway.md"),
      `${fm([
        "id: US-0001",
        "title: Shipped anyway",
        "status: done",
        "owner: TBD",
        "date: 2026-07-29",
        "priority: P1",
        "parent: RFC-0001",
      ])}\n# US-0001\n\nMarked done under a design nobody decided.\n`,
    );
    writeFileSync(
      join(dir, "docs/issues/INDEX.md"),
      "# US Index\n\n| ID | Title | Status | Owner | Date |\n|---|---|---|---|---|\n" +
        "| [US-0001](./US-0001-shipped-anyway.md) | Shipped anyway | done | TBD | 2026-07-29 |\n",
    );
    const v = runVerify({ root: dir });
    expect(v.ok, "a US at `done` under an RFC at `draft` must not pass a fresh scaffold").toBe(
      false,
    );
  });
});
