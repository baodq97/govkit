import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { type AdoptResult, runAdopt } from "./commands/adopt";
import { type AuditDecision, auditWrite, type HookInput } from "./commands/audit-write";
import { type CalibrateResult, type CalibrationBaseline, runCalibrate } from "./commands/calibrate";
import { type EvalResult, runEval } from "./commands/eval";
import { type InitResult, runInit } from "./commands/init";
import { type ReportResult, runReport } from "./commands/report";
import { runStale, type StaleResult } from "./commands/stale";
import { runVerify, type VerifyResult } from "./commands/verify";
import { loadConfig } from "./config";
import { appendJournal, buildJournalRecord, resolveJournalPath } from "./journal";
import { gitChangedDocs, gitHeadSha, resolveChangedBase } from "./util";

const HELP = `govkit — deterministic docs-as-code governance engine

Usage:
  govkit init         [--root <dir>] [--force] [--docs-root <dir>]
  govkit init --adopt [--root <dir>] [--apply]  (migrate existing prose metadata → front-matter)
  govkit check        [--root <dir>] [--changed [--base <ref>]] [--journal]  (verify + eval — the no-key CI gate)
  govkit verify       [--root <dir>] [--json] [--changed [--base <ref>]] [--journal]
  govkit eval         [--root <dir>] [--json] [--changed [--base <ref>]] [--journal]
  govkit calibrate    --corpus <dir> [--root <dir>] [--json] [--baseline <file> [--update-baseline]]
  govkit report       [--root <dir>] [--json]   (lifecycle histogram — done / in-flight / cleanup)
  govkit stale        [--root <dir>] [--json]   (advisory: governed code newer than its doc — needs git)
  govkit audit-write  [--root <dir>]        (reads a PreToolUse hook payload on stdin)

Commands:
  init         Scaffold govkit governance into a repo (govkit.yml, the PreToolUse
               hook, and docs/{product,rfc,adr,issues}/INDEX.md). Idempotent.
               With --adopt: instead of scaffolding, migrate EXISTING docs that lack
               front-matter — extract declared prose metadata (e.g. **Status**: X)
               into a YAML block, sentinel anything not found so it still fails the
               gate (never asserts unverified metadata), and report status values
               outside your enum as a suggested govkit.yml patch. Dry-run unless --apply.
  check        Run verify then eval — the single no-API-key gate a CI calls. Exits
               non-zero if either the structural gate or the eval floor fails.
  verify       Structural GATE: front-matter, status enum, id convention, INDEX
               sync, unique ids, no placeholders. Binary pass/fail (quality control).
  eval         Quality signal: a required structural FLOOR (blocks) + an advisory
               0–100 score against the deterministic rubric in govkit.yml.
  calibrate    The eval's own regression harness: grade a LABELED corpus (good/ must
               pass the required floor, weak/ must fail it) and report the floor's
               confusion matrix + precision/recall/f1. Exits 1 on ANY false positive
               (a good doc blocked — the zero-FP hard invariant) or, with --baseline,
               on a recall/f1 drop vs the committed baseline.
  report       Advisory lifecycle view: per-type status histogram with the ids in
               each bucket, marking which statuses are terminal (decided/shipped per
               terminalStatuses). Answers "what is done / in-flight / cleanup". Never
               blocks — read-only, always exits 0. (RFC-0008)
  stale        Advisory staleness (RFC-0009): for every doc that declares a
               'governs: [glob]' front-matter key, compare the doc's last-commit
               time against the newest commit of the code it governs and warn when
               the code moved on. A PROXY ('code changed'), never 'doc wrong' — so it
               NEVER blocks (always exits 0) and check never calls it. Needs git.
  audit-write  PreToolUse hook gate: block a Write to a governed doc that lacks
               complete front-matter. On a write that marks a doc shipped/terminal
               while it has a parent, emits a non-blocking reconciliation reminder.
               Acts on Write only — an Edit defers (its partial content can't be
               parsed), so an Edit-based status flip is caught by the CI verify gate.

Options:
  --root       Repo root containing govkit.yml (default: cwd, or the hook's cwd).
  --json       Machine-readable output (verify, eval, report, stale).
  --changed    Adoption mode (verify, eval, check): restrict to docs that are
               new-or-modified vs --base. verify still scans the whole repo for cross-doc
               checks (only the report is scoped, so a new duplicate id / dangling ref is
               still caught); eval scores only the changed docs. Requires git.
  --base       Base ref for --changed (default: origin/main, else HEAD).
  --journal    Sensor mode (verify, eval, check): append one JSON line per run to the
               journal (.govkit/journal.jsonl, or journal.path in govkit.yml). Purely
               observational — a journal write failure warns on stderr and NEVER
               changes the command's exit code.
  --corpus     (calibrate) Labeled corpus dir containing good/ and weak/ subtrees.
  --baseline   (calibrate) Baseline JSON to compare the floor matrix against.
  --update-baseline
               (calibrate) Rewrite --baseline from the current run. Refused (exit 1,
               nothing written) when the run has false positives or regressed.
  --adopt      Migration mode for init (see above). Dry-run unless --apply.
  --apply      Write the proposed front-matter to disk (init --adopt only).
  --docs-root  (init only, RFC-0007) Parent dir for kit-managed docs, e.g. .govkit —
               writes docs.root into govkit.yml and scaffolds under it. Default: current dir.
  --force      Overwrite existing files (init only).
  -h, --help   Show this help.
`;

