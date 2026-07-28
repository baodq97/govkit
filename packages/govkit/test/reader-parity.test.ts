// READER PARITY + the STRICT/TOLERANT config line — the two seams a bounded-context split found.
//
// 1. The governed corpus is resolved in more places than any single reader knows about, and the
//    count has been wrong three times running (5 asserted here, 6 claimed by a later bar, "8
//    files" by a grep). The measured census — every module importing the resolution vocabulary
//    from util.ts — is 10 modules plus util.ts itself, and they do NOT all owe the same duty:
//
//      module              vocabulary                        role              honours recursive?
//      verify.ts           walkGovernedDocs+typeDir           corpus walk       MUST — via util
//      citations.ts        typeDir                            corpus walk       MUST — yes
//      eval.ts             walkGovernedDocs                   corpus walk       MUST — via util
//      report.ts           walkGovernedDocs                   corpus walk       MUST — via util
//      adopt.ts            walkGovernedDocs                   corpus walk       MUST — via util
//      doctor.ts           walkGovernedDocs+typeDir           corpus walk       MUST — via util
//      audit-write.ts      governedTypeOf                     single path       MUST — yes (was NO)
//      util.ts             (defines all of them)              the generator     MUST — yes
//      drift.ts            scanGoverned                       inherits the walk MUST — via util
//      stale.ts            scanGoverned                       inherits the walk MUST — via util
//      ledger.ts           collectGovernedIds + isInside      inherits + root   MUST — via util
//      journal.ts          isInside                           root confinement  MUST NOT — n/a
//
//    So the real denominator is EIGHT resolution sites, not five: seven that resolve a type dir
//    themselves plus util.ts's own shared scan, which three more commands inherit. The five
//    file-by-file corpus walkers (verify, eval, report, adopt, doctor) now route through ONE
//    generator, `walkGovernedDocs` — each keeps its own missing/malformed front-matter POLICY
//    in its visitor, but none of them can walk a different corpus anymore. `citations.ts`
//    is the seventh and the only one that does NOT walk with the shared walk — the citation pass
//    reads the governed TREE (`.md` plus a design tree's `model.yaml`/`.yml` sidecars), so it
//    mirrors the membership rule instead of importing the walk, and that mirroring is exactly the
//    kind of divergence this census exists to keep honest: it is asserted below on `recursive`
//    true AND false, against the same corpus as everyone else. The last two
//    rows use `isInside(root, …)` to confine a CONFIGURED FILE PATH (journal.path, ledger.path)
//    to the repo — not a type dir, no depth question to get wrong; padding them into the count
//    would be as wrong as omitting doctor was.
//    `audit-write` was the one that disagreed: it asked containment (`isInside(typeDir(…))`) and
//    so claimed a type's WHOLE subtree, while a flat type governs only its direct children. With
//    `recursive: false` the hook DENIED a write to a nested file that verify and report both
//    reported as ungoverned. The durable fix is the generator, not the instance — `governedTypeOf`
//    is now the single-path dual of `listMarkdown`, and surface N+1 asking "is this path governed"
//    calls it instead of rebuilding the rule.
//    Parity is asserted as a property of all of them TOGETHER, on `recursive` true AND false,
//    because a per-reader test is exactly what passed while the seam was broken. The census
//    itself is asserted too, so surface N+1 cannot join the vocabulary without joining this test.
// 2. `required` (base and per-type) and `dir` fail LOUD at load. They are the STRICT side of the
//    schema's asymmetry; `journal.path` / `ledger.path` are the TOLERANT side and stay tolerant.
//    Both sides are pinned, since the line only means something if it is a line.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { stringify } from "yaml";
import { runCitations } from "../src/citations";
import { runAdopt } from "../src/commands/adopt";
import { auditWrite } from "../src/commands/audit-write";
import { runDoctor } from "../src/commands/doctor";
import { runEval } from "../src/commands/eval";
import { runReport } from "../src/commands/report";
import { runVerify } from "../src/commands/verify";
import { type DocType, type GovkitConfig, loadConfig } from "../src/config";
import { collectGovernedIds, governedTypeOf, scanGoverned } from "../src/util";

const RUBRIC = {
  threshold: 50,
  rubrics: {
    domain: [{ id: "r1", desc: "non-stub", weight: 100, kind: "minWords" as const, min: 3 }],
  },
};

