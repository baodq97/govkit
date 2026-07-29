#!/usr/bin/env node
// scaffold_prototype.mjs — emit the prototype shell so the designer spends its effort on the
// screens, not on re-deriving chrome.
//
// WHY THIS EXISTS: three independent runs of this brief each hand-rolled the same ~150 lines of
// device-frame CSS, the same :root variable block, and the same showcase grid before drawing a
// single screen. That is repeated work with a deterministic answer, and hand-rolling it has a
// second cost: the CSS variables get retyped from the token file by hand, so the prototype
// silently drifts from the tokens the gate checks. Deriving them here makes drift structurally
// impossible — every color in the prototype resolves back to a role in tokens.json.
//
// It emits a SHELL with one empty frame per declared screen. Filling those frames — real copy,
// real numbers, the actual layout — is the design work, and no script can do it.
//
// Usage:
//   node scaffold_prototype.mjs <tokens.json> <screens-dir-or-file> <out.html> [--device kiosk|phone|desktop]
//
// Zero dependencies, stock node >= 20.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

// minBody / minTarget are the accessibility floors from references/prototype-craft.md. They
// are emitted into the shell so check_prototype.mjs can verify them mechanically — a floor that
// only a human can measure is a floor nobody measures.
const DEVICES = {
  kiosk: { w: 480, h: 854, radius: 26, label: "portrait touchscreen", minBody: 24, minTarget: 56 },
  phone: { w: 390, h: 844, radius: 34, label: "phone", minBody: 16, minTarget: 44 },
  desktop: { w: 1280, h: 800, radius: 10, label: "desktop", minBody: 14, minTarget: 32 },
};

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      flags[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
    } else positional.push(argv[i]);
  }
  return { positional, flags };
}

