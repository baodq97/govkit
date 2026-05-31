import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type ArtifactScore, runEval } from "../src/commands/eval";
import { type GovkitConfig, loadConfig } from "../src/config";

// Regression tests for the adversarial red-team findings. Each `it` pins one gaming
// vector closed or one false-positive guard open — this file is the eval's "source of
// trust": if a future change reopens a vector, a test here goes red.

// A focused config for engine-mechanic tests (rubric-agnostic behaviour).
const CFG: GovkitConfig = {
  schemaVersion: 1,
  docs: {
    ignore: ["INDEX.md", "_TEMPLATE.md"],
    base: { required: [] },
    types: { adr: { dir: "docs/adr", required: [] } },
  },
  eval: {
    threshold: 70,
    rubrics: {
      adr: [
        { id: "context", weight: 25, kind: "section", pattern: "context", desc: "context" },
        { id: "decision", weight: 25, kind: "section", pattern: "decision", desc: "decision" },
        { id: "consequences", weight: 20, kind: "section", pattern: "consequence", desc: "cons" },
        {
          id: "gherkin",
          weight: 10,
          kind: "regex",
          pattern: "\\b(given|when|then)\\b",
          desc: "gherkin",
        },
        {
          id: "substance",
          weight: 15,
          kind: "minWords",
          min: 30,
          required: true,
          desc: "≥30 words",
        },
        {
          id: "nofiller",
          weight: 5,
          kind: "forbid",
          pattern: "to be filled in",
          required: true,
          desc: "no filler",
        },
      ],
    },
  },
};

const here = fileURLToPath(new URL(".", import.meta.url));
const repoConfig = loadConfig(join(here, "..", "..", ".."));
const W = (n: number): string => Array(n).fill("word").join(" ");

