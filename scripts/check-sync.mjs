#!/usr/bin/env node
// check-sync.mjs — deterministic drift guard for hand-maintained mirror files (US-0004).
//
// WHY: the swe-flow marketplace entry and the plugin's own plugin.json are edited by hand and
// moved in lockstep for every release until 0.6.0, when only plugin.json was bumped — consumers
// browsing the marketplace never saw the release. Same failure shape for the root↔template
// mirrors: template/ ships copies of root .claude files that must stay byte-identical. This
// check makes that class of silent drift impossible. Plain file/JSON comparison — no key, no
// network, stock node >= 20.
//
// SCOPE: check A pins plugin.json ↔ marketplace swe-flow entry on version AND description
// (byte equality — the entry is copied from plugin.json, so equality is by construction, not
// judgment). Check B byte-compares an EXPLICIT allowlist of root↔template pairs — no
// directory-wide sweep, because template/.github/workflows/ci.yml intentionally differs from
// the root CI workflow and must not be flagged. packages/govkit's version is deliberately NOT
// coupled: the CLI is a separate deliverable and versions independently of the plugin.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const failures = [];

// Check A: plugin manifest ↔ marketplace entry.
const pluginPath = "plugins/swe-flow/.claude-plugin/plugin.json";
const marketplacePath = ".claude-plugin/marketplace.json";
const plugin = JSON.parse(readFileSync(join(repoRoot, pluginPath), "utf8"));
const marketplace = JSON.parse(readFileSync(join(repoRoot, marketplacePath), "utf8"));
const entry = (marketplace.plugins ?? []).find((p) => p.name === plugin.name);

if (!entry) {
  failures.push(
    `${marketplacePath} has no entry named "${plugin.name}", but ${pluginPath} declares it.\n` +
      `  Fix: add a "${plugin.name}" entry whose version and description are copied from ${pluginPath}.`,
  );
} else {
  if (entry.version !== plugin.version) {
    failures.push(
      `version drift: ${pluginPath} says "${plugin.version}" but the "${plugin.name}" entry in ` +
        `${marketplacePath} says "${entry.version}".\n` +
        `  Fix: set the marketplace entry's "version" to "${plugin.version}" (the plugin manifest ` +
        `is the source of truth; every plugin bump updates both files).`,
    );
  }
  if (entry.description !== plugin.description) {
    failures.push(
      `description drift: the "${plugin.name}" entry in ${marketplacePath} is not byte-identical ` +
        `to the "description" in ${pluginPath}.\n` +
        `  Fix: copy the description verbatim from ${pluginPath} into the marketplace entry — ` +
        `identical-by-construction, no paraphrasing.`,
    );
  }
}

// Check B: intentionally-identical root↔template mirrors. Allowlist only — never widen this to a
// directory sweep (template CI workflow legitimately differs from root CI).
const mirrorPairs = [
  [".claude/workflows/sdlc.js", "template/.claude/workflows/sdlc.js"],
  [".claude/hooks/session-freshness.mjs", "template/.claude/hooks/session-freshness.mjs"],
];

for (const [rootFile, templateFile] of mirrorPairs) {
  let rootBytes;
  let templateBytes;
  try {
    rootBytes = readFileSync(join(repoRoot, rootFile));
    templateBytes = readFileSync(join(repoRoot, templateFile));
  } catch (err) {
    failures.push(
      `mirror pair unreadable: ${rootFile} ↔ ${templateFile}.\n` +
        `  ${err instanceof Error ? err.message : String(err)}\n` +
        `  Fix: both files must exist — the template ships a byte-identical copy of the root file.`,
    );
    continue;
  }
  if (!rootBytes.equals(templateBytes)) {
    failures.push(
      `mirror drift: ${rootFile} and ${templateFile} are no longer byte-identical.\n` +
        `  Fix: these files are intentionally the same artifact shipped twice — edit one, then ` +
        `copy it over the other so consumers scaffolded from template/ get the current version.`,
    );
  }
}

if (failures.length > 0) {
  console.error(`check-sync: FAIL — ${failures.length} drift issue(s):\n`);
  for (const failure of failures) console.error(`- ${failure}\n`);
  process.exit(1);
}

console.log(
  `check-sync: OK — marketplace "${plugin.name}" entry matches ${pluginPath} ` +
    `(version ${plugin.version}, description byte-identical) and ${mirrorPairs.length} ` +
    `root↔template mirror pair(s) are byte-identical.`,
);
