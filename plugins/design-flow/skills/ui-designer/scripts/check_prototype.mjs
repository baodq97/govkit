#!/usr/bin/env node
// check_prototype.mjs — the drift + completeness gate for docs/ui/prototype.html.
//
// WHY: a prototype is a generated artifact that a human will inevitably hand-edit ("just this
// one color"), and the moment it stops resolving to the token file it stops being evidence of
// anything — it becomes a pretty picture that agrees with no gate. This check keeps the
// prototype and the gated tokens provably in sync, and keeps the frames honest: an unfilled
// frame or a lorem screen is worse than a missing one, because it looks done.
//
// Scope is deliberately narrow and mechanical. It does NOT judge whether the design is good —
// that is the reviewer's and the owner's job, and a script that pretended to judge taste would
// make people distrust the ones that don't.
//
// Exit contract: 0 clean · 2 gate fail (all violations printed) · 1 tool crash.
//
// Usage: node check_prototype.mjs <prototype.html> <tokens.json> <screens-dir|file>

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const PLACEHOLDER =
  /lorem ipsum|<!--\s*FILL THIS FRAME|TODO|TBD|placeholder text|Screen title here|xxx+/i;
// A literal color anywhere in the prototype means a decision that never passed the token gate.
// `&#10003;` (a numeric HTML entity) is not a color, so an `&` before the `#` disqualifies it.
const LITERAL_COLOR = /(?<![\w&-])(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))/g;