// Score one ADR body (front-matter auto-added) under the given config.
function evalAdr(body: string, config: GovkitConfig = CFG): ArtifactScore {
  const root = mkdtempSync(join(tmpdir(), "govkit-eval-"));
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  const fm = "---\nid: ADR-0001\ntitle: t\nstatus: accepted\nowner: TBD\ndate: 2026-05-31\n---\n\n";
  writeFileSync(join(root, "docs", "adr", "ADR-0001-x.md"), fm + body);
  try {
    const r = runEval({ root, config });
    if (!r.artifacts[0]) throw new Error("no artifact scored");
    return r.artifacts[0];
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// Score one US body under a config (defaults to the shipped rubric).
function evalUs(body: string, config: GovkitConfig = repoConfig): ArtifactScore {
  const root = mkdtempSync(join(tmpdir(), "govkit-eval-us-"));
  mkdirSync(join(root, "docs", "issues"), { recursive: true });
  const fm =
    "---\nid: US-0001\ntitle: t\nstatus: open\nowner: TBD\ndate: 2026-05-31\npriority: P1\n---\n\n";
  writeFileSync(join(root, "docs", "issues", "US-0001-x.md"), fm + body);
  try {
    const r = runEval({ root, config });
    if (!r.artifacts[0]) throw new Error("no artifact scored");
    return r.artifacts[0];
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const sectionPasses = (a: ArtifactScore): number =>
  a.rules.filter((r) => ["context", "decision", "consequences"].includes(r.id) && r.passed).length;

describe("eval hardening — gaming vectors closed", () => {
  it("kitchen-sink heading satisfies only ONE section (distinct-heading matching)", () => {
    const a = evalAdr(`## Context, Decision and Consequences\n\n${W(35)}`);
    expect(sectionPasses(a)).toBe(1); // not 3
  });

  it("distinct headings each satisfy their own section", () => {
    const a = evalAdr(`## Context\n\n## Decision\n\n## Consequences\n\n${W(35)}`);
    expect(sectionPasses(a)).toBe(3);
  });

  it("signals smuggled inside a code fence do NOT count (non-prose stripped)", () => {
    const a = evalAdr(
      `## Real heading\n\n\`\`\`\n## Context\n## Decision\nwhen then given\n\`\`\`\n\n${W(35)}`,
    );
    expect(sectionPasses(a)).toBe(0); // fenced headings are not headings
    expect(a.rules.find((r) => r.id === "gherkin")?.passed).toBe(false); // fenced keywords stripped
  });

  it("forbid blocks template filler in prose, but not inside a code fence", () => {
    const blocked = evalAdr(`## Decision\n\nWe will do X. to be filled in later. ${W(30)}`);
    expect(blocked.requiredOk).toBe(false);
    expect(blocked.missedRequired.join(" ")).toContain("filler");

    const fenced = evalAdr(
      `## Decision\n\nWe will do X.\n\n\`\`\`\nto be filled in later\n\`\`\`\n\n${W(30)}`,
    );
    expect(fenced.requiredOk).toBe(true); // the phrase is illustrative code, not a real stub
  });

  it("testable keywords use word boundaries — 'whenever'/'strengthen' do not match", () => {
    const prose = evalAdr(`## Decision\n\nWhenever we deploy we strengthen monitoring. ${W(30)}`);
    expect(prose.rules.find((r) => r.id === "gherkin")?.passed).toBe(false);

    const real = evalAdr(
      `## Decision\n\nWhen the user clicks export then a file downloads. ${W(30)}`,
    );
    expect(real.rules.find((r) => r.id === "gherkin")?.passed).toBe(true);
  });

  it("the required floor blocks a structured-but-tiny stub (<30 words)", () => {
    const a = evalAdr("## Context\n## Decision\n## Consequences\n\ntiny stub.");
    expect(a.requiredOk).toBe(false);
    expect(a.missedRequired.join(" ")).toContain("30 words");
  });
});

describe("eval hardening — zero false-positive on legitimate ADR styles (shipped rubric)", () => {
  it("passes a MADR-formatted ADR (Considered Options / Decision Outcome / Pros and Cons)", () => {
    const a = evalAdr(
      `## Context and Problem Statement\nWe need a durable, consistent billing store under moderate write load.\n\n` +
        `## Considered Options\nPostgreSQL, MySQL, DynamoDB.\n\n` +
        `## Decision Outcome\nChosen option: PostgreSQL, because it gives the ACID guarantees billing needs.\n\n` +
        `## Pros and Cons of the Options\nPostgres: mature ops, stateful cost. DynamoDB: scales, weak transactions.`,
      repoConfig,
    );
    expect(a.requiredOk).toBe(true);
    expect(a.score).toBeGreaterThanOrEqual(70);
  });

  it("passes a Nygard third-person/passive ADR", () => {
    const a = evalAdr(
      `## Status\nAccepted.\n\n## Context\nThe team must choose a transport for internal calls under tight latency limits.\n\n` +
        `## Decision\nThe team adopts gRPC; it was selected over REST to guarantee low-latency streaming between services.\n\n` +
        `## Consequences\nIn return the team accepts heavier tooling. Negative: harder browser-side debugging.`,
      repoConfig,
    );
    expect(a.requiredOk).toBe(true);
    expect(a.score).toBeGreaterThanOrEqual(70);
  });

  it("passes a terse-but-complete ADR (concision is a virtue, not a defect)", () => {
    const a = evalAdr(
      `## Context\nThe billing service needs a durable transactional store and the team knows Postgres well.\n\n` +
        `## Decision\nUse PostgreSQL as the primary datastore for all billing records.\n\n` +
        `## Consequences\nWe accept stateful operational cost; no other store was evaluated for this iteration.`,
      repoConfig,
    );
    expect(a.requiredOk).toBe(true); // must NOT be blocked by the length floor
  });

  it("credits checkbox-only acceptance criteria (testable rule is line-anchored)", () => {
    // No Gherkin words — the checkbox branch alone must satisfy `testable`. This pins
    // the `^…checkbox` rule to LINE start (multiline), not document start.
    const a = evalUs(
      `As a user I want CSV export.\n\n## Acceptance criteria\n\n` +
        `- [ ] The export button is visible to a signed-in user.\n` +
        `- [ ] The downloaded CSV has one row per metered event.\n\n${W(15)}`,
    );
    expect(a.rules.find((r) => r.id === "testable")?.passed).toBe(true);
  });
});
