#!/usr/bin/env node
// ui_view.mjs — extractor for the design-flow view. Reads the docs/ui/ tree the ui-designer
// skill writes (design-brief.md, tokens.json, screens/*.md, audit.md) plus an optional
// candidates dir, and emits ONE workspace payload for the frozen shell.
//
// It is an extractor, not an emitter: the skill writes markdown/JSON for people and the gate,
// and this reads that back — so the view cannot drift from the artifacts. What it cannot parse
// it records as a GAP and the shell shows it: an unparsed section and an empty section look
// identical on screen, and only one of them is a design problem.
//
// Usage:
//   node ui_view.mjs --root . [--ui-dir docs/ui] [--candidates <dir>] [--mode draft|published]
//                    --out .design-flow/preview/model.json
//
// Zero dependencies, stock node >= 20.

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

// ---------------------------------------------------------------------------- args

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------- WCAG math
// Same formula as ui-designer's check_tokens.mjs — spec math, duplicated knowingly (a
// cross-skill import would couple two skills that only share a public standard).

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const AA = { body: 4.5, large: 3.0 };

function luminance(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const channel = (i) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrastRatio(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------- readers

function readIfExists(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** Split markdown into { title, body } sections on ## headings; body before the first ## goes
 *  under the synthetic title "_intro". Fenced code is respected (a ## inside a fence is body). */
function sections(md) {
  const out = [];
  let current = { title: "_intro", body: [] };
  let inFence = false;
  for (const line of md.split("\n")) {
    if (/^```/.test(line)) inFence = !inFence;
    const h = !inFence && /^##\s+(.*)$/.exec(line);
    if (h) {
      out.push(current);
      current = { title: h[1].trim(), body: [] };
    } else current.body.push(line);
  }
  out.push(current);
  return out.map((s) => ({ title: s.title, body: s.body.join("\n").trim() }));
}

/** First mermaid fence in a markdown string, or null. */
function mermaidBlock(md) {
  const m = /```mermaid\n([\s\S]*?)```/.exec(md);
  return m ? m[1].trim() : null;
}

/** Very small flow reader: "A --> B" / "A -->|label| B" lines out of a mermaid block. */
function flowEdges(mermaid) {
  const edges = [];
  for (const line of mermaid.split("\n")) {
    const m = /^\s*([\w-]+)(?:\[[^\]]*\])?\s*-->\s*(?:\|([^|]*)\|\s*)?([\w-]+)/.exec(line);
    if (m) edges.push({ from: m[1], to: m[3], label: (m[2] ?? "").trim() });
  }
  return edges;
}

/** Pull "**Field**: value" / "| **Field** | value |" style declarations out of a screen body. */
function fields(body) {
  const out = {};
  const patterns = [
    /^\s*[-*]?\s*\*\*([^*]+)\*\*[:\s|]+(.+?)\s*\|?\s*$/,
    /^\s*\|\s*\*?\*?([^|*]+?)\*?\*?\s*\|\s*(.+?)\s*\|\s*$/,
  ];
  for (const line of body.split("\n")) {
    for (const re of patterns) {
      const m = re.exec(line);
      if (m) {
        const key = m[1].trim().toLowerCase();
        if (!(key in out)) out[key] = m[2].trim();
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------- extraction

function extract({ root, uiDir, candidatesDir, mode }) {
  const gaps = [];
  const base = resolve(root, uiDir);

  // tokens.json — parsed as data; contrast computed here so the shell renders VERDICTS, not vibes.
  let tokens = null;
  const tokensRaw = readIfExists(join(base, "tokens.json"));
  if (tokensRaw === null)
    gaps.push(`${uiDir}/tokens.json: missing — the token sheet lens is empty`);
  else {
    try {
      const parsed = JSON.parse(tokensRaw);
      const roles = parsed?.color?.roles ?? {};
      const dark = parsed?.color?.dark ?? {};
      const lookup = new Map(Object.entries(roles));
      for (const [k, v] of Object.entries(dark)) lookup.set(`dark.${k}`, v);
      const contrast = [];
      for (const p of Array.isArray(parsed?.contrastPairs) ? parsed.contrastPairs : []) {
        const fg = lookup.get(p?.fg);
        const bg = lookup.get(p?.bg);
        if (typeof fg !== "string" || typeof bg !== "string" || !HEX.test(fg) || !HEX.test(bg)) {
          gaps.push(
            `tokens.json contrastPairs: "${p?.fg}" on "${p?.bg}" not resolvable to hex roles`,
          );
          continue;
        }
        const ratio = contrastRatio(fg, bg);
        const min = AA[p.level] ?? AA.body;
        contrast.push({
          ...p,
          fgHex: fg,
          bgHex: bg,
          ratio: Number(ratio.toFixed(2)),
          min,
          pass: ratio >= min,
        });
      }
      tokens = { ...parsed, contrast };
    } catch (e) {
      gaps.push(`${uiDir}/tokens.json: not valid JSON (${e.message})`);
    }
  }

  // design-brief.md — sections for the brief panel.
  let brief = null;
  const briefRaw = readIfExists(join(base, "design-brief.md"));
  if (briefRaw === null) gaps.push(`${uiDir}/design-brief.md: missing — the brief panel is empty`);
  else brief = { sections: sections(briefRaw) };

  // screens/*.md — one entry per bounded context.
  const screens = [];
  let screenFiles = [];
  try {
    screenFiles = readdirSync(join(base, "screens")).filter((f) => f.endsWith(".md"));
  } catch {
    gaps.push(`${uiDir}/screens/: missing — no screen inventory to show`);
  }
  for (const file of screenFiles.sort()) {
    const raw = readFileSync(join(base, "screens", file), "utf8");
    const mermaid = mermaidBlock(raw);
    const secs = sections(raw);
    const entries = secs
      .filter((s) => s.title !== "_intro")
      .map((s) => ({ name: s.title, fields: fields(s.body), raw: s.body }));
    if (!mermaid) gaps.push(`${uiDir}/screens/${file}: no mermaid flow block found`);
    if (entries.length === 0)
      gaps.push(`${uiDir}/screens/${file}: no "## <screen>" sections found`);
    screens.push({
      context: basename(file, ".md"),
      mermaid,
      edges: mermaid ? flowEdges(mermaid) : [],
      screens: entries,
    });
  }

  // prototype.html — THE deliverable. The view serves it in an iframe rather than re-rendering
  // it, because a second renderer is a second source of truth and they always diverge.
  let prototype = null;
  const protoRaw = readIfExists(join(base, "prototype.html"));
  if (protoRaw === null)
    gaps.push(
      `${uiDir}/prototype.html: missing — the Prototype lens is empty, and the prototype is the deliverable`,
    );
  else prototype = { path: `${uiDir}/prototype.html`, bytes: protoRaw.length };

  // audit.md — surfaced verbatim when present (AUDIT mode output).
  const auditRaw = readIfExists(join(base, "audit.md"));
  const audit = auditRaw === null ? null : { sections: sections(auditRaw) };

  // Blind-spot declaration: anything under docs/ui this extractor does NOT read is reported,
  // never silently skipped — a source-of-truth script that ignores data it cannot classify
  // produces a confident picture of an incomplete world.
  const CLASSIFIED = new Set([
    "INDEX.md",
    "design-brief.md",
    "tokens.json",
    "prototype.html",
    "audit.md",
    "screens",
    "_views",
  ]);
  try {
    for (const entry of readdirSync(base)) {
      if (!CLASSIFIED.has(entry))
        gaps.push(
          `${uiDir}/${entry}: not a file this extractor classifies — it is NOT shown in the view`,
        );
    }
  } catch {
    gaps.push(`${uiDir}/: missing entirely — nothing to extract`);
  }
  try {
    for (const entry of readdirSync(join(base, "screens")))
      if (!entry.endsWith(".md"))
        gaps.push(`${uiDir}/screens/${entry}: not .md — the extractor does not read it`);
  } catch {
    /* screens/ absence already reported above */
  }

  // Candidate token sets — the theme-factory-style opening move: the agent writes N candidate
  // directions; the shell renders them side by side and the human picks one by eye.
  const candidates = [];
  if (candidatesDir) {
    let names = [];
    try {
      names = readdirSync(resolve(root, candidatesDir)).filter((f) => f.endsWith(".json"));
    } catch {
      gaps.push(`${candidatesDir}: candidates dir named but unreadable`);
    }
    for (const file of names.sort()) {
      try {
        const parsed = JSON.parse(readFileSync(resolve(root, candidatesDir, file), "utf8"));
        candidates.push({ name: basename(file, ".json"), tokens: parsed });
      } catch (e) {
        gaps.push(`${candidatesDir}/${file}: not valid JSON (${e.message})`);
      }
    }
  }

  return {
    schemaVersion: 1,
    kind: "design-workspace",
    source: { mode, root: uiDir },
    brief,
    tokens,
    prototype,
    screens,
    audit,
    candidates,
    gaps,
  };
}

// ---------------------------------------------------------------------------- main

const args = parseArgs(process.argv.slice(2));
const payload = extract({
  root: args.root ?? ".",
  uiDir: args["ui-dir"] ?? "docs/ui",
  candidatesDir: args.candidates ?? null,
  mode: args.mode === "published" ? "published" : "draft",
});
const out = resolve(args.out ?? ".design-flow/preview/model.json");
mkdirSync(resolve(out, ".."), { recursive: true });
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
// Serve the prototype from the session dir so the shell can iframe it without the server
// needing to know the project layout. Copying (not linking) keeps Windows checkouts working.
if (payload.prototype) {
  try {
    copyFileSync(
      resolve(args.root ?? ".", args["ui-dir"] ?? "docs/ui", "prototype.html"),
      resolve(out, "..", "prototype.html"),
    );
  } catch (e) {
    payload.gaps.push(`prototype.html could not be staged for the view (${e.message})`);
  }
}

console.log(
  `ui_view: wrote ${out} — tokens ${payload.tokens ? "ok" : "MISSING"}, ` +
    `${payload.screens.length} screen file(s), ${payload.candidates.length} candidate(s), ` +
    `${payload.gaps.length} gap(s)`,
);
for (const g of payload.gaps) console.log(`  gap: ${g}`);
