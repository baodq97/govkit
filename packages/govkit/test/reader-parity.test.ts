// READER PARITY + the STRICT/TOLERANT config line — the two seams a bounded-context split found.
//
// 1. Five readers walk the governed corpus: verify (the gate), eval (the grader), report (the
//    lifecycle view), adopt (the migrator) and collectGovernedIds (the shared id universe). They
//    must see ONE corpus. `report` and `adopt` used to drop the per-type `recursive` flag, so on a
//    nested tree a doc was gated and graded while invisible in its lifecycle and unreachable by
//    the migrator — governed but un-adoptable, i.e. permanently red. Parity is asserted here as a
//    property of all five together, not per reader, because a per-reader test is exactly what
//    passed while the seam was broken.
// 2. `required` (base and per-type) and `dir` fail LOUD at load. They are the STRICT side of the
//    schema's asymmetry; `journal.path` / `ledger.path` are the TOLERANT side and stay tolerant.
//    Both sides are pinned, since the line only means something if it is a line.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAdopt } from "../src/commands/adopt";
import { runEval } from "../src/commands/eval";
import { runReport } from "../src/commands/report";
import { runVerify } from "../src/commands/verify";
import { type DocType, type GovkitConfig, loadConfig } from "../src/config";
import { collectGovernedIds } from "../src/util";

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

const BODY = "# Heading\n\nprose body of the doc\n";

let root: string;

function write(rel: string, text: string): void {
  const file = join(root, "docs", "domain", rel);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, text);
}

/** A nested corpus: 1 top-level doc + 1 a directory down. Two files, one of them only reachable
 *  by a recursive walk — the minimum shape that can catch a reader dropping the flag. */
function tree(withFrontMatter: boolean): void {
  const doc = (id: string) =>
    withFrontMatter
      ? `---\nid: ${id}\ntitle: "t"\nstatus: draft\nowner: TBD\n---\n\n${BODY}`
      : BODY;
  write("context-map.md", doc("DOMAIN-CM-0001"));
  write("parking-visit/README.md", doc("DOMAIN-0001"));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-parity-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("reader parity — five readers, one corpus", () => {
  it("recursive: true — verify, eval, report and the id universe all count 2", () => {
    tree(true);
    const config = cfg({ recursive: true });
    expect(runVerify({ root, config }).checked).toBe(2);
    expect(runEval({ root, config }).scored).toBe(2);
    expect(runReport({ root, config }).total).toBe(2);
    expect(collectGovernedIds(root, config).size).toBe(2);
  });

  it("recursive: true — adopt offers a block to the NESTED doc too, so it can be adopted", () => {
    // adopt only ACTS on docs LACKING front-matter, so its walk is measured on that corpus —
    // where verify also counts 2, which is the parity claim for this reader.
    tree(false);
    const config = cfg({ recursive: true });
    expect(runVerify({ root, config }).checked).toBe(2);
    const planned = runAdopt({ root, config }).planned;
    expect(planned).toHaveLength(2);
    expect(planned.some((p) => p.file.includes("parking-visit"))).toBe(true);
  });

  it("adopt --apply reaches the nested doc, and the gate then agrees it has front-matter", () => {
    tree(false);
    const config = cfg({ recursive: true });
    runAdopt({ root, config, apply: true });
    // Both docs now carry a block: the only remaining complaints are the sentinel placeholders
    // a human must fill, never "missing YAML front-matter".
    const kinds = runVerify({ root, config }).violations.map((v) => v.kind);
    expect(kinds).not.toContain("frontmatter");
  });

  it("the flat DEFAULT narrows all five together — parity holds in both directions", () => {
    tree(true);
    const config = cfg();
    expect(runVerify({ root, config }).checked).toBe(1);
    expect(runEval({ root, config }).scored).toBe(1);
    expect(runReport({ root, config }).total).toBe(1);
    expect(collectGovernedIds(root, config).size).toBe(1);
    // …and the migrator narrows with them rather than out of step.
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    tree(false);
    expect(runAdopt({ root, config }).planned).toHaveLength(1);
  });

  it("report buckets the nested doc under its real status, not into a phantom count", () => {
    tree(true);
    write(
      "parking-visit/decided.md",
      `---\nid: DOMAIN-0002\ntitle: "t"\nstatus: accepted\nowner: TBD\n---\n\n${BODY}`,
    );
    const result = runReport({ root, config: cfg({ recursive: true }) });
    expect(result.total).toBe(3);
    const domain = result.types.find((t) => t.type === "domain");
    expect(domain?.buckets.map((b) => [b.status, b.count, b.terminal])).toEqual([
      ["accepted", 1, true],
      ["draft", 2, false],
    ]);
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
