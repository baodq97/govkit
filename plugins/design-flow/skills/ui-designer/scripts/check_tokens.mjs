#!/usr/bin/env node
// check_tokens.mjs — the deterministic gate for docs/ui/tokens.json.
//
// Scope is deliberately DECLARED-ONLY: every check runs on values the token file itself
// declares (design read, dials, roles, contrast pairs), so every failure is exact. WCAG
// contrast is computed with the spec's own math over declared hex pairs — never sampled
// from a rendered page, because a sampled contrast check is a lead, not a verdict, and a
// gate built on leads teaches people to ignore it. Stock node >= 20, zero dependencies.
//
// Exit contract — three states, so "bad tokens" is distinguishable from "broken tool":
//   0  clean
//   2  gate fail — every violation printed, all collected in one run (a token change can
//      break several pairs at once; fail-fast would make the author iterate N times)
//   1  crash — the tool itself failed; never a verdict on the tokens
//
// Usage: node check_tokens.mjs <path/to/tokens.json>

import { readFileSync } from "node:fs";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
// An unfilled skeleton slot ("<...>") is a violation — same rule as govkit's placeholder
// check: the skeleton is designed to fail the gate until every slot is a real decision.
const PLACEHOLDER = /<[^>]*>/;

const AA = { body: 4.5, large: 3.0 };

function expandHex(hex) {
  const h = hex.slice(1);
  return h.length === 3 ? [...h].map((c) => c + c).join("") : h;
}

function luminance(hex) {
  const h = expandHex(hex);
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

function isFilledString(v) {
  return typeof v === "string" && v.trim() !== "" && !PLACEHOLDER.test(v);
}

// Pure over the parsed object → list of violation strings; unit-testable without fs.
export function checkTokens(tokens) {
  const errors = [];
  const bad = (msg) => errors.push(msg);

  // 1. Design read — the recorded commitment every later decision cites.
  const read = tokens?.meta?.designRead ?? {};
  for (const slot of ["pageKind", "audience", "job", "vibe", "systemFamily"]) {
    if (!isFilledString(read[slot]))
      bad(
        `meta.designRead.${slot}: missing, empty, or an unfilled <placeholder> — the design read is recorded before tokens`,
      );
  }

  // 2. Dials — explicit and reasoned; a silent baseline is the failure, not the value.
  const dials = tokens?.meta?.dials ?? {};
  for (const dial of ["variance", "motion", "density"]) {
    const v = dials[dial];
    if (!Number.isInteger(v) || v < 1 || v > 10)
      bad(
        `meta.dials.${dial}: not set to an integer 1-10 — dials are explicit and reasoned, never silent`,
      );
  }
  if (!isFilledString(dials.reason))
    bad("meta.dials.reason: missing — write why these values follow from the brief");

  // 3. Color roles — every declared value a real hex. Dark-mode roles are addressed in
  // contrast pairs as "dark.<role>"; they are checked with the same math.
  const roles = tokens?.color?.roles ?? {};
  const dark = tokens?.color?.dark ?? {};
  if (Object.keys(roles).length === 0)
    bad("color.roles: empty — declare the palette as named roles");
  const lookup = new Map();
  for (const [scope, set] of [
    ["", roles],
    ["dark.", dark],
  ]) {
    for (const [name, value] of Object.entries(set)) {
      if (typeof value !== "string" || !HEX.test(value)) {
        bad(
          `color.${scope ? "dark" : "roles"}.${name}: "${value}" is not a #rgb/#rrggbb hex${PLACEHOLDER.test(String(value)) ? " (unfilled placeholder)" : ""}`,
        );
        continue;
      }
      lookup.set(scope + name, value);
    }
  }

  // 4. Contrast pairs — the point of the file. At least one body-level pair, every pair
  // resolvable, every ratio at or above its AA threshold.
  const pairs = tokens?.contrastPairs;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    bad(
      "contrastPairs: missing or empty — declare at least the body-text pair; an unchecked palette is undeclared, not clean",
    );
  } else {
    if (!pairs.some((p) => p?.level === "body"))
      bad('contrastPairs: no pair with level "body" — body text is the floor');
    pairs.forEach((p, i) => {
      const where = `contrastPairs[${i}]`;
      if (!(p?.level in AA)) {
        bad(`${where}.level: "${p?.level}" is not "body" | "large"`);
        return;
      }
      const fg = lookup.get(p.fg);
      const bg = lookup.get(p.bg);
      if (!fg) bad(`${where}.fg: "${p.fg}" does not resolve to a declared color role`);
      if (!bg) bad(`${where}.bg: "${p.bg}" does not resolve to a declared color role`);
      if (!fg || !bg) return;
      const ratio = contrastRatio(fg, bg);
      if (ratio < AA[p.level])
        bad(
          `${where}: ${p.fg} on ${p.bg} is ${ratio.toFixed(2)}:1 — below WCAG AA ${AA[p.level]}:1 for ${p.level} text`,
        );
    });
  }

  // 5. Singularity rules that are countable here: one icon family.
  const family = tokens?.iconography?.family;
  if (family !== undefined && !isFilledString(family))
    bad("iconography.family: present but unfilled — name the ONE icon family or omit the key");

  return errors;
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: check_tokens.mjs <path/to/tokens.json>");
    return 1;
  }
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    console.error(
      `${path}: unreadable (${e.code ?? e.message}) — the token file is part of the deliverable`,
    );
    return 2;
  }
  let tokens;
  try {
    tokens = JSON.parse(raw);
  } catch (e) {
    console.error(`${path}: not valid JSON — ${e.message}`);
    return 2;
  }
  const errors = checkTokens(tokens);
  for (const err of errors) console.error(`${path}: ${err}`);
  console.log(`check_tokens: ${errors.length} violation(s)`);
  return errors.length > 0 ? 2 : 0;
}

if (import.meta.filename === process.argv[1]) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(`check_tokens crashed (this is a tool bug, not a verdict): ${e.stack}`);
    process.exit(1);
  }
}
