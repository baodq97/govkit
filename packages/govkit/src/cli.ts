import { parseArgs } from "node:util";
import { runVerify, type VerifyResult } from "./commands/verify";

const HELP = `govkit — deterministic docs-as-code governance engine

Usage:
  govkit verify [--root <dir>] [--json]

Commands:
  verify     Check every governed doc has complete front-matter (per govkit.yml).

Options:
  --root     Repo root containing govkit.yml (default: cwd).
  --json     Machine-readable output.
  -h, --help Show this help.
`;

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

function main(argv: string[]): number {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      root: { type: "string", default: process.cwd() },
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
      if (values.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        printVerify(result);
      }
      return result.ok ? 0 : 1;
    }
    default:
      process.stderr.write(`govkit: unknown command '${command}'\n\n${HELP}`);
      return 2;
  }
}

process.exit(main(process.argv.slice(2)));
