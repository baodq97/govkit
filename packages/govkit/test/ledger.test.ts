import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LedgerResult } from "../src/commands/ledger";
import type { JournalRecord } from "../src/journal";
import { baseConfig, git, gitInit, rmRepo, runCli, tmpRepo, writeDoc } from "./helpers";

// The RFC-0016 feature-ledger gate, e2e on the built dist/cli.js in a temp git repo. Pinned
// here: the four layers (schema loud, unique ids, spec→governed-id resolution, append-only
// vs HEAD), the legal moves (passes flips both ways, new entries), the degraded no-baseline
// run (pure checks + ONE stderr note), the missing-file operational error, and the
// --journal record shape.

const GOVKIT_YML = baseConfig({
  type: "rfc",
  dir: "docs/rfc",
  required: ["id", "title", "status"],
});

const RFC_DOC = `---
id: RFC-0001
title: x
status: accepted
---

body prose
`;

const LEDGER = join("docs", "ledger.json");

interface Entry {
  id?: unknown;
  title?: unknown;
  spec?: unknown;
  passes?: unknown;
  check?: unknown;
}

const entry = (over: Entry = {}): Entry => ({
  id: "F-001",
  title: "a feature",
  spec: "RFC-0001",
  passes: true,
  ...over,
});

let root: string;
const g = (...args: string[]) => git(root, ...args);
const cli = (args: string[]) => runCli(root, args);
const writeLedger = (entries: Entry[]) =>
  writeDoc(root, LEDGER, `${JSON.stringify({ entries }, null, 2)}\n`);
const commitAll = (msg: string) => {
  g("add", "-A");
  g("commit", "-m", msg);
};

beforeEach(() => {
  root = tmpRepo("govkit-ledger-");
  gitInit(root);
  writeDoc(root, "govkit.yml", GOVKIT_YML);
  writeDoc(root, join("docs", "rfc", "RFC-0001-x.md"), RFC_DOC);
  commitAll("seed");
});

afterEach(() => {
  rmRepo(root);
});

