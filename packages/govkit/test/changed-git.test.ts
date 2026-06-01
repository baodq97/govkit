import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gitChangedDocs, resolveChangedBase } from "../src/util";

// The git-backed half of --changed (RFC-0004/0005) is the most operationally risky code
// in the feature — ref resolution, the fallback, and the diff/ls-files union — and every
// other test injects the changed Set directly. This exercises it against a REAL temp repo.
let root: string;
const g = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-git-"));
  g("init");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "Test");
  g("config", "commit.gpgsign", "false");
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "docs", "adr", "ADR-0001.md"), "# one\n");
  g("add", "-A");
  g("commit", "-m", "seed");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("gitChangedDocs", () => {
  it("unions tracked changes vs ref with new untracked .md files, as absolute paths", () => {
    writeFileSync(join(root, "docs", "adr", "ADR-0001.md"), "# one edited\n"); // tracked, modified
    writeFileSync(join(root, "docs", "adr", "ADR-0002.md"), "# two\n"); // untracked, new
    writeFileSync(join(root, "docs", "adr", "notes.txt"), "ignore me\n"); // not .md

    const changed = gitChangedDocs(root, "HEAD");
    expect(changed.has(resolve(root, "docs/adr/ADR-0001.md"))).toBe(true);
    expect(changed.has(resolve(root, "docs/adr/ADR-0002.md"))).toBe(true);
    expect([...changed].some((p) => p.endsWith("notes.txt"))).toBe(false);
  });

  it("returns an empty set on a clean tree vs HEAD", () => {
    expect(gitChangedDocs(root, "HEAD").size).toBe(0);
  });
});

describe("resolveChangedBase", () => {
  it("returns an explicit ref that resolves, with no implicit fallback", () => {
    expect(resolveChangedBase(root, "HEAD")).toEqual({ ref: "HEAD", implicitFallback: false });
  });

  it("throws a clear error on an unresolvable explicit ref", () => {
    expect(() => resolveChangedBase(root, "no-such-ref")).toThrow(/does not resolve/);
  });

  it("falls back to HEAD and flags it when origin/main does not resolve", () => {
    // No remote configured → origin/main is unresolvable → implicit fallback (CLI warns).
    expect(resolveChangedBase(root)).toEqual({ ref: "HEAD", implicitFallback: true });
  });
});
