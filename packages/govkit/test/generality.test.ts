import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VerifyResult } from "../src/commands/verify";

// The THIRD dissimilar consumer (PRD-0001 R1 / ledger F-R1-N3, config-surface half): an ML
// research lab whose taxonomy shares NOTHING with the shipped default — exp/mc/ds types, a
// per-type lifecycle vocabulary, extra required keys, .govkit docs isolation (RFC-0007), a
// demoted INDEX tier (RFC-0014), custom journal/ledger paths — run END TO END through the
// SHIPPED dist/cli.js. What this proves: govkit.yml parameterizes the whole diverging
// surface with zero engine changes. What it deliberately does NOT prove (the honest
// boundary the ledger keeps open): generality outside the author's DNA — that still needs
// an external consumer.

const CLI = join(import.meta.dir, "../dist/cli.js");
const FIXTURE = join(import.meta.dir, "fixtures", "ml-research");

let root: string;
const cli = (args: string[]) =>
  spawnSync(process.execPath, [CLI, ...args, "--root", root], { encoding: "utf8", stdio: "pipe" });
const g = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });

const EXP1 = join(".govkit", "docs", "experiments", "EXP-0001-churn-transformer-baseline.md");
const EXP2 = join(".govkit", "docs", "experiments", "EXP-0002-feature-window-ablation.md");
const MC1 = join(".govkit", "docs", "model-cards", "MC-0001-churn-lightgbm-v3.md");

/** In-place fixture mutation — each test states the one divergence it injects. */
function mutate(rel: string, from: string | RegExp, to: string): void {
  const file = join(root, rel);
  writeFileSync(file, readFileSync(file, "utf8").replace(from, to));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "govkit-n3-"));
  cpSync(FIXTURE, root, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("generality — the ml-research consumer, pure-fs surface (no git)", () => {
  it("verify is green on the whole corpus under .govkit — 4 docs across 3 custom types", () => {
    const r = cli(["verify", "--json"]);
    expect(r.status).toBe(0);
    const result = JSON.parse(r.stdout) as VerifyResult;
    expect(result.checked).toBe(4);
    expect(result.violations).toEqual([]);
  });

  it("eval passes the floor and scores against the lab's own rubric, not the default one", () => {
    const r = cli(["eval"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("4 artifact(s)");
    expect(r.stdout).toContain("[exp]"); // the custom type names flow through to the report
    expect(r.stdout).toContain("[ds]");
  });

  it("enforces the lab's OWN status vocabulary — 'accepted' (a default-taxonomy value) is rejected", () => {
    mutate(EXP2, "status: analyzed", "status: accepted");
    const r = cli(["verify"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("accepted");
    expect(r.stderr).toContain("designed, running, analyzed, published, abandoned");
  });

  it("enforces the extra per-type required key (metric) beyond the base set", () => {
    mutate(EXP2, /^metric: auc\r?\n/m, "");
    const r = cli(["verify"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("metric");
  });

  it("enforces the custom id convention (EXP prefix + filename)", () => {
    mutate(EXP2, "id: EXP-0002", "id: RFC-0002");
    const r = cli(["verify"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("must start with 'EXP-'");
  });

  it("resolves cross-type refs on lab-specific keys: exp.dataset → ds, mc.parent → exp", () => {
    mutate(EXP1, "dataset: DS-0001", "dataset: DS-9999");
    const r = cli(["verify"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("DS-9999");

    // restore, then break the other ref key to prove both are live
    mutate(EXP1, "dataset: DS-9999", "dataset: DS-0001");
    mutate(MC1, "parent: EXP-0001", "parent: EXP-7777");
    const r2 = cli(["verify"]);
    expect(r2.status).toBe(1);
    expect(r2.stderr).toContain("EXP-7777");
  });

  it("fires requiredSectionsByStatus on the lab's 'published' status — Results may not vanish", () => {
    mutate(EXP1, "## Results", "## Numbers we saw");
    const r = cli(["verify"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Results");
  });

  it("honors the demoted INDEX tier: a stale INDEX row warns but does not block (RFC-0014)", () => {
    mutate(
      join(".govkit", "docs", "datasets", "INDEX.md"),
      "validated",
      "proposed", // stale status in the row — an index violation, demoted to advisory here
    );
    const r = cli(["verify"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("warn");
    expect(r.stdout).toContain("1 advisory");
  });

  it("writes the --journal record to the lab's configured path, not the default", () => {
    const r = cli(["verify", "--journal"]);
    expect(r.status).toBe(0);
    const custom = join(root, ".govkit", "telemetry", "journal.jsonl");
    expect(existsSync(custom)).toBe(true);
    expect(existsSync(join(root, ".govkit", "journal.jsonl"))).toBe(false);
  });
});

describe("generality — the ml-research consumer, git-backed surface", () => {
  beforeEach(() => {
    g("init");
    g("config", "user.email", "lab@example.com");
    g("config", "user.name", "Lab");
    g("config", "commit.gpgsign", "false");
    g("add", "-A");
    g("commit", "-m", "lab corpus");
  });

  it("drift: ack replaces the placeholder claim, content moves re-drift, ledger gates at its custom path", () => {
    // The fixture ships EXP-0001 with a placeholder claim — red until the lab vouches.
    expect(cli(["drift"]).status).toBe(1);
    expect(cli(["drift", "--ack"]).status).toBe(0);
    expect(cli(["drift"]).status).toBe(0);

    // Governed pipeline changes (staged) ⇒ the vouched content state moved.
    writeFileSync(
      join(root, "pipelines", "train.py"),
      'BASELINE = {"model": "lightgbm", "num_leaves": 127}\n',
    );
    g("add", "-A");
    expect(cli(["drift"]).status).toBe(1);

    // The ledger gate reads the lab's configured .govkit/ledger.json and resolves specs
    // (EXP-0001/EXP-0002) against the lab's OWN id universe.
    const ledger = cli(["ledger"]);
    expect(ledger.status).toBe(0);
    expect(ledger.stdout).toContain("2 entries");

    mutate(join(".govkit", "ledger.json"), "EXP-0002", "EXP-4040");
    const broken = cli(["ledger"]);
    expect(broken.status).toBe(1);
    expect(broken.stderr).toContain("EXP-4040");
  });
});