function readStdin(): Promise<string> {
  return new Promise((resolveStdin) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (c: Buffer) => chunks.push(c));
    process.stdin.on("end", () => resolveStdin(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolveStdin(""));
  });
}

function printVerify(result: VerifyResult): void {
  // Never silently scope: when --changed narrowed the report, say so explicitly.
  const scope = result.scoped
    ? ` (changed-set vs ${result.scoped.ref}: ${result.scoped.changedDocs} doc(s); cross-doc checks scanned all ${result.checked})`
    : "";
  if (result.ok) {
    process.stdout.write(
      `govkit verify: OK — ${result.checked} doc(s) checked, 0 violations${scope}.\n`,
    );
    return;
  }
  process.stderr.write(
    `govkit verify: FAIL — ${result.violations.length} doc(s) with violations${scope}:\n`,
  );
  for (const v of result.violations) {
    process.stderr.write(`  ${v.file} [${v.type}]\n`);
    for (const problem of v.problems) process.stderr.write(`    - ${problem}\n`);
  }
}

function printEval(result: EvalResult): void {
  if (result.note) {
    process.stdout.write(`govkit eval: ${result.note}\n`);
    return;
  }
  const header = result.ok ? "OK" : "FAIL";
  const stream = result.ok ? process.stdout : process.stderr;
  const advPct = Math.round(result.advisoryPassRate * 100);
  // Never silently scope: when --changed narrowed the scored set, say so explicitly.
  const scope = result.scoped ? ` (changed-set vs ${result.scoped.ref})` : "";
  stream.write(
    `govkit eval: ${header} — ${result.scored} artifact(s)${scope}; required floor: ` +
      `${Math.round(result.floorPassRate * 100)}% passed; ` +
      `advisory score: avg ${result.averageScore}/100, ${advPct}% ≥ ${result.threshold}.\n`,
  );
  for (const a of result.artifacts) {
    if (!a.requiredOk) {
      stream.write(
        `  BLOCK ${a.score}/100  ${a.file} [${a.type}] — missing required: ${a.missedRequired.join("; ")}\n`,
      );
    } else {
      const mark = a.passedAdvisory ? "ok   " : "warn ";
      const tail = a.passedAdvisory ? "" : " (below advisory threshold)";
      stream.write(`  ${mark} ${a.score}/100  ${a.file} [${a.type}]${tail}\n`);
      if (!a.passedAdvisory) for (const m of a.missed) stream.write(`         - ${m}\n`);
    }
  }
}

// Emit the Claude Code 2.1.x PreToolUse decision. A block is exit 0 + a "deny"
// permissionDecision (NOT exit 2 — exit 2 is the emergency-stop path). A pass
// emits nothing and exits 0, deferring to the normal permission flow.
function emitDecision(decision: AuditDecision): void {
  if (decision.block) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: decision.reason ?? "govkit: blocked by governance gate",
          additionalContext: decision.context ?? "",
        },
      }),
    );
    return;
  }
  // A non-blocking reconciliation nudge (RFC-0008): inject context, do NOT set a
  // permissionDecision — the write proceeds, the author just gets the reminder.
  if (decision.remind) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: decision.remind,
        },
      }),
    );
  }
}

