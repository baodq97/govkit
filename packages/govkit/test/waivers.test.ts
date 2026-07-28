import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runEval } from "../src/commands/eval";
import { runVerify, verifySummaryLine } from "../src/commands/verify";
import {
  classifyWaivers,
  type GovkitConfig,
  loadConfig,
  type Waiver,
  waiverCovers,
} from "../src/config";
import type { JournalRecord } from "../src/journal";

// WAIVERS — the recorded, EXPIRING exception. The whole mechanism is built so its failure mode is
// a NOISY gate, never a quiet one: of the three waiver states only `active` suppresses, and even
// then the violation stays in the report. These tests pin the three states, the boundary between
// them, and the arithmetic of the summary line — because a suppression mechanism nobody can audit
// is indistinguishable from having turned the gate off.

const NOW = new Date("2026-07-28T12:00:00Z");
const FUTURE = "2026-12-31"; // far past the 14-day expiring-soon horizon
const SOON = "2026-08-02"; // 5 days out — inside the horizon
const PAST = "2026-07-01";

let root: string;

function write(rel: string, text: string): void {
  const file = join(root, rel);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, text);
}

const meta = { title: "t", status: "draft", owner: "TBD", date: "2026-07-28" };

function doc(fields: Record<string, string>, body = "prose body of the doc"): string {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `---\n${fm}\n---\n\n${body}\n`;
}

/** A two-ADR corpus with NO INDEX.md — so the baseline is exactly one `index` violation, the
 *  finding every waiver test below aims at. Nothing else in the corpus is broken. */
function corpus(): void {
  write("docs/adr/ADR-0001.md", doc({ id: "ADR-0001", ...meta }));
  write("docs/adr/ADR-0002.md", doc({ id: "ADR-0002", ...meta }));
}

function cfg(waivers?: unknown[]): GovkitConfig {
  return {
    schemaVersion: 1,
    docs: {
      ignore: ["INDEX.md", "_TEMPLATE.md"],
      base: { required: ["id", "title", "status", "owner", "date"] },
      types: {
        adr: {
          dir: "docs/adr",
          required: ["id", "title", "status", "owner", "date"],
          idPrefix: "ADR",
          statuses: ["draft", "accepted"],
        },
      },
    },
    ...(waivers ? { waivers } : {}),
  };
}

function waiver(over: Partial<Record<keyof Waiver, string>> = {}): Record<string, string> {
  return {
    rule: "index",
    scope: "docs/adr/**",
    reason: "INDEX rows are backfilled by the migration; blocking stalls it on a mechanical edit",
    authorized_by: "@baodq97",
    expires: FUTURE,
    ...over,
  };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-waiver-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("baseline — the finding a waiver is aimed at", () => {
  it("fails with exactly one index violation and an all-zero waiver summary", () => {
    corpus();
    const result = runVerify({ root, config: cfg(), now: NOW });
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.kind).toBe("index");
    expect(result.waivers).toEqual({
      configured: 0,
      active: 0,
      expired: 0,
      malformed: 0,
      expiringSoon: 0,
      horizonDays: 14,
      applied: 0,
    });
  });
});

