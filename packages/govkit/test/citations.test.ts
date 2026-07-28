import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ANCHOR_WINDOW,
  ENCLOSING_LOOKBACK,
  extractCitations,
  runCitations,
} from "../src/citations";
import { runVerify, verifySummaryLine } from "../src/commands/verify";
import type { GovkitConfig } from "../src/config";

// ── ANCHORED citation resolution ─────────────────────────────────────────────────────────────
// The rule this suite exists to defend: a citation checker that only asks "does that line exist"
// CERTIFIES staleness. Measured on this repo's own design corpus, a positional check scored zero
// errors while a `govkit.yml` citation was already 34 lines out of date, because a +34-line edit
// pushed the block down and something else still occupied the old line. So the load-bearing test
// here is `shift the file, watch the verdict flip` — not "the file has enough lines".

// A design tree: recursive, and citations live in the `.md` doc AND its `model.yaml` sidecar.
const CONFIG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: [] },
    types: {
      // `index: false` keeps these fixtures about citations only — an INDEX violation would
      // otherwise ride along and blur "the flag adds exactly one kind and nothing else".
      domain: {
        dir: "docs/domain",
        required: [],
        recursive: true,
        idFilenameConvention: false,
        index: false,
      },
    },
  },
};

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-citations-"));
  mkdirSync(join(root, "docs", "domain", "ctx"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A source file whose interesting symbol sits at a KNOWN line, with `pad` filler lines above it
 *  — bumping `pad` is exactly the "+34 lines were inserted above the cited block" incident. */
function source(name: string, pad: number): { path: string; declLine: number } {
  const filler = Array.from({ length: pad }, (_, i) => `// filler ${i + 1}`);
  const body = [
    ...filler,
    "export function resolveWidget(id: string): string {",
    "  const trimmed = id.trim();",
    "  return trimmed;",
    "}",
    "",
    "export const UNRELATED_TOKEN = 1;",
  ];
  writeFileSync(join(root, "src", name), `${body.join("\n")}\n`);
  return { path: `src/${name}`, declLine: pad + 1 };
}

/** One citing doc in the design tree. */
function doc(name: string, body: string): void {
  writeFileSync(join(root, "docs", "domain", name), `---\nid: DOMAIN-0001\n---\n\n${body}\n`);
}

function run(): ReturnType<typeof runCitations> {
  return runCitations(root, CONFIG);
}

describe("extractCitations — what counts as a citation", () => {
  it("reads bare, repo-relative, range and multi-target forms, and expands multi-target", () => {
    const found = extractCitations(
      [
        "bare `verify.ts:554` and path `packages/govkit/src/util.ts:60`",
        "a range `verify.ts:541-547` and a multi-target `util.ts:60,70`",
      ].join("\n"),
      "doc.md",
    );
    expect(found.map((c) => `${c.target}:${c.start}-${c.end}`)).toEqual([
      "verify.ts:554-554",
      "packages/govkit/src/util.ts:60-60",
      "verify.ts:541-547",
      "util.ts:60-60",
      "util.ts:70-70",
    ]);
    // The multi-target pair keeps the ONE raw spelling it was written as, so the report quotes
    // what the author typed rather than a form that appears nowhere in the doc.
    expect(found[3]?.raw).toBe("util.ts:60,70");
    expect(found[4]?.raw).toBe("util.ts:60,70");
  });

  it("is not fooled by a doc-id reference, a URL authority, or a version", () => {
    const found = extractCitations(
      "see RFC-0027:134-143 and PRD-0001:37-42 at https://example.com:8080 in v1.2:3",
      "doc.md",
    );
    expect(found).toEqual([]);
  });

  it("ignores citations inside fenced code — a pasted stack trace is not a claim", () => {
    // Measured regression: US-0002/US-0003 paste a Node stack trace, and `at loadConfig
    // (.../dist/cli.js:7380:11)` produced five path-missing false positives on a clean corpus.
    const found = extractCitations(
      ["real `src/a.ts:10`", "```", "at loadConfig (.../dist/cli.js:7380:11)", "```"].join("\n"),
      "doc.md",
    );
    expect(found.map((c) => c.target)).toEqual(["src/a.ts"]);
  });

  it("keeps line numbers correct AFTER a fence — the fence is blanked, never removed", () => {
    const found = extractCitations(
      ["intro", "```", "junk", "junk", "```", "claim `src/a.ts:10`"].join("\n"),
      "doc.md",
    );
    expect(found[0]?.fromLine).toBe(6);
  });

  it("terminates on a line carrying BOTH a citation and a backtick span", () => {
    // Regression: the extractor and the anchor filter shared one /g/ regex, so testing the
    // filter reset the extractor's lastIndex and the line was walked forever. If this ever
    // hangs again the suite times out here rather than in a 600-file gate run.
    const found = extractCitations("`src/a.ts:10` proves `someSymbol` holds", "doc.md");
    expect(found).toHaveLength(1);
    expect(found[0]?.anchors).toContain("someSymbol");
  });
});

describe("anchors — what the citing line offers as evidence", () => {
  const anchorsOf = (line: string): string[] => extractCitations(line, "d.md")[0]?.anchors ?? [];

  it("takes the symbol the citation names right after itself, bare or parenthesised", () => {
    expect(anchorsOf("`util.ts:33 listMarkdown` is the walk")).toContain("listMarkdown");
    expect(anchorsOf("— src/util.ts:60 (stripNonProse)")).toContain("stripNonProse");
    expect(anchorsOf("(config.ts:19 VIOLATION_KINDS)")).toContain("VIOLATION_KINDS");
  });

  it("refuses an English word as a trailing symbol", () => {
    // `verify.ts:554 and eval.ts:225` would otherwise donate "and" — a token near every line of
    // every file, which turns the whole check into a rubber stamp.
    expect(anchorsOf("verify.ts:554 and eval.ts:225 both pass")).not.toContain("and");
  });

  it("takes backtick spans, but never a backticked citation as its own evidence", () => {
    const anchors = anchorsOf("`ratification:` is in this file (`govkit.yml:128-134`)");
    expect(anchors).toContain("ratification:");
    expect(anchors).not.toContain("govkit.yml:128-134");
  });
});

describe("runCitations — the three failure names", () => {
  it("path-missing when the cited file does not resolve", () => {
    doc("a.md", "claim (`src/ghost.ts:3` GhostSymbol)");
    const { summary, reports } = run();
    expect(summary.failedBy["path-missing"]).toBe(1);
    expect(reports[0]?.failures[0]?.reason).toBe("path-missing");
  });

  it("line-beyond-eof when the file is shorter than the citation", () => {
    const src = source("widget.ts", 2);
    doc("a.md", `claim (\`${src.path}:900\` resolveWidget)`);
    const { summary, reports } = run();
    expect(summary.failedBy["line-beyond-eof"]).toBe(1);
    // 2 filler + 6 body lines; the trailing newline is NOT a citable line
    expect(reports[0]?.failures[0]?.detail).toContain("has 8 line(s)");
  });

  it("anchor-not-found when the cited block moved DOWN, and says where it went", () => {
    // THE incident, reproduced: the citation was written when the symbol was at line 3, then
    // 34 lines were inserted above it. Line 3 still exists — a positional check passes here.
    const src = source("widget.ts", 34);
    doc("a.md", `claim (\`${src.path}:3\` resolveWidget)`);
    const { summary, reports } = run();
    expect(summary.failedBy["anchor-not-found"]).toBe(1);
    expect(summary.resolved).toBe(0);
    const detail = reports[0]?.failures[0]?.detail ?? "";
    expect(detail).toContain(`at line(s) ${src.declLine}`);
  });

  it("resolves the SAME citation before the shift — the verdict is the shift, not the doc", () => {
    const src = source("widget.ts", 2);
    doc("a.md", `claim (\`${src.path}:${src.declLine}\` resolveWidget)`);
    const { summary } = run();
    expect(summary.resolved).toBe(1);
    expect(summary.failed).toBe(0);
  });
});

describe("runCitations — the two citation conventions both hold", () => {
  it("POINT form: the symbol sits at the cited line, within ±ANCHOR_WINDOW", () => {
    const src = source("widget.ts", 10);
    doc("a.md", `claim (\`${src.path}:${src.declLine + ANCHOR_WINDOW}\` resolveWidget)`);
    expect(run().summary.resolved).toBe(1);
    // one line further and the point form no longer covers it
    doc("a.md", `claim (\`${src.path}:${src.declLine + ANCHOR_WINDOW + 1}\` resolveWidget)`);
    expect(run().summary.resolved).toBe(1); // still ok — now via the ENCLOSING rule below
  });

  it("ENCLOSING form: the citation points into a body and names the declaration above it", () => {
    const filler = Array.from({ length: 60 }, (_, i) => `  const x${i} = ${i};`);
    writeFileSync(
      join(root, "src", "big.ts"),
      ["export function resolveWidget(): void {", ...filler, "}", ""].join("\n"),
    );
    // line 50 is deep inside the body; the declaration is at line 1
    doc("a.md", "claim — `src/big.ts:50` (resolveWidget)");
    expect(run().summary.resolved).toBe(1);
  });

  it("the enclosing lookback is BOUNDED — a mention far above does not vouch for a citation", () => {
    const filler = Array.from({ length: ENCLOSING_LOOKBACK + 40 }, () => "// noise");
    writeFileSync(
      join(root, "src", "far.ts"),
      [
        "// resolveWidget is described here",
        ...filler,
        "export function resolveWidget() {}",
        "",
      ].join("\n"),
    );
    // Cite a line just past the lookback from the comment, and well ABOVE the real declaration:
    // exactly the shape that made `config.ts:417 (loadConfig)` falsely pass with an unbounded
    // lookback while `loadConfig` itself sat 22 lines BELOW the citation.
    doc("a.md", `claim — \`src/far.ts:${ENCLOSING_LOOKBACK + 20}\` (resolveWidget)`);
    expect(run().summary.failedBy["anchor-not-found"]).toBe(1);
  });

  it("the lookback is ONE-SIDED: a declaration BELOW its own citation is staleness", () => {
    const src = source("widget.ts", 40);
    doc("a.md", `claim (\`${src.path}:5\` resolveWidget)`);
    expect(run().summary.failedBy["anchor-not-found"]).toBe(1);
  });
});

describe("runCitations — the skips are named and counted, never silent", () => {
  it("no-anchor: the citing line offers nothing checkable", () => {
    source("widget.ts", 2);
    doc("a.md", "see src/widget.ts:3 for the rest");
    const { summary } = run();
    expect(summary.skippedBy["no-anchor"]).toBe(1);
    expect(summary.resolved).toBe(0); // NOT counted as coverage
  });

  it("no-anchor: an anchor absent from the whole cited file is discarded, never a failure", () => {
    // Measured: 39 of 366 anchored citations in the design corpus had an anchor that appears
    // nowhere in the target (an English phrase, a doc id, an example value). That is evidence
    // the ANCHOR is wrong, not the citation — failing on it is a pure false positive.
    const src = source("widget.ts", 2);
    doc("a.md", `\`some phrase that is nowhere\` (\`${src.path}:3\`)`);
    const { summary } = run();
    expect(summary.failed).toBe(0);
    expect(summary.skippedBy["no-anchor"]).toBe(1);
  });

  it("an anchor that is just the cited file's own name cannot vouch for it", () => {
    const src = source("widget.ts", 2);
    doc("a.md", `\`widget.ts\` header (\`${src.path}:3\`)`);
    expect(run().summary.skippedBy["no-anchor"]).toBe(1);
  });

  it("ambiguous-path: a bare basename with several candidates is skipped by name", () => {
    mkdirSync(join(root, "src", "a"), { recursive: true });
    mkdirSync(join(root, "src", "b"), { recursive: true });
    writeFileSync(join(root, "src", "a", "twin.ts"), "export const resolveWidget = 1;\n");
    writeFileSync(join(root, "src", "b", "twin.ts"), "export const resolveWidget = 1;\n");
    doc("a.md", "claim (`twin.ts:1` resolveWidget)");
    const { summary } = run();
    expect(summary.skippedBy["ambiguous-path"]).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it("a bare basename prefers the repo root over any deeper namesake", () => {
    writeFileSync(join(root, "README.md"), "export function resolveWidget() {}\n");
    mkdirSync(join(root, "src", "deep"), { recursive: true });
    writeFileSync(join(root, "src", "deep", "README.md"), "unrelated\n");
    doc("a.md", "claim (`README.md:1` resolveWidget)");
    const { summary } = run();
    expect(summary.resolved).toBe(1);
  });

  it("every bucket is present and the totals reconcile", () => {
    source("widget.ts", 2);
    doc("a.md", "see src/widget.ts:3 plus a ghost (`src/ghost.ts:1` GhostSymbol)");
    const { summary } = run();
    expect(summary.found).toBe(summary.resolved + summary.skipped + summary.failed);
    expect(Object.keys(summary.skippedBy).sort()).toEqual(["ambiguous-path", "no-anchor"]);
    expect(Object.keys(summary.failedBy).sort()).toEqual([
      "anchor-not-found",
      "line-beyond-eof",
      "path-missing",
    ]);
  });
});

describe("runCitations — which files it reads", () => {
  it("reads the governed TREE (a design tree's model.yaml too), not only the .md docs", () => {
    const src = source("widget.ts", 40);
    doc("ctx/README.md", `ok (\`${src.path}:${src.declLine}\` resolveWidget)`);
    writeFileSync(
      join(root, "docs", "domain", "ctx", "model.yaml"),
      `context: Ctx\ninvariant: stale claim — ${src.path}:3 (resolveWidget)\n`,
    );
    const { summary, reports } = run();
    expect(summary.files).toBe(2);
    expect(summary.resolved).toBe(1);
    expect(summary.failed).toBe(1);
    expect(reports[0]?.file.endsWith("model.yaml")).toBe(true);
  });

  it("honors the type's `ignore` list and its `recursive` flag", () => {
    const src = source("widget.ts", 40);
    writeFileSync(
      join(root, "docs", "domain", "ctx", "model.yaml"),
      `stale — ${src.path}:3 (resolveWidget)\n`,
    );
    const flat: GovkitConfig = {
      ...CONFIG,
      docs: {
        ...CONFIG.docs,
        types: { domain: { dir: "docs/domain", required: [], index: false } },
      },
    };
    // non-recursive: the nested sidecar is out of scope entirely
    expect(runCitations(root, flat).summary.files).toBe(0);
    expect(run().summary.files).toBe(1);
  });
});

describe("runVerify — the flag is OFF by default and additive when on", () => {
  it("without checkCitations there is no citation violation and no `citations` key", () => {
    const src = source("widget.ts", 40);
    doc("a.md", `stale (\`${src.path}:3\` resolveWidget)`);
    const result = runVerify({ root, config: CONFIG });
    expect(result.citations).toBeUndefined();
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
    // and the summary line degrades to exactly what it was before this check existed
    expect(verifySummaryLine(result)).toBe("0 violations");
  });

  it("with checkCitations the stale citation is a blocking `citation` violation", () => {
    const src = source("widget.ts", 40);
    doc("a.md", `stale (\`${src.path}:3\` resolveWidget)`);
    const result = runVerify({ root, config: CONFIG, checkCitations: true });
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.kind)).toEqual(["citation"]);
    expect(result.violations[0]?.tier).toBe("blocking");
    expect(result.violations[0]?.problems[0]).toContain("anchor-not-found");
    expect(result.violations[0]?.problems[0]).toContain("line 5 cites");
  });

  it("the summary line states found / resolved / skipped / failed with its breakdowns", () => {
    const src = source("widget.ts", 40);
    doc("a.md", `stale (\`${src.path}:3\` resolveWidget) and bare src/widget.ts:41`);
    const line = verifySummaryLine(runVerify({ root, config: CONFIG, checkCitations: true }));
    expect(line).toContain("citations: 2 found in 1 file(s)");
    expect(line).toContain("1 skipped (no-anchor 1)");
    expect(line).toContain("1 failed (anchor-not-found 1)");
    // the denominator can be audited against the line itself
    expect(line).toContain("0 resolved");
  });

  it("a citation finding is demotable by tier and waivable like any other kind", () => {
    const src = source("widget.ts", 40);
    doc("a.md", `stale (\`${src.path}:3\` resolveWidget)`);
    const advisory: GovkitConfig = { ...CONFIG, tiers: { citation: "advisory" } };
    const result = runVerify({ root, config: advisory, checkCitations: true });
    expect(result.violations[0]?.tier).toBe("advisory");
    expect(result.ok).toBe(true); // reported, never verdict-flipping
  });
});