describe("govkit ledger — the RFC-0016 gate (e2e)", () => {
  it("passes a green committed ledger and prints the advisory N/M passing line", () => {
    writeLedger([entry(), entry({ id: "F-002", passes: false })]);
    commitAll("ledger");
    const r = cli(["ledger"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("govkit ledger: OK — 2 entries, 1/2 passing");
  });

  it("fails (exit 1) when a spec does not resolve to any governed doc id; --hook exits 2", () => {
    writeLedger([entry(), entry({ id: "F-002", spec: "RFC-9999" })]);
    commitAll("ledger");
    const r = cli(["ledger"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("spec 'RFC-9999' does not resolve");
    expect(r.stderr).toContain("2/2 passing"); // the advisory line prints on FAIL too
    const hook = cli(["ledger", "--hook"]);
    expect(hook.status).toBe(2);
  });

  it("fails on a duplicate entry id", () => {
    writeLedger([entry(), entry({ title: "same id again" })]);
    commitAll("ledger");
    const r = cli(["ledger"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("duplicate entry id 'F-001'");
  });

  it("fails when an entry present in HEAD was removed — entries are append-only", () => {
    writeLedger([entry(), entry({ id: "F-002" })]);
    commitAll("two entries");
    writeLedger([entry()]); // F-002 vanishes from the working copy
    const r = cli(["ledger"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("entry 'F-002' exists in HEAD but was removed");
  });

  it("fails when a check recorded in HEAD was dropped — provenance may not vanish", () => {
    writeLedger([entry({ check: "bun test drift" })]);
    commitAll("with check");
    writeLedger([entry()]); // same entry, check field gone
    const r = cli(["ledger"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("had check 'bun test drift' in HEAD but it was removed");
  });

  it("allows the honest moves: passes true→false and a new entry", () => {
    writeLedger([entry({ passes: true })]);
    commitAll("passing");
    writeLedger([entry({ passes: false }), entry({ id: "F-002", passes: false })]);
    const r = cli(["ledger"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("0/2 passing");
  });

  it("runs the pure checks with ONE stderr note when there is no committed baseline", () => {
    writeLedger([entry({ spec: "RFC-9999" })]); // never committed → no HEAD version
    const r = cli(["ledger"]);
    expect(r.status).toBe(1); // the pure spec-resolution layer still gates
    expect(r.stderr).toContain("no committed baseline");
    expect(r.stderr).toContain("append-only checks skipped");
  });

  it("errors operationally, naming the expected path, when the ledger file is missing", () => {
    const r = cli(["ledger"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`no ledger at ${join(root, "docs", "ledger.json")}`);
    const hook = cli(["ledger", "--hook"]);
    expect(hook.status).toBe(2); // fail-closed under --hook, like every operational error
  });

  it("fails loud on malformed JSON and on a schema-breaking entry, naming the offender", () => {
    writeDoc(root, LEDGER, "{ not json\n");
    const bad = cli(["ledger"]);
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain("docs/ledger.json is not valid JSON");

    writeLedger([entry({ passes: "yes" })]);
    commitAll("bad entry");
    const schema = cli(["ledger"]);
    expect(schema.status).toBe(1);
    expect(schema.stderr).toContain("entry #1 ('F-001'): 'passes' must be a boolean");
  });

  it("honours ledger.path from config and rejects one escaping the root", () => {
    writeDoc(root, "govkit.yml", `${GOVKIT_YML}ledger:\n  path: meta/features.json\n`);
    writeDoc(root, join("meta", "features.json"), `${JSON.stringify({ entries: [entry()] })}\n`);
    commitAll("custom path");
    const r = cli(["ledger"]);
    expect(r.status).toBe(0);

    writeDoc(root, "govkit.yml", `${GOVKIT_YML}ledger:\n  path: ../outside.json\n`);
    const escaped = cli(["ledger"]);
    expect(escaped.status).toBe(1);
    expect(escaped.stderr).toContain("resolves outside the repo root");
  });

  it("runs the append-only layer when --root is a SUBDIRECTORY of the repo (HEAD paths are cwd-relative)", () => {
    // `git show HEAD:<path>` resolves from the repo TOP LEVEL; with a nested --root the
    // baseline lookup must use the cwd-relative `HEAD:./<path>` form or it always misses
    // and the append-only layer silently never runs — the exact bypass this pins.
    const sub = join(root, "gov");
    writeDoc(sub, "govkit.yml", GOVKIT_YML);
    writeDoc(sub, join("docs", "rfc", "RFC-0001-x.md"), RFC_DOC);
    writeDoc(
      sub,
      LEDGER,
      `${JSON.stringify({ entries: [entry(), entry({ id: "F-002" })] }, null, 2)}\n`,
    );
    commitAll("nested govkit root");
    // Remove F-002 in the working tree — the gate must see the committed baseline and fail.
    writeDoc(sub, LEDGER, `${JSON.stringify({ entries: [entry()] }, null, 2)}\n`);
    const r = runCli(sub, ["ledger"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("entry 'F-002' exists in HEAD but was removed");
    expect(r.stderr).not.toContain("no committed baseline");
  });

  it("catches the rename bypass: pointing ledger.path at a fresh file abandons the committed evidence", () => {
    writeLedger([entry()]);
    commitAll("ledger");
    // Swap the path and seed a fresh empty ledger in the same change — F-001's committed
    // evidence would vanish without the path-continuity guard (the fresh file has no HEAD
    // baseline, so layer 4 would silently degrade to the skip note).
    writeDoc(root, "govkit.yml", `${GOVKIT_YML}ledger:\n  path: docs/ledger2.json\n`);
    writeDoc(root, join("docs", "ledger2.json"), `${JSON.stringify({ entries: [] })}\n`);
    const r = cli(["ledger"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("ledger path changed from docs/ledger.json to docs/ledger2.json");
    expect(r.stderr).toContain("append-only continuity broken");
  });

  it("still degrades gracefully for a legitimate FIRST ledger at a committed custom path", () => {
    writeDoc(root, "govkit.yml", `${GOVKIT_YML}ledger:\n  path: docs/ledger2.json\n`);
    commitAll("declare the ledger path"); // config committed BEFORE the ledger exists
    writeDoc(root, join("docs", "ledger2.json"), `${JSON.stringify({ entries: [entry()] })}\n`);
    const r = cli(["ledger"]);
    expect(r.status).toBe(0); // bootstrap, not bypass: committed path == current path
    expect(r.stderr).toContain("no committed baseline");
  });

  it("writes a --journal record { cmd: ledger, ledger: { entries, passing, violations } }", () => {
    writeLedger([entry(), entry({ id: "F-002", passes: false })]);
    commitAll("ledger");
    const r = cli(["ledger", "--journal"]);
    expect(r.status).toBe(0);
    const record = JSON.parse(
      readFileSync(join(root, ".govkit", "journal.jsonl"), "utf8").trim(),
    ) as JournalRecord;
    expect(record.cmd).toBe("ledger");
    expect(record.ok).toBe(true);
    expect(record.ledger).toEqual({ entries: 2, passing: 1, violations: 0 });
  });

  it("--json emits the full result on stdout (pure) with the note kept on stderr", () => {
    writeLedger([entry()]);
    const r = cli(["ledger", "--json"]); // uncommitted → degraded layer 4
    expect(r.status).toBe(0);
    const result = JSON.parse(r.stdout) as LedgerResult;
    expect(result.ok).toBe(true);
    expect(result.entries).toBe(1);
    expect(result.headNote).toContain("no committed baseline");
    expect(r.stderr).toContain("append-only checks skipped");
  });
});