describe("an ACTIVE waiver — reported, not blocking", () => {
  it("keeps the violation in the report, marks who signed it, and passes the gate", () => {
    corpus();
    const result = runVerify({ root, config: cfg([waiver()]), now: NOW });
    expect(result.ok).toBe(true);
    // Marking, never filtering: the finding is still there for every printer and --json consumer.
    expect(result.violations).toHaveLength(1);
    const v = result.violations[0];
    expect(v?.kind).toBe("index");
    expect(v?.waivedBy?.authorized_by).toBe("@baodq97");
    expect(v?.problems.join(" ")).toContain(`waived by @baodq97 until ${FUTURE}`);
    expect(result.waivers.active).toBe(1);
    expect(result.waivers.applied).toBe(1);
    expect(result.waivers.expiringSoon).toBe(0);
  });

  it("must match rule AND scope — a right-scope/wrong-rule waiver suppresses nothing", () => {
    corpus();
    const wrongRule = runVerify({ root, config: cfg([waiver({ rule: "status" })]), now: NOW });
    expect(wrongRule.ok).toBe(false);
    expect(wrongRule.waivers.applied).toBe(0);
    const wrongScope = runVerify({
      root,
      config: cfg([waiver({ scope: "docs/rfc/**" })]),
      now: NOW,
    });
    expect(wrongScope.ok).toBe(false);
    expect(wrongScope.waivers.applied).toBe(0);
  });

  it("cannot waive the `waiver` kind itself — no self-concealing exception", () => {
    corpus();
    // An expired waiver produces a `waiver` violation; a second, active waiver aimed at that
    // kind must not silence it, or a repo could bury its whole dead-waiver backlog in one line.
    const config = cfg([
      waiver({ expires: PAST }),
      waiver({ rule: "waiver", scope: "govkit.yml", expires: FUTURE }),
    ]);
    const result = runVerify({ root, config, now: NOW });
    const waiverViolation = result.violations.find((v) => v.kind === "waiver");
    expect(waiverViolation).toBeDefined();
    expect(waiverViolation?.waivedBy).toBeUndefined();
    expect(result.ok).toBe(false);
  });
});

describe("an EXPIRED waiver — suppresses nothing, and says so", () => {
  it("lets the finding come back AND reports the expiry (bar (b))", () => {
    corpus();
    const result = runVerify({ root, config: cfg([waiver({ expires: PAST })]), now: NOW });
    expect(result.ok).toBe(false);
    // The original finding is back, unwaived — this is the property the whole design turns on.
    const index = result.violations.find((v) => v.kind === "index");
    expect(index).toBeDefined();
    expect(index?.waivedBy).toBeUndefined();
    // …and it did not reappear as if from nowhere: the run names the dead waiver.
    const expired = result.violations.find((v) => v.kind === "waiver");
    expect(expired?.problems.join(" ")).toContain(`EXPIRED on ${PAST}`);
    expect(expired?.problems.join(" ")).toContain("no longer suppresses anything");
    expect(result.waivers).toMatchObject({ configured: 1, active: 0, expired: 1, applied: 0 });
  });

  it("expires at the END of a date-only day, UTC — not at its midnight", () => {
    const config = cfg([waiver({ expires: "2026-07-28" })]);
    const lastMoment = classifyWaivers(config, new Date("2026-07-28T23:59:59.000Z"));
    expect(lastMoment[0]?.state).toBe("active");
    const nextDay = classifyWaivers(config, new Date("2026-07-29T00:00:00.000Z"));
    expect(nextDay[0]?.state).toBe("expired");
  });
});

describe("a MALFORMED waiver — itself a violation (bar (c))", () => {
  it.each([
    ["reason", waiver({ reason: "" }), /missing a non-empty 'reason'/],
    ["authorized_by", waiver({ authorized_by: "" }), /missing a non-empty 'authorized_by'/],
    ["expires", waiver({ expires: "" }), /missing a non-empty 'expires'/],
    ["scope", waiver({ scope: "" }), /missing a non-empty 'scope'/],
  ])("missing %s is reported and suppresses nothing", (_field, entry, pattern) => {
    corpus();
    const result = runVerify({ root, config: cfg([entry]), now: NOW });
    expect(result.ok).toBe(false);
    const broken = result.violations.find((v) => v.kind === "waiver");
    expect(broken?.file).toBe(join(root, "govkit.yml"));
    expect(broken?.problems.join(" ")).toMatch(pattern);
    // the finding it was aimed at is untouched
    expect(result.violations.find((v) => v.kind === "index")?.waivedBy).toBeUndefined();
    expect(result.waivers).toMatchObject({ malformed: 1, active: 0, applied: 0 });
  });

  it("a non-ISO expires is malformed, not silently permanent", () => {
    corpus();
    const result = runVerify({ root, config: cfg([waiver({ expires: "Dec 31 2026" })]), now: NOW });
    expect(result.ok).toBe(false);
    expect(result.violations.find((v) => v.kind === "waiver")?.problems.join(" ")).toContain(
      "is not an ISO date",
    );
    expect(result.waivers.malformed).toBe(1);
  });

  it("a typo'd rule name is malformed — it would waive nothing while reading as if it did", () => {
    corpus();
    const result = runVerify({ root, config: cfg([waiver({ rule: "indx" })]), now: NOW });
    expect(result.violations.find((v) => v.kind === "waiver")?.problems.join(" ")).toContain(
      "names unknown rule 'indx'",
    );
    expect(result.waivers.malformed).toBe(1);
  });

  it("an eval rubric rule id IS a valid rule name — the vocabulary spans both layers", () => {
    corpus();
    const config: GovkitConfig = {
      ...cfg([waiver({ rule: "substance", scope: "docs/adr/ADR-0001.md" })]),
      eval: {
        threshold: 50,
        rubrics: {
          adr: [
            {
              id: "substance",
              desc: "≥40 words",
              weight: 100,
              kind: "minWords",
              min: 40,
              required: true,
            },
          ],
        },
      },
    };
    expect(classifyWaivers(config, NOW)[0]?.state).toBe("active");
    expect(runVerify({ root, config, now: NOW }).waivers.malformed).toBe(0);
  });

  it("a non-mapping entry is malformed rather than a crash", () => {
    corpus();
    const result = runVerify({ root, config: cfg(["just a string"]), now: NOW });
    expect(result.waivers.malformed).toBe(1);
    expect(result.violations.find((v) => v.kind === "waiver")?.problems.join(" ")).toContain(
      "must be a mapping",
    );
  });
});

