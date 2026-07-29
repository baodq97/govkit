// `report --aging` (RFC-0029): the six behaviors the RFC's Impact section pins.
// All e2e through the built CLI — aging is a rendering+annotation contract, and the
// flag wiring, degrade paths and pr-body determinism only exist at that surface.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { baseConfig, gitInit, rmRepo, runCli, tmpRepo, writeDoc } from "./helpers";

// Commit everything with BOTH git dates pinned — statusSince must be a choice of commit,
// never a choice of wall clock, or these tests race midnight and CI timezones.
function commitAll(root: string, msg: string, isoDate: string): void {
  execFileSync("git", ["add", "-A"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", msg, "--allow-empty"], {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate },
  });
}

const AGING_CONFIG = `${baseConfig()}      aging:
        proposed: 30
`;

function adr(id: string, status: string, body = "Context here."): string {
  return `---
id: ${id}
title: ${id}
status: ${status}
owner: t
date: 2026-01-01
---

${body}
`;
}

let root: string;
beforeEach(() => {
  root = tmpRepo("govkit-aging-");
});
afterEach(() => rmRepo(root));

describe("report --aging", () => {
  test("statusSince follows the status LINE, not the doc: a body edit never resets it", () => {
    gitInit(root);
    writeDoc(root, "govkit.yml", AGING_CONFIG);
    writeDoc(root, "docs/adr/ADR-0001-a.md", adr("ADR-0001", "proposed"));
    commitAll(root, "born", "2026-01-15T10:00:00Z");
    writeDoc(root, "docs/adr/ADR-0001-a.md", adr("ADR-0001", "proposed", "Body edited later."));
    commitAll(root, "body only", "2026-02-15T10:00:00Z");

    const r1 = runCli(root, ["report", "--aging", "--json"]);
    expect(r1.status).toBe(0);
    const bucket1 = JSON.parse(r1.stdout).types[0].buckets[0];
    expect(bucket1.docs[0]).toMatchObject({ id: "ADR-0001", statusSince: "2026-01-15" });

    // Flipping the status DOES reset it — the clock measures exactly the line that changed.
    writeDoc(root, "docs/adr/ADR-0001-a.md", adr("ADR-0001", "accepted", "Body edited later."));
    commitAll(root, "flip", "2026-03-15T10:00:00Z");
    const r2 = runCli(root, ["report", "--aging", "--json"]);
    const accepted = JSON.parse(r2.stdout).types[0].buckets.find(
      (b: { status: string }) => b.status === "accepted",
    );
    expect(accepted.docs[0].statusSince).toBe("2026-03-15");
  });

  test("an uncommitted doc reports null, listed — never dropped", () => {
    gitInit(root);
    writeDoc(root, "govkit.yml", AGING_CONFIG);
    commitAll(root, "config only", "2026-01-15T10:00:00Z");
    writeDoc(root, "docs/adr/ADR-0002-b.md", adr("ADR-0002", "proposed"));

    const r = runCli(root, ["report", "--aging", "--json"]);
    expect(r.status).toBe(0);
    const bucket = JSON.parse(r.stdout).types[0].buckets[0];
    expect(bucket.ids).toEqual(["ADR-0002"]);
    expect(bucket.docs[0]).toEqual({ id: "ADR-0002", statusSince: null, ageDays: null });
    // The plain rendering surfaces the same doc as explicitly age-less — never dropped.
    const plain = runCli(root, ["report", "--aging"]);
    expect(plain.stdout).toContain("(uncommitted, no age: ADR-0002)");
  });

  test("no git → a surfaced note, a normal report, exit 0", () => {
    writeDoc(root, "govkit.yml", AGING_CONFIG);
    writeDoc(root, "docs/adr/ADR-0003-c.md", adr("ADR-0003", "proposed"));

    const r = runCli(root, ["report", "--aging", "--json"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.aging).toBeUndefined();
    expect(parsed.agingNote).toContain("git is not available");
    expect(parsed.types[0].buckets[0].ids).toEqual(["ADR-0003"]);
    // The degrade note reaches the pr-body surface too (a reviewer asked for the column and
    // must learn why it is missing) — and stays byte-identical, being static text.
    const a = runCli(root, ["report", "--pr-body", "--aging"]);
    const b = runCli(root, ["report", "--pr-body", "--aging"]);
    expect(a.stdout).toContain("_(aging: git is not available");
    expect(a.stdout).toBe(b.stdout);
  });

  test("⚠ threshold fires only for the CONFIGURED (type, status) pair", () => {
    gitInit(root);
    writeDoc(root, "govkit.yml", AGING_CONFIG); // aging: proposed: 30 — nothing for accepted
    writeDoc(root, "docs/adr/ADR-0004-d.md", adr("ADR-0004", "proposed"));
    writeDoc(root, "docs/adr/ADR-0005-e.md", adr("ADR-0005", "accepted"));
    commitAll(root, "old", "2020-01-01T10:00:00Z"); // ancient — far over any threshold

    const r = runCli(root, ["report", "--aging", "--json"]);
    const buckets = JSON.parse(r.stdout).types[0].buckets;
    const proposed = buckets.find((b: { status: string }) => b.status === "proposed");
    const accepted = buckets.find((b: { status: string }) => b.status === "accepted");
    expect(proposed.overThreshold).toEqual(["ADR-0004"]);
    // No configured threshold ⇒ no judgment key at all — absence, not an empty verdict.
    expect(accepted.overThreshold).toBeUndefined();
    // The plain rendering carries the same advisory mark.
    const plain = runCli(root, ["report", "--aging"]);
    expect(plain.stdout).toContain("⚠ over threshold: [ADR-0004]");
    expect(plain.status).toBe(0);
  });

  test("--pr-body --aging is byte-identical across runs and shows dates, not ages", () => {
    gitInit(root);
    writeDoc(root, "govkit.yml", AGING_CONFIG);
    writeDoc(root, "docs/adr/ADR-0006-f.md", adr("ADR-0006", "proposed"));
    commitAll(root, "born", "2026-01-15T10:00:00Z");

    const a = runCli(root, ["report", "--pr-body", "--aging"]);
    const b = runCli(root, ["report", "--pr-body", "--aging"]);
    expect(a.stdout).toBe(b.stdout);
    expect(a.stdout).toContain("| since |");
    expect(a.stdout).toContain("2026-01-15");
    // ageDays derives from "now" and is banned from the idempotent surface.
    expect(a.stdout).not.toMatch(/\d+d/);
  });

  test("without the flag, every default surface is unchanged — no aging keys, old table shape", () => {
    gitInit(root);
    writeDoc(root, "govkit.yml", AGING_CONFIG);
    writeDoc(root, "docs/adr/ADR-0007-g.md", adr("ADR-0007", "proposed"));
    commitAll(root, "born", "2026-01-15T10:00:00Z");

    const json = JSON.parse(runCli(root, ["report", "--json"]).stdout);
    expect(json.aging).toBeUndefined();
    expect(json.agingNote).toBeUndefined();
    expect(json.types[0].buckets[0].docs).toBeUndefined();
    expect(json.types[0].buckets[0].overThreshold).toBeUndefined();
    const prBody = runCli(root, ["report", "--pr-body"]).stdout;
    expect(prBody).toContain("| type | status | count | ids |");
    expect(prBody).not.toContain("| since |");
    // And the flag is report-scoped: any other command rejects it loudly.
    const misuse = runCli(root, ["verify", "--aging"]);
    expect(misuse.status).toBe(2);
    expect(misuse.stderr).toContain("--aging is only valid for report");
  });
});
