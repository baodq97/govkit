import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DriftAckResult, DriftResult } from "../src/commands/drift";
import type { JournalRecord } from "../src/journal";

// The RFC-0015 drift gate (as amended: content-hash claims), e2e on the built dist/cli.js
// against a REAL temp git repo (the stale.test.ts posture: the risky part is the git
// plumbing, so it is exercised for real). Pinned here: the gate's verdict + exit codes (1,
// --hook 2), the short-claim prefix match, the skip/violation split for missing vs garbage
// vs LEGACY (commit-sha) `reconciled:`, squash/amend history rewrites staying green (the CI
// escape the amendment exists for), the no-git degrade to exit 0, the --ack surgery (ONLY
// the claim value changes — byte-identical rest, CRLF included), and the --journal record.

const CLI = join(import.meta.dir, "../dist/cli.js");

const GOVKIT_YML = `schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status]
  types:
    rfc:
      dir: docs/rfc
      required: [id, title, status]
`;

let root: string;
const g = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
const cli = (args: string[]) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });
const headSha = (): string =>
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

/** The canonical claim the gate computes for `pathspecs`: sha256 over the governed files'
 *  index manifest (git's own blob OIDs), first 16 hex. Mirrors the shipped derivation so the
 *  ack-surgery assertions can predict the exact token; the SEMANTICS (what should drift, what
 *  must survive a squash) are pinned by the behavioral tests, not by this helper. */
function governedHash(...pathspecs: string[]): string {
  const out = execFileSync("git", ["ls-files", "-s", "-z", "--", ...pathspecs], {
    cwd: root,
    encoding: "utf8",
  });
  const manifest = out
    .split("\0")
    .filter((r) => r !== "")
    .join("\n");
  return `sha256:${createHash("sha256").update(manifest).digest("hex").slice(0, 16)}`;
}

/** A doc opting in (or not) to the drift gate. `reconciled: null` omits the key entirely —
 *  the not-opted-in case, distinct from an empty value (a violation). */
function rfcDoc(opts: { governs?: string; reconciled?: string | null }): string {
  const governs = opts.governs !== undefined ? `governs:\n  - ${opts.governs}\n` : "";
  const reconciled =
    opts.reconciled === undefined || opts.reconciled === null
      ? ""
      : `reconciled: ${opts.reconciled}\n`;
  return `---\nid: RFC-0001\ntitle: x\nstatus: accepted\n${governs}${reconciled}---\n\nbody prose\n`;
}

const DOC = join("docs", "rfc", "RFC-0001-x.md");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-drift-"));
  g("init");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "Test");
  g("config", "commit.gpgsign", "false");
  mkdirSync(join(root, "docs", "rfc"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "govkit.yml"), GOVKIT_YML);
  writeFileSync(join(root, "src", "thing.ts"), "export const x = 1;\n");
  g("add", "-A");
  g("commit", "-m", "seed");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Write the doc reconciled at the CURRENT governed content state (or a caller-chosen claim). */
function reconcileAtContent(reconciled?: string): string {
  const claim = reconciled ?? governedHash("src/thing.ts");
  writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: claim }));
  return claim;
}

