// `govkit doctor` — the orientation command. Its whole value is that an agent replaces a
// multi-call look-around (does govkit.yml exist? what types? how many docs? is the hook wired?)
// with ONE call, so these tests pin the two properties that make that trade safe: it never
// throws on a repo it cannot read, and it recommends EXACTLY ONE next action.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDoctor } from "../src/commands/doctor";
import { runInit } from "../src/commands/init";

const CLI = join(import.meta.dir, "../dist/cli.js");

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-doctor-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function adr(name: string, body: string): void {
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "docs", "adr", name), body, "utf8");
}

const GOOD_DOC = `---
id: ADR-0001
title: A decision
status: proposed
owner: TBD
date: 2026-07-28
---

body
`;

// A config loadConfig REJECTS (excludeBase may not drop `id`) rather than merely-empty YAML:
// the point of the test is the throwing path, and an empty-but-legal config loads fine.
const BROKEN_CONFIG = `schemaVersion: 1
docs:
  ignore: []
  base:
    required: [id, title]
  types:
    adr:
      dir: docs/adr
      required: []
      excludeBase: [id]
`;

describe("runDoctor — the survey", () => {
  it("a blank dir: config missing, and the one action is `govkit init`", () => {
    const r = runDoctor({ root });
    expect(r.config.kind).toBe("missing");
    expect(r.types).toHaveLength(0);
    expect(r.next.kind).toBe("scaffold");
    expect(r.next.command).toBe("govkit init");
  });

  it("a scaffolded-but-empty repo: hook installed, 0 docs, action is authoring the first doc", () => {
    runInit({ root });
    const r = runDoctor({ root });
    expect(r.config.kind).toBe("loaded");
    expect(r.hook.installed).toBe(true);
    expect(r.totalDocs).toBe(0);
    expect(r.types.length).toBeGreaterThan(0);
    expect(r.next.kind).toBe("author-first-doc");
    // No command to run, so the action must still name the command that FOLLOWS it — an agent
    // recovers by pattern-matching text to a command, and a dead-end action strands it.
    expect(r.next.command).toBeUndefined();
    expect(r.next.detail).toContain("govkit check");
  });

  it("counts docs per type and points at --adopt when any lack front-matter", () => {
    runInit({ root });
    adr("ADR-0001-good.md", GOOD_DOC);
    adr("ADR-0002-legacy.md", "# Legacy\n\n**Status**: accepted\n");
    const r = runDoctor({ root });
    expect(r.totalDocs).toBe(2);
    expect(r.missingFrontMatter).toBe(1);
    expect(r.types.find((t) => t.name === "adr")?.docs).toBe(2);
    expect(r.types.find((t) => t.name === "adr")?.missingFrontMatter).toBe(1);
    expect(r.next.kind).toBe("adopt");
    expect(r.next.command).toBe("govkit init --adopt");
  });

  // Regression: doctor first counted a malformed block as "missing front-matter" and therefore
  // recommended `govkit init --adopt` — a command that prints "nothing to migrate" and changes
  // nothing, because adopt must never prepend a SECOND block to a doc that already has one
  // (adopt.ts runAdopt). A recommendation that is a guaranteed no-op is worse than none: the
  // agent runs it, sees no change, and has no next move.
  it("a MALFORMED block is counted apart from a MISSING one — adopt cannot fix a malformed one", () => {
    runInit({ root });
    adr("ADR-0001-broken.md", "---\nid: [unclosed\n---\n\nbody\n");
    const r = runDoctor({ root });
    expect(r.missingFrontMatter).toBe(0);
    expect(r.malformedFrontMatter).toBe(1);
    expect(r.next.kind).toBe("repair-frontmatter");
    expect(r.next.command).toBeUndefined();
    expect(r.next.detail).toContain("govkit verify");
  });

  it("a doc with NO block outranks a malformed one — the migration is the cheaper move first", () => {
    runInit({ root });
    adr("ADR-0001-broken.md", "---\nid: [unclosed\n---\n\nbody\n");
    adr("ADR-0002-legacy.md", "# Legacy\n");
    const r = runDoctor({ root });
    expect(r.missingFrontMatter).toBe(1);
    expect(r.malformedFrontMatter).toBe(1);
    expect(r.next.kind).toBe("adopt");
  });

  it("a broken govkit.yml is REPORTED, never thrown — the map is most useful exactly then", () => {
    writeFileSync(join(root, "govkit.yml"), BROKEN_CONFIG, "utf8");
    const r = runDoctor({ root });
    expect(r.config.kind).toBe("invalid");
    expect(r.next.kind).toBe("fix-config");
    // The problem is named, so the reader does not have to reproduce the load to see it.
    if (r.config.kind === "invalid") expect(r.config.problem.length).toBeGreaterThan(0);
  });

  it("a missing write-time hook is its own action, ranked BELOW a doc that fails the gate", () => {
    runInit({ root });
    rmSync(join(root, ".claude"), { recursive: true, force: true });
    adr("ADR-0001-good.md", GOOD_DOC);
    const clean = runDoctor({ root });
    expect(clean.hook.installed).toBe(false);
    expect(clean.next.kind).toBe("install-hook");
    // Add an unmigrated doc and adopt outranks it: a doc the gate will reject is more urgent
    // than a hook that would have prevented it.
    adr("ADR-0002-legacy.md", "# Legacy\n");
    expect(runDoctor({ root }).next.kind).toBe("adopt");
  });

  it("names ungoverned markdown dirs beside the governed ones — but never recommends them", () => {
    runInit({ root });
    adr("ADR-0001-good.md", GOOD_DOC);
    mkdirSync(join(root, "docs", "research"), { recursive: true });
    writeFileSync(join(root, "docs", "research", "notes.md"), "# notes\n", "utf8");
    const r = runDoctor({ root });
    expect(r.ungoverned.map((u) => u.dir)).toContain("docs/research");
    expect(r.ungoverned.find((u) => u.dir === "docs/research")?.markdown).toBe(1);
    // "looks like a doc dir" is a guess; the recommendation ladder refuses to act on a guess.
    expect(r.next.kind).toBe("run-gate");
    expect(r.next.command).toBe("govkit check");
  });

  it("a configured type dir is never reported as ungoverned", () => {
    runInit({ root });
    adr("ADR-0001-good.md", GOOD_DOC);
    expect(runDoctor({ root }).ungoverned.map((u) => u.dir)).not.toContain("docs/adr");
  });
});

