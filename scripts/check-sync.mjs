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
// coupled: the CLI is a separate deliverable and versions independently of the plugin. Check C
// reuses Task 2's `lintSurface` to confirm every agent/skill on disk is at least named in
// plugins/swe-flow/README.md — a cheap substring check, not a prose-quality check, so the
// README stays the single place a human can see the whole surface without opening every file.
// Check D is the orphan-artifact detector (RFC-0026 C2): every scripts/*.test.mjs must be named in
// a package.json script (so a gate runs it) and every non-test scripts/*.mjs must be referenced by
// a package.json script or imported by another script — a file reached by neither is a dead orphan.
// Check E (US-0008/F1) pins the swe-flow plugin's own Stop hook command byte-identical to the Stop
// command in the settings template — the plugin ships that hook so a marketplace consumer who never
// runs `govkit init` still gets it enforced (see plugins/swe-flow/README.md for the accepted,
// idempotent double-fire this pin keeps honest).
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintSurface } from "./skill-lint.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// Core of Check D (RFC-0026 C2), factored out as a PURE function so it is unit-testable without any
// filesystem access. Inputs:
//   - files:       top-level script file names (basenames), e.g. ["check-sync.mjs", "x.test.mjs"];
//   - pkgScripts:  the package.json "scripts" object;
//   - sourceTexts: map of file name -> its source text (used only to detect sibling imports).
// Returns the list of orphan failure messages, byte-identical to the CLI's. Contract:
//   (a) a *.test.mjs is an orphan unless its name appears in the "check" script value (the gate);
//   (b) a non-test *.mjs is an orphan unless it is named in ANY package.json script OR imported
//       (relative specifier) by another script — (b) is deliberately broader than (a);
//   (c) anything under a `fixtures/` path segment is exempt (test inputs, not wired artifacts).
// The CLI reads scripts/ non-recursively, so it never passes a fixtures path; the (c) filter is a
// no-op for real CLI input (keeping output byte-identical) and exists so the exemption is testable.
export function findOrphans({ files, pkgScripts, sourceTexts, scriptsDir = "scripts" }) {
  const failures = [];
  const considered = files.filter((name) => !name.split("/").includes("fixtures"));

  const pkgScriptText = Object.values(pkgScripts ?? {}).join("\n");
  const referencedInPkg = (name) => pkgScriptText.includes(name);
  const checkScriptText = pkgScripts?.check ?? "";
  const referencedInCheckScript = (name) => checkScriptText.includes(name);

  // Build the set of sibling scripts imported by any script. Matches `from "…"`, bare `import "…"`,
  // dynamic `import("…")`, and `export … from "…"`; only relative specifiers count, keyed by basename.
  const importSpecifier = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  const importedNames = new Set();
  for (const name of considered) {
    const src = sourceTexts[name] ?? "";
    for (const match of src.matchAll(importSpecifier)) {
      const spec = match[1];
      if (spec.startsWith(".")) importedNames.add(basename(spec));
    }
  }

  for (const name of considered) {
    const rel = `${scriptsDir}/${name}`;
    if (name.endsWith(".test.mjs")) {
      if (!referencedInCheckScript(name)) {
        failures.push(
          `orphan test: ${rel} does not appear in package.json's "check" script value, so the gate ` +
            `never runs it (being named in some OTHER script does not count — that script may never ` +
            `run).\n` +
            `  Fix: add it to the "check" chain (e.g. \`node --test ${rel}\`) so the gate executes ` +
            `it, or delete it.`,
        );
      }
    } else if (!referencedInPkg(name) && !importedNames.has(name)) {
      failures.push(
        `orphan script: ${rel} is referenced by no package.json "scripts" value and imported by no ` +
          `other script — nothing reaches it.\n` +
          `  Fix: wire it into the "check" chain, import it from a script that already is, or delete it.`,
      );
    }
  }

  return failures;
}