function printInit(result: InitResult): void {
  for (const f of result.created) process.stdout.write(`  created  ${f}\n`);
  for (const f of result.skipped) {
    process.stdout.write(`  exists   ${f} (skipped; --force to overwrite)\n`);
  }
  process.stdout.write(
    `govkit init: ${result.created.length} created, ${result.skipped.length} skipped.\n`,
  );
}

function printAdopt(result: AdoptResult): void {
  const out = process.stdout;
  // Lane 1: docs lacking front-matter, with the block adopt proposes. A "preview", not a
  // "diff" — naming it honestly (it is a prepend, shown for review), per the no-silent-scope
  // discipline the rest of the CLI holds.
  for (const p of result.planned) {
    const tail = p.hasMissing ? "  ← has NEEDS-REVIEW fields (will still fail verify)" : "";
    out.write(`\n${p.file} [${p.type}]${tail}\n`);
    for (const line of p.block.split("\n")) if (line) out.write(`  ${line}\n`);
  }
  const needHuman = result.planned.filter((p) => p.hasMissing).length;
  if (result.planned.length === 0) {
    out.write("govkit init --adopt: no docs lacking front-matter — nothing to migrate.\n");
  } else if (result.applied) {
    out.write(
      `\ngovkit init --adopt: wrote front-matter to ${result.planned.length} doc(s)` +
        (needHuman > 0 ? `; ${needHuman} still need a human to fill NEEDS-REVIEW fields.` : ".") +
        "\n",
    );
  } else {
    out.write(
      `\ngovkit init --adopt: ${result.planned.length} doc(s) would get front-matter` +
        (needHuman > 0 ? ` (${needHuman} with NEEDS-REVIEW fields)` : "") +
        " — nothing written; pass --apply to write.\n",
    );
  }
  // Boundary, stated out loud: docs that already HAVE front-matter but are missing keys are
  // out of adopt's scope — that is a human edit, not a migration.
  out.write(
    "  (docs that already have a front-matter block are left untouched, even if incomplete.)\n",
  );

  // Lane 2: vocabulary drift — a SUGGESTED govkit.yml patch, never applied.
  for (const d of result.drift) {
    out.write(
      `\ngovkit init --adopt: '${d.type}' has status value(s) outside its enum: ${d.unknown.join(", ")}\n` +
        `  suggested govkit.yml — docs.types.${d.type}.statuses: [${d.suggested.join(", ")}]\n` +
        "  (not applied — govkit.yml is your contract; edit it yourself if you agree.)\n",
    );
  }
}

function printReport(result: ReportResult): void {
  const out = process.stdout;
  out.write(`govkit report — lifecycle of ${result.total} governed doc(s)\n`);
  for (const t of result.types) {
    out.write(`\n${t.type} (${t.total})\n`);
    if (t.buckets.length === 0) {
      out.write("  (no docs)\n");
      continue;
    }
    for (const b of t.buckets) {
      // Mark decided/shipped buckets so "done" is legible at a glance; only meaningful when the
      // type opted into terminalStatuses (else every bucket is unmarked, which is honest).
      const tag = b.terminal ? " ✓ decided" : t.hasTerminal ? " · in-flight" : "";
      out.write(`  ${b.status} ×${b.count}${tag}  [${b.ids.join(", ")}]\n`);
    }
  }
  out.write(
    "\n(advisory — a presence-only view of lifecycle; it cannot judge whether prose is current. " +
      "Use it to spot superseded/rejected docs to clean up and stale work to reconcile.)\n",
  );
}

