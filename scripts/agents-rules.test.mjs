// agents-rules.test.mjs — the drift guard for the AGENTS.md -> .claude/rules/*.md split (US-0009 / RFC-0032 F8).
//
// F8 moved the per-path rules out of the always-on root AGENTS.md into lazy .claude/rules/*.md
// (paths:-scoped). The split is only safe if a rule cannot silently VANISH: a future edit that drops
// a load-bearing rule from AGENTS.md, or demotes a genuinely-global one into a paths:-scoped file
// that will not load on an unrelated session, must fail a gate — `govkit verify`/`eval` cannot see
// prose content. This is that gate: it pins (a) the global anchors that MUST stay in root AGENTS.md,
// (b) the full load-bearing inventory that must survive SOMEWHERE in the union, and (c) the split's
// structural invariants (AGENTS.md carries no paths: frontmatter; every rule file carries one).

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const agents = readFileSync(join(repo, "AGENTS.md"), "utf8");
const rulesDir = join(repo, ".claude/rules");
const ruleFiles = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
const ruleTexts = ruleFiles.map((f) => readFileSync(join(rulesDir, f), "utf8"));
const union = [agents, ...ruleTexts].join("\n\n");

// Anchors that MUST remain in the always-on root AGENTS.md — demoting any of these into a
// paths:-scoped rule file (which will not load on an unrelated session) is a silent loss.
const GLOBAL_ANCHORS = [
  "The authority split is main-agent vs sub-agent",
  "Lifecycle — gates by change class",
  "Act-on-green is conditional",
  "no API key",
];

// The full load-bearing inventory: every rule below must survive SOMEWHERE (AGENTS.md or a rule
// file). Dropping one from both fails this test — the exact failure mode F8 exists to prevent.
const INVENTORY_ANCHORS = [
  ...GLOBAL_ANCHORS,
  "Never pipe a gate through",
  "Reconcile-as-you-go",
  "minimalism ladder",
  "Gate the INDEX",
  "Run evidence is exhibit",
];

test("root AGENTS.md still carries every global anchor (none demoted to a path-scoped file)", () => {
  for (const a of GLOBAL_ANCHORS) {
    assert.ok(agents.includes(a), `global anchor missing from root AGENTS.md: "${a}"`);
  }
});

test("the load-bearing rule inventory survives somewhere in AGENTS.md ∪ .claude/rules/*.md", () => {
  for (const a of INVENTORY_ANCHORS) {
    assert.ok(union.includes(a), `load-bearing rule vanished from the split union: "${a}"`);
  }
});

test("root AGENTS.md carries NO paths: frontmatter key (it is the always-on contract)", () => {
  assert.ok(!/^paths:/m.test(agents), "AGENTS.md must not be path-scoped — it loads every session");
});

test("every .claude/rules/*.md declares a non-empty paths: glob (it is lazy-loaded)", () => {
  assert.ok(ruleFiles.length > 0, "expected at least one .claude/rules/*.md after the F8 split");
  for (const [i, text] of ruleTexts.entries()) {
    assert.match(text, /^paths:/m, `${ruleFiles[i]}: missing a paths: frontmatter key`);
    // at least one glob line under paths: — a bare `paths:` with no globs auto-loads nothing.
    assert.match(
      text,
      /^\s*-\s*["']?[^"'\n]+["']?\s*$/m,
      `${ruleFiles[i]}: paths: has no glob entry`,
    );
  }
});