function cfg(over: Partial<DocType> = {}): GovkitConfig {
  return {
    schemaVersion: 1,
    docs: {
      ignore: ["INDEX.md", "_TEMPLATE.md"],
      base: { required: ["id", "title", "status", "owner"] },
      types: {
        domain: {
          dir: "docs/domain",
          required: [],
          idPrefix: "DOMAIN",
          idFilenameConvention: false,
          statuses: ["draft", "accepted"],
          terminalStatuses: ["accepted"],
          index: false,
          ...over,
        },
      },
    },
    eval: RUBRIC,
  };
}

/** The same config every surface in this file reads, written to disk and loaded back — `doctor`
 *  takes no config object, so an in-memory-only fixture would leave it comparing a corpus nobody
 *  else was measured on. One source, eight consumers. */
function useConfig(over: Partial<DocType> = {}): GovkitConfig {
  writeFileSync(join(root, "govkit.yml"), stringify(cfg(over)));
  return loadConfig(root);
}

const BODY = "# Heading\n\nprose body of the doc\n";

let root: string;

function write(rel: string, text: string): void {
  const file = join(root, "docs", "domain", rel);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, text);
}

/** A nested corpus: 1 top-level doc + 1 a directory down. Two files, one of them only reachable
 *  by a recursive walk — the minimum shape that can catch a reader dropping the flag. `governs:`
 *  is present so the git-backed scanner (`scanGoverned`, which drift and stale share) is measured
 *  on the same two files rather than trivially returning none. */
function tree(withFrontMatter: boolean): void {
  const doc = (id: string) =>
    withFrontMatter
      ? `---\nid: ${id}\ntitle: "t"\nstatus: draft\nowner: TBD\ngoverns: "src/**"\n---\n\n${BODY}`
      : BODY;
  write("context-map.md", doc("DOMAIN-CM-0001"));
  write("parking-visit/README.md", doc("DOMAIN-0001"));
}

const TOP = () => join(root, "docs", "domain", "context-map.md");
const NESTED = () => join(root, "docs", "domain", "parking-visit", "README.md");

/** The hook's verdict on writing `file` with no front-matter at all: `true` when it claims the
 *  path as governed and blocks, `false` when it defers. The one bit the gate has to agree with. */
function hookBlocks(file: string, config: GovkitConfig): boolean {
  return auditWrite(
    { tool_name: "Write", tool_input: { file_path: file, content: BODY } },
    root,
    config,
  ).block;
}

/** Every `.md` under the fixture's docs dir, absolute — the ground truth both the walk and the
 *  single-path resolver are compared against. */
function everyMarkdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return everyMarkdown(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-parity-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("reader parity — every path-resolving surface, one corpus", () => {
  it("recursive: true — all eight resolution sites count 2", () => {
    tree(true);
    const config = useConfig({ recursive: true });
    expect(runVerify({ root, config }).checked).toBe(2);
    // The citation pass mirrors the membership rule rather than importing the walk (it reads
    // sidecars too), so it is the one site that COULD silently diverge — measured here.
    expect(runCitations(root, config).summary.files).toBe(2);
    expect(runEval({ root, config }).scored).toBe(2);
    expect(runReport({ root, config }).total).toBe(2);
    expect(runDoctor({ root }).totalDocs).toBe(2);
    expect(collectGovernedIds(root, config).size).toBe(2);
    expect(scanGoverned(root, config)).toHaveLength(2);
    // …and the hook, the site that was out of step, claims exactly the same two.
    expect(hookBlocks(TOP(), config)).toBe(true);
    expect(hookBlocks(NESTED(), config)).toBe(true);
  });

  it("recursive: false — the flat DEFAULT narrows all of them together, hook included", () => {
    tree(true);
    const config = useConfig();
    expect(runVerify({ root, config }).checked).toBe(1);
    expect(runCitations(root, config).summary.files).toBe(1);
    expect(runEval({ root, config }).scored).toBe(1);
    expect(runReport({ root, config }).total).toBe(1);
    expect(runDoctor({ root }).totalDocs).toBe(1);
    expect(collectGovernedIds(root, config).size).toBe(1);
    expect(scanGoverned(root, config)).toHaveLength(1);
    // THE DEFECT, pinned: the hook used to deny this write while verify and report both said
    // the file was not governed at all — a write blocked on a doc the gate says does not exist.
    expect(hookBlocks(NESTED(), config)).toBe(false);
    expect(hookBlocks(TOP(), config)).toBe(true);
  });

  it("the single-path resolver agrees with the walk FILE BY FILE, both ways", () => {
    tree(true);
    write("parking-visit/INDEX.md", `---\nid: X\n---\n\n${BODY}`); // ignored by name, nested
    write("INDEX.md", `---\nid: Y\n---\n\n${BODY}`); // ignored by name, top level
    for (const recursive of [true, false]) {
      const config = useConfig({ recursive });
      const walked = new Set(runEval({ root, config }).artifacts.map((a) => a.file));
      const resolved = new Set(
        everyMarkdown(join(root, "docs")).filter((f) => governedTypeOf(root, config, f) !== null),
      );
      expect([...resolved].sort()).toEqual([...walked].sort());
    }
  });

  it("an ignored directory NAME opts its subtree out of the hook exactly as it does the walk", () => {
    tree(true);
    // `ignore` matches subdirectory names too (util.ts listMarkdown) — the containment test the
    // hook used could not express that, so it governed an opted-out subtree.
    write("_TEMPLATE.md/nested.md", `---\nid: DOMAIN-0009\n---\n\n${BODY}`);
    const config = useConfig({ recursive: true });
    expect(runEval({ root, config }).scored).toBe(2);
    expect(hookBlocks(join(root, "docs", "domain", "_TEMPLATE.md", "nested.md"), config)).toBe(
      false,
    );
  });

  it("recursive: true — adopt offers a block to the NESTED doc too, so it can be adopted", () => {
    // adopt only ACTS on docs LACKING front-matter, so its walk is measured on that corpus —
    // where verify also counts 2, which is the parity claim for this reader.
    tree(false);
    const config = useConfig({ recursive: true });
    expect(runVerify({ root, config }).checked).toBe(2);
    const planned = runAdopt({ root, config }).planned;
    expect(planned).toHaveLength(2);
    expect(planned.some((p) => p.file.includes("parking-visit"))).toBe(true);
  });

  it("adopt --apply reaches the nested doc, and the gate then agrees it has front-matter", () => {
    tree(false);
    const config = useConfig({ recursive: true });
    runAdopt({ root, config, apply: true });
    // Both docs now carry a block: the only remaining complaints are the sentinel placeholders
    // a human must fill, never "missing YAML front-matter".
    const kinds = runVerify({ root, config }).violations.map((v) => v.kind);
    expect(kinds).not.toContain("frontmatter");
  });

  it("the flat DEFAULT narrows the migrator too — parity holds in both directions", () => {
    tree(false);
    expect(runAdopt({ root, config: useConfig() }).planned).toHaveLength(1);
  });

  it("report buckets the nested doc under its real status, not into a phantom count", () => {
    tree(true);
    write(
      "parking-visit/decided.md",
      `---\nid: DOMAIN-0002\ntitle: "t"\nstatus: accepted\nowner: TBD\n---\n\n${BODY}`,
    );
    const result = runReport({ root, config: useConfig({ recursive: true }) });
    expect(result.total).toBe(3);
    const domain = result.types.find((t) => t.type === "domain");
    expect(domain?.buckets.map((b) => [b.status, b.count, b.terminal])).toEqual([
      ["accepted", 1, true],
      ["draft", 2, false],
    ]);
  });
});

// The census as an executable assertion. The runtime tests above can only measure the surfaces
// they import; this one measures the SET, so a module that starts resolving governed paths is
// forced to declare which side of the line it is on. Detection is by IMPORT from util.ts — that
// is what "fix the generator" buys: the rule exists in exactly one module, so joining the seam
// means importing from it. A surface that hand-rolled its own walk instead would still escape;
// that is the known limit, and the reason `governedTypeOf` exists rather than a lint rule.
describe("the census — surface N+1 cannot join the seam without joining this test", () => {
  /** What a module does with the vocabulary, and therefore what it owes `recursive`. */
  type Role = "resolves-governed-paths" | "confines-a-configured-path";

  const VOCABULARY = [
    "collectGovernedIds",
    "governedTypeOf",
    "isInside",
    "listMarkdown",
    "scanGoverned",
    "typeDir",
    "walkGovernedDocs",
  ] as const;

  /** Every module importing the vocabulary, by src-relative path. `util.ts` is absent by
   *  construction — it DEFINES the vocabulary, so it imports none of it. */
  const CENSUS: Readonly<Record<string, { symbols: string[]; role: Role }>> = {
    "citations.ts": { symbols: ["typeDir"], role: "resolves-governed-paths" },
    "commands/adopt.ts": { symbols: ["walkGovernedDocs"], role: "resolves-governed-paths" },
    "commands/audit-write.ts": { symbols: ["governedTypeOf"], role: "resolves-governed-paths" },
    // doctor and verify keep `typeDir` beside the shared walk: doctor names each type's dir in
    // its report (and scans for ungoverned siblings), verify locates each type's INDEX.md.
    "commands/doctor.ts": {
      symbols: ["typeDir", "walkGovernedDocs"],
      role: "resolves-governed-paths",
    },
    "commands/drift.ts": { symbols: ["scanGoverned"], role: "resolves-governed-paths" },
    "commands/eval.ts": { symbols: ["walkGovernedDocs"], role: "resolves-governed-paths" },
    "commands/ledger.ts": {
      symbols: ["collectGovernedIds", "isInside"],
      role: "resolves-governed-paths",
    },
    "commands/report.ts": { symbols: ["walkGovernedDocs"], role: "resolves-governed-paths" },
    "commands/stale.ts": { symbols: ["scanGoverned"], role: "resolves-governed-paths" },
    // verify builds its id set from the docs its own walk already parsed — importing
    // `collectGovernedIds` again would mean paying a second full corpus walk for the same ids.
    "commands/verify.ts": {
      symbols: ["typeDir", "walkGovernedDocs"],
      role: "resolves-governed-paths",
    },
    "journal.ts": { symbols: ["isInside"], role: "confines-a-configured-path" },
  };

  const SRC = join(import.meta.dir, "..", "src");

  function tsFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return tsFiles(path);
      return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
    });
  }

  /** Named imports taken from util.ts, per module. `[^}]*` deliberately, not `[\s\S]*?`: a
   *  greedy-across-statements capture silently glues `import {` onto the first symbol and drops
   *  it, which is how a census undercounts itself. */
  function measured(): Record<string, string[]> {
    const found: Record<string, string[]> = {};
    for (const file of tsFiles(SRC).sort()) {
      const symbols = new Set<string>();
      for (const m of readFileSync(file, "utf8").matchAll(
        /import\s+\{([^}]*)\}\s+from\s+"[^"]*util";/g,
      )) {
        for (const raw of (m[1] ?? "").split(",")) {
          const name = raw.replace(/^\s*type\s+/, "").trim();
          if ((VOCABULARY as readonly string[]).includes(name)) symbols.add(name);
        }
      }
      if (symbols.size > 0) {
        found[relative(SRC, file).split(/[\\/]/).join("/")] = [...symbols].sort();
      }
    }
    return found;
  }

  it("the set of modules importing the resolution vocabulary is exactly the declared census", () => {
    // A NEW surface (or a module that drops the vocabulary) fails here by NAME, with the
    // declared set beside the measured one — the fix is to add a row and, if it resolves
    // governed paths, a recursive-true/false assertion above.
    expect(Object.keys(measured()).sort()).toEqual(Object.keys(CENSUS).sort());
  });

  it("each module still imports the symbols its role was judged on", () => {
    const found = measured();
    for (const [file, { symbols }] of Object.entries(CENSUS)) {
      expect([file, found[file]]).toEqual([file, symbols]);
    }
  });

  it("the real denominator is 8 resolution sites: 10 modules plus util.ts, minus ledger's dual use", () => {
    const resolving = Object.values(CENSUS).filter(
      (e) => e.role === "resolves-governed-paths",
    ).length;
    expect(resolving).toBe(10);
    // Three of those ten (drift, stale, ledger) resolve nothing themselves — they consume
    // util.ts's shared scan, so they cannot drift from it. The other seven still declare a
    // corpus surface of their own — five walk file-by-file through the shared walkGovernedDocs
    // generator, citations mirrors the membership rule, audit-write asks the single-path dual —
    // and util.ts's own scan is the eighth site.
    const inherits = ["commands/drift.ts", "commands/stale.ts", "commands/ledger.ts"];
    expect(resolving - inherits.length + 1).toBe(8);
    // And exactly one module confines a configured path without resolving a governed one — it
    // owes `recursive` nothing, and counting it would be the same error as omitting doctor.
    expect(
      Object.values(CENSUS).filter((e) => e.role === "confines-a-configured-path"),
    ).toHaveLength(1);
  });
});

