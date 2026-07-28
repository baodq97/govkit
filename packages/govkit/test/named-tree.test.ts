import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { runEval } from "../src/commands/eval";
import { runVerify } from "../src/commands/verify";
import { type DocType, type GovkitConfig, loadConfig } from "../src/config";
import { collectGovernedIds, listMarkdown } from "../src/util";

// A NAMED DESIGN TREE as the second legitimate layout (the first is the flat numbered corpus
// govkit shipped with): `context-map.md` at the top, a per-context `README.md`, aggregates a
// level deeper, `message-flows/` numbered. Two opt-in per-type fields carry the difference —
// `recursive` (which files are governed) and `idFilenameConvention` (whether the filename must
// spell the id) — and BOTH default to the pre-existing behavior, so the whole point of these
// tests is as much the defaults as the opt-ins. Everything else about the type still applies to
// every file the walk finds: front-matter completeness, the status set, unique ids, INDEX sync.

function cfg(over: Partial<DocType> = {}): GovkitConfig {
  return {
    schemaVersion: 1,
    docs: {
      ignore: ["INDEX.md", "_TEMPLATE.md"],
      base: { required: ["id", "title", "status", "owner", "date"] },
      types: {
        domain: {
          dir: "docs/domain",
          required: ["id", "title", "status", "owner", "date"],
          idPrefix: "DOMAIN",
          statuses: ["draft", "review", "accepted"],
          refs: [{ key: "parent" }],
          ...over,
        },
      },
    },
  };
}

const meta = { title: "t", status: "draft", owner: "TBD", date: "2026-07-28" };

function doc(fields: Record<string, string>, body = "prose body of the doc"): string {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `---\n${fm}\n---\n\n${body}\n`;
}

let root: string;

function write(rel: string, text: string): void {
  const file = join(root, "docs", "domain", rel);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, text);
}

/** The miniature euro-parking shape: 1 top-level named doc + 3 nested docs + 1 nested file
 *  with NO front-matter (the discovery notes that are genuinely ungoverned prose today). */
