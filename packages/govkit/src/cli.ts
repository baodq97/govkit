import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { type AdoptResult, runAdopt } from "./commands/adopt";
import { type AuditDecision, auditWrite, type HookInput } from "./commands/audit-write";
import {
  type CalibrateResult,
  type CalibrationBaseline,
  parseBaseline,
  runCalibrate,
} from "./commands/calibrate";
import { type DriftAckResult, type DriftResult, runDrift, runDriftAck } from "./commands/drift";
import { type EvalResult, runEval } from "./commands/eval";
import { type InitResult, runInit } from "./commands/init";
import { type LedgerResult, runLedger } from "./commands/ledger";
import { type ReportResult, renderReportPrBody, runReport } from "./commands/report";
import { runStale, type StaleResult } from "./commands/stale";
import { runVerify, type VerifyResult } from "./commands/verify";
import { type GovkitConfig, loadConfig } from "./config";
import { appendJournal, type JournalRecord, resolveJournalPath } from "./journal";
import { gitChangedDocs, gitHeadSha, resolveChangedBase } from "./util";

const HELP = `govkit — deterministic docs-as-code governance engine

Usage:
  govkit init         [--root <dir>] [--force] [--docs-root <dir>]
  govkit init --adopt [--root <dir>] [--apply]  (migrate existing prose metadata → front-matter)
  govkit check        [--root <dir>] [--changed [--base <ref>]] [--journal] [--hook]  (verify + eval — the no-key CI gate)
  govkit verify       [--root <dir>] [--json] [--changed [--base <ref>]] [--journal] [--hook]
  govkit eval         [--root <dir>] [--json] [--changed [--base <ref>]] [--journal] [--hook]
  govkit calibrate    --corpus <dir> [--root <dir>] [--json] [--baseline <file> [--update-baseline]]
  govkit report       [--root <dir>] [--json | --pr-body]   (lifecycle histogram — done / in-flight / cleanup)
  govkit stale        [--root <dir>] [--json]   (advisory: governed code newer than its doc — needs git)
  govkit drift        [--root <dir>] [--json] [--journal] [--hook]  (gate: reconciled content hash vs governed code — needs git)
  govkit drift --ack [docPath] [--root <dir>] [--json] [--journal]  (rewrite 'reconciled:' to the current governed content hash)
  govkit ledger       [--root <dir>] [--json] [--journal] [--hook]  (gate: the committed feature ledger — needs git)
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
               blocks — read-only, always exits 0. (RFC-0008) With --pr-body: the same
               view as GitHub markdown fenced by stable HTML comment markers, for
               idempotent replace-not-append injection into a PR body. (RFC-0021)
  stale        Advisory staleness (RFC-0009): for every doc that declares a
               'governs: [glob]' front-matter key, compare the doc's last-commit
               time against the newest commit of the code it governs and warn when
               the code moved on. A PROXY ('code changed'), never 'doc wrong' — so it
               NEVER blocks (always exits 0) and check never calls it. Needs git.
  drift        Deterministic spec↔code GATE (RFC-0015, as amended): a doc opts in by
               carrying BOTH 'governs:' and 'reconciled: sha256:<hex>' (the author's
               recorded claim "this doc is true as of this content state" — a hash over
               the governed files' git blob OIDs, stable across squash/rebase); it fails
               (exit 1) when the governed content no longer matches that claim. The honest
               exits are updating the doc or an explicit --ack — the gate never acks
               itself. Every governed doc (opted in or not) is also checked per-pathspec
               for governs existence (RFC-0018): a spec matching no tracked file is a
               violation naming it — ghost paths silently shrink drift/stale coverage.
               Git absent degrades to a note + exit 0; check never calls it.
  ledger       Feature-ledger GATE (RFC-0016): gates the committed JSON ledger
               ({ entries: [{ id, title, spec, passes, check? }] }, docs/ledger.json or
               ledger.path) — parse/schema, unique ids, every spec resolves to a governed
               doc id, and append-only vs the committed HEAD version (a removed entry or
               removed check provenance is a violation; 'passes' flips both ways are
               legal). The N/M passing summary is advisory and never affects the exit.
  audit-write  PreToolUse hook gate: block a Write to a governed doc that lacks
               complete front-matter. On a write that marks a doc shipped/terminal
               while it has a parent, emits a non-blocking reconciliation reminder.
               Acts on Write only — an Edit defers (its partial content can't be
               parsed), so an Edit-based status flip is caught by the CI verify gate.

Options:
  --root       Repo root containing govkit.yml (default: cwd, or the hook's cwd).
  --json       Machine-readable output (verify, eval, report, stale, drift, ledger).
  --pr-body    (report) Emit the lifecycle view as a markdown block fenced by
               <!-- govkit:report:begin/end --> markers, deterministic on unchanged state
               (sorted, timestamp-free) so an injector splices with zero diff noise. govkit
               only emits — writing it into a PR body is the caller's job (gh pr edit).
               Mutually exclusive with --json.
  --changed    Adoption mode (verify, eval, check): restrict to docs that are
               new-or-modified vs --base. verify still scans the whole repo for cross-doc
               checks (only the report is scoped, so a new duplicate id / dangling ref is
               still caught); eval scores only the changed docs. Requires git.
  --base       Base ref for --changed (default: origin/main, else HEAD).
  --journal    Sensor mode (verify, eval, check, drift, ledger): append one JSON line per
               run to the journal (.govkit/journal.jsonl, or journal.path in govkit.yml).
               Purely observational — a journal write failure warns on stderr and NEVER
               changes the command's exit code.
  --hook       Blocking-hook mode (verify, eval, check, drift, ledger — check-mode runs
               only, never drift --ack): map gate failure to exit 2 + report on stderr —
               wire as a blocking hook. Fail-closed: an operational error (broken config)
               also exits 2, so a broken guardrail blocks.
  --ack        (drift) Reconcile: rewrite 'reconciled:' to the current governed content
               hash for the doc named by the positional path after the command, or for
               ALL opted-in docs when no path is given. Runs the drift check first and
               writes only where drifted (a no-op ack says so); the rewrite is surgical —
               only the claim value changes, every other byte (a trailing comment
               included) is preserved for the reviewed diff. Combines with --journal (the
               record is marked ack: true) but never with --hook — hooks gate, they don't ack.
  --corpus     (calibrate) Labeled corpus dir containing good/ and weak/ subtrees.
  --baseline   (calibrate) Baseline JSON to compare the floor matrix against. A missing
               file is an error unless --update-baseline creates it (bootstrap).
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

function printVerify(result: VerifyResult, toStderr = false): void {
  // Never silently scope: when --changed narrowed the report, say so explicitly.
  const scope = result.scoped
    ? ` (changed-set vs ${result.scoped.ref}: ${result.scoped.changedDocs} doc(s); cross-doc checks scanned all ${result.checked})`
    : "";
  // Advisory-tier violations (RFC-0014) never flip the OK/FAIL header, but they are never
  // silent either: they get their own summary count and a `warn` prefix per entry.
  const advisories = result.violations.filter((v) => v.tier === "advisory").length;
  const blocking = result.violations.length - advisories;
  const advTail = advisories > 0 ? `, ${advisories} advisor${advisories === 1 ? "y" : "ies"}` : "";
  // --hook routes the whole human report to stderr — the channel a blocking-hook harness
  // feeds back to the model; otherwise OK → stdout, FAIL → stderr as before.
  const stream = toStderr || !result.ok ? process.stderr : process.stdout;
  if (result.ok) {
    stream.write(
      `govkit verify: OK — ${result.checked} doc(s) checked, 0 violations${advTail}${scope}.\n`,
    );
  } else {
    stream.write(`govkit verify: FAIL — ${blocking} doc(s) with violations${advTail}${scope}:\n`);
  }
  for (const v of result.violations) {
    stream.write(`  ${v.tier === "advisory" ? "warn " : ""}${v.file} [${v.type}]\n`);
    for (const problem of v.problems) stream.write(`    - ${problem}\n`);
  }
}

function printEval(result: EvalResult, toStderr = false): void {
  if (result.note) {
    (toStderr ? process.stderr : process.stdout).write(`govkit eval: ${result.note}\n`);
    return;
  }
  const header = result.ok ? "OK" : "FAIL";
  // Same --hook stderr routing as printVerify — the report is model feedback under a hook.
  const stream = toStderr || !result.ok ? process.stderr : process.stdout;
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

function printDrift(result: DriftResult, toStderr = false): void {
  // Nothing evaluable (git absent, or no doc opted in) → one honest note, exit stays 0.
  if (result.note) {
    (toStderr ? process.stderr : process.stdout).write(`govkit drift: ${result.note}\n`);
    return;
  }
  // Same --hook stderr routing as printVerify — the report is model feedback under a hook.
  const stream = toStderr || !result.ok ? process.stderr : process.stdout;
  const skipTail =
    result.skipped > 0
      ? ` (${result.skipped} governs-only doc(s) outside the claim check — existence-checked only)`
      : "";
  if (result.ok) {
    stream.write(
      `govkit drift: OK — ${result.checked} opted-in doc(s) in sync with their governed code${skipTail}.\n`,
    );
    return;
  }
  // `drifted` may include governs-only docs failing the RFC-0018 existence check, so the
  // header counts GOVERNED docs in violation — never "N of M opted-in" with N > M.
  stream.write(
    `govkit drift: FAIL — ${result.drifted.length} governed doc(s) in violation (${result.checked} opted into the claim check)${skipTail}:\n`,
  );
  for (const e of result.drifted) {
    stream.write(`  DRIFT  ${e.path} [${e.type}] — ${e.problem}\n`);
    stream.write(`         governs: ${e.governs.join(", ")}\n`);
  }
  stream.write(
    "\n(the two honest exits: update the doc, then `govkit drift --ack <doc>` — or ack directly " +
      "if the code change did not invalidate it. The gate never acks itself.)\n",
  );
}

function printDriftAck(result: DriftAckResult, toStderr = false): void {
  const stream = toStderr || !result.ok ? process.stderr : process.stdout;
  if (result.note) {
    stream.write(`govkit drift --ack: ${result.note}\n`);
    return;
  }
  for (const a of result.acked) {
    stream.write(`  acked  ${a.path}  ${a.from === "" ? "(empty)" : a.from} → ${a.to}\n`);
  }
  for (const u of result.upToDate) {
    stream.write(`  ok     ${u.path} — already reconciled at ${u.reconciled} (nothing written)\n`);
  }
  for (const u of result.unackable) stream.write(`  CANNOT ${u.path} — ${u.problem}\n`);
  const tail =
    result.unackable.length > 0 ? `, ${result.unackable.length} NOT ackable (still red)` : "";
  stream.write(
    `govkit drift --ack: ${result.acked.length} doc(s) reconciled, ` +
      `${result.upToDate.length} already in sync${tail}.\n`,
  );
}

function printLedger(result: LedgerResult, toStderr = false): void {
  const stream = toStderr || !result.ok ? process.stderr : process.stdout;
  const n = result.entries;
  // The N/M passing summary is ADVISORY (RFC-0016): integrity gates, completeness informs —
  // it is printed on both verdicts and never moves the exit code.
  const summary = `${result.passing}/${n} passing`;
  if (result.ok) {
    stream.write(
      `govkit ledger: OK — ${n} entr${n === 1 ? "y" : "ies"}, ${summary} (advisory), 0 violations.\n`,
    );
    return;
  }
  stream.write(
    `govkit ledger: FAIL — ${result.violations.length} violation(s), ${summary} (advisory):\n`,
  );
  for (const v of result.violations) stream.write(`  ${v.kind}  ${v.message}\n`);
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
    const tag = b.recallRegressed || b.f1Regressed || b.corpusShrunk ? "REGRESSION" : "ok";
    stream.write(
      `  baseline: recall ${r3(b.floor.recall)} → ${r3(result.floor.recall)}, ` +
        `f1 ${r3(b.floor.f1)} → ${r3(result.floor.f1)} (${tag})\n`,
    );
    if (b.corpusShrunk) {
      stream.write(
        "  baseline: corpus coverage SHRANK — fewer graded docs than the committed counts pin; " +
          "restore the fixtures, or deliberately re-pin with --update-baseline\n",
      );
    }
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
      hook: { type: "boolean", default: false },
      corpus: { type: "string" },
      baseline: { type: "string" },
      "update-baseline": { type: "boolean", default: false },
      adopt: { type: "boolean", default: false },
      apply: { type: "boolean", default: false },
      // `--ack` is a boolean + an optional POSITIONAL doc path after the command
      // (`govkit drift --ack [docPath]`) — parseArgs has no "string with optional value",
      // and a positional keeps `--ack` alone meaning "all opted-in docs" unambiguous.
      ack: { type: "boolean", default: false },
      "pr-body": { type: "boolean", default: false },
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

  // Command-scoped flags, ONE table: a flag set on a command outside its allowlist is
  // rejected loudly rather than silently ignored — the user clearly intended it to do
  // something. The emitted wording ("only valid for a, b, or c") is pinned by cli tests,
  // so the message is derived, not hand-written per guard. `--changed` is deliberately
  // LAST so multi-misuse precedence matches the historical guard order.
  const gateCommands = ["verify", "eval", "check"];
  // drift + ledger (RFC-0015/0016) are gates too — they join the sensor/hook flags but NOT
  // `--changed` (their scope question is deferred; see RFC-0015 open questions).
  const sensorCommands = [...gateCommands, "drift", "ledger"];
  const scopedFlags: Array<{ set: boolean; flag: string; allowed: string[] }> = [
    { set: values.adopt, flag: "--adopt", allowed: ["init"] },
    { set: values["docs-root"] !== undefined, flag: "--docs-root", allowed: ["init"] },
    { set: values.journal, flag: "--journal", allowed: sensorCommands },
    { set: values.hook, flag: "--hook", allowed: sensorCommands },
    { set: values.ack, flag: "--ack", allowed: ["drift"] },
    { set: values["pr-body"], flag: "--pr-body", allowed: ["report"] },
    { set: values.corpus !== undefined, flag: "--corpus", allowed: ["calibrate"] },
    { set: values.baseline !== undefined, flag: "--baseline", allowed: ["calibrate"] },
    { set: values["update-baseline"], flag: "--update-baseline", allowed: ["calibrate"] },
    { set: values.changed, flag: "--changed", allowed: gateCommands },
  ];
  for (const { set, flag, allowed } of scopedFlags) {
    if (!set || allowed.includes(command)) continue;
    const where =
      allowed.length === 1
        ? allowed[0]
        : `${allowed.slice(0, -1).join(", ")}, or ${allowed.at(-1)}`;
    process.stderr.write(`govkit: ${flag} is only valid for ${where}\n`);
    return 2;
  }
  // The two flag-to-flag couplings sit outside the command table: they constrain a flag
  // against ANOTHER flag, not against the command.
  if (values.apply && !values.adopt) {
    process.stderr.write("govkit: --apply is only valid with init --adopt\n");
    return 2;
  }
  if (values["update-baseline"] && values.baseline === undefined) {
    process.stderr.write("govkit: --update-baseline requires --baseline <file>\n");
    return 2;
  }
  // Two machine channels on one stdout would be ambiguous (RFC-0021): the fenced markdown
  // block and the JSON payload are each consumed whole by their caller.
  if (values["pr-body"] && values.json) {
    process.stderr.write(
      "govkit: --pr-body cannot be combined with --json — one stdout, one machine channel\n",
    );
    return 2;
  }
  // An ack REWRITES docs; a blocking hook must never mutate — hooks gate, they don't ack.
  if (values.ack && values.hook) {
    process.stderr.write(
      "govkit: --ack cannot be combined with --hook — an ack rewrites docs, and a blocking hook must never mutate\n",
    );
    return 2;
  }

  // `--changed` adoption scoping (RFC-0004/0005): resolved ONCE here, shared by verify,
  // eval, and check. This is the only path that touches git (lazily); the un-flagged
  // commands stay pure-fs/no-key. A git/ref failure errors clearly and exits non-zero —
  // never a silent full-scan, which would re-introduce the avalanche --changed prevents.
  let changed: { files: Set<string>; ref: string } | undefined;
  if (values.changed) {
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
      // A would-be exit 1; under --hook it must fail CLOSED (a guardrail that cannot
      // resolve its scope blocks) — same mapping as gateExit / the top-level catch.
      return values.hook ? 2 : 1;
    }
  }

  // --hook exit-code contract (RFC-0013): a blocking-hook harness treats exit 2 as "block
  // and feed stderr back"; exit 1 is merely "non-blocking error". So under --hook every
  // would-be gate failure (exit 1) maps to exit 2. Success stays 0. The run itself is
  // identical — only this edge and the stderr routing in printVerify/printEval change.
  const gateExit = (ok: boolean): number => (ok ? 0 : values.hook ? 2 : 1);

  // The ONE gate wiring shared by the verify/eval/check arms: load the config ONCE (fed to
  // the core run AND the journal path — never a second loadConfig), time the run, and with
  // --journal append exactly one record even when the run THROWS — an error path with no
  // journal line blinds the sensor precisely when the gate fails hardest. The journal stays
  // purely observational: it is written AFTER the case printed its report, an append failure
  // warns without touching the exit code, and a thrown run records ok:false + the error's
  // first line before rethrowing to the top-level handler (exit code unchanged).
  type GateParts = {
    verify?: VerifyResult;
    eval?: EvalResult;
    // drift/ledger (RFC-0015/0016) record pre-summarized counts — their full results carry
    // absolute paths and per-entry prose the sensor does not need. `ack: true` marks a
    // rewrite run, where drifted > 0 with ok: true is legal (see journal.ts).
    drift?: { checked: number; drifted: number; skipped: number; ack?: true };
    ledger?: { entries: number; passing: number; violations: number };
    ok: boolean;
  };
  const runGate = (
    cmd: "verify" | "eval" | "check" | "drift" | "ledger",
    root: string,
    run: (config: GovkitConfig) => GateParts,
  ): GateParts => {
    const started = Date.now();
    const journal = (config: GovkitConfig | undefined, parts: GateParts, error?: string): void => {
      if (!values.journal) return;
      try {
        const gitSha = gitHeadSha(root);
        const record: JournalRecord = {
          at: new Date().toISOString(),
          cmd,
          root,
          ...(gitSha ? { gitSha } : {}),
          ...(changed ? { changed: changed.ref } : {}),
          ...(parts.verify
            ? {
                verify: {
                  docs: parts.verify.checked,
                  violations: parts.verify.violations.map((v) => ({
                    path: v.file,
                    kind: v.kind,
                    tier: v.tier,
                  })),
                },
              }
            : {}),
          ...(parts.eval
            ? {
                eval: {
                  artifacts: parts.eval.scored,
                  floorPassRate: parts.eval.floorPassRate,
                  advisoryPassRate: parts.eval.advisoryPassRate,
                  averageScore: parts.eval.averageScore,
                },
              }
            : {}),
          ...(parts.drift ? { drift: parts.drift } : {}),
          ...(parts.ledger ? { ledger: parts.ledger } : {}),
          ok: parts.ok,
          ...(error ? { error } : {}),
          durationMs: Date.now() - started,
        };
        // A config that failed to load cannot name a journal.path override, so the record
        // of THAT failure goes to the default location — better a line in the default
        // journal than a sensor that goes dark exactly when the config broke.
        const journalConfig = config ?? {
          schemaVersion: 1,
          docs: { ignore: [], base: { required: [] }, types: {} },
        };
        appendJournal(resolveJournalPath(root, journalConfig), record);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        process.stderr.write(`govkit: journal write failed: ${detail}\n`);
      }
    };
    let config: GovkitConfig | undefined;
    try {
      config = loadConfig(root);
      const parts = run(config);
      journal(config, parts);
      return parts;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      journal(config, { ok: false }, message.split("\n", 1)[0] ?? message);
      throw err;
    }
  };

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
      const { ok } = runGate("verify", root, (config) => {
        const result = runVerify({ root, config, changed });
        // --json keeps stdout the pure machine channel even under --hook; the human
        // report otherwise follows the hook's stderr routing.
        if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        else printVerify(result, values.hook);
        return { verify: result, ok: result.ok };
      });
      return gateExit(ok);
    }
    case "eval": {
      const root = values.root ?? process.cwd();
      const { ok } = runGate("eval", root, (config) => {
        const result = runEval({ root, config, changed });
        if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        else printEval(result, values.hook);
        return { eval: result, ok: result.ok };
      });
      return gateExit(ok);
    }
    case "check": {
      // The single no-API-key gate a CI invokes: structural gate THEN quality floor.
      // Both run regardless of the other's result, so one pass surfaces every failure.
      // --changed threads into BOTH halves so the whole entrypoint is adoptable (RFC-0005).
      const root = values.root ?? process.cwd();
      const { ok } = runGate("check", root, (config) => {
        const verify = runVerify({ root, config, changed });
        // Report the structural verdict the moment it exists: a runEval that throws must
        // never suppress an already-computed verify FAIL report.
        printVerify(verify, values.hook);
        const evaluation = runEval({ root, config, changed });
        printEval(evaluation, values.hook);
        return { verify, eval: evaluation, ok: verify.ok && evaluation.ok };
      });
      return gateExit(ok);
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
      // A named baseline that does not exist is a hard operational error, never a silent
      // fresh-run: failing open here lets CI "compare" against nothing forever. The one
      // legitimate absence is bootstrap, which the user declares with --update-baseline.
      let baseline: CalibrationBaseline | undefined;
      if (values.baseline) {
        if (existsSync(values.baseline)) {
          baseline = parseBaseline(readFileSync(values.baseline, "utf8"), values.baseline);
        } else if (!values["update-baseline"]) {
          throw new Error(
            `govkit: baseline file not found: ${values.baseline} — pass --update-baseline to create it`,
          );
        }
      }
      const result = runCalibrate({ corpus: values.corpus, config: loadConfig(root), baseline });
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printCalibrate(result);
      if (values["update-baseline"]) {
        // Refuse to lower the bar in the same breath as a regression: a run with any FP or
        // a recall/f1 drop cannot become the new baseline. A SHRUNK corpus may be re-pinned,
        // though — that rewrite is a deliberate act recorded in the git diff for review.
        const regressed = result.baseline?.recallRegressed || result.baseline?.f1Regressed;
        if (result.counts.fp > 0 || regressed) {
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
        // stderr, like the journal warning, so `--json` stdout stays pure JSON.
        process.stderr.write(`govkit calibrate: baseline updated → ${values.baseline}\n`);
        return 0;
      }
      return result.ok ? 0 : 1;
    }
    case "report": {
      // Advisory lifecycle view (RFC-0008). Read-only, no exit-code effect: a report that
      // could fail CI would tempt someone to gate on advisory output, the exact thing the
      // gate/eval split exists to prevent.
      const result = runReport({ root: values.root ?? process.cwd() });
      // --pr-body (RFC-0021) is a rendering choice over the same ReportResult, not a gate:
      // stdout gets the marker-fenced block; splicing it into a PR body is the caller's job.
      if (values["pr-body"]) process.stdout.write(renderReportPrBody(result));
      else if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
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
    case "drift": {
      // The deterministic spec↔code gate (RFC-0015): stale's git-gated sibling that CAN fail —
      // it checks a recorded `reconciled:` claim, not a recency proxy. Outside the no-key
      // floor by construction (`check` never calls it); git absent degrades inside runDrift
      // to a note + ok:true, so the exit stays 0 without a special case here.
      const root = values.root ?? process.cwd();
      const docPath = positionals[1];
      if (docPath !== undefined && !values.ack) {
        // A stray positional is a mistyped ack, not noise — reject loudly like the scope table.
        process.stderr.write("govkit: a doc path after 'drift' is only valid with --ack\n");
        return 2;
      }
      const { ok } = runGate("drift", root, (config) => {
        if (values.ack) {
          // The ack ritual: runs the same drift computation, then rewrites `reconciled:`
          // where drifted. Journaled like a gate run — the record captures what drift SAW
          // (pre-ack counts) with ok = "nothing left unackable", marked `ack: true` so a
          // sensor consumer never mistakes it for a check run (drifted > 0 with ok: true
          // would corrupt the drifted⇔ok reading otherwise). --hook was rejected above:
          // an ack mutates docs, which a blocking hook must never do.
          const result = runDriftAck({ root, config, docPath });
          if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
          else printDriftAck(result);
          const c = result.check;
          return {
            drift: { checked: c.checked, drifted: c.drifted.length, skipped: c.skipped, ack: true },
            ok: result.ok,
          };
        }
        const result = runDrift({ root, config });
        if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        else printDrift(result, values.hook);
        return {
          drift: {
            checked: result.checked,
            drifted: result.drifted.length,
            skipped: result.skipped,
          },
          ok: result.ok,
        };
      });
      return gateExit(ok);
    }
    case "ledger": {
      // The feature-ledger gate (RFC-0016). A missing/malformed ledger THROWS the operational
      // error inside runGate (journaled ok:false, exit 1 / hook 2 via the top-level catch) —
      // an opt-in gate pointed at nothing must never pass silently.
      const root = values.root ?? process.cwd();
      const { ok } = runGate("ledger", root, (config) => {
        const result = runLedger({ root, config });
        // The skipped append-only layer surfaces on stderr in BOTH output modes — under
        // --json it is also a field, but a degraded check must never be silent.
        if (result.headNote) process.stderr.write(`govkit ledger: note — ${result.headNote}\n`);
        if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        else printLedger(result, values.hook);
        return {
          ledger: {
            entries: result.entries,
            passing: result.passing,
            violations: result.violations.length,
          },
          ok: result.ok,
        };
      });
      return gateExit(ok);
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
    // --hook fail-closed (RFC-0013): an operational error IS a broken guardrail, so under
    // --hook it must block (exit 2) like a gate failure — never a quiet non-blocking 1.
    // A raw argv scan, not parseArgs' values: this catch also fires when main threw before
    // (or during) parsing, so the parsed flags may not exist. Cheap and honest — the only
    // miss is `--hook` appearing as another flag's VALUE, which no gate flag accepts.
    process.exit(process.argv.includes("--hook") ? 2 : 1);
  });
