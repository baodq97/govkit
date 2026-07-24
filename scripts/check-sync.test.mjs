// Regression tests for Check D's core — the orphan-artifact detector (RFC-0026 C2), factored out
// of scripts/check-sync.mjs as the pure function `findOrphans`. Every case runs in-memory: no
// filesystem fixtures, no subprocess — the CLI does file discovery, `findOrphans` does the logic.
//
// SELF-REFERENCE: Check D requires every scripts/*.test.mjs to be named in package.json's "check"
// script. This very file must therefore be wired into that chain to pass the check it tests — the
// package.json wiring is part of the same change (see scripts/check-sync.mjs Check D comment).
import assert from "node:assert/strict";
import { test } from "node:test";
import { findOrphans } from "./check-sync.mjs";

// A test file present in the "check" script value is reachable from the gate → not an orphan.
test("*.test.mjs named in the check script is not flagged", () => {
  const failures = findOrphans({
    files: ["foo.test.mjs"],
    pkgScripts: { check: "node --test scripts/foo.test.mjs" },
    sourceTexts: { "foo.test.mjs": "" },
  });
  assert.deepEqual(failures, []);
});

// The "reachable from the gate" guarantee: being named in some OTHER script (not "check") does NOT
// count — that script may never run, so the test is still effectively orphaned.
test("*.test.mjs referenced only in a NON-check script is flagged", () => {
  const failures = findOrphans({
    files: ["foo.test.mjs"],
    pkgScripts: { check: "biome check .", "one-off": "node --test scripts/foo.test.mjs" },
    sourceTexts: { "foo.test.mjs": "" },
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /orphan test: scripts\/foo\.test\.mjs/);
});

// A test file no script mentions at all is an orphan.
test("*.test.mjs referenced nowhere is flagged", () => {
  const failures = findOrphans({
    files: ["foo.test.mjs"],
    pkgScripts: { check: "biome check ." },
    sourceTexts: { "foo.test.mjs": "" },
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /orphan test: scripts\/foo\.test\.mjs/);
});

// A non-test helper reached via a static import from a sibling script is not an orphan.
test("non-test .mjs imported (static) by another script is not flagged", () => {
  const failures = findOrphans({
    files: ["helper.mjs", "main.mjs"],
    pkgScripts: { check: "node scripts/main.mjs" },
    sourceTexts: {
      "helper.mjs": "export const x = 1;",
      "main.mjs": 'import { x } from "./helper.mjs";\nconsole.log(x);',
    },
  });
  assert.deepEqual(failures, []);
});

// Rule (b) also honours dynamic import() and re-export forms — the import regex covers all three.
test("non-test .mjs reached via dynamic import() or re-export is not flagged", () => {
  const dyn = findOrphans({
    files: ["helper.mjs", "main.mjs"],
    pkgScripts: { check: "node scripts/main.mjs" },
    sourceTexts: {
      "helper.mjs": "export const x = 1;",
      "main.mjs": 'const m = await import("./helper.mjs");',
    },
  });
  assert.deepEqual(dyn, []);

  const reexport = findOrphans({
    files: ["helper.mjs", "main.mjs"],
    pkgScripts: { check: "node scripts/main.mjs" },
    sourceTexts: {
      "helper.mjs": "export const x = 1;",
      "main.mjs": 'export { x } from "./helper.mjs";',
    },
  });
  assert.deepEqual(reexport, []);
});

// Rule (b) is broader than (a): a non-test helper wired to ANY package.json script (not just
// "check") is reachable and not an orphan.
test("non-test .mjs referenced by a non-check package.json script is not flagged", () => {
  const failures = findOrphans({
    files: ["helper.mjs"],
    pkgScripts: { check: "biome check .", build: "node scripts/helper.mjs" },
    sourceTexts: { "helper.mjs": "export const x = 1;" },
  });
  assert.deepEqual(failures, []);
});

// A non-test script nothing references and nothing imports is an orphan.
test("non-test .mjs referenced nowhere is flagged", () => {
  const failures = findOrphans({
    files: ["orphan.mjs"],
    pkgScripts: { check: "biome check ." },
    sourceTexts: { "orphan.mjs": "export const y = 2;" },
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /orphan script: scripts\/orphan\.mjs/);
});

// Importing only node built-ins (non-relative specifiers) does not make a script "reached".
test("importing only node built-ins does not exempt an otherwise-unreferenced script", () => {
  const failures = findOrphans({
    files: ["orphan.mjs"],
    pkgScripts: { check: "biome check ." },
    sourceTexts: { "orphan.mjs": 'import { readFileSync } from "node:fs";' },
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /orphan script: scripts\/orphan\.mjs/);
});

// fixtures/** are test inputs, not wired artifacts — exempt even when referenced nowhere. A real
// orphan alongside them is still flagged, proving the exemption is scoped, not a blanket pass.
test("fixtures/** files are ignored while a real orphan beside them is still flagged", () => {
  const failures = findOrphans({
    files: ["fixtures/helper.mjs", "fixtures/nested/inner.test.mjs", "orphan.mjs"],
    pkgScripts: { check: "biome check ." },
    sourceTexts: {
      "fixtures/helper.mjs": "export const z = 3;",
      "fixtures/nested/inner.test.mjs": "",
      "orphan.mjs": "export const y = 2;",
    },
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /orphan script: scripts\/orphan\.mjs/);
  assert.ok(
    !failures.some((f) => f.includes("fixtures/")),
    "no fixtures path should ever be reported",
  );
});

// The real repo state must be clean: every top-level scripts/*.mjs (this file included) is wired.
test("this repo's own scripts/ has no orphans", () => {
  const files = ["check-sync.mjs", "check-sync.test.mjs", "skill-lint.mjs", "skill-lint.test.mjs"];
  const failures = findOrphans({
    files,
    pkgScripts: {
      check:
        "node scripts/check-sync.mjs && node scripts/skill-lint.mjs plugins/swe-flow && " +
        "node --test scripts/skill-lint.test.mjs && node --test scripts/check-sync.test.mjs",
    },
    sourceTexts: {
      "check-sync.mjs": 'import { lintSurface } from "./skill-lint.mjs";',
      "check-sync.test.mjs": 'import { findOrphans } from "./check-sync.mjs";',
      "skill-lint.mjs": "export function lintSurface() {}",
      "skill-lint.test.mjs": 'import { lintSurface } from "./skill-lint.mjs";',
    },
  });
  assert.deepEqual(failures, []);
});