function tree(): void {
  write("context-map.md", doc({ id: "DOMAIN-CM-0001", ...meta, parent: "DOMAIN-AGG-0001" }));
  write("parking-visit/README.md", doc({ id: "DOMAIN-0001", ...meta }));
  write("parking-visit/aggregates/ParkingVisit.md", doc({ id: "DOMAIN-AGG-0001", ...meta }));
  write("message-flows/DOMAIN-FLOW-0001-entry.md", doc({ id: "DOMAIN-FLOW-0001", ...meta }));
  write("discovery/hotspots.md", "# Hotspots\n\nRaw workshop notes, never front-mattered.\n");
  const ids = ["DOMAIN-CM-0001", "DOMAIN-0001", "DOMAIN-AGG-0001", "DOMAIN-FLOW-0001"];
  const rows = ids.map((id) => `| ${id} | t | draft | TBD | 2026-07-28 |`).join("\n");
  write("INDEX.md", `# Domain index\n\n${rows}\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-tree-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("listMarkdown — the walk itself", () => {
  it("defaults to the flat scan: subdirectories are invisible", () => {
    tree();
    const dir = join(root, "docs", "domain");
    const files = listMarkdown(dir, ["INDEX.md", "_TEMPLATE.md"]);
    expect(files.map((f) => relative(dir, f))).toEqual(["context-map.md"]);
  });

  it("recursive walks the tree, and the ignore list still drops ignored filenames", () => {
    tree();
    write("parking-visit/_TEMPLATE.md", doc({ id: "DOMAIN-9999", ...meta }));
    const files = listMarkdown(join(root, "docs", "domain"), ["INDEX.md", "_TEMPLATE.md"], true);
    expect(files).toHaveLength(5);
    expect(files.some((f) => f.endsWith("_TEMPLATE.md"))).toBe(false);
    // Depth-second order: the dir's own files first, nested ones after.
    expect(files[0]?.endsWith("context-map.md")).toBe(true);
  });

  it("ignore also matches a SUBDIRECTORY name — how a subtree opts out", () => {
    tree();
    const ignore = ["INDEX.md", "_TEMPLATE.md", "discovery"];
    const files = listMarkdown(join(root, "docs", "domain"), ignore, true);
    expect(files).toHaveLength(4);
    expect(files.some((f) => f.includes("discovery"))).toBe(false);
  });
});

describe("recursive — which files a type governs", () => {
  it("default (field absent) governs ONLY the top level — today's behavior, unchanged", () => {
    tree();
    const result = runVerify({ root, config: cfg({ idFilenameConvention: false }) });
    expect(result.checked).toBe(1); // the 4 nested files stay invisible
  });

  it("recursive: true governs the whole tree, front-matter check included", () => {
    tree();
    const result = runVerify({
      root,
      config: cfg({ recursive: true, idFilenameConvention: false }),
    });
    expect(result.checked).toBe(5);
    // The ONE genuine defect in the tree: discovery notes with no front-matter block.
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.kind).toBe("frontmatter");
    expect(result.violations[0]?.file).toContain("hotspots.md");
    expect(result.ok).toBe(false);
  });

  it("INDEX sync still applies to a NESTED doc — the rest of the type is not relaxed", () => {
    tree();
    write("parking-visit/aggregates/Fee.md", doc({ id: "DOMAIN-AGG-0002", ...meta }));
    const result = runVerify({
      root,
      config: cfg({ recursive: true, idFilenameConvention: false }),
    });
    const index = result.violations.filter((v) => v.kind === "index");
    expect(index).toHaveLength(1);
    expect(index[0]?.problems.join(" ")).toContain("DOMAIN-AGG-0002");
  });

  it("the id universe follows the same flag, so a ref to a NESTED id is not dangling", () => {
    tree(); // context-map.md's parent is DOMAIN-AGG-0001, two levels down
    const deep = cfg({ recursive: true, idFilenameConvention: false });
    expect(collectGovernedIds(root, deep).has("DOMAIN-AGG-0001")).toBe(true);
    expect(
      runVerify({ root, config: deep }).violations.filter((v) => v.kind === "reference"),
    ).toHaveLength(0);
    // …and under the flat default the collector narrows with verify rather than out of step:
    // the same ref is then genuinely dangling, reported once, not silently resolved.
    const flat = cfg({ idFilenameConvention: false });
    expect(collectGovernedIds(root, flat).has("DOMAIN-AGG-0001")).toBe(false);
    expect(
      runVerify({ root, config: flat }).violations.filter((v) => v.kind === "reference"),
    ).toHaveLength(1);
  });

  it("eval grades the same corpus verify gates — both read the one flag", () => {
    tree();
    const rubric = {
      threshold: 50,
      rubrics: {
        domain: [{ id: "r1", desc: "non-stub", weight: 100, kind: "minWords" as const, min: 3 }],
      },
    };
    const flat = runEval({
      root,
      config: { ...cfg({ idFilenameConvention: false }), eval: rubric },
    });
    expect(flat.scored).toBe(1);
    const deep = runEval({
      root,
      config: { ...cfg({ recursive: true, idFilenameConvention: false }), eval: rubric },
    });
    expect(deep.scored).toBe(4); // 5 files scanned, the front-matter-less one is the gate's job
  });
});

describe("idFilenameConvention — whether the filename must spell the id", () => {
  it("default (field absent) rejects a NAMED file, exactly as before", () => {
    tree();
    const result = runVerify({ root, config: cfg({ recursive: true }) });
    const id = result.violations.filter((v) => v.kind === "id");
    expect(id).toHaveLength(3); // context-map.md + README.md + ParkingVisit.md
    expect(id[0]?.problems.join(" ")).toContain("must be 'DOMAIN-CM-0001.md'");
    // the numbered flow file satisfies the convention either way
    expect(id.some((v) => v.file.includes("DOMAIN-FLOW-0001"))).toBe(false);
  });

  it("false drops the filename half only — idPrefix is STILL enforced", () => {
    tree();
    write("tariff/README.md", doc({ id: "BC-0007", ...meta }));
    write("INDEX.md", "# Domain index\n\n| BC-0007 | t | draft | TBD | 2026-07-28 |\n");
    const result = runVerify({
      root,
      config: cfg({ recursive: true, idFilenameConvention: false }),
    });
    const id = result.violations.filter((v) => v.kind === "id");
    expect(id).toHaveLength(1);
    expect(id[0]?.file).toContain("tariff");
    expect(id[0]?.problems).toEqual(["id 'BC-0007' must start with 'DOMAIN-'"]);
  });

  it("is scoped to ONE type — a sibling flat type keeps the convention", () => {
    tree();
    const config = cfg({ recursive: true, idFilenameConvention: false });
    config.docs.types.rfc = {
      dir: "docs/rfc",
      required: ["id", "title", "status", "owner", "date"],
      idPrefix: "RFC",
      statuses: ["draft"],
    };
    mkdirSync(join(root, "docs", "rfc"), { recursive: true });
    writeFileSync(join(root, "docs", "rfc", "named-rfc.md"), doc({ id: "RFC-0001", ...meta }));
    writeFileSync(
      join(root, "docs", "rfc", "INDEX.md"),
      "# RFC\n\n| RFC-0001 | t | draft | TBD | 2026-07-28 |\n",
    );
    const id = runVerify({ root, config }).violations.filter((v) => v.kind === "id");
    expect(id).toHaveLength(1);
    expect(id[0]?.file).toContain("named-rfc.md");
  });
});

describe("loadConfig — the two fields fail loud rather than coerce", () => {
  function yml(body: string): GovkitConfig {
    writeFileSync(join(root, "govkit.yml"), body);
    return loadConfig(root);
  }
  const HEAD =
    "schemaVersion: 1\ndocs:\n  ignore: [INDEX.md]\n  base:\n    required: [id]\n  types:\n" +
    "    domain:\n      dir: docs/domain\n      required: [id]\n";

  it("absent ⇒ undefined, i.e. the flat + convention-enforced defaults", () => {
    const config = yml(HEAD);
    expect(config.docs.types.domain?.recursive).toBeUndefined();
    expect(config.docs.types.domain?.idFilenameConvention).toBeUndefined();
  });

  it("accepts real booleans", () => {
    const config = yml(`${HEAD}      recursive: true\n      idFilenameConvention: false\n`);
    expect(config.docs.types.domain?.recursive).toBe(true);
    expect(config.docs.types.domain?.idFilenameConvention).toBe(false);
  });

  it("rejects a quoted 'true' — the truthy string that would leave a tree ungoverned", () => {
    expect(() => yml(`${HEAD}      recursive: "true"\n`)).toThrow(
      /type 'domain' recursive must be true or false \(got 'true'/,
    );
  });

  it("rejects a non-boolean idFilenameConvention", () => {
    expect(() => yml(`${HEAD}      idFilenameConvention: off-please\n`)).toThrow(
      /type 'domain' idFilenameConvention must be true or false/,
    );
  });
});