describe("loadConfig — 'required' and 'dir' are STRICT keys, failing loud at load", () => {
  function yml(body: string): GovkitConfig {
    writeFileSync(join(root, "govkit.yml"), body);
    return loadConfig(root);
  }
  const HEAD =
    "schemaVersion: 1\ndocs:\n  ignore: [INDEX.md]\n  base:\n    required: [id]\n  types:\n";

  it("a type with NO required fails at load naming the type — never a TypeError from a gate", () => {
    expect(() => yml(`${HEAD}    adr:\n      dir: docs/adr\n`)).toThrow(
      /type 'adr' required must be a list of front-matter key names/,
    );
    // The whole point: the message names the offender. A spread of undefined names nothing.
    expect(() => yml(`${HEAD}    adr:\n      dir: docs/adr\n`)).not.toThrow(TypeError);
  });

  it("a SCALAR required is rejected too — a string spreads to ['i','d'] instead of crashing", () => {
    expect(() => yml(`${HEAD}    adr:\n      dir: docs/adr\n      required: id\n`)).toThrow(
      /type 'adr' required must be a list of front-matter key names .* got '"id"'/s,
    );
  });

  it("an empty list is the legal way to say 'this type adds no keys of its own'", () => {
    const config = yml(`${HEAD}    adr:\n      dir: docs/adr\n      required: []\n`);
    expect(config.docs.types.adr?.required).toEqual([]);
  });

  it("a type with no dir fails at load naming the type", () => {
    expect(() => yml(`${HEAD}    adr:\n      required: [id]\n`)).toThrow(
      /type 'adr' is missing a 'dir'/,
    );
  });

  it("a written-but-empty base block fails; an ABSENT one keeps its documented default", () => {
    const withBase = "schemaVersion: 1\ndocs:\n  ignore: []\n  base: {}\n  types:\n";
    expect(() => yml(`${withBase}    adr:\n      dir: docs/adr\n      required: [id]\n`)).toThrow(
      /docs\.base\.required must be a list of front-matter key names/,
    );
    const noBase = "schemaVersion: 1\ndocs:\n  ignore: []\n  types:\n";
    const config = yml(`${noBase}    adr:\n      dir: docs/adr\n      required: [id]\n`);
    expect(config.docs.base.required).toEqual([]);
  });

  it("journal.path and ledger.path stay TOLERANT — the other side of the same line", () => {
    // Strictness is a judgement about consequence, not a house style: an unused bad sensor path
    // can only break the command that reads it, so it must not take down a gate that never does.
    const config = yml(
      `${HEAD}    adr:\n      dir: docs/adr\n      required: [id]\njournal:\n  path: 17\nledger:\n  path: 17\n`,
    );
    expect(config.journal?.path).toBe(17 as unknown as string);
    expect(config.ledger?.path).toBe(17 as unknown as string);
  });
});