// Core of Check E (US-0008/F1), factored out as a PURE function — no filesystem access — so it is
// unit-testable in-memory like `findOrphans` above. The swe-flow plugin ships its OWN Stop hook
// (plugins/swe-flow/hooks/hooks.json) so a marketplace consumer who never runs `govkit init` still
// gets the gate enforced; a consumer who also ran `init` gets the SAME command from both sources,
// which the owner accepted as idempotent duplicate work, not a contradiction (measured: no
// cross-source hook dedup — see plugins/swe-flow/README.md). That acceptance only holds if the two
// commands are byte-identical, which is what this pin enforces. Extraction never throws: malformed
// JSON or a missing `hooks.Stop[0].hooks[0].command` path both degrade to "unextractable" rather
// than an uncaught exception, because a drift check crashing is worse than a drift check that fails
// loudly with a diagnosable message.
export function stopHookCommandPin({ pluginHooksText, settingsText }) {
  const extractStopCommand = (text) => {
    try {
      const command = JSON.parse(text)?.hooks?.Stop?.[0]?.hooks?.[0]?.command;
      return typeof command === "string" ? command : undefined;
    } catch {
      return undefined;
    }
  };

  const pluginCommand = extractStopCommand(pluginHooksText);
  const settingsCommand = extractStopCommand(settingsText);

  if (pluginCommand !== undefined && pluginCommand === settingsCommand) {
    return [];
  }

  const describe = (command) =>
    command ?? "<unextractable — no hooks.Stop[0].hooks[0].command found, or malformed JSON>";

  return [
    `Stop hook command drift: plugins/swe-flow/hooks/hooks.json's Stop command is not byte-identical ` +
      `to packages/govkit/templates/settings.default.json's Stop command.\n` +
      `  plugin:   ${describe(pluginCommand)}\n` +
      `  settings: ${describe(settingsCommand)}\n` +
      `  Fix: the plugin-bundled Stop hook is a second enforcement path for marketplace consumers who ` +
      `never ran \`govkit init\` (plugins/swe-flow/README.md) — the accepted double-fire stays ` +
      `idempotent duplicate work, not drift, only while both commands run the identical gate. Copy one ` +
      `command over the other so they match exactly.`,
  ];
}

