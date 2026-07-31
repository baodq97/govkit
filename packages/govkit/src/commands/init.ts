import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

export interface InitResult {
  created: string[];
  skipped: string[];
}

export interface InitOptions {
  root: string;
  force?: boolean;
  /**
   * RFC-0007: the configurable parent for kit-managed docs. When set to a non-`"."` value,
   * init writes `docs.root: <dir>` into the scaffolded govkit.yml AND scaffolds the INDEX
   * stubs under `<dir>/docs/*`. Absent/`"."` ⇒ today's layout exactly.
   */
  docsRoot?: string;
}

// Every scaffolded file with real content is the SAME canonical default the engine ships
// (packages/govkit/templates/*), read at runtime — not a second copy embedded as a string.
// That keeps regex-bearing / escape-heavy content out of JS template literals and makes
// drift between "what govkit ships" and "what init writes" structurally impossible
// (scripts/check-sync.mjs additionally pins these defaults byte-identical to template/).
// Resolved relative to this module so it works both bundled (dist/cli.js → ../templates)
// and from source in tests (src/commands/init.ts → ../../templates).
function bundledDefault(name: string): string {
  for (const rel of [`../templates/${name}`, `../../templates/${name}`]) {
    const path = fileURLToPath(new URL(rel, import.meta.url));
    if (existsSync(path)) return readFileSync(path, "utf8");
  }
  throw new Error(`govkit init: bundled default (templates/${name}) not found`);
}

const defaultSchema = (): string => bundledDefault("govkit.default.yml");

const indexStub = (title: string): string =>
  `# ${title}\n\n| ID | Title | Status | Owner | Date |\n|---|---|---|---|---|\n`;

// Inject `docs.root: <dir>` into the scaffolded schema (RFC-0007). The default template's
// `docs:` block has no `root:` line, so we add one as the first key under it. Targeted on the
// line-anchored `docs:` mapping key, never a substring — and only when a non-`.` root is asked
// for, so the default scaffold is byte-identical to before.
function withDocsRoot(schema: string, docsRoot: string): string {
  if (docsRoot === ".") return schema;
  const anchor = /^docs:\s*$/m;
  if (!anchor.test(schema)) {
    throw new Error("govkit init: cannot place docs.root — scaffold schema has no `docs:` block");
  }
  return schema.replace(anchor, `docs:\n  root: ${JSON.stringify(docsRoot)}`);
}

// One INDEX stub per type declared in the scaffolded schema — DERIVED, never hardcoded, so a
// type added to govkit.default.yml (domain, rel, …) scaffolds its dir automatically. A
// hand-kept list here silently un-scaffolds every new type: the premise at the top of
// govkit.yml ("doc dirs are CONFIG, not hardcoded in the CLI") has to hold for init too —
// caught 2026-07-29 when domain/rel joined the default schema and init kept emitting four.
function typeIndexStubs(prefix: string): Array<{ path: string; content: string }> {
  const parsed = parseYaml(defaultSchema()) as {
    docs?: { types?: Record<string, { dir?: string; idPrefix?: string }> };
  };
  return Object.entries(parsed?.docs?.types ?? {})
    .filter(([, def]) => typeof def?.dir === "string" && def.dir.trim() !== "")
    .map(([name, def]) => ({
      path: `${prefix}${def.dir}/INDEX.md`,
      content: indexStub(`${(def.idPrefix ?? name).toUpperCase()} Index`),
    }));
}

// The scaffold entries, rooted under docsRoot (default `"."` → `docs/*` as before). Uses POSIX
// separators in the relative path; runInit resolves them against `root` with the platform join.
function scaffold(docsRoot: string): Array<{ path: string; content: string }> {
  const prefix = docsRoot === "." ? "" : `${docsRoot}/`;
  return [
    { path: "govkit.yml", content: withDocsRoot(defaultSchema(), docsRoot) },
    // The decided consumer experience (RFC-0013 addendum "working-by-default"): three hooks —
    // SessionStart freshness advisory (needs the scaffolded hooks file below), PreToolUse
    // audit-write, and a Stop check. The npx-based hooks need no local build/install; exit-0
    // + deny is the verified block protocol, and timeouts are generous for a cold npx fetch.
    { path: ".claude/settings.json", content: bundledDefault("settings.default.json") },
    {
      path: ".claude/hooks/session-freshness.mjs",
      content: bundledDefault("session-freshness.default.mjs"),
    },
    // RFC-0031: the agent-facing half of the contract. Without it an `npx`-scaffolded repo
    // gets the enforcement (gate + hooks) but never the rules an agent reads BEFORE it writes
    // — the chain, the change-class gates, the never-self-flip constraints. Shipped as the
    // same bytes template/ carries, so both adoption paths land the identical contract.
    // Idempotent like every other entry: an existing AGENTS.md is skipped, never clobbered.
    { path: "AGENTS.md", content: bundledDefault("AGENTS.default.md") },
    ...typeIndexStubs(prefix),
  ];
}

// Scaffold govkit governance into a repo. Idempotent: an existing file is skipped
// (reported), never clobbered, unless --force. Path-safe: every write is confined to
// `root` — a scaffold entry that would escape it is refused, not written.
export function runInit(opts: InitOptions): InitResult {
  const root = resolve(opts.root);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const entry of scaffold(opts.docsRoot ?? ".")) {
    const target = resolve(root, entry.path);
    const rel = relative(root, target);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new Error(`govkit init: refusing to write outside root: ${entry.path}`);
    }
    if (existsSync(target) && !opts.force) {
      skipped.push(entry.path);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, entry.content, "utf8");
    created.push(entry.path);
  }
  return { created, skipped };
}