describe("the summary line — the count the human reads", () => {
  it('reads "3 violations, 1 blocking, 2 waived, 1 waiver expiring within 14 days"', () => {
    // 3 findings: two ADRs missing a `status` value, plus the type's missing INDEX.md. ONE waiver,
    // scoped by glob, covers both status findings — so `applied` (2) and `active` (1) differ, which
    // is exactly the distinction the line has to keep straight.
    write("docs/adr/ADR-0001.md", doc({ id: "ADR-0001", title: "t", owner: "TBD", date: "d" }));
    write("docs/adr/ADR-0002.md", doc({ id: "ADR-0002", title: "t", owner: "TBD", date: "d" }));
    const config = cfg([waiver({ rule: "frontmatter", expires: SOON })]);
    const result = runVerify({ root, config, now: NOW });
    expect(result.violations).toHaveLength(3);
    expect(result.waivers).toMatchObject({ active: 1, applied: 2, expiringSoon: 1, expired: 0 });
    expect(verifySummaryLine(result)).toBe(
      "3 violations, 1 blocking, 2 waived, 1 waiver expiring within 14 days",
    );
    expect(result.ok).toBe(false); // the unwaived INDEX finding still blocks
  });

  it("says nothing about waivers when none are configured", () => {
    corpus();
    expect(verifySummaryLine(runVerify({ root, config: cfg(), now: NOW }))).toBe(
      "1 violation, 1 blocking",
    );
  });

  it("names expired and malformed entries in the line too", () => {
    corpus();
    const config = cfg([waiver({ expires: PAST }), waiver({ reason: "" })]);
    const result = runVerify({ root, config, now: NOW });
    expect(verifySummaryLine(result)).toBe(
      "2 violations, 2 blocking, 1 waiver expired, 1 waiver malformed",
    );
  });

  // THE header-vs-body bar. A run whose only finding is waived is `ok`, and the old line answered
  // that by counting nothing — "0 violations" printed directly above the violation. The head term
  // counts what is about to be listed; only the breakdown may say zero.
  it("never says '0 violations' when a violation is in the report", () => {
    corpus();
    const result = runVerify({ root, config: cfg([waiver()]), now: NOW });
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(1);
    const line = verifySummaryLine(result);
    expect(line).toBe("1 violation, 0 blocking, 1 waived");
    expect(line).not.toContain("0 violations");
  });

  it("still reads exactly '0 violations' on a clean corpus — the OK header is unchanged", () => {
    corpus();
    write("docs/adr/INDEX.md", "# ADR\n\n| ADR-0001 | t | draft |\n| ADR-0002 | t | draft |\n");
    const result = runVerify({ root, config: cfg(), now: NOW });
    expect(result.ok).toBe(true);
    expect(verifySummaryLine(result)).toBe("0 violations");
  });

  it("counts a waived ADVISORY once, in the waived bucket — the buckets partition the list", () => {
    corpus();
    const config: GovkitConfig = { ...cfg([waiver()]), tiers: { index: "advisory" } };
    const result = runVerify({ root, config, now: NOW });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.tier).toBe("advisory");
    expect(result.violations[0]?.waivedBy).toBeDefined();
    // 1 = 0 blocking + 1 waived + 0 advisory: double-counting would read "1 violation, -1 blocking".
    expect(verifySummaryLine(result)).toBe("1 violation, 0 blocking, 1 waived");
  });
});