describe("govkit doctor — the command", () => {
  function run(args: string[]): { out: string; status: number } {
    try {
      return {
        out: execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" }),
        status: 0,
      };
    } catch (e: unknown) {
      const err = e as { status: number; stdout: string };
      return { out: err.stdout, status: err.status };
    }
  }

  const nextLines = (out: string): string[] =>
    out.split("\n").filter((l) => l.startsWith("Next: "));

  it("exits 0 and prints EXACTLY ONE next action on a blank dir", () => {
    const { out, status } = run(["doctor", "--root", root]);
    expect(status).toBe(0);
    expect(nextLines(out)).toHaveLength(1);
    expect(nextLines(out)[0]).toContain("govkit init");
  });

  it("exits 0 and prints EXACTLY ONE next action on a fully configured repo", () => {
    runInit({ root });
    adr("ADR-0001-good.md", GOOD_DOC);
    const { out, status } = run(["doctor", "--root", root]);
    expect(status).toBe(0);
    expect(nextLines(out)).toHaveLength(1);
    expect(nextLines(out)[0]).toContain("govkit check");
    // The map itself: config, hook and per-type counts, all in the one call.
    expect(out).toContain("govkit.yml loaded");
    expect(out).toContain("installed");
    expect(out).toContain("doc(s)");
  });

  it("still exits 0 with a BROKEN config — a map is not a gate", () => {
    writeFileSync(join(root, "govkit.yml"), BROKEN_CONFIG, "utf8");
    const { out, status } = run(["doctor", "--root", root]);
    expect(status).toBe(0);
    expect(out).toContain("UNREADABLE");
    expect(nextLines(out)).toHaveLength(1);
  });

  it("--json emits the machine channel and nothing else on stdout", () => {
    runInit({ root });
    const { out, status } = run(["doctor", "--root", root, "--json"]);
    expect(status).toBe(0);
    const parsed = JSON.parse(out) as { next: { kind: string }; totalDocs: number };
    expect(parsed.totalDocs).toBe(0);
    expect(parsed.next.kind).toBe("author-first-doc");
  });
});