describe("required parity — the three readers of 'which keys must exist' agree on excludeBase", () => {
  // The seam this pins: verify subtracted `excludeBase` (RFC-0023 G1) while adopt and the
  // audit-write hook each carried their own base∪type union — so the hook BLOCKED a write for
  // a key the CI gate deliberately exempts, and adopt scaffolded a `<MISSING — fill in>`
  // sentinel for it. All three now call util.effectiveRequired; this test is the parity row
  // that makes a fourth divergent copy fail loudly.
  const STATUSLESS = { excludeBase: ["status"], statuses: [], terminalStatuses: [] };
  const DOC = `---\nid: DOMAIN-0001\ntitle: "t"\nowner: TBD\n---\n\n${BODY}`;

  it("verify does not require the excluded key", () => {
    const config = useConfig(STATUSLESS);
    write("context-map.md", DOC);
    const result = runVerify({ root, config });
    expect(result.violations.filter((v) => v.kind === "frontmatter")).toEqual([]);
  });

  it("the hook does not block a write the gate would pass", () => {
    const config = useConfig(STATUSLESS);
    const decision = auditWrite(
      { tool_name: "Write", tool_input: { file_path: TOP(), content: DOC } },
      root,
      config,
    );
    expect(decision.block).toBe(false);
  });

  it("adopt does not scaffold a sentinel for the excluded key", () => {
    const config = useConfig(STATUSLESS);
    write("context-map.md", BODY); // no front-matter → adopt plans a block
    const result = runAdopt({ root, config });
    expect(result.planned).toHaveLength(1);
    const keys = (result.planned[0]?.fields ?? []).map((f) => f.key);
    expect(keys).toContain("id");
    expect(keys).not.toContain("status");
  });
});
