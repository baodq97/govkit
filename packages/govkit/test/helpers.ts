// Shared e2e fixture plumbing. Every CLI-level test in this suite builds the same scaffolding —
// a throwaway temp repo, an optional git identity, a govkit.yml, some docs, and a spawn of the
// built dist/cli.js — and the copies had begun to drift in small ways (five different `cli()`
// wrappers, four hand-written govkit.yml strings). One home, so a fixture rule changes in one
// place. Deliberately NOT a framework: these are the five moves the tests repeat, nothing more,
// and a test with an unusual need (a shim on PATH, a custom env) still spawns by hand.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** The built CLI every e2e test spawns — help/dispatch/exit codes only exist at this entrypoint. */
export const CLI = join(import.meta.dir, "../dist/cli.js");

/** A fresh temp repo root (mkdtemp under the OS tmpdir). Pair with `rmRepo` in afterEach. */
export function tmpRepo(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** The afterEach half of `tmpRepo`. */
export function rmRepo(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

/** One git command in `root`, output discarded — fixture plumbing, never an assertion. */
export function git(root: string, ...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

/** `git init` plus the throwaway identity/config every temp-repo git fixture needs. */
export function gitInit(root: string): void {
  git(root, "init");
  git(root, "config", "user.email", "t@example.com");
  git(root, "config", "user.name", "Test");
  git(root, "config", "commit.gpgsign", "false");
}

/** Spawn the built CLI against `root` (`--root` appended — position never matters to parseArgs).
 *  Never throws: pass or fail, the caller asserts on status/stdout/stderr. */
export function runCli(
  root: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [CLI, ...args, "--root", root], {
    encoding: "utf8",
    stdio: "pipe",
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** Write `rel` under `root`, creating parent directories — docs, config, code, anything. */
export function writeDoc(root: string, rel: string, content: string): void {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** The one-type govkit.yml the e2e fixtures share: base and type require the same keys, the
 *  standard ignore list. Defaults to the classic `adr` shape; a caller with an extra block
 *  (ledger.path, tiers) appends it — YAML key order does not matter to the loader. */
export function baseConfig(
  opts: { type?: string; dir?: string; required?: string[] } = {},
): string {
  const type = opts.type ?? "adr";
  const dir = opts.dir ?? `docs/${type}`;
  const required = `[${(opts.required ?? ["id", "title", "status", "owner", "date"]).join(", ")}]`;
  return `schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: ${required}
  types:
    ${type}:
      dir: ${dir}
      required: ${required}
`;
}