describe("govkit drift — the RFC-0015 gate (e2e)", () => {
  it("passes (exit 0) when the opted-in doc's reconciled claim matches the governed content", () => {
    reconcileAtContent();
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("govkit drift: OK — 1 opted-in doc(s) in sync");
  });

  it("matches a SHORT reconciled claim by digest prefix (sha256: + 8–64 hex chars)", () => {
    const manifest = execFileSync("git", ["ls-files", "-s", "-z", "--", "src/thing.ts"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\0")
      .filter((r) => r !== "")
      .join("\n");
    const full = createHash("sha256").update(manifest).digest("hex");
    reconcileAtContent(`sha256:${full.slice(0, 8)}`);
    expect(cli(["drift", "--root", root]).status).toBe(0);
    reconcileAtContent(`sha256:${full}`); // the full 64-hex digest is also a legal claim
    expect(cli(["drift", "--root", root]).status).toBe(0);
  });

  it("fails (exit 1) naming both claims when the governed content moved; --hook exits 2", () => {
    const vouched = reconcileAtContent();
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "code moved");
    const current = governedHash("src/thing.ts");

    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("govkit drift: FAIL");
    expect(r.stderr).toContain("governed content moved");
    expect(r.stderr).toContain(vouched);
    expect(r.stderr).toContain(current);
    expect(r.stderr).toContain("governs: src/thing.ts");

    const hook = cli(["drift", "--hook", "--root", root]);
    expect(hook.status).toBe(2);
    expect(hook.stdout).toBe(""); // the report moves to stderr under --hook
    expect(hook.stderr).toContain("govkit drift: FAIL");
  });

  it("sees a STAGED-but-uncommitted content change — the claim is judged against the index", () => {
    reconcileAtContent();
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    expect(cli(["drift", "--root", root]).status).toBe(0); // unstaged edit: index unchanged
    g("add", "src/thing.ts");
    expect(cli(["drift", "--root", root]).status).toBe(1); // staged: the vouched state moved
  });

  it("stays GREEN across a history rewrite that keeps content identical — the squash-merge escape", () => {
    // The amendment's reason to exist: a squash merge rewrites every branch commit sha
    // without changing a byte, which orphaned every pre-merge commit-sha ack (CI escape,
    // run 28918975371). A content claim must not care what the commit graph looks like.
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "feature work");
    reconcileAtContent();
    writeFileSync(join(root, DOC), readFileSync(join(root, DOC), "utf8")); // touch nothing
    g("add", "-A");
    g("commit", "-m", "ack on the branch");
    expect(cli(["drift", "--root", root]).status).toBe(0);

    // Squash the two commits into one new commit — every sha above is rewritten.
    const before = headSha();
    g("reset", "--soft", "HEAD~2");
    g("commit", "-m", "squash!");
    expect(headSha()).not.toBe(before);
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("in sync");
  });

  it("SKIPS (exit 0) a doc with governs but no reconciled key — stale's turf, not drift's", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: null }));
    const r = cli(["drift", "--root", root, "--json"]);
    expect(r.status).toBe(0);
    const result = JSON.parse(r.stdout) as DriftResult;
    expect(result.checked).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.ok).toBe(true);
  });

  it("flags a GARBAGE reconciled value as a violation naming the doc, never a crash", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: "not-a-hash" }));
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("docs/rfc/RFC-0001-x.md");
    expect(r.stderr).toContain("'not-a-hash' is not a content-hash claim");
  });

  it("flags a LEGACY commit-sha claim as a violation naming the migration (never silently checked)", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: headSha() }));
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("legacy commit-sha claim");
    expect(r.stderr).toContain("govkit drift --ack");
  });

  it("flags an EMPTY reconciled value as a violation (empty ≠ unclaimed)", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: "" }));
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("reconciled: is empty");
  });

  it("flags a GHOST pathspec among live ones (RFC-0018) — coverage may not silently shrink", () => {
    // src/thing.ts is tracked, src/ghost.ts is not: the manifest is non-empty, so the claim
    // would check green — but one declared path governs NOTHING. Per-pathspec existence is
    // the RFC-0018 gate; the violation names exactly the dead spec.
    const claim = governedHash("src/thing.ts");
    writeFileSync(
      join(root, DOC),
      `---\nid: RFC-0001\ntitle: x\nstatus: accepted\ngoverns:\n  - src/thing.ts\n  - src/ghost.ts\nreconciled: ${claim}\n---\n\nbody prose\n`,
    );
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("match no tracked file: src/ghost.ts");
  });

  it("flags a ghost pathspec on a governs-only doc too (no reconciled — the declaration itself is broken)", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/ghost.ts", reconciled: null }));
    const r = cli(["drift", "--root", root, "--json"]);
    expect(r.status).toBe(1);
    const result = JSON.parse(r.stdout ? r.stdout : r.stderr) as DriftResult;
    expect(result.skipped).toBe(1); // still not opted into the CLAIM check
    expect(result.drifted).toHaveLength(1);
    expect(result.drifted[0]?.ghost).toEqual(["src/ghost.ts"]);
  });

  it("flags a well-formed claim whose governs paths match NO tracked file — never silently green", () => {
    writeFileSync(
      join(root, DOC),
      rfcDoc({ governs: "src/ghost.ts", reconciled: `sha256:${"a".repeat(16)}` }),
    );
    const r = cli(["drift", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("match no tracked file");
  });

  it("degrades to a note + exit 0 without git — advisory posture, never a crash", () => {
    const bare = mkdtempSync(join(tmpdir(), "govkit-drift-nogit-"));
    try {
      mkdirSync(join(bare, "docs", "rfc"), { recursive: true });
      writeFileSync(join(bare, "govkit.yml"), GOVKIT_YML);
      writeFileSync(
        join(bare, "docs", "rfc", "RFC-0001-x.md"),
        rfcDoc({ governs: "src/thing.ts", reconciled: `sha256:${"a".repeat(16)}` }),
      );
      const r = cli(["drift", "--root", bare]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("git unavailable, 1 opted-in doc(s) skipped");
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });

  it("writes a --journal record { cmd: drift, drift: { checked, drifted, skipped } }", () => {
    reconcileAtContent();
    const r = cli(["drift", "--journal", "--root", root]);
    expect(r.status).toBe(0);
    const line = readFileSync(join(root, ".govkit", "journal.jsonl"), "utf8").trim();
    const record = JSON.parse(line) as JournalRecord;
    expect(record.cmd).toBe("drift");
    expect(record.ok).toBe(true);
    expect(record.drift).toEqual({ checked: 1, drifted: 0, skipped: 0 });
    expect("verify" in record).toBe(false); // additive: gate fields stay omitted
  });
});

describe("govkit drift --ack — the reconciliation ritual (e2e)", () => {
  it("rewrites ONLY the reconciled claim value (byte-identical rest) and a rerun is green", () => {
    const vouched = reconcileAtContent();
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "code moved");
    const current = governedHash("src/thing.ts");
    const before = readFileSync(join(root, DOC), "utf8");

    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`${vouched} → ${current}`);

    const after = readFileSync(join(root, DOC), "utf8");
    // Surgical: the file after the ack is EXACTLY the file before with one claim substituted.
    expect(after).toBe(before.replace(vouched, current));

    const rerun = cli(["drift", "--root", root]);
    expect(rerun.status).toBe(0);
  });

  it("MIGRATES a legacy commit-sha claim to a content-hash claim", () => {
    const legacy = headSha();
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: legacy }));
    expect(cli(["drift", "--root", root]).status).toBe(1); // legacy = the migration violation

    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(0);
    const after = readFileSync(join(root, DOC), "utf8");
    expect(after).toContain(`reconciled: ${governedHash("src/thing.ts")}`);
    expect(after).not.toContain(legacy);
    expect(cli(["drift", "--root", root]).status).toBe(0);
  });

  it("preserves CRLF line endings byte-for-byte through the ack", () => {
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "code moved");
    const current = governedHash("src/thing.ts");
    const stale = `sha256:${"a".repeat(16)}`;
    const crlf =
      `---\r\nid: RFC-0001\r\ntitle: x\r\nstatus: accepted\r\ngoverns:\r\n  - src/thing.ts\r\n` +
      `reconciled: ${stale}\r\n---\r\n\r\nbody prose\r\n`;
    writeFileSync(join(root, DOC), crlf);

    const r = cli(["drift", "--ack", "--root", root]); // no path → all opted-in docs
    expect(r.status).toBe(0);
    const after = readFileSync(join(root, DOC), "utf8");
    expect(after).toBe(crlf.replace(stale, current)); // every \r\n survives, only the claim moved
  });

  it("is a said-out-loud NO-OP when the doc is already in sync (nothing written)", () => {
    reconcileAtContent();
    const before = readFileSync(join(root, DOC), "utf8");
    const r = cli(["drift", "--ack", "--root", root, "--json"]);
    expect(r.status).toBe(0);
    const result = JSON.parse(r.stdout) as DriftAckResult;
    expect(result.acked).toEqual([]);
    expect(result.upToDate).toHaveLength(1);
    expect(readFileSync(join(root, DOC), "utf8")).toBe(before);
  });

  it("errors operationally when the named doc declares no governs", () => {
    writeFileSync(join(root, DOC), rfcDoc({ reconciled: "sha256:abcdef12" })); // reconciled, no governs
    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("not a governed doc declaring 'governs:'");
  });

  it("errors operationally when the named doc has governs but never opted in (no reconciled key)", () => {
    writeFileSync(join(root, DOC), rfcDoc({ governs: "src/thing.ts", reconciled: null }));
    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("has no 'reconciled:' front-matter key");
  });

  it("preserves a same-line trailing comment through check and ack — only the claim token moves", () => {
    const vouched = governedHash("src/thing.ts");
    const withComment = (claim: string) =>
      `---\nid: RFC-0001\ntitle: x\nstatus: accepted\ngoverns:\n  - src/thing.ts\n` +
      `reconciled: ${claim}  # acked by alice\n---\n\nbody prose\n`;
    writeFileSync(join(root, DOC), withComment(vouched));
    expect(cli(["drift", "--root", root]).status).toBe(0); // the comment is not part of the claim

    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "code moved");
    const current = governedHash("src/thing.ts");

    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(0);
    // The claim token moved; the author's `# acked by alice` annotation survived byte-for-byte.
    expect(readFileSync(join(root, DOC), "utf8")).toBe(withComment(current));
  });

  it("refuses to ack a continuation-line reconciled value — never a corrupt two-line scalar", () => {
    // `reconciled:` with the value on the NEXT line is valid YAML; writing the claim onto the
    // key line would merge the two lines into one corrupt scalar, so the surgery refuses.
    const doc =
      `---\nid: RFC-0001\ntitle: x\nstatus: accepted\ngoverns:\n  - src/thing.ts\n` +
      `reconciled:\n  sha256:${"a".repeat(16)}\n---\n\nbody prose\n`;
    writeFileSync(join(root, DOC), doc);
    const r = cli(["drift", "--ack", DOC, "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("rewrite it by hand");
    expect(readFileSync(join(root, DOC), "utf8")).toBe(doc); // untouched, not corrupted
  });

  it("converges for a SELF-governing doc: ack + commit does not re-drift it", () => {
    // The doc's governs glob matches its own path. Without the self-path exclusion, every
    // ack commit changes the doc's own governed content past the claim just recorded, and
    // the doc re-drifts forever — the ritual could never converge.
    writeFileSync(join(root, "docs", "notes.md"), "governed prose\n");
    writeFileSync(
      join(root, DOC),
      rfcDoc({ governs: "docs/**", reconciled: `sha256:${"a".repeat(16)}` }),
    );
    g("add", "-A");
    g("commit", "-m", "docs corpus");
    expect(cli(["drift", "--root", root]).status).toBe(1); // the stale claim drifts

    expect(cli(["drift", "--ack", "--root", root]).status).toBe(0);
    g("add", "-A");
    g("commit", "-m", "ack the drift");
    const rerun = cli(["drift", "--root", root]);
    expect(rerun.status).toBe(0); // green stays green across the ack commit
    expect(rerun.stdout).toContain("in sync");
  });

  it("reports a ghost-path doc as CANNOT in an ack-all run — never exit 0 with drift still red", () => {
    reconcileAtContent(); // one healthy opted-in doc
    const ghostDoc = join("docs", "rfc", "RFC-0002-y.md");
    writeFileSync(
      join(root, ghostDoc),
      `---\nid: RFC-0002\ntitle: y\nstatus: accepted\ngoverns:\n  - src/ghost.ts\n---\n\nbody prose\n`,
    );
    const before = readFileSync(join(root, ghostDoc), "utf8");
    const r = cli(["drift", "--ack", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain("CANNOT");
    expect(r.stdout + r.stderr).toContain("src/ghost.ts");
    expect(readFileSync(join(root, ghostDoc), "utf8")).toBe(before); // an ack can't fix governs
  });

  it("marks an ack run in the --journal record (drift.ack: true) so drifted>0 ∧ ok stays legible", () => {
    reconcileAtContent();
    writeFileSync(join(root, "src", "thing.ts"), "export const x = 2;\n");
    g("add", "-A");
    g("commit", "-m", "code moved");
    const r = cli(["drift", "--ack", "--journal", "--root", root]);
    expect(r.status).toBe(0);
    const line = readFileSync(join(root, ".govkit", "journal.jsonl"), "utf8").trim();
    const record = JSON.parse(line) as JournalRecord;
    expect(record.cmd).toBe("drift");
    expect(record.ok).toBe(true);
    // drifted 1 with ok true is legal ONLY because the record says the run acked the drift.
    expect(record.drift).toEqual({ checked: 1, drifted: 1, skipped: 0, ack: true });
  });

  it("rejects --ack combined with --hook (exit 2) — a blocking hook must never mutate", () => {
    const vouched = reconcileAtContent();
    const before = readFileSync(join(root, DOC), "utf8");
    const r = cli(["drift", "--ack", "--hook", "--root", root]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--ack cannot be combined with --hook");
    expect(readFileSync(join(root, DOC), "utf8")).toBe(before); // nothing ran, nothing moved
    expect(before).toContain(vouched);
  });

  it("rejects --ack outside drift (scope table) and a doc path without --ack", () => {
    const scope = cli(["verify", "--ack", "--root", root]);
    expect(scope.status).toBe(2);
    expect(scope.stderr).toContain("--ack is only valid for drift");

    reconcileAtContent();
    const stray = cli(["drift", DOC, "--root", root]);
    expect(stray.status).toBe(2);
    expect(stray.stderr).toContain("only valid with --ack");
  });
});
