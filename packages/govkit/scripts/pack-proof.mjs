#!/usr/bin/env node
// pack-proof.mjs — repeatable zero-install portability proof for the published govkit bundle.
//
// WHY: tsup bundles the one runtime dep (yaml) into dist/cli.js (noExternal). If that regresses,
// the in-repo gate STILL passes — `node dist/cli.js` resolves yaml from the dev node_modules that
// sits beside it (the Round-13 "only works because node_modules ambiently held it" bug). The only
// way to catch an unbundled dep is to run ONLY the published files from a dir with NO node_modules.
//
// WHAT: assemble the published file set (package.json `files` + package.json) in an OS-temp dir
// that has no node_modules anywhere up its path, then run the bundled CLI under STOCK node against
// this repo's real govkit.yml (which exercises the yaml import). Exit 0 only if it runs clean. Run
// after `bun run build`. Drives the copy from `files`, so a `files` that omits dist is caught too —
// no external tar/npm, so it is cross-platform (the Windows `tar` D:-as-remote-host trap is avoided).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = dirname(dirname(fileURLToPath(import.meta.url))); // packages/govkit
const repoRoot = dirname(dirname(pkgDir)); // repo root

const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const published = [...(pkg.files ?? []), "package.json"];

if (!existsSync(join(pkgDir, "dist", "cli.js"))) {
  console.error("pack-proof: dist/cli.js not found — run `bun run build` first.");
  process.exit(1);
}

let workDir;
try {
  // OS temp has no node_modules ancestors, so Node's upward resolution finds nothing to fall back
  // on: an unbundled `import ... from "yaml"` fails here exactly as it would for an npx consumer.
  workDir = mkdtempSync(join(tmpdir(), "govkit-packproof-"));
  const stage = join(workDir, "package");
  for (const entry of published) {
    const from = join(pkgDir, entry);
    if (existsSync(from)) cpSync(from, join(stage, entry), { recursive: true });
  }

  const cli = join(stage, "dist", "cli.js");
  if (!existsSync(cli)) {
    throw new Error(
      `published file set has no dist/cli.js (package.json \`files\`: ${JSON.stringify(pkg.files)})`,
    );
  }

  // process.execPath is the node running this script (the npm script invokes `node`), so this is
  // genuinely stock node — never bun. --root points at the repo's real govkit.yml.
  const out = execFileSync(process.execPath, [cli, "check", "--root", repoRoot], {
    encoding: "utf8",
  });
  const head = out.split(/\r?\n/).find((l) => l.includes("verify")) ?? out.trim();
  console.log(
    `pack-proof: OK — published file set ran \`govkit check\` under stock node from an isolated ` +
      `dir (no node_modules). ${head}`,
  );
} catch (err) {
  const extra = [err?.stdout, err?.stderr].filter(Boolean).join("\n");
  console.error(
    `pack-proof: FAIL — the published file set did not run standalone under stock node.\n` +
      `${extra}\n${err instanceof Error ? err.message : String(err)}`,
  );
  process.exitCode = 1;
} finally {
  if (workDir && existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
}
