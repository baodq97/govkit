#!/usr/bin/env node
// Deterministic surface check for the swe-flow plugin: front-matter shape,
// description budget, and description collisions. Keyless, no deps, no state.
// Runs in `bun run check`; it scores THIS repo's plugin, never a consumer's docs,
// so it is deliberately not a `govkit` CLI subcommand.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_DESCRIPTION = 1024; // agents inject this into the system prompt
const COLLIDE_ERROR = 0.75;
const COLLIDE_WARN = 0.5;
const STOP = new Set([
  "the",
  "and",
  "for",
  "this",
  "that",
  "with",
  "from",
  "into",
  "when",
  "use",
  "its",
  "not",
  "are",
  "you",
]);

/** Parse front-matter, joining folded/block scalars into one line. */
export function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return null;
  const out = {};
  let key = null;
  for (const line of m[1].split("\n")) {
    const kv = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1];
      const v = kv[2].trim();
      // `>`, `>-`, `|`, `|-` open a block scalar: the value is on the following lines
      out[key] = /^[>|][-+]?$/.test(v) ? "" : v;
      continue;
    }
    if (key && /^\s+\S/.test(line)) out[key] = `${out[key]} ${line.trim()}`.trim();
  }
  return out;
}

function tokenize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function cosine(a, b) {
  const av = new Map();
  const bv = new Map();
  for (const t of a) av.set(t, (av.get(t) ?? 0) + 1);
  for (const t of b) bv.set(t, (bv.get(t) ?? 0) + 1);
  let dot = 0;
  for (const [t, n] of av) dot += n * (bv.get(t) ?? 0);
  const na = Math.sqrt([...av.values()].reduce((s, n) => s + n * n, 0));
  const nb = Math.sqrt([...bv.values()].reduce((s, n) => s + n * n, 0));
  return na && nb ? dot / (na * nb) : 0;
}

// US-0006 / RFC-0032 F5: a description is how the model decides whether to
// auto-invoke a skill/agent, so it must read as a trigger — naming the
// moment or intent that calls it — not as a terse label. This is a small,
// deliberately loose set of common trigger phrasings; anything that fails
// all of them either needs a rewrite or an explicit
// `disable-model-invocation: true` guard (checked by the caller, not here).
export function isTriggerShaped(desc) {
  const s = desc.toLowerCase();
  // "Use <subject> when/to/for/before <intent>" — the standard imperative shape.
  if (/\buse\b.*\b(when|to|for|before)\b/.test(s)) return true;
  // explicit trigger vocabulary
  if (/\btrigger/.test(s)) return true;
  // conditional phrasing naming the invoking moment
  if (/when the user|whenever|\bwhen you\b/.test(s)) return true;
  return false;
}

function collect(root) {
  const docs = [];
  for (const kind of ["agents", "skills"]) {
    const dir = join(root, kind);
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue; // a surface dir may legitimately not exist in a fixture
    }
    for (const e of entries) {
      const p = join(dir, e);
      const file = statSync(p).isDirectory() ? join(p, "SKILL.md") : p;
      if (!file.endsWith(".md")) continue;
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue; // a skill dir without SKILL.md is reported by the shape check below
      }
      const fm = parseFrontMatter(text);
      docs.push({
        kind,
        file,
        stem: statSync(p).isDirectory() ? e : e.replace(/\.md$/, ""),
        name: fm?.name ?? "",
        description: fm?.description ?? "",
        tools: fm?.tools ?? "",
        model: fm?.model ?? "",
        // Front-matter values come through parseFrontMatter as strings, but
        // tolerate an actual boolean too in case a caller hands us parsed YAML.
        disableModelInvocation:
          fm?.["disable-model-invocation"] === true || fm?.["disable-model-invocation"] === "true",
      });
    }
  }
  return docs;
}

export function lintSurface(root) {
  const docs = collect(root);
  const errors = [];
  const warnings = [];

  for (const d of docs) {
    if (!d.name) errors.push(`${d.file}: missing front-matter key "name"`);
    else if (d.name !== d.stem)
      errors.push(`${d.file}: name "${d.name}" does not match filename stem "${d.stem}"`);
    if (!d.description) errors.push(`${d.file}: missing front-matter key "description"`);
    else {
      if (d.description.length > MAX_DESCRIPTION)
        errors.push(
          `${d.file}: description is ${d.description.length} chars, over the ${MAX_DESCRIPTION} limit`,
        );
      if (!d.disableModelInvocation && !isTriggerShaped(d.description))
        errors.push(
          `${d.file}: description is not trigger-shaped and does not declare "disable-model-invocation: true"`,
        );
    }
    if (d.kind === "agents" && !d.tools) errors.push(`${d.file}: agent must declare "tools"`);
    if (d.kind === "agents" && !d.model) errors.push(`${d.file}: agent must declare "model"`);
  }

  // Lexical overlap is a PROXY for mis-routing, and a measured-poor one — read a warning as "look
  // at this pair", never as "this pair mis-routes". A 44-case / 3-router routing eval over the
  // ddd-flow surface (2026-08-01) scored 129/132: the two pairs this check warns on
  // (2-discover<->3-decompose 55.2%, 3-decompose<->7-define 50.9%) produced ZERO routing errors,
  // while the only real confusion — 3-decompose<->4-connect — sits at 43.6%, under the warn floor,
  // so this check was silent on the one pair that bit. Lowering the floor would only add noise:
  // the ranking itself is what does not track. Kept because a cheap keyless proxy still catches
  // copy-paste descriptions, but do not spend effort "fixing" a warned pair without a routing
  // measurement that shows it failing.
  const pairs = [];
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const score = cosine(tokenize(docs[i].description), tokenize(docs[j].description));
      if (score < COLLIDE_WARN) continue;
      pairs.push({ a: docs[i].stem, b: docs[j].stem, score });
      const line = `description collision ${(score * 100).toFixed(1)}%: ${docs[i].stem} <-> ${docs[j].stem}`;
      if (score >= COLLIDE_ERROR) errors.push(line);
      else warnings.push(line);
    }
  }

  return { docs, errors, warnings, pairs };
}

if (import.meta.filename === process.argv[1]) {
  const root = process.argv[2] ?? "plugins/swe-flow";
  const { docs, errors, warnings } = lintSurface(root);
  for (const w of warnings) console.warn(`warn  ${w}`);
  for (const e of errors) console.error(`error ${e}`);
  console.log(
    `skill-lint: ${docs.length} surface entries, ${errors.length} error(s), ${warnings.length} warning(s)`,
  );
  process.exit(errors.length > 0 ? 1 : 0);
}
