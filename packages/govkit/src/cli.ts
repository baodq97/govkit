import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { runAdopt } from "./commands/adopt";
import { type AuditDecision, auditWrite, type HookInput } from "./commands/audit-write";
import { type CalibrationBaseline, parseBaseline, runCalibrate } from "./commands/calibrate";
import { runDoctor } from "./commands/doctor";
import { runDrift, runDriftAck } from "./commands/drift";
import { type EvalResult, runEval, waiverClearedArtifacts } from "./commands/eval";
import { runInit } from "./commands/init";
import { runLedger } from "./commands/ledger";
import { renderReportPrBody, runReport } from "./commands/report";
import { runStale } from "./commands/stale";
import { runVerify, type VerifyResult } from "./commands/verify";
import { type GovkitConfig, loadConfig } from "./config";
import { HELP, HELP_PAGES, isCommand } from "./help";
import { appendJournal, type JournalRecord, resolveJournalPath } from "./journal";
import {
  checkNext,
  driftNext,
  emitDecision,
  evalNext,
  nextActionLine,
  printAdopt,
  printCalibrate,
  printDoctor,
  printDrift,
  printDriftAck,
  printEval,
  printInit,
  printLedger,
  printReport,
  printStale,
  printVerify,
  verifyNext,
  writeNext,
} from "./render";
import { gitChangedDocs, gitHeadSha, resolveChangedBase } from "./util";

