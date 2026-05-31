import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export interface InitResult {
  created: string[];
  skipped: string[];
}

export interface InitOptions {
  root: string;
  force?: boolean;
}

const GOVKIT_YML = `# govkit governance schema — the single pluggable interface the engine reads.
# Edit doc dirs / required front-matter to match your repo; the CLI reads this, nothing is hardcoded.
schemaVersion: 1

docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status, owner, date]
  types:
    prd:
      dir: docs/product
      required: [id, title, status, owner, date]
      startStatus: draft
    rfc:
      dir: docs/rfc
      required: [id, title, status, owner, date]
      startStatus: draft
    adr:
      dir: docs/adr
      required: [id, title, status, owner, date]
      startStatus: proposed
    us:
      dir: docs/issues
      required: [id, title, status, owner, date, priority]
      startStatus: open
`;

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

const SCAFFOLD: Array<{ path: string; content: string }> = [
  { path: "govkit.yml", content: GOVKIT_YML },
  { path: ".claude/settings.json", content: SETTINGS_JSON },
  { path: "docs/product/INDEX.md", content: indexStub("PRD Index") },
  { path: "docs/rfc/INDEX.md", content: indexStub("RFC Index") },
  { path: "docs/adr/INDEX.md", content: indexStub("ADR Index") },
  { path: "docs/issues/INDEX.md", content: indexStub("User Story (US) Index") },
];

// Scaffold govkit governance into a repo. Idempotent: an existing file is skipped
// (reported), never clobbered, unless --force. Path-safe: every write is confined to
// `root` — a scaffold entry that would escape it is refused, not written.
export function runInit(opts: InitOptions): InitResult {
  const root = resolve(opts.root);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const entry of SCAFFOLD) {
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