/** Same slug rule as the scaffold — the two must agree or the gate demands ids nobody wrote. */
function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readScreens(path) {
  const files = statSync(path).isDirectory()
    ? readdirSync(path)
        .filter((f) => f.endsWith(".md"))
        .map((f) => join(path, f))
    : [path];
  const out = [];
  for (const file of files) {
    const md = readFileSync(file, "utf8");
    let inFence = false;
    let current = null;
    for (const line of md.split("\n")) {
      if (/^```/.test(line)) inFence = !inFence;
      if (inFence) continue;
      const h = /^##\s+(.*)$/.exec(line);
      if (h) {
        // Same rule as the scaffold: a section is a screen when it declares a primary action.
        // The two must agree or the gate demands frames the scaffold never offered.
        current = { context: basename(file, ".md"), name: h[1].trim(), isScreen: false };
        out.push(current);
        continue;
      }
      if (current && /^\s*[-*]?\s*\*\*primary action\*\*\s*:/i.test(line)) current.isScreen = true;
    }
  }
  return out.filter((s) => s.isScreen);
}

/** Pure over the three inputs → violation strings; unit-testable without fs. */
export function checkPrototype(html, tokens, screens) {
  const errors = [];

  // 1. Every declared screen actually got drawn. A screen in the inventory that nobody drew is
  //    the failure mode this whole rework exists to kill.
  for (const s of screens) {
    const id = slug(s.name);
    const drawn = html.includes(`id="${id}--`) || html.includes(`id="${id}"`);
    // A prototype written before ids were slugged still DREW the screen; saying "no frame"
    // would send the author looking for missing design work instead of a rename.
    const drawnUnslugged = html.includes(`id="${s.name}--`) || html.includes(`id="${s.name}"`);
    if (drawn) continue;
    if (drawnUnslugged) {
      errors.push(
        `screen "${s.name}" is drawn but its frame id is not a valid HTML identifier — re-scaffold (or rename the id to "${id}--<state>"), otherwise anchors, getElementById, and #id selectors cannot reach it`,
      );
      continue;
    }
    errors.push(
      `screen "${s.name}" (${s.context}) is declared in the inventory but has no frame in the prototype`,
    );
  }

  // 2. Nothing left unfilled. The scaffold's own FILL THIS FRAME comment is the canary.
  const lines = html.split("\n");
  lines.forEach((line, i) => {
    if (PLACEHOLDER.test(line))
      errors.push(
        `line ${i + 1}: unfilled scaffold or placeholder text — "${line.trim().slice(0, 70)}"`,
      );
  });

  // 3. No color that bypassed the token gate. Two regions legitimately hold literals: the
  //    :root block (where tokens become CSS variables) and the scaffold's generated chrome
  //    (the neutral page around the device frames), which marks itself with sentinels. Using
  //    the scaffold's own markers rather than guessing from nearby selectors is what keeps the
  //    generator and this gate in agreement — an untouched scaffold must pass its own check.
  const rootStart = html.indexOf(":root");
  const rootEnd = rootStart === -1 ? -1 : html.indexOf("}", rootStart);
  const chromeStart = html.indexOf("GENERATED CHROME START");
  const chromeEnd = html.lastIndexOf("GENERATED CHROME END");
  const declared = new Set(
    [...Object.values(tokens?.color?.roles ?? {}), ...Object.values(tokens?.color?.dark ?? {})].map(
      (h) => String(h).toLowerCase(),
    ),
  );
  // A prototype with no chrome markers came from a scaffold older than this check. Saying that
  // once is honest; listing every neutral chrome color as a design violation would send the
  // author hunting for problems that are not theirs.
  if (chromeStart === -1) {
    errors.push(
      "no GENERATED CHROME markers — this prototype predates the current scaffold, so the token check cannot tell design colors from scaffold chrome. Re-run scaffold_prototype.mjs and move your screens into the new shell.",
    );
    return errors;
  }

  LITERAL_COLOR.lastIndex = 0;
  for (const m of html.matchAll(LITERAL_COLOR)) {
    if (rootStart !== -1 && m.index > rootStart && m.index < rootEnd) continue; // token block
    if (chromeStart !== -1 && chromeEnd !== -1 && m.index > chromeStart && m.index < chromeEnd)
      continue; // scaffold chrome, declared by the generator itself
    const value = m[1].toLowerCase();
    if (declared.has(value)) {
      errors.push(
        `literal ${m[1]} used outside :root — it matches a token role, so reference var(--c-<role>) instead (offset ${m.index})`,
      );
      continue;
    }
    errors.push(
      `literal ${m[1]} is a color decision outside tokens.json — add it as a role (so the contrast gate sees it) or use an existing var (offset ${m.index})`,
    );
  }

  // 4. The accessibility floor for this surface, taken from the shell's own declaration. Any
  //    px font-size inside a screen must clear it. This is the rule the pre-flight used to ask
  //    a person to measure, and the run that prompted it shipped 20-23px text on a 24px-floor
  //    kiosk with both gates green — a floor nobody can check is not a floor.
  const floor = /data-min-body="(\d+)"/.exec(html);
  if (floor) {
    const min = Number(floor[1]);
    const screenStart = html.indexOf("<body");
    for (const m of html.slice(screenStart).matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      const size = Number(m[1]);
      if (size < min)
        errors.push(
          `font-size ${size}px is below this surface's ${min}px body floor — raise it, or if this text is genuinely not body copy (a caption on a label), say so in the brief and use a class the floor check can see`,
        );
    }
  }

  // 5. The type stack the tokens declare is actually applied.
  if (tokens?.type?.body && !html.includes("--font-body"))
    errors.push("tokens declare a body typeface but the prototype never applies --font-body");

  return errors;
}

function main() {
  const [protoPath, tokensPath, screensPath] = process.argv.slice(2);
  if (!protoPath || !tokensPath || !screensPath) {
    console.error("usage: check_prototype.mjs <prototype.html> <tokens.json> <screens-dir|file>");
    return 1;
  }
  let html;
  let tokens;
  let screens;
  try {
    html = readFileSync(resolve(protoPath), "utf8");
  } catch (e) {
    console.error(
      `${protoPath}: unreadable (${e.code ?? e.message}) — the prototype is the deliverable`,
    );
    return 2;
  }
  try {
    tokens = JSON.parse(readFileSync(resolve(tokensPath), "utf8"));
    screens = readScreens(resolve(screensPath));
  } catch (e) {
    console.error(`inputs unreadable: ${e.message}`);
    return 2;
  }
  const errors = checkPrototype(html, tokens, screens);
  for (const err of errors) console.error(`${protoPath}: ${err}`);
  console.log(`check_prototype: ${errors.length} violation(s)`);
  return errors.length > 0 ? 2 : 0;
}

if (import.meta.filename === process.argv[1]) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(`check_prototype crashed (tool bug, not a verdict): ${e.stack}`);
    process.exit(1);
  }
}