function readStdin(): Promise<string> {
  return new Promise((resolveStdin) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (c: Buffer) => chunks.push(c));
    process.stdin.on("end", () => resolveStdin(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolveStdin(""));
  });
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
      aging: { type: "boolean", default: false },
      "docs-root": { type: "string" },
      "check-citations": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  const command = positionals[0];

  // `--help` short-circuits BEFORE flag validation: asking a command how it works must never
  // fail because of another flag on the line. With a command it prints that command's page and
  // nothing else; bare, it prints the index. An unknown command is still an error — silently
  // showing the index would let `govkit verfiy --help` read as success.
  if (values.help) {
    if (command === undefined) {
      process.stdout.write(HELP);
      return 0;
    }
    if (isCommand(command)) {
      process.stdout.write(HELP_PAGES[command]);
      return 0;
    }
    process.stderr.write(`govkit: unknown command '${command}'\n\n${HELP}`);
    return 2;
  }

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
    { set: values.aging, flag: "--aging", allowed: ["report"] },
    { set: values.corpus !== undefined, flag: "--corpus", allowed: ["calibrate"] },
    { set: values.baseline !== undefined, flag: "--baseline", allowed: ["calibrate"] },
    { set: values["update-baseline"], flag: "--update-baseline", allowed: ["calibrate"] },
    // `verify` only, deliberately NOT `check`: `check` is the no-API-key CI gate, and a rule with
    // no calibration history may not be reachable from the command CI runs. It earns its way in
    // with evidence, not by being wired everywhere on day one.
    { set: values["check-citations"], flag: "--check-citations", allowed: ["verify"] },
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
  // The citation pass reads the governed TREE (a design tree's `model.yaml` carries most of this
  // repo's own citations), while `--changed` resolves its scope from git with an `.md`-only
  // filter. Combined, every non-markdown citing file would silently fall out of the report — the
  // "looks-checked-but-isn't" leak this whole check exists to close. Refuse loudly instead.
  if (values["check-citations"] && values.changed) {
    process.stderr.write(
      "govkit: --check-citations cannot be combined with --changed — the changed set is " +
        "resolved for `.md` docs only, so non-markdown citing files would drop out unreported\n",
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
                  // Marking, never filtering, holds all the way to the sensor: a waived finding
                  // is journalled like any other AND carries `waived: true`, so a consumer can
                  // tell a signed-for exception from the broken gate it otherwise looks like.
                  violations: parts.verify.violations.map((v) => ({
                    path: v.file,
                    kind: v.kind,
                    tier: v.tier,
                    ...(v.waivedBy !== undefined ? { waived: true as const } : {}),
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
                  // The same marker the verify entries carry, one layer up: eval journals
                  // aggregates, so the mark is the COUNT of artifacts a waiver cleared the floor
                  // for. Omitted when zero (never 0), so lines written before it stay readable.
                  // Without it `floorPassRate: 0` on an `ok: true` line is a gate failing open as
                  // far as any consumer can tell — RFC-0017's distiller would learn from an
                  // incident nobody had.
                  ...(waiverClearedArtifacts(parts.eval) > 0
                    ? { waived: waiverClearedArtifacts(parts.eval) }
                    : {}),
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
      const root = values.root ?? process.cwd();
      if (values.adopt) {
        const result = runAdopt({ root, apply: values.apply });
        printAdopt(result);
        const needHuman = result.planned.filter((p) => p.hasMissing).length;
        // Four outcomes, four different next steps — a preview, a written migration with holes,
        // a clean written migration, and nothing to do are not the same situation.
        if (result.planned.length === 0) {
          writeNext(process.stdout, "govkit verify   (nothing to migrate — run the gate)");
        } else if (!result.applied) {
          writeNext(
            process.stdout,
            `govkit init --adopt --apply   (writes the ${result.planned.length} block(s) previewed above)`,
          );
        } else if (needHuman > 0) {
          writeNext(
            process.stdout,
            `fill the \`<MISSING — fill in>\` fields in the ${needHuman} doc(s) above, then run \`govkit verify\``,
          );
        } else {
          writeNext(process.stdout, "govkit verify   (confirm the migrated docs pass the gate)");
        }
        return result.planned.some((p) => p.hasMissing) ? 1 : 0;
      }
      const result = runInit({ root, force: values.force, docsRoot: values["docs-root"] });
      printInit(result);
      // The footer is DERIVED, not written: re-survey the repo init just scaffolded and print
      // doctor's own recommendation. A repo that already had docs lands on `init --adopt`; a
      // blank one lands on authoring the first doc — and neither answer can drift from
      // `govkit doctor`, because it is literally the same function.
      writeNext(process.stdout, nextActionLine(runDoctor({ root }).next));
      return 0;
    }
    case "doctor": {
      // A map, not a gate: read-only, never throws (a broken govkit.yml is the most useful
      // thing it can report), and ALWAYS exits 0 — see the printer's closing line.
      const result = runDoctor({ root: values.root ?? process.cwd() });
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printDoctor(result);
      return 0;
    }
    case "verify": {
      const root = values.root ?? process.cwd();
      const { ok } = runGate("verify", root, (config) => {
        const result = runVerify({
          root,
          config,
          changed,
          checkCitations: values["check-citations"],
        });
        // --json keeps stdout the pure machine channel even under --hook; the human
        // report otherwise follows the hook's stderr routing.
        if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        else {
          printVerify(result, values.hook);
          // The footer follows the REPORT's stream, so a hook harness feeding stderr back to a
          // model gets the fix on the same channel as the failure. Never under --json: stdout
          // stays one machine channel.
          writeNext(
            values.hook || !result.ok ? process.stderr : process.stdout,
            verifyNext(result),
          );
        }
        return { verify: result, ok: result.ok };
      });
      return gateExit(ok);
    }
    case "eval": {
      const root = values.root ?? process.cwd();
      const { ok } = runGate("eval", root, (config) => {
        const result = runEval({ root, config, changed });
        if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        else {
          printEval(result, values.hook);
          writeNext(values.hook || !result.ok ? process.stderr : process.stdout, evalNext(result));
        }
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
        // ONE footer for the composite run — printVerify/printEval carry the remedies, but two
        // competing "Next:" lines would make an agent pick, and the failing half owns the answer.
        const ok = verify.ok && evaluation.ok;
        writeNext(
          values.hook || !ok ? process.stderr : process.stdout,
          checkNext(verify, evaluation),
        );
        return { verify, eval: evaluation, ok };
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
      const result = runReport({ root: values.root ?? process.cwd(), aging: values.aging });
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
        else {
          printDrift(result, values.hook);
          writeNext(values.hook || !result.ok ? process.stderr : process.stdout, driftNext(result));
        }
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