function printStale(result: StaleResult): void {
  const out = process.stdout;
  if (result.note && result.checked === 0) {
    out.write(`govkit stale: ${result.note}\n`);
    return;
  }
  const stale = result.entries.filter((e) => e.status === "stale");
  const dangling = result.entries.filter((e) => e.status === "dangling");
  const uncommitted = result.entries.filter((e) => e.status === "uncommitted");
  out.write(
    `govkit stale — ${result.checked} doc(s) declare governs: ` +
      `${stale.length} possibly stale, ${dangling.length} dangling glob, ` +
      `${result.entries.length - stale.length - dangling.length - uncommitted.length} fresh` +
      `${uncommitted.length > 0 ? `, ${uncommitted.length} uncommitted (skipped)` : ""}\n`,
  );
  for (const e of stale) {
    out.write(`  STALE  ${e.file} [${e.type}] — governed code moved since the doc's last commit\n`);
    out.write(`         governs: ${e.governs.join(", ")}\n`);
  }
  for (const e of dangling) {
    out.write(
      `  GLOB?  ${e.file} [${e.type}] — governs has no evaluable commit history ` +
        `(matches no tracked file, or only staged/uncommitted ones): ${e.governs.join(", ")}\n`,
    );
  }
  out.write(
    "\n(advisory — a PROXY: 'code moved' is not 'doc wrong' (a rename or lint fix trips it), and a " +
      "fresh result does not certify the prose is current. Never blocks. Reconcile or supersede the " +
      "flagged docs, or ignore if the change was cosmetic.)\n",
  );
}

function printCalibrate(result: CalibrateResult): void {
  const stream = result.ok ? process.stdout : process.stderr;
  const r3 = (n: number): string => n.toFixed(3).replace(/\.?0+$/, "") || "0";
  const { tp, fp, fn, tn } = result.counts;
  stream.write(
    `govkit calibrate: ${result.ok ? "OK" : "FAIL"} — floor matrix: ` +
      `tp ${tp}, fp ${fp}, fn ${fn}, tn ${tn}; ` +
      `precision ${r3(result.floor.precision)}, recall ${r3(result.floor.recall)}, ` +
      `f1 ${r3(result.floor.f1)}; advisory avg: good ${result.advisory.goodAverageScore}/100, ` +
      `weak ${result.advisory.weakAverageScore}/100.\n`,
  );
  for (const file of result.falsePositives) {
    stream.write(`  FP ${file} — good artifact blocked by the required floor (must be zero)\n`);
  }
  for (const file of result.falseNegatives) {
    stream.write(
      `  FN ${file} — weak artifact cleared the required floor (a stub the gate misses)\n`,
    );
  }
  if (result.baseline) {
    const b = result.baseline;
    const tag = b.recallRegressed || b.f1Regressed ? "REGRESSION" : "ok";
    stream.write(
      `  baseline: recall ${r3(b.floor.recall)} → ${r3(result.floor.recall)}, ` +
        `f1 ${r3(b.floor.f1)} → ${r3(result.floor.f1)} (${tag})\n`,
    );
  }
}

// Load + shape-check a calibration baseline. Malformed JSON or a missing floor block is an
// operational error (thrown as `govkit: …`) — comparing against garbage would let a
// regression pass on an undefined < undefined false.
function readBaseline(path: string): CalibrationBaseline {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`govkit: cannot read baseline ${path}: ${detail}`);
  }
  const baseline = parsed as CalibrationBaseline;
  const floor = baseline?.floor;
  if (
    typeof floor?.precision !== "number" ||
    typeof floor?.recall !== "number" ||
    typeof floor?.f1 !== "number"
  ) {
    throw new Error(
      `govkit: baseline ${path} is malformed — expected { "floor": { "precision", "recall", "f1" }, … }`,
    );
  }
  return baseline;
}

