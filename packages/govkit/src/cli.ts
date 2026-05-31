import { parseArgs } from "node:util";
import { type AuditDecision, auditWrite, type HookInput } from "./commands/audit-write";
import { runVerify, type VerifyResult } from "./commands/verify";

const HELP = `govkit — deterministic docs-as-code governance engine

Usage:
  govkit verify       [--root <dir>] [--json]
  govkit audit-write  [--root <dir>]        (reads a PreToolUse hook payload on stdin)

Commands:
  verify       Check every governed doc has complete front-matter (per govkit.yml).
  audit-write  PreToolUse hook gate: block a Write to a governed doc that lacks
               complete front-matter. Emits the Claude Code permissionDecision JSON.

Options:
  --root       Repo root containing govkit.yml (default: cwd, or the hook's cwd).
  --json       Machine-readable output (verify only).
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
  if (result.ok) {
    process.stdout.write(`govkit verify: OK — ${result.checked} doc(s) checked, 0 violations.\n`);
    return;
  }
  process.stderr.write(
    `govkit verify: FAIL — ${result.violations.length} doc(s) with violations:\n`,
  );
  for (const v of result.violations) {
    process.stderr.write(`  ${v.file} [${v.type}]\n`);
    for (const problem of v.problems) process.stderr.write(`    - ${problem}\n`);
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

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      root: { type: "string" },
      json: { type: "boolean", default: false },
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

  switch (command) {
    case "verify": {
      const result = runVerify({ root: values.root ?? process.cwd() });
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else printVerify(result);
      return result.ok ? 0 : 1;
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