/** Screen names + their declared state keys, read back from the screens markdown. */
function readScreens(path) {
  const files = statSync(path).isDirectory()
    ? readdirSync(path)
        .filter((f) => f.endsWith(".md"))
        .map((f) => join(path, f))
    : [path];
  const out = [];
  for (const file of files) {
    const md = readFileSync(file, "utf8");
    let current = null;
    let inFence = false;
    for (const line of md.split("\n")) {
      if (/^```/.test(line)) inFence = !inFence;
      if (inFence) continue;
      const h = /^##\s+(.*)$/.exec(line);
      if (h) {
        // A "##" alone does not make a screen — a screens file legitimately carries prose
        // sections (Flow, Assumed domain, notes) at the same level. What makes a section a
        // screen is that it declares a primary action, which is the per-screen contract's
        // required field. Sections are collected here and filtered below.
        current = {
          context: basename(file, ".md"),
          name: h[1].trim(),
          states: [],
          isScreen: false,
        };
        out.push(current);
        continue;
      }
      if (!current) continue;
      const f = /^\s*[-*]?\s*\*\*([^*]+)\*\*\s*:\s*(.*)$/.exec(line);
      if (!f) continue;
      const key = f[1].trim().toLowerCase();
      const value = f[2].trim();
      if (key === "primary action") current.isScreen = true;
      // A frame per STATE, because a state nobody drew is a state nobody designed. But a state
      // the inventory itself rules out ("n/a — this screen only exists with a read ticket") has
      // nothing to draw; forcing an empty frame for it would train people to fill frames with
      // filler, which is the exact habit the placeholder check is trying to stop.
      const ruledOut = /^n\/?a\b|^none\b|^not applicable/i.test(value);
      if (ruledOut) continue;
      if (key === "empty state") current.states.push("empty");
      if (key === "loading state") current.states.push("loading");
      if (key === "error states") current.states.push("error");
      // Variants are the third kind of frame: same screen, same job, materially different
      // content (an amount charged at the mismatched class, a replacement card instead of the
      // original). Declaring them keeps regeneration non-destructive — without this, the only
      // way to draw one was to hand-add a frame that the next scaffold run would delete.
      if (key === "variants")
        for (const v of value
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean))
          current.states.push(v);
    }
  }
  return out.filter((s) => s.isScreen);
}

function cssVars(tokens) {
  const lines = [];
  for (const [name, hex] of Object.entries(tokens?.color?.roles ?? {}))
    lines.push(`    --c-${name}: ${hex};`);
  for (const [name, hex] of Object.entries(tokens?.color?.dark ?? {}))
    lines.push(`    --c-dark-${name}: ${hex};`);
  if (tokens?.type?.display) lines.push(`    --font-display: ${tokens.type.display};`);
  if (tokens?.type?.body) lines.push(`    --font-body: ${tokens.type.body};`);
  const unit = Number.parseInt(tokens?.spacing?.unit ?? "8", 10) || 8;
  for (const step of tokens?.spacing?.scale ?? []) lines.push(`    --s-${step}: ${step * unit}px;`);
  return lines.join("\n");
}

/** A frame id has to survive getElementById, a CSS `#id` selector, and a URL fragment, so it
 *  is slugified; the human-readable name stays in the caption where people read it. */
function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function frame(screen, state, device) {
  const id = `${slug(screen.name)}--${slug(state)}`;
  return `      <figure class="slot" id="${id}">
        <figcaption class="slot-tag">${screen.name} <span>${state}</span></figcaption>
        <div class="device" style="--dev-w:${device.w}px;--dev-h:${device.h}px;--dev-r:${device.radius}px">
          <div class="screen">
            <!-- FILL THIS FRAME: ${screen.name}, ${state} state.
                 Real copy, real numbers, the layout a person would actually see.
                 Every color must be a var(--c-*) so the gate can prove it came from tokens.json. -->
          </div>
        </div>
      </figure>`;
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const [tokensPath, screensPath, outPath] = positional;
if (!tokensPath || !screensPath || !outPath) {
  console.error(
    "usage: scaffold_prototype.mjs <tokens.json> <screens-dir|file> <out.html> [--device kiosk|phone|desktop]",
  );
  process.exit(1);
}
const device = DEVICES[flags.device ?? "kiosk"] ?? DEVICES.kiosk;
const tokens = JSON.parse(readFileSync(resolve(tokensPath), "utf8"));
const screens = readScreens(resolve(screensPath));
const read = tokens?.meta?.designRead ?? {};

// Every screen gets its resting frame, then one per declared state. The resting state is where
// users spend their time; dropping it because a screen also declares an error state was the
// scaffold silently deciding the happy path did not need designing.
const frames = screens
  .flatMap((s) => ["default", ...s.states].map((st) => frame(s, st, device)))
  .join("\n");

const html = `<!doctype html>
<!-- GENERATED SHELL — regenerate with scaffold_prototype.mjs; the screens inside are hand-designed.
     Every color resolves to a var(--c-*) derived from tokens.json, so check_prototype.mjs can
     prove the prototype and the gated tokens still agree. -->
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="design-surface" content="${flags.device ?? "kiosk"}" data-min-body="${device.minBody}" data-min-target="${device.minTarget}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${read.pageKind ?? "prototype"} — prototype</title>
<style>
  :root {
${cssVars(tokens)}
  }
  /* GENERATED CHROME START
     The neutral page around the device frames. Colors between this marker and its closing
     counterpart below belong to the scaffold, not to the design system, and check_prototype.mjs
     exempts exactly this region. Do not put design decisions here. */
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 32px 64px; background: #eef0f3; color: #14171c;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  header.doc { max-width: 900px; margin: 0 auto 36px; }
  header.doc h1 { font-size: 26px; margin: 0 0 8px; }
  header.doc p { margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6; }
  .fidelity { display: inline-block; margin-top: 12px; font-size: 12px; color: #6b7280;
              border: 1px solid #d1d5db; border-radius: 20px; padding: 3px 12px; }
  .frames { display: grid; grid-template-columns: repeat(auto-fit, minmax(${device.w}px, max-content));
            gap: 40px 32px; justify-content: center; }
  .slot { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .slot-tag { order: -1; font-size: 12px; font-weight: 600; letter-spacing: .04em;
              text-transform: uppercase; color: #374151; }
  .slot-tag span { font-weight: 400; text-transform: none; letter-spacing: 0; color: #9ca3af; }
  .device { width: var(--dev-w); height: var(--dev-h); border-radius: var(--dev-r);
            background: #14171c; padding: 14px; box-shadow: 0 18px 40px rgba(0,0,0,.18); }
  .screen { font-size: ${device.minBody}px; width: 100%; height: 100%; border-radius: calc(var(--dev-r) - 8px); overflow: hidden;
            background: var(--c-background, #fff); color: var(--c-foreground, #111);
            font-family: var(--font-body, inherit); display: flex; flex-direction: column; }
  /* GENERATED CHROME END */
</style>
</head>
<body>
<header class="doc">
  <h1>${read.pageKind ?? "Prototype"}${tokens?.meta?.project ? ` — ${tokens.meta.project}` : ""}</h1>
  <p>${read.audience ? `For ${read.audience}. ` : ""}${read.job ? `The one job: ${read.job}.` : ""}</p>
  <span class="fidelity">${device.label} · wireframe-to-visual fidelity · not final pixels</span>
</header>
<main class="frames">
${frames}
</main>
</body>
</html>
`;

mkdirSync(dirname(resolve(outPath)), { recursive: true });
writeFileSync(resolve(outPath), html);
console.log(
  `scaffold_prototype: wrote ${outPath} — ${screens.length} screen(s), ${frames.split("<figure").length - 1} frame(s) to fill, device ${flags.device ?? "kiosk"}`,
);
for (const s of screens)
  if (!s.states.length)
    console.log(`  note: "${s.name}" declares no states — one default frame emitted`);
