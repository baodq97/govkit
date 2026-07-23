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
