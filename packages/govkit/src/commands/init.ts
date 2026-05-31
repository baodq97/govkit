import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface InitResult {
  created: string[];
  skipped: string[];
}

export interface InitOptions {
  root: string;
  force?: boolean;
}

// The scaffolded govkit.yml is the SAME canonical default the engine ships, read at
// runtime — not a second copy embedded as a string. That keeps the regex-bearing rubric
// out of a JS template literal (no backslash-escaping hazard) and makes drift between
// "what govkit ships" and "what init writes" structurally impossible. Resolved relative
// to this module so it works both bundled (dist/cli.js → ../templates) and from source
// in tests (src/commands/init.ts → ../../templates).
function defaultSchema(): string {
  for (const rel of ["../templates/govkit.default.yml", "../../templates/govkit.default.yml"]) {
    const path = fileURLToPath(new URL(rel, import.meta.url));
    if (existsSync(path)) return readFileSync(path, "utf8");
  }
  throw new Error("govkit init: bundled default schema (templates/govkit.default.yml) not found");
}

// Consumer hook: invoke govkit via npx so no local build/install is needed. exit-0
// + deny is the verified block protocol; timeout is generous for a cold npx fetch.
const SETTINGS_JSON = `{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx --yes govkit audit-write --root \\"\${CLAUDE_PROJECT_DIR}\\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
`;

const indexStub = (title: string): string =>
  `# ${title}\n\n| ID | Title | Status | Owner | Date |\n|---|---|---|---|---|\n`;

function scaffold(): Array<{ path: string; content: string }> {
  return [
    { path: "govkit.yml", content: defaultSchema() },
    { path: ".claude/settings.json", content: SETTINGS_JSON },
    { path: "docs/product/INDEX.md", content: indexStub("PRD Index") },
    { path: "docs/rfc/INDEX.md", content: indexStub("RFC Index") },
    { path: "docs/adr/INDEX.md", content: indexStub("ADR Index") },
    { path: "docs/issues/INDEX.md", content: indexStub("User Story (US) Index") },
  ];
}

// Scaffold govkit governance into a repo. Idempotent: an existing file is skipped
// (reported), never clobbered, unless --force. Path-safe: every write is confined to
// `root` — a scaffold entry that would escape it is refused, not written.
export function runInit(opts: InitOptions): InitResult {
  const root = resolve(opts.root);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const entry of scaffold()) {
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
