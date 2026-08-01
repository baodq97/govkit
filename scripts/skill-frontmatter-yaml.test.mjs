// Every SKILL.md / agent front-matter block must be parseable YAML.
//
// It was not, and nothing said so. Two ddd-flow skills carried a `description:` written as an
// unquoted plain scalar containing `: ` — "…before any boundary is drawn: mining PRDs…" and
// "…where it belongs: a distributed invariant…" — which YAML reads as an attempt to open a mapping
// inside a scalar. `claude plugin validate` rejects the whole plugin and says exactly what happens
// at runtime: "this skill loads with empty metadata (all frontmatter fields silently dropped)". No
// name, no description, no `paths` — the skill is unroutable and the orchestrator's handoff to it
// dead-ends.
//
// `skill-lint` reported 0 errors throughout, because it read the block with a line regex rather
// than a YAML parser: it found `description:` and took the rest of the line, which is precisely
// what YAML refuses to do. A gate that parses more permissively than the consumer cannot see the
// bug the consumer hits — LEARNING-LOOP Round 24's F-GATE-INERT, one layer up. Same defect class
// as the `ddd_check` bad-YAML crash fixed earlier on this branch: a bare `: ` in a plain scalar.
//
// This asserts the property directly, with the same parser the consumer uses.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Every front-matter-bearing surface a plugin ships: skills and agents, across all plugins. */
function surfaces() {
  const out = [];
  const plugins = join(repo, "plugins");
  for (const p of readdirSync(plugins)) {
    for (const [dir, leaf] of [
      ["skills", "SKILL.md"],
      ["agents", null],
    ]) {
      const base = join(plugins, p, dir);
      let entries;
      try {
        entries = readdirSync(base);
      } catch {
        continue;
      }
      for (const e of entries) {
        const f = leaf ? join(base, e, leaf) : join(base, e);
        try {
          if (!statSync(f).isFile() || !f.endsWith(".md")) continue;
        } catch {
          continue;
        }
        out.push(f.slice(repo.length + 1));
      }
    }
  }
  return out.sort();
}

const BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

test("every plugin skill/agent front-matter is parseable YAML", () => {
  const files = surfaces();
  assert.ok(files.length > 20, `expected the whole plugin surface, found ${files.length}`);

  const broken = [];
  for (const rel of files) {
    const m = BLOCK.exec(readFileSync(join(repo, rel), "utf8"));
    if (!m) {
      broken.push(`${rel}: no front-matter block`);
      continue;
    }
    try {
      const doc = parse(m[1]);
      // A scalar or null here means the block parsed as something other than a mapping, which
      // loads as "no fields" just as surely as a parse error does.
      if (!doc || typeof doc !== "object" || Array.isArray(doc))
        broken.push(`${rel}: front-matter is not a mapping`);
      else if (!doc.name && !doc.description)
        broken.push(`${rel}: front-matter carries neither name nor description`);
    } catch (e) {
      broken.push(`${rel}: ${String(e.message).split("\n")[0]}`);
    }
  }

  assert.deepEqual(
    broken,
    [],
    `front-matter that a consumer's loader will drop:\n  ${broken.join("\n  ")}\n` +
      "A `: ` inside an unquoted value is the usual cause — quote it, use `>`, or reword.",
  );
});
