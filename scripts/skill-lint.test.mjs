import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { lintSurface } from "./skill-lint.mjs";

const FIX = join(import.meta.dirname, "fixtures", "skill-lint");

test("good fixture is clean", () => {
  const r = lintSurface(join(FIX, "good"));
  assert.deepEqual(r.errors, []);
});

test("flags a description over 1024 chars", () => {
  const r = lintSurface(join(FIX, "weak"));
  assert.ok(r.errors.some((e) => e.includes("toolong.md") && e.includes("1024")));
});

test("flags a description collision at or above 0.75", () => {
  const r = lintSurface(join(FIX, "weak"));
  assert.ok(r.errors.some((e) => e.includes("collision") && e.includes("collide-a")));
});

test('parses a folded scalar description, not the ">" marker', () => {
  const r = lintSurface(join(FIX, "good"));
  const doc = r.docs.find((d) => d.file.endsWith("ok.md"));
  assert.ok(doc.description.length > 20, 'folded description must be joined, not ">"');
});

test("flags name not matching filename", () => {
  const r = lintSurface(join(FIX, "weak"));
  assert.ok(r.errors.some((e) => e.includes("name") && e.includes("filename")));
});

// US-0006 / RFC-0032 F5: a skill description is the auto-discovery trigger.
// A terse, non-trigger-shaped description with no `disable-model-invocation: true`
// guard is auto-discoverable but cannot win routing — that must be an error.
test("flags a terse, non-trigger-shaped description with no disable-model-invocation guard", () => {
  const r = lintSurface(join(FIX, "triggering"));
  assert.ok(
    r.errors.some(
      (e) =>
        e.includes("terse-unguarded") &&
        e.includes("trigger") &&
        e.includes("disable-model-invocation"),
    ),
    `expected a trigger-shape/guard error for terse-unguarded, got: ${JSON.stringify(r.errors)}`,
  );
});

test("does not flag a terse description guarded by disable-model-invocation: true", () => {
  const r = lintSurface(join(FIX, "triggering"));
  assert.ok(
    !r.errors.some((e) => e.includes("/guarded/SKILL.md") && e.includes("trigger")),
    `expected no trigger-shape error for guarded, got: ${JSON.stringify(r.errors)}`,
  );
});

test("does not flag a trigger-shaped description", () => {
  const r = lintSurface(join(FIX, "triggering"));
  assert.ok(
    !r.errors.some((e) => e.includes("trigger-shaped/SKILL.md") && e.includes("trigger")),
    `expected no trigger-shape error for trigger-shaped, got: ${JSON.stringify(r.errors)}`,
  );
});
