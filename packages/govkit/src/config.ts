import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface DocType {
  dir: string;
  required: string[];
  startStatus?: string;
}

export interface GovkitConfig {
  schemaVersion: number;
  docs: {
    ignore: string[];
    base: { required: string[] };
    types: Record<string, DocType>;
  };
}

const DEFAULT_IGNORE = ["INDEX.md", "_TEMPLATE.md"];

// Load the pluggable governance schema. A missing file is an explicit, actionable
// error — never a silent default that would let an unconfigured repo "pass".
export function loadConfig(root: string): GovkitConfig {
  const path = join(root, "govkit.yml");
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(
      `govkit: no govkit.yml at ${path} — run \`govkit init\` first (${(err as Error).message})`,
    );
  }
  const raw = (parseYaml(text) ?? {}) as Partial<GovkitConfig>;
  const docs = raw.docs ?? { ignore: DEFAULT_IGNORE, base: { required: [] }, types: {} };
  return {
    schemaVersion: raw.schemaVersion ?? 1,
    docs: {
      ignore: docs.ignore ?? DEFAULT_IGNORE,
      base: docs.base ?? { required: [] },
      types: docs.types ?? {},
    },
  };
}