// The `--journal` sensor write. Runs AFTER printing, and NO failure in here — an escaping
// journal.path, an unwritable destination — may change the command's exit code: a broken
// sensor must never break (or un-break) the gate. One warning line, then move on.
function writeJournal(
  cmd: "verify" | "eval" | "check",
  root: string,
  durationMs: number,
  parts: { verify?: VerifyResult; eval?: EvalResult },
  ok: boolean,
): void {
  try {
    const config = loadConfig(root);
    const record = buildJournalRecord({
      cmd,
      root,
      gitSha: gitHeadSha(root),
      verify: parts.verify,
      eval: parts.eval,
      ok,
      durationMs,
    });
    appendJournal(resolveJournalPath(root, config), record);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    process.stderr.write(`govkit: journal write failed: ${detail}\n`);
  }
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      root: { type: "string" },
      json: { type: "boolean", default: false },
      changed: { type: "boolean", default: false },
      base: { type: "string" },
      journal: { type: "boolean", default: false },
      corpus: { type: "string" },
      baseline: { type: "string" },
      "update-baseline": { type: "boolean", default: false },
      adopt: { type: "boolean", default: false },
      apply: { type: "boolean", default: false },
      "docs-root": { type: "string" },
      force: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const command = positionals[0];
  if (!command) {
    process.stderr.write(HELP);
    return 1;
  }

  // `--adopt`/`--apply` are init-only (RFC-0006). Reject misuse loudly rather than silently
  // ignoring a flag the user clearly intended to do something.
  if (values.adopt && command !== "init") {
    process.stderr.write("govkit: --adopt is only valid for init\n");
    return 2;
  }
  if (values.apply && !values.adopt) {
    process.stderr.write("govkit: --apply is only valid with init --adopt\n");
    return 2;
  }
  if (values["docs-root"] !== undefined && command !== "init") {
    process.stderr.write("govkit: --docs-root is only valid for init\n");
    return 2;
  }
  // `--journal` is a sensor on the gate commands only; on anything else the user clearly
  // expected a record that would never be written — reject loudly (same guard as --changed).
  if (values.journal && command !== "verify" && command !== "eval" && command !== "check") {
    process.stderr.write("govkit: --journal is only valid for verify, eval, or check\n");
    return 2;
  }
  if (values.corpus !== undefined && command !== "calibrate") {
    process.stderr.write("govkit: --corpus is only valid for calibrate\n");
    return 2;
  }
  if (values.baseline !== undefined && command !== "calibrate") {
    process.stderr.write("govkit: --baseline is only valid for calibrate\n");
    return 2;
  }
  if (values["update-baseline"] && command !== "calibrate") {
    process.stderr.write("govkit: --update-baseline is only valid for calibrate\n");
    return 2;
  }
  if (values["update-baseline"] && values.baseline === undefined) {
    process.stderr.write("govkit: --update-baseline requires --baseline <file>\n");
    return 2;
  }

  // `--changed` adoption scoping (RFC-0004/0005): resolved ONCE here, shared by verify,
  // eval, and check. This is the only path that touches git (lazily); the un-flagged
  // commands stay pure-fs/no-key. A git/ref failure errors clearly and exits non-zero —
  // never a silent full-scan, which would re-introduce the avalanche --changed prevents.
  let changed: { files: Set<string>; ref: string } | undefined;
  if (values.changed) {
    if (command !== "verify" && command !== "eval" && command !== "check") {
      process.stderr.write("govkit: --changed is only valid for verify, eval, or check\n");
      return 2;
    }
    const root = values.root ?? process.cwd();
    try {
      const { ref, implicitFallback } = resolveChangedBase(root, values.base);
      if (implicitFallback) {
        // origin/main did not resolve and no --base was given. HEAD scopes to working-tree
        // + untracked only — on a shallow CI clone that is nothing, a silent pass. Warn loud.
        process.stderr.write(
          "govkit --changed: 'origin/main' did not resolve; falling back to HEAD " +
            "(scopes to uncommitted + untracked only). Pass --base <ref> explicitly in CI.\n",
        );
      }
      changed = { files: gitChangedDocs(root, ref), ref };
    } catch (err) {
      process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
      return 1;
    }
  }

  switch (command) {
    case "init": {
      // --adopt switches init from greenfield scaffolding to migrating an EXISTING corpus
      // (RFC-0006). The two modes do not mix: adopt never scaffolds, --force is init-only,
      // --apply is adopt-only. Dry-run unless --apply, and the exit code reflects whether any
      // migrated doc would still fail the gate (a missing-field sentinel) so CI can't mistake
      // a preview for a clean migration.
      if (values.adopt) {
        const result = runAdopt({ root: values.root ?? process.cwd(), apply: values.apply });
        printAdopt(result);
        return result.planned.some((p) => p.hasMissing) ? 1 : 0;
      }
      const result = runInit({
        root: values.root ?? process.cwd(),
        force: values.force,
        docsRoot: values["docs-root"],
      });
      printInit(result);
      return 0;
    }
    case "verify": {
      const root = values.root ?? process.cwd();
      const started = Date.now();
      const result = runVerify({ root, changed });
      const durationMs = Date.now() - started;
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printVerify(result);
      if (values.journal) writeJournal("verify", root, durationMs, { verify: result }, result.ok);
      return result.ok ? 0 : 1;
    }
    case "eval": {
      const root = values.root ?? process.cwd();
      const started = Date.now();
      const result = runEval({ root, changed });
      const durationMs = Date.now() - started;
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printEval(result);
      if (values.journal) writeJournal("eval", root, durationMs, { eval: result }, result.ok);
      return result.ok ? 0 : 1;
    }
    case "check": {
      // The single no-API-key gate a CI invokes: structural gate THEN quality floor.
      // Both run regardless of the other's result, so one pass surfaces every failure.
      // --changed threads into BOTH halves so the whole entrypoint is adoptable (RFC-0005).
      const root = values.root ?? process.cwd();
      const started = Date.now();
      const verify = runVerify({ root, changed });
      const evaluation = runEval({ root, changed });
      const durationMs = Date.now() - started;
      printVerify(verify);
      printEval(evaluation);
      const ok = verify.ok && evaluation.ok;
      if (values.journal) {
        writeJournal("check", root, durationMs, { verify, eval: evaluation }, ok);
      }
      return ok ? 0 : 1;
    }
    case "calibrate": {
      // The eval's regression harness. All file I/O (baseline read/write) stays here so
      // runCalibrate remains pure like the other commands.
      if (!values.corpus) {
        process.stderr.write(
          "govkit: calibrate requires --corpus <dir> — a labeled corpus containing good/ and weak/\n" +
            "  usage: govkit calibrate --corpus <dir> [--root <dir>] [--json] " +
            "[--baseline <file> [--update-baseline]]\n",
        );
        return 2;
      }
      const root = values.root ?? process.cwd();
      const baseline =
        values.baseline && existsSync(values.baseline) ? readBaseline(values.baseline) : undefined;
      const result = runCalibrate({ corpus: values.corpus, config: loadConfig(root), baseline });
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printCalibrate(result);
      if (values["update-baseline"]) {
        // Refuse to lower the bar in the same breath as a regression: a run with any FP or
        // a recall/f1 drop cannot become the new baseline. Better-or-equal is the normal path.
        if (!result.ok) {
          process.stderr.write(
            "govkit calibrate: refusing to update baseline — the current run has false " +
              "positives or a floor regression; nothing written.\n",
          );
          return 1;
        }
        const next: CalibrationBaseline = {
          floor: result.floor,
          counts: result.counts,
          advisory: result.advisory,
        };
        writeFileSync(values.baseline as string, `${JSON.stringify(next, null, 2)}\n`, "utf8");
        process.stdout.write(`govkit calibrate: baseline updated → ${values.baseline}\n`);
      }
      return result.ok ? 0 : 1;
    }
    case "report": {
      // Advisory lifecycle view (RFC-0008). Read-only, no exit-code effect: a report that
      // could fail CI would tempt someone to gate on advisory output, the exact thing the
      // gate/eval split exists to prevent.
      const result = runReport({ root: values.root ?? process.cwd() });
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printReport(result);
      return 0;
    }
    case "stale": {
      // Advisory staleness (RFC-0009). Read-only, ALWAYS exits 0 — gating on a recency proxy is
      // exactly what the gate/eval split forbids. Touches git (like --changed), so it lives
      // outside the no-key floor; `check` never calls it.
      const result = runStale({ root: values.root ?? process.cwd() });
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printStale(result);
      return 0;
    }
    case "audit-write": {
      // Robust by construction: any failure DEFERS (no output, exit 0) rather
      // than crash-blocking the user's write.
      let decision: AuditDecision = { block: false };
      try {
        const input = JSON.parse(await readStdin()) as HookInput;
        decision = auditWrite(input, values.root ?? input.cwd ?? process.cwd());
      } catch {
        decision = { block: false };
      }
      emitDecision(decision);
      return 0;
    }
    default:
      process.stderr.write(`govkit: unknown command '${command}'\n\n${HELP}`);
      return 2;
  }
}

// Top-level handler (US-0003): an expected operational failure — a missing/unreadable
// govkit.yml, malformed config — is thrown by loadConfig and friends, NOT returned. Without
// this catch the rejected promise dumps a Node/bun stack trace, burying an already-actionable
// message ("run `govkit init` first"). Print one clean line to stderr and exit non-zero; the
// full stack stays available behind GOVKIT_DEBUG for diagnosing a genuinely unexpected error.
main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message.startsWith("govkit:") ? message : `govkit: ${message}`}\n`);
    if (process.env.GOVKIT_DEBUG && err instanceof Error && err.stack) {
      process.stderr.write(`${err.stack}\n`);
    }
    process.exit(1);
  });