describe("composition with the rest of the engine", () => {
  it("`tiers: { waiver: advisory }` demotes the broken-waiver report without hiding it", () => {
    corpus();
    write("docs/adr/INDEX.md", "# ADR\n\n| ADR-0001 | t | draft |\n| ADR-0002 | t | draft |\n");
    const config: GovkitConfig = {
      ...cfg([waiver({ expires: PAST })]),
      tiers: { waiver: "advisory" },
    };
    const result = runVerify({ root, config, now: NOW });
    expect(result.violations.find((v) => v.kind === "waiver")?.tier).toBe("advisory");
    expect(result.ok).toBe(true);
  });

  it("a waiver survives `--changed` scoping: it is reported on govkit.yml, never a changed .md", () => {
    corpus();
    const config = cfg([waiver({ expires: PAST })]);
    const result = runVerify({
      root,
      config,
      now: NOW,
      changed: { files: new Set<string>(), ref: "origin/main" },
    });
    // Scoped by file this would vanish on every --changed run — quietly hiding a dead exception.
    expect(result.violations.some((v) => v.kind === "waiver")).toBe(true);
  });

  it("scope globs are segment-aware and anchored at both ends", () => {
    const w = (scope: string): Waiver => ({
      rule: "index",
      scope,
      reason: "r",
      authorized_by: "@baodq97",
      expires: FUTURE,
    });
    expect(waiverCovers(w("docs/adr/**"), "index", "docs/adr/deep/ADR-0001.md")).toBe(true);
    expect(waiverCovers(w("docs/adr/*.md"), "index", "docs/adr/ADR-0001.md")).toBe(true);
    // `*` does not cross a separator, so a per-dir scope cannot silently widen to the subtree.
    expect(waiverCovers(w("docs/adr/*.md"), "index", "docs/adr/deep/ADR-0001.md")).toBe(false);
    // anchored: a scope can never widen itself by substring match.
    expect(waiverCovers(w("docs/adr"), "index", "other/docs/adr/x.md")).toBe(false);
  });
});

describe("eval — the graded floor honors the same waivers", () => {
  const rubric = {
    threshold: 50,
    rubrics: {
      adr: [
        {
          id: "substance",
          desc: "not an empty stub (≥40 words of prose)",
          weight: 100,
          kind: "minWords" as const,
          min: 40,
          required: true,
        },
      ],
    },
  };

  function stub(): void {
    write("docs/adr/ADR-0001.md", doc({ id: "ADR-0001", ...meta }, "too short"));
  }

  it("an ACTIVE waiver unblocks the required floor but keeps the gap visible", () => {
    stub();
    const config: GovkitConfig = {
      ...cfg([waiver({ rule: "substance", scope: "docs/adr/**" })]),
      eval: rubric,
    };
    const result = runEval({ root, config, now: NOW });
    expect(result.ok).toBe(true);
    const a = result.artifacts[0];
    expect(a?.floorOk).toBe(true);
    // Reported, not hidden: the literal structural truth is untouched, and so is the trend that
    // `calibrate` reads — a waiver must never be able to re-tune the rubric.
    expect(a?.requiredOk).toBe(false);
    expect(a?.missedRequired).toEqual(["not an empty stub (≥40 words of prose)"]);
    expect(result.floorPassRate).toBe(0);
    expect(a?.waived).toHaveLength(1);
    expect(a?.waived[0]?.rule).toBe("substance");
    expect(a?.waived[0]?.waiver.authorized_by).toBe("@baodq97");
    expect(a?.waived[0]?.waiver.expires).toBe(FUTURE);
    expect(result.waivers).toMatchObject({ active: 1, applied: 1 });
  });

  it("an EXPIRED waiver does not unblock it", () => {
    stub();
    const config: GovkitConfig = {
      ...cfg([waiver({ rule: "substance", scope: "docs/adr/**", expires: PAST })]),
      eval: rubric,
    };
    const result = runEval({ root, config, now: NOW });
    expect(result.ok).toBe(false);
    expect(result.artifacts[0]?.floorOk).toBe(false);
    expect(result.waivers).toMatchObject({ expired: 1, applied: 0 });
  });

  it("a MALFORMED waiver does not unblock it either", () => {
    stub();
    const config: GovkitConfig = {
      ...cfg([waiver({ rule: "substance", scope: "docs/adr/**", authorized_by: "" })]),
      eval: rubric,
    };
    const result = runEval({ root, config, now: NOW });
    expect(result.ok).toBe(false);
    expect(result.waivers).toMatchObject({ malformed: 1, applied: 0 });
  });
});

