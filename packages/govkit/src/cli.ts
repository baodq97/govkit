import { parseArgs } from "node:util";
import { type AuditDecision, auditWrite, type HookInput } from "./commands/audit-write";
import { type EvalResult, runEval } from "./commands/eval";
import { type InitResult, runInit } from "./commands/init";
import { runVerify, type VerifyResult } from "./commands/verify";
import { gitChangedDocs, resolveChangedBase } from "./util";

const HELP = `govkit — deterministic docs-as-code governance engine

Usage:
  govkit init         [--root <dir>] [--force]
  govkit check        [--root <dir>] [--changed [--base <ref>]]  (verify + eval — the no-key CI gate)
  govkit verify       [--root <dir>] [--json] [--changed [--base <ref>]]
  govkit eval         [--root <dir>] [--json] [--changed [--base <ref>]]
  govkit audit-write  [--root <dir>]        (reads a PreToolUse hook payload on stdin)

Commands:
  init         Scaffold govkit governance into a repo (govkit.yml, the PreToolUse
               hook, and docs/{product,rfc,adr,issues}/INDEX.md). Idempotent.
  check        Run verify then eval — the single no-API-key gate a CI calls. Exits
               non-zero if either the structural gate or the eval floor fails.
  verify       Structural GATE: front-matter, status enum, id convention, INDEX
               sync, unique ids, no placeholders. Binary pass/fail (quality control).
  eval         Quality signal: a required structural FLOOR (blocks) + an advisory
               0–100 score against the deterministic rubric in govkit.yml.
  audit-write  PreToolUse hook gate: block a Write to a governed doc that lacks
               complete front-matter. Emits the Claude Code permissionDecision JSON.

Options:
  --root       Repo root containing govkit.yml (default: cwd, or the hook's cwd).
  --json       Machine-readable output (verify only).
  --changed    Adoption mode (verify, eval, check): restrict to docs that are
               new-or-modified vs --base. verify still scans the whole repo for cross-doc
               checks (only the report is scoped, so a new duplicate id / dangling ref is
               still caught); eval scores only the changed docs. Requires git.
  --base       Base ref for --changed (default: origin/main, else HEAD).
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
  if (!decision.block) return;
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

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      root: { type: "string" },
      json: { type: "boolean", default: false },
      changed: { type: "boolean", default: false },
      base: { type: "string" },
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
      const result = runInit({ root: values.root ?? process.cwd(), force: values.force });
      printInit(result);
      return 0;
    }
    case "verify": {
      const result = runVerify({ root: values.root ?? process.cwd(), changed });
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printVerify(result);
      return result.ok ? 0 : 1;
    }
    case "eval": {
      const result = runEval({ root: values.root ?? process.cwd(), changed });
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printEval(result);
      return result.ok ? 0 : 1;
    }
    case "check": {
      // The single no-API-key gate a CI invokes: structural gate THEN quality floor.
      // Both run regardless of the other's result, so one pass surfaces every failure.
      // --changed threads into BOTH halves so the whole entrypoint is adoptable (RFC-0005).
      const root = values.root ?? process.cwd();
      const verify = runVerify({ root, changed });
      printVerify(verify);
      const evaluation = runEval({ root, changed });
      printEval(evaluation);
      return verify.ok && evaluation.ok ? 0 : 1;
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

main(process.argv.slice(2)).then((code) => process.exit(code));