function runCli() {
  const failures = [];

  // Check A: plugin manifest ↔ marketplace entry — for EVERY plugin the monorepo ships.
  // (This check exists because swe-flow once bumped only plugin.json and marketplace browsers
  // never saw the release; ddd-flow has the same two-file shape and gets the same guard.)
  const marketplacePath = ".claude-plugin/marketplace.json";
  const marketplace = JSON.parse(readFileSync(join(repoRoot, marketplacePath), "utf8"));
  for (const pluginName of ["swe-flow", "ddd-flow", "design-flow"]) {
    const pluginPath = `plugins/${pluginName}/.claude-plugin/plugin.json`;
    const plugin = JSON.parse(readFileSync(join(repoRoot, pluginPath), "utf8"));
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
  }

  // Check B: intentionally-identical root↔template mirrors. Allowlist only — never widen this to a
  // directory sweep (template CI workflow legitimately differs from root CI).
  const mirrorPairs = [
    [".claude/workflows/sdlc.js", "template/.claude/workflows/sdlc.js"],
    [".claude/hooks/session-freshness.mjs", "template/.claude/hooks/session-freshness.mjs"],
    [".claude/workflows/gate-loop.js", "template/.claude/workflows/gate-loop.js"],
    // ONE source of truth for what a scaffolded consumer gets: `npx govkit init` reads the
    // packages/govkit/templates/*.default.* files at runtime, and template/ ships the same
    // bytes for copy-the-directory adoption. session-freshness is a three-way mirror (root
    // hook ↔ template hook above, plus the bundled default here) — all copies byte-identical.
    ["packages/govkit/templates/govkit.default.yml", "template/govkit.yml"],
    ["packages/govkit/templates/settings.default.json", "template/.claude/settings.json"],
    [
      "packages/govkit/templates/session-freshness.default.mjs",
      "template/.claude/hooks/session-freshness.mjs",
    ],
    ["packages/govkit/templates/AGENTS.default.md", "template/AGENTS.md"],
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

  // Check C: every agent/skill on disk is at least named in the plugin README, so the surface
  // never quietly grows past the doc that is supposed to enumerate it.
  const surface = lintSurface("plugins/swe-flow");
  const onDisk = new Set(surface.docs.map((d) => `${d.kind}/${d.stem}`));
  const readmePath = "plugins/swe-flow/README.md";
  const readme = readFileSync(join(repoRoot, readmePath), "utf8");
  const missing = [...onDisk].filter((s) => !readme.includes(s.split("/")[1]));
  if (missing.length > 0) {
    failures.push(
      `${readmePath} does not mention: ${missing.join(", ")}.\n` +
        `  Fix: add each new agent/skill to the README's component table so the surface stays ` +
        `documented as it grows.`,
    );
  }

  // Check D: orphan-artifact detector (RFC-0026 C2). A test or script wired to no gate is invisible —
  // it ships, but nothing ever runs it. Every scripts/*.test.mjs must appear in the "check" script's
  // value specifically — RFC-0026 promises "reachable from the gate", and the gate IS `npm run check`;
  // a test merely named in some OTHER package.json script (e.g. a one-off, non-gating convenience
  // script) is not actually reachable from the gate and would be a false negative here. Every
  // non-test scripts/*.mjs must be either referenced by ANY package.json script or imported by
  // another script (static, re-export, or dynamic) — rule (b) is intentionally broader than rule (a)
  // because a non-test helper script can be legitimately wired to a non-check script. A file that
  // satisfies neither is an orphan. scripts/fixtures/** is exempt — it holds test inputs, not wired
  // artifacts — and only top-level scripts/*.mjs are considered.
  const scriptsDir = "scripts";
  const scriptFiles = readdirSync(join(repoRoot, scriptsDir), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".mjs"))
    .map((e) => e.name);

  const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const sourceTexts = Object.fromEntries(
    scriptFiles.map((name) => [name, readFileSync(join(repoRoot, scriptsDir, name), "utf8")]),
  );
  for (const failure of findOrphans({
    files: scriptFiles,
    pkgScripts: rootPkg.scripts,
    sourceTexts,
    scriptsDir,
  })) {
    failures.push(failure);
  }

  // Check E: plugin Stop hook ↔ settings template Stop command (US-0008/F1). Read both files
  // defensively — a missing plugin hooks file is a failure to report, not a crash to throw.
  const pluginHooksPath = "plugins/swe-flow/hooks/hooks.json";
  const settingsTemplatePath = "packages/govkit/templates/settings.default.json";
  let pluginHooksText;
  let settingsTemplateText;
  try {
    pluginHooksText = readFileSync(join(repoRoot, pluginHooksPath), "utf8");
  } catch (err) {
    failures.push(
      `${pluginHooksPath} is unreadable: ${err instanceof Error ? err.message : String(err)}.\n` +
        `  Fix: the swe-flow plugin must ship this file so a marketplace consumer who never runs ` +
        `\`govkit init\` still gets the Stop gate enforced.`,
    );
  }
  try {
    settingsTemplateText = readFileSync(join(repoRoot, settingsTemplatePath), "utf8");
  } catch (err) {
    failures.push(
      `${settingsTemplatePath} is unreadable: ${err instanceof Error ? err.message : String(err)}.\n` +
        `  Fix: this file is the byte source of truth for the Stop hook command — it must exist.`,
    );
  }
  if (pluginHooksText !== undefined && settingsTemplateText !== undefined) {
    for (const failure of stopHookCommandPin({
      pluginHooksText,
      settingsText: settingsTemplateText,
    })) {
      failures.push(failure);
    }
  }

  if (failures.length > 0) {
    console.error(`check-sync: FAIL — ${failures.length} drift issue(s):\n`);
    for (const failure of failures) console.error(`- ${failure}\n`);
    process.exit(1);
  }

  console.log(
    `check-sync: OK — marketplace entries match plugin.json for swe-flow, ddd-flow, and design-flow ` +
      `(version + description byte-identical), ${mirrorPairs.length} ` +
      `root↔template mirror pair(s) are byte-identical, ${onDisk.size} agent/skill(s) are ` +
      `all named in ${readmePath}, all ${scriptFiles.length} ${scriptsDir}/*.mjs are wired to ` +
      `a gate or imported (no orphans), and the plugin Stop hook is byte-identical to the settings ` +
      `template's Stop command.`,
  );
}

// Only run the CLI when executed directly (`node scripts/check-sync.mjs`), not when imported by a
// test — so importing `findOrphans` has zero side effects (no filesystem reads, no process.exit).
function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) runCli();