describe("loadConfig — shape only, so a broken entry reaches the gate", () => {
  const HEAD =
    "schemaVersion: 1\ndocs:\n  ignore: [INDEX.md]\n  base:\n    required: [id]\n  types:\n" +
    "    adr:\n      dir: docs/adr\n      required: [id]\n";

  function yml(body: string): GovkitConfig {
    writeFileSync(join(root, "govkit.yml"), body);
    return loadConfig(root);
  }

  it("absent ⇒ undefined", () => {
    expect(yml(HEAD).waivers).toBeUndefined();
  });

  it("a mapping instead of a list fails loud — it would record nothing", () => {
    expect(() => yml(`${HEAD}waivers:\n  rule: index\n`)).toThrow(/waivers must be a list of/);
  });

  it("does NOT throw on a malformed ENTRY — that has to surface as a reported violation", () => {
    const config = yml(`${HEAD}waivers:\n  - rule: index\n`);
    expect(config.waivers).toHaveLength(1);
    const states = classifyWaivers(config, NOW);
    expect(states[0]?.state).toBe("malformed");
  });
});

// The wiring bar. Every assertion above holds on a VerifyResult in-process; the defect these
// close was that nothing carried those numbers to a human or to the sensor — the summary function
// had zero production callers, and the journal had no word for "waived" at all. So this block
// spawns dist/cli.js and reads what a person and a consumer actually get.
describe("e2e on dist/cli.js — the report and the journal a waiver reaches", () => {
  const CLI = join(import.meta.dir, "../dist/cli.js");
  const cli = (args: string[]) =>
    spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });

  // The CLI reads the real clock, so the e2e waiver expires well past any test run.
  const YML = (waivers: string): string => `schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status, owner, date]
  types:
    adr:
      dir: docs/adr
      required: [id, title, status, owner, date]
      idPrefix: ADR
      statuses: [draft, accepted]
${waivers}`;

  const ACTIVE = `waivers:
  - rule: index
    scope: docs/adr/**
    reason: INDEX rows are backfilled by the migration; blocking stalls it on a mechanical edit
    authorized_by: "@baodq97"
    expires: "2999-12-31"
`;

  /** The header must describe its own BODY: the count that opens the summary is the number of
   *  entries printed beneath it. This is the assertion the old printer failed — it headed a
   *  waived finding "0 violations" and then listed it. */
  function expectHeaderCountsItsBody(out: string): void {
    const lines = out.split("\n");
    const header = lines.find((l) => l.startsWith("govkit verify:"));
    expect(header).toBeDefined();
    const entries = lines.filter((l) => /^ {2}\S/.test(l)).length;
    const claimed = Number(/, (\d+) violations?/.exec(header ?? "")?.[1]);
    expect(claimed).toBe(entries);
  }

  function fixture(waivers: string): void {
    corpus();
    writeFileSync(join(root, "govkit.yml"), YML(waivers));
  }

  it("a waived-only run exits 0 and its OK header counts the finding it prints", () => {
    fixture(ACTIVE);
    const r = cli(["verify", "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("govkit verify: OK");
    expect(r.stdout).toContain("1 violation, 0 blocking, 1 waived");
    expect(r.stdout).not.toContain("0 violations"); // the exact lie this closes
    // The entry is prefixed, not hidden (the printer writes absolute paths).
    expect(r.stdout).toContain(`waived ${join(root, "docs", "adr", "INDEX.md")}`);
    expect(r.stdout).toContain("waived by @baodq97 until 2999-12-31");
    expectHeaderCountsItsBody(r.stdout);
  });

  it("the unwaived run still FAILs, and its header counts its body too", () => {
    fixture("");
    const r = cli(["verify", "--root", root]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("govkit verify: FAIL");
    expect(r.stderr).toContain("1 violation, 1 blocking");
    expectHeaderCountsItsBody(r.stderr);
  });

  it("the --journal record marks the waived finding, so it is not read as a broken gate", () => {
    fixture(ACTIVE);
    const r = cli(["verify", "--journal", "--root", root]);
    expect(r.status).toBe(0);
    const journal = join(root, ".govkit", "journal.jsonl");
    expect(existsSync(journal)).toBe(true);
    const line = JSON.parse(readFileSync(journal, "utf8").trim()) as JournalRecord;
    expect(line.ok).toBe(true);
    expect(line.verify?.violations).toHaveLength(1); // marked, never filtered — still journalled
    expect(line.verify?.violations[0]?.kind).toBe("index");
    expect(line.verify?.violations[0]?.tier).toBe("blocking"); // the KIND is still blocking…
    expect(line.verify?.violations[0]?.waived).toBe(true); // …and THIS finding was signed for
  });

  // The same header-vs-body contradiction lived in the EVAL printer, found while wiring this one:
  // it branched on the literal `requiredOk`, so an artifact whose every missed required rule was
  // signed for printed `BLOCK` under an `OK` header, naming no waiver at all.
  it("the eval report shows a waived floor as waived, not as BLOCK under an OK header", () => {
    write("docs/adr/ADR-0001.md", doc({ id: "ADR-0001", ...meta }, "too short"));
    writeFileSync(
      join(root, "govkit.yml"),
      `${YML(`waivers:
  - rule: substance
    scope: docs/adr/**
    reason: the stub is tracked by the migration; blocking stalls it
    authorized_by: "@baodq97"
    expires: "2999-12-31"
`)}eval:
  threshold: 50
  rubrics:
    adr:
      - id: substance
        desc: not an empty stub
        weight: 100
        kind: minWords
        min: 40
        required: true
`,
    );
    const r = cli(["eval", "--root", root]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("govkit eval: OK");
    // The literal floor stays 0% (calibrate must never see a waiver) — but the line now says why.
    expect(r.stdout).toContain("required floor: 0% passed, 1 waived");
    expect(r.stdout).not.toContain("BLOCK");
    expect(r.stdout).toContain("waived 0/100");
    expect(r.stdout).toContain("missing required: not an empty stub");
    expect(r.stdout).toContain("(signed: substance by @baodq97 until 2999-12-31)");
  });

  it("a genuine blocking failure is distinguishable from it — no `waived` field at all", () => {
    fixture("");
    const r = cli(["verify", "--journal", "--root", root]);
    expect(r.status).toBe(1);
    const line = JSON.parse(
      readFileSync(join(root, ".govkit", "journal.jsonl"), "utf8").trim(),
    ) as JournalRecord;
    expect(line.ok).toBe(false);
    const entry = line.verify?.violations[0];
    expect(entry?.kind).toBe("index");
    expect(entry?.tier).toBe("blocking");
    // Omitted, never false (journal.ts) — and the two records now differ on more than `ok`, which
    // is what a consumer clustering "blocking violations" needs to tell them apart.
    expect(entry?.waived).toBeUndefined();
    expect(Object.keys(entry ?? {})).not.toContain("waived");
  });
});

describe("this repo's own govkit.yml", () => {
  it("waives NOTHING — the example block is commented out", () => {
    // Guards against the one way this feature could turn into a silent kill switch: a real waiver
    // landing in the kit's own config while nobody is looking.
    const config = loadConfig(join(import.meta.dir, "..", "..", ".."));
    expect(config.waivers).toBeUndefined();
  });
});
