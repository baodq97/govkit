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
import { type DoctorResult, type NextAction, runDoctor } from "./commands/doctor";
import { type DriftAckResult, type DriftResult, runDrift, runDriftAck } from "./commands/drift";
import {
  type ArtifactScore,
  type EvalResult,
  evalFloorLine,
  runEval,
  waiverClearedArtifacts,
} from "./commands/eval";
import { type InitResult, runInit } from "./commands/init";
import { type LedgerResult, runLedger } from "./commands/ledger";
import { type ReportResult, renderReportPrBody, runReport } from "./commands/report";
import { runStale, type StaleResult } from "./commands/stale";
import { runVerify, type VerifyResult, type Violation, verifySummaryLine } from "./commands/verify";
import { type GovkitConfig, loadConfig, type ViolationKind } from "./config";
import { appendJournal, type JournalRecord, resolveJournalPath } from "./journal";
import { gitChangedDocs, gitHeadSha, resolveChangedBase } from "./util";

/**
 * HELP is an INDEX, not a manual. The reader of `govkit --help` is an agent working inside
 * someone else's repo, and it pays a tool call for every look — so the global page names what
 * exists and where the detail is, and `govkit <cmd> --help` carries the detail for exactly the
 * one command being run. One wall listing every flag of every command costs the agent the whole
 * page to learn one flag.
 */
const HELP = `govkit — deterministic docs-as-code governance engine

Getting started:
  1. govkit init      scaffold govkit.yml, the doc dirs and the write-time hook
     (already have docs? \`govkit init --adopt\` migrates their prose metadata instead)
  2. govkit doctor    read-only map: what is configured, what is governed, what to do next
  3. govkit check     the no-API-key CI gate — verify + eval in one pass

Commands (run \`govkit <command> --help\` for flags and worked examples):
  doctor       Where am I: config, doc types + counts, hook, ONE next action. Always exits 0.
  init         Scaffold governance into a repo; --adopt migrates an existing corpus.
  check        verify + eval — the single gate a CI calls.
  verify       Structural GATE: front-matter, status enum, id convention, INDEX sync, refs.
  eval         Quality: a blocking structural floor + an advisory 0–100 rubric score.
  calibrate    The eval's own regression harness over a labeled good/ + weak/ corpus.
  report       Advisory lifecycle histogram — done / in-flight / cleanup. Never blocks.
  stale        Advisory: governed code has newer commits than its doc. Needs git.
  drift        GATE: governed content vs the doc's recorded \`reconciled:\` hash. Needs git.
  ledger       GATE: the committed feature ledger — append-only, every spec resolves. Needs git.
  audit-write  PreToolUse hook gate: reads a hook payload on stdin, blocks an ungoverned write.

Options shared by several commands (a command's page lists the rest):
  --root <dir>  Repo root containing govkit.yml (default: cwd, or the hook's cwd).
  --json        Machine-readable output (doctor, verify, eval, report, stale, drift, ledger).
  --changed     (verify, eval, check) Scope the report to docs new-or-modified vs --base.
  --base <ref>  Base ref for --changed (default: origin/main, else HEAD).
  --journal     (verify, eval, check, drift, ledger) Append one JSON line per run to the journal.
  --hook        (same commands) Map a gate failure to exit 2 — wire as a blocking hook.
  -h, --help    This index; \`govkit <command> --help\` for one command's page.
`;

/** The commands the dispatcher accepts. One closed list so `isCommand`, the per-command help
 *  table and the switch below can never disagree about what exists. */
const COMMANDS = [
  "doctor",
  "init",
  "check",
  "verify",
  "eval",
  "calibrate",
  "report",
  "stale",
  "drift",
  "ledger",
  "audit-write",
] as const;
type Command = (typeof COMMANDS)[number];

function isCommand(value: string): value is Command {
  return (COMMANDS as readonly string[]).includes(value);
}

/**
 * One page per command: synopsis, flags, worked examples, and the next command. `Record<Command,
 * string>` on purpose — adding a command without writing its page is a type error, which is the
 * only reliable way a help system stays complete.
 */
const HELP_PAGES: Record<Command, string> = {
  doctor: `govkit doctor — where am I, and what do I run next

Usage:
  govkit doctor [--root <dir>] [--json]

Read-only orientation, in ONE call: whether govkit.yml loads, which doc types it
configures and how many docs each holds, how many of those lack front-matter,
whether the write-time hook is installed, which markdown dirs sit beside your
governed dirs without being governed, and exactly ONE recommended next action.

A map, not a gate: it never writes, never runs verify or eval, and ALWAYS exits 0.
Gate on \`govkit check\` — a report that could fail CI would get gated on.

Flags:
  --root <dir>  Repo to inspect (default: cwd).
  --json        Emit DoctorResult as JSON on stdout; no human report.

Examples:
  govkit doctor                      # orient before touching anything
  govkit doctor --json               # same map, for a script or an agent

The last line is always \`Next: …\` — the one action this repo needs.
`,

  init: `govkit init — scaffold governance into a repo, or adopt an existing corpus

Usage:
  govkit init         [--root <dir>] [--docs-root <dir>] [--force]
  govkit init --adopt [--root <dir>] [--apply]

Scaffold mode writes govkit.yml (the schema govkit itself ships), .claude/settings.json
(the PreToolUse write-time hook) and one INDEX.md stub per doc type. Idempotent — an
existing file is skipped, never clobbered, unless --force.

--adopt is the brownfield mode instead: for docs that LACK front-matter it lifts DECLARED
prose metadata (\`**Status**: accepted\`) into a YAML block and writes \`<MISSING — fill in>\`
where nothing was found, so the gate still flags it — it never asserts metadata nobody
approved. Docs that already have a block are untouched; status values outside your enum
print as a SUGGESTED govkit.yml patch, never applied. Dry run unless --apply.

Flags:
  --root <dir>       Repo root to write into (default: cwd).
  --docs-root <dir>  Parent dir for kit-managed docs, e.g. .govkit (sets docs.root).
  --force            Overwrite existing files (scaffold mode only).
  --adopt            Migrate an existing corpus instead of scaffolding.
  --apply            Write the proposed front-matter to disk (--adopt only).

Examples:
  govkit init                   # greenfield: config, hook and INDEX stubs
  govkit init --adopt --apply   # brownfield: write front-matter for legacy docs

init ends by naming the next command for YOUR repo; \`govkit doctor\` recomputes it.
`,

  verify: `govkit verify — the structural gate over every governed doc

Usage:
  govkit verify [--root <dir>] [--json] [--changed [--base <ref>]]
                [--check-citations] [--journal] [--hook]

Checks every governed doc for: a parseable leading \`---\` block carrying each required
key, a status inside the type's enum, the id/filename convention, a matching INDEX.md
row, globally unique ids, no unresolved placeholder, chain-status coherence, the
sections a status requires, and well-formed waivers. Binary — exit 0 clean, exit 1 on
any BLOCKING violation. Advisory kinds and waived findings are reported by name and
never flip the verdict. Every violation names its file, what disagreed, and the fix.

Flags:
  --root <dir>  Repo root containing govkit.yml (default: cwd).
  --json        Emit VerifyResult as JSON on stdout; no human report.
  --changed     Scope the REPORT to docs new-or-modified vs --base; cross-doc checks
                still scan everything, so a new duplicate id is still caught. Needs git.
  --base <ref>  Base ref for --changed (default: origin/main, else HEAD).
  --check-citations   OPT-IN, ANCHORED: every \`path:line\` the tree cites must still NAME the
                code it claims — a moved block fails though its old line exists. verify only.
  --journal     Append one JSON line for this run to .govkit/journal.jsonl.
  --hook        Map a FAIL to exit 2 and route the report to stderr (blocking hook).

Examples:
  govkit verify                          # gate the whole corpus
  govkit verify --changed --base main    # gate only this branch's docs

Next: govkit eval   (or \`govkit check\` to run both in one pass)
`,

  eval: `govkit eval — the graded quality layer on top of a passing gate

Usage:
  govkit eval [--root <dir>] [--json] [--changed [--base <ref>]] [--journal] [--hook]

Two layers over the rubric in govkit.yml (\`eval.rubrics.<type>\`). The REQUIRED floor is
a small set of rules every legitimate doc of the type carries; missing one BLOCKS (exit 1).
Everything else contributes weight to an advisory 0–100 score compared against
\`eval.threshold\` — reported, never blocking. It is a STRUCTURAL floor, not a substance
judge: it proves a doc has the canonical sections and is not a stub. No API key, ever.
No \`eval:\` block in govkit.yml ⇒ one note and exit 0.

Flags:
  --root <dir>  Repo root containing govkit.yml (default: cwd).
  --json        Emit EvalResult as JSON on stdout; no human report.
  --changed     Score ONLY the docs new-or-modified vs --base. Needs git.
  --base <ref>  Base ref for --changed (default: origin/main, else HEAD).
  --journal     Append one JSON line for this run to .govkit/journal.jsonl.
  --hook        Map a FAIL to exit 2 and route the report to stderr (blocking hook).

Examples:
  govkit eval                     # floor + advisory score for the whole corpus
  govkit eval --json              # the per-artifact breakdown, machine-readable

Next: govkit check   (verify + eval, the gate CI runs)
`,

  check: `govkit check — the single no-API-key gate a CI calls

Usage:
  govkit check [--root <dir>] [--changed [--base <ref>]] [--journal] [--hook]

Runs verify then eval. BOTH always run, so one invocation surfaces every failure —
a structural violation does not hide an eval floor miss. Exits non-zero when either
half fails. Deliberately does NOT run drift, stale or ledger: those need git and are
opt-in gates of their own.

Flags:
  --root <dir>  Repo root containing govkit.yml (default: cwd).
  --changed     Scope both halves to docs new-or-modified vs --base. Needs git.
  --base <ref>  Base ref for --changed (default: origin/main, else HEAD).
  --journal     Append one JSON line for this run to .govkit/journal.jsonl.
  --hook        Map a FAIL to exit 2 and route both reports to stderr.

Examples:
  govkit check                              # the CI gate
  govkit check --changed --base origin/main # adoption mode: only this branch's docs

Next: govkit drift   (the spec↔code claim gate — the one gate check does not run)
`,

  calibrate: `govkit calibrate — the eval's own regression harness

Usage:
  govkit calibrate --corpus <dir> [--root <dir>] [--json]
                   [--baseline <file> [--update-baseline]]

Grades a LABELED corpus: everything under <corpus>/good/ must clear the required floor,
everything under <corpus>/weak/ must fail it. Reports the floor's confusion matrix plus
precision / recall / f1. Exits 1 on ANY false positive — a good doc blocked is the
zero-FP hard invariant, because that is what gets a gate switched off — and, with
--baseline, on a recall or f1 drop against the committed numbers.

Flags:
  --root <dir>       Repo whose govkit.yml supplies the rubric (default: cwd).
  --corpus <dir>     REQUIRED. Labeled corpus containing good/ and weak/ subtrees.
  --baseline <file>  Baseline JSON to compare against. A missing file is an error
                     unless --update-baseline creates it (bootstrap).
  --update-baseline  Rewrite --baseline from this run. Refused (exit 1, nothing
                     written) when the run has a false positive or a regression.
  --json             Emit CalibrateResult as JSON on stdout.

Examples:
  govkit calibrate --corpus eval/fixtures --baseline eval/baseline.json
  govkit calibrate --corpus eval/fixtures --baseline eval/baseline.json --update-baseline

Next: govkit check   (calibrate proves the gate; check runs it)
`,

  report: `govkit report — the advisory lifecycle view

Usage:
  govkit report [--root <dir>] [--json | --pr-body]

Per-type status histogram with the ids in each bucket, marking which statuses are
terminal (decided / shipped, per \`terminalStatuses\`). Answers "what is done, what is
in flight, what needs cleanup". Read-only and ALWAYS exits 0 — a lifecycle view that
could fail CI would be gated on, and presence is not currency: it cannot judge prose.

Flags:
  --root <dir>  Repo root containing govkit.yml (default: cwd).
  --json        Emit ReportResult as JSON on stdout.
  --pr-body     Emit the same view as GitHub markdown fenced by stable
                <!-- govkit:report:begin/end --> markers — deterministic on unchanged
                state, so an injector splices it with zero diff noise. govkit only
                emits; writing it into a PR body is the caller's job (gh pr edit).
                Mutually exclusive with --json.

Examples:
  govkit report
  govkit report --pr-body >> "$GITHUB_STEP_SUMMARY"

Next: govkit stale   (which of those in-flight docs the code has moved past)
`,

  stale: `govkit stale — advisory recency for docs that claim to govern code

Usage:
  govkit stale [--root <dir>] [--json]

For every doc carrying \`governs: [glob]\`, compares the doc's last-commit time against
the newest commit of the code it governs and warns when the code moved on. A PROXY:
"code changed" is not "doc wrong" (a rename or a lint fix trips it), and a fresh result
does not certify the prose. So it NEVER blocks — always exits 0 — and \`check\` never
calls it. Needs git; without it, one note and exit 0.

Flags:
  --root <dir>  Repo root containing govkit.yml (default: cwd).
  --json        Emit StaleResult as JSON on stdout.

Examples:
  govkit stale
  govkit stale --json

Next: govkit drift   (the deterministic version — a recorded claim, not a timestamp)
`,

  drift: `govkit drift — the deterministic spec↔code gate

Usage:
  govkit drift        [--root <dir>] [--json] [--journal] [--hook]
  govkit drift --ack  [docPath] [--root <dir>] [--json] [--journal]

A doc opts in by carrying BOTH \`governs:\` and \`reconciled: sha256:<hex>\` — the author's
recorded claim "this doc is true as of this content state", hashed over the governed
files' git blob OIDs so it survives squash and rebase. The gate fails (exit 1) when the
governed content no longer matches that claim. Every governed doc, opted in or not, is
also checked for governs EXISTENCE: a pathspec matching no tracked file is a violation,
because a ghost path silently shrinks drift and stale coverage.

The two honest exits are updating the doc or an explicit \`--ack\`. The gate never acks
itself. Git absent degrades to a note + exit 0; \`check\` never calls it.

Flags:
  --root <dir>  Repo root containing govkit.yml (default: cwd).
  --ack         Rewrite \`reconciled:\` to the current hash — for the doc named by the
                positional path, or ALL opted-in docs when none is given. Surgical:
                only the claim value changes. Never combines with --hook.
  --json        Emit the result as JSON on stdout.
  --journal     Append one JSON line for this run (an ack is marked \`ack: true\`).
  --hook        Map a FAIL to exit 2 and route the report to stderr.

Examples:
  govkit drift                                 # gate
  govkit drift --ack docs/rfc/RFC-0015.md      # reconcile one doc after updating it

Next: govkit ledger   (the other git-backed gate)
`,

  ledger: `govkit ledger — the committed feature-ledger gate

Usage:
  govkit ledger [--root <dir>] [--json] [--journal] [--hook]

Gates the committed JSON ledger — \`{ entries: [{ id, title, spec, passes, check? }] }\` at
docs/ledger.json, or \`ledger.path\` in govkit.yml — on four properties: it parses and
matches the schema, ids are unique, every \`spec\` resolves to a real governed doc id, and
the file is APPEND-ONLY versus the committed HEAD version (a removed entry or removed
\`check\` provenance is a violation; flipping \`passes\` either way is legal). The N/M
passing summary is advisory and never moves the exit code. A missing or malformed ledger
is an operational error, not a pass — an opt-in gate pointed at nothing must never be green.

Flags:
  --root <dir>  Repo root containing govkit.yml (default: cwd).
  --json        Emit LedgerResult as JSON on stdout.
  --journal     Append one JSON line for this run to .govkit/journal.jsonl.
  --hook        Map a FAIL to exit 2 and route the report to stderr.

Examples:
  govkit ledger
  govkit ledger --json

Next: govkit check   (the no-key gate over the docs those entries cite)
`,

  "audit-write": `govkit audit-write — the per-write twin of the verify gate

Usage:
  govkit audit-write [--root <dir>]        # reads a PreToolUse hook payload on stdin

Blocks a Write to a governed doc that lacks complete front-matter, before the file lands
— the same rule CI enforces, one write earlier. On a write that marks a doc terminal
while it has a parent, it emits a NON-blocking reconciliation reminder instead.

Acts on Write only: an Edit DEFERS, because partial content cannot be parsed, so an
Edit-based status flip is caught later by the CI verify gate. Robust by construction —
any internal failure defers rather than crash-blocking the author's write.

\`govkit init\` wires this into .claude/settings.json for you; you rarely run it by hand.

Flags:
  --root <dir>  Repo root containing govkit.yml (default: the hook's cwd).

Examples:
  echo '{"tool_name":"Write","tool_input":{"file_path":"docs/adr/ADR-0001.md","content":"..."}}' \\
    | govkit audit-write --root .

Next: govkit doctor   (confirm the hook is the one this repo has installed)
`,
};

/**
 * One remedy per violation kind. `Record<ViolationKind, string>` so a NEW kind cannot ship
 * without one — an agent recovers from a gate failure by pattern-matching text to an action, and
 * a kind with no remedy is a kind it has to guess at. Each line names the repair AND, where the
 * answer lives in config, the exact govkit.yml key — "unknown status" is only actionable if you
 * are told where the enum is.
 */
const VIOLATION_REMEDY: Record<ViolationKind, string> = {
  citation:
    "a `path:line` reference no longer describes what the sentence claims — re-read the cited file and update the line (path-missing: the file moved or was renamed; line-beyond-eof: the file shrank; anchor-not-found: the cited block moved, so re-cite it or name its symbol in the sentence)",
  coherence:
    "a decided doc points at a parent that is not decided — advance the parent's status, or repoint `parent:` (the decided set is docs.types.<type>.terminalStatuses)",
  duplicate:
    "two docs claim one id — renumber the newer doc AND its filename; ids are unique across every type, not just within one",
  frontmatter:
    "add the missing key(s) to the leading `---` block, or repair the block if the parser rejected it (required keys: docs.base.required ∪ docs.types.<type>.required)",
  id: "the id must carry the type's prefix and match the filename (`<id>.md` or `<id>-*.md`) — see docs.types.<type>.idPrefix, or set idFilenameConvention: false for a named-file layout",
  index:
    "add or correct this doc's row in the type dir's INDEX.md — the columns that must agree are docs.types.<type>.index.sync (default: status)",
  placeholder:
    "replace the scaffolded value with a real one; `owner: TBD` is the ONE legal sentinel (an agent must never self-assign an owner)",
  reference:
    "this doc's ref names an id no governed doc carries — fix the value or author the doc it points at; the keys checked are docs.types.<type>.refs",
  section:
    "add the heading this status requires — the patterns live at docs.types.<type>.requiredSectionsByStatus.<status>",
  status: "use a value from the type's enum — it lives at docs.types.<type>.statuses in govkit.yml",
  waiver:
    "repair the `waivers:` entry in govkit.yml — rule, scope, reason, authorized_by and expires are ALL mandatory, expires is ISO, and `rule` must name a real verify kind or rubric rule id",
};

/** True when at least one finding is "this doc has no `---` block at all" — the ONE condition
 *  `govkit init --adopt` can act on. verify reports that and "the block is present but broken"
 *  under the SAME kind (`frontmatter`), while adopt treats them oppositely: it scaffolds a block
 *  where there is none and refuses to touch one that exists, because it must never prepend a
 *  second. Anything that suggests adopt has to test for this, not for the kind. */
function hasUnmigratedDocs(violations: readonly Violation[]): boolean {
  return violations.some(
    (v) => v.kind === "frontmatter" && v.problems.some((p) => p.startsWith("missing YAML")),
  );
}

/** `frontmatter` is the one kind whose remedy depends on WHICH of its two failures fired, so the
 *  migration is offered only where it would actually do something. Every other kind is a constant
 *  — the table stays `Record<ViolationKind, string>`, which is what makes completeness a compile
 *  error rather than a review note. */
function remedyFor(kind: ViolationKind, violations: readonly Violation[]): string {
  const base = VIOLATION_REMEDY[kind];
  if (kind !== "frontmatter" || !hasUnmigratedDocs(violations)) return base;
  return `${base}; for a doc with NO block at all, \`govkit init --adopt\` drafts one from its own prose`;
}

/** The eval floor has one shape of failure, so it gets one remedy rather than a table. */
const EVAL_FLOOR_REMEDY =
  "each `missing required:` above is a rubric rule id — its heading/pattern is at eval.rubrics.<type> in govkit.yml; add the section it asks for";

/**
 * The next-step footer. Every command ends by naming what to run next, computed from the ACTUAL
 * result — a static string would point a failing repo at an imagined happy path, which is worse
 * than silence because an agent follows it. Blank line first so the footer is greppable and never
 * runs into the report above it.
 */
function writeNext(stream: NodeJS.WritableStream, line: string): void {
  stream.write(`\nNext: ${line}\n`);
}

/** verify's next step: on FAIL the fix, on OK the next gate. A corpus whose docs have no
 *  front-matter at all has a MIGRATION available, which is a different action from repairing
 *  a key by hand — so it is detected and named rather than folded into "fix the files above". */
function verifyNext(result: VerifyResult): string {
  if (result.ok) {
    const reported = result.violations.length;
    return reported > 0
      ? `govkit eval   (${reported} finding(s) above were advisory or waived — reported, not blocking)`
      : "govkit eval   (or `govkit check` to run verify + eval in one pass)";
  }
  if (hasUnmigratedDocs(result.violations)) {
    const unmigrated = result.violations.filter(
      (v) => v.kind === "frontmatter" && v.problems.some((p) => p.startsWith("missing YAML")),
    ).length;
    return `govkit init --adopt   (${unmigrated} doc(s) have no front-matter block at all; add --apply to write, then re-run \`govkit verify\`)`;
  }
  return "fix the doc(s) above — each violation's `fix:` line names the repair — then re-run `govkit verify`";
}

/** eval's next step. The `note` path (no rubric configured) is its own case: there is nothing
 *  to fix, the feature is simply unconfigured, and saying "fix the docs" there would be a lie. */
function evalNext(result: EvalResult): string {
  if (result.note) {
    return "add an `eval:` rubric to govkit.yml to turn this layer on — `govkit verify` is the structural gate meanwhile";
  }
  if (!result.ok) {
    const blocked = result.artifacts.filter((a) => !a.floorOk).length;
    return `fix the ${blocked} BLOCK artifact(s) above — ${EVAL_FLOOR_REMEDY} — then re-run \`govkit eval\``;
  }
  return "govkit check   (verify + eval together, the gate CI runs)";
}

/** drift's next step. The `note` path means nothing was evaluable (no git, or no doc opted in),
 *  which is an OPT-IN gap, not a failure — pointing it at `--ack` would be nonsense. */
function driftNext(result: DriftResult): string {
  if (result.note) {
    return "add `governs:` + `reconciled: sha256:<hex>` to a doc to opt it into the claim gate (`govkit drift --ack <doc>` writes the hash)";
  }
  if (!result.ok) {
    return `update the doc(s) above, then \`govkit drift --ack <doc>\`   (${result.drifted.length} in violation; the gate never acks itself)`;
  }
  return "govkit ledger   (the other git-backed gate) — or `govkit stale` for the advisory recency view";
}

/** check's next step: whichever half failed owns the footer, so the agent is pointed at the
 *  first thing standing between it and green — never at the happy path while a gate is red. */
function checkNext(verify: VerifyResult, evaluation: EvalResult): string {
  if (!verify.ok) return verifyNext(verify);
  if (!evaluation.ok) return evalNext(evaluation);
  return "govkit drift   (the spec↔code claim gate — the one gate `check` does not run; needs git)";
}

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
  // ONE summary for both verdicts, computed in verify.ts beside the counting rule. Neither an
  // advisory (RFC-0014) nor a waived finding flips the OK/FAIL header, and neither is silent in
  // it either: both are counted by name, so the header can never claim "0 violations" over a body
  // that lists one. On a clean report the line degrades to exactly `0 violations`.
  const summary = verifySummaryLine(result);
  // --hook routes the whole human report to stderr — the channel a blocking-hook harness
  // feeds back to the model; otherwise OK → stdout, FAIL → stderr as before.
  const stream = toStderr || !result.ok ? process.stderr : process.stdout;
  const header = result.ok ? "OK" : "FAIL";
  const tail = result.ok ? "." : ":";
  stream.write(
    `govkit verify: ${header} — ${result.checked} doc(s) checked, ${summary}${scope}${tail}\n`,
  );
  // One prefix per entry, so the reason an entry is not blocking is visible without reading its
  // problems: `waived` (a human signed for THIS finding) outranks `warn` (the KIND is advisory
  // everywhere) — a waived advisory is still, first, someone's signed exception.
  const kinds = new Set<ViolationKind>();
  for (const v of result.violations) {
    const mark = v.waivedBy !== undefined ? "waived " : v.tier === "advisory" ? "warn " : "";
    stream.write(`  ${mark}${v.file} [${v.type}]\n`);
    for (const problem of v.problems) stream.write(`    - ${problem}\n`);
    kinds.add(v.kind);
  }
  // The remedy block is grouped by KIND, not repeated per entry: the fix for `status` is the
  // same sentence on all forty docs that got it wrong, and a report that repeats it forty times
  // costs the reader the one thing this output is for. Printed only for the kinds actually
  // present, so a clean run is byte-identical to before.
  //
  // Indented FOUR spaces, deliberately. Two-space-then-non-space is this printer's grammar for
  // "one violation entry", and the counting invariant beside `verifySummaryLine` — the header
  // may never claim fewer findings than the body lists — is checked on exactly that shape. A
  // remedy is commentary on the entries above, not a new one, so it sits at the problem level.
  if (kinds.size > 0) {
    stream.write("\nFixes:\n");
    for (const kind of kinds) {
      stream.write(`    fix: [${kind}] ${remedyFor(kind, result.violations)}\n`);
    }
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
  // `floorPassRate` stays waiver-BLIND on purpose (a waiver must never move the number
  // calibrate reads), so an all-waived run reads "0% passed" under an OK header. Without the
  // waived count that pair is unreadable — the same header-vs-body contradiction printVerify
  // just lost. Counted in eval.ts beside the data, in BOTH units, so the header can only ever
  // describe the lines printed under it.
  stream.write(
    `govkit eval: ${header} — ${result.scored} artifact(s)${scope}; ${evalFloorLine(result)}; ` +
      `advisory score: avg ${result.averageScore}/100, ${advPct}% ≥ ${result.threshold}.\n`,
  );
  // Who signed for this artifact's missed required rules, and until when. Printed on EVERY line
  // that has one — the blocking line too: an artifact can be partly signed (one missed required
  // rule waived, one not), it still blocks, and dropping the signature there is what makes a
  // human-signed exception indistinguishable from a bug. It is also what left the header's waived
  // count with no line beneath it to account for.
  const signature = (a: ArtifactScore): string =>
    a.waived.length === 0
      ? ""
      : ` (signed: ${a.waived
          .map((w) => `${w.rule} by ${w.waiver.authorized_by} until ${w.waiver.expires}`)
          .join("; ")})`;
  for (const a of result.artifacts) {
    // Branch on what the GATE read (`floorOk`), not on the literal `requiredOk`: an artifact
    // whose every missed required rule is signed for printed `BLOCK` under an `OK` header and
    // never named the signature. The gap is still shown — marking, never filtering — but it is
    // shown as what it is.
    if (!a.floorOk) {
      stream.write(
        `  BLOCK ${a.score}/100  ${a.file} [${a.type}] — missing required: ${a.missedRequired.join("; ")}${signature(a)}\n`,
      );
    } else if (!a.requiredOk) {
      stream.write(
        `  waived ${a.score}/100  ${a.file} [${a.type}] — missing required: ${a.missedRequired.join("; ")}${signature(a)}\n`,
      );
    } else {
      const mark = a.passedAdvisory ? "ok   " : "warn ";
      const tail = a.passedAdvisory ? "" : " (below advisory threshold)";
      stream.write(`  ${mark} ${a.score}/100  ${a.file} [${a.type}]${tail}\n`);
      if (!a.passedAdvisory) for (const m of a.missed) stream.write(`         - ${m}\n`);
    }
  }
  // Same discipline as printVerify: a blocked artifact names a rule id, and a rule id is only
  // actionable once you are told where its pattern is defined. One line, only when it blocks.
  // Four-space indent for the same reason as printVerify's: two-space entries are this
  // printer's per-artifact rows, and a remedy must not read as one more artifact.
  if (result.artifacts.some((a) => !a.floorOk)) {
    stream.write(`\nFixes:\n    fix: [required floor] ${EVAL_FLOOR_REMEDY}\n`);
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

/** Render one NextAction as the single `Next:` line. The command and the reason are joined
 *  HERE, never in the action, so doctor and init cannot phrase the same recommendation two
 *  different ways — that divergence is what makes a next-step untrustworthy. */
function nextActionLine(action: NextAction): string {
  return action.command ? `${action.command}   (${action.detail})` : action.detail;
}

function printDoctor(result: DoctorResult): void {
  const out = process.stdout;
  out.write(`govkit doctor — ${result.root}\n\n`);
  switch (result.config.kind) {
    case "missing":
      out.write("  config    NOT FOUND — no govkit.yml at this root\n");
      break;
    case "invalid":
      out.write(`  config    UNREADABLE — ${result.config.problem}\n`);
      break;
    case "loaded":
      out.write(
        `  config    govkit.yml loaded${result.docsRoot === "." ? "" : ` (docs.root: ${result.docsRoot})`}\n`,
      );
      break;
  }
  out.write(
    `  hook      ${result.hook.installed ? "installed" : "NOT installed"} — ${result.hook.path}\n`,
  );
  if (result.config.kind === "loaded") {
    // The two front-matter counts are named apart, because the ACTION differs: no block at all
    // is a migration `init --adopt` can do, a broken block is a hand repair adopt refuses.
    const malformed =
      result.malformedFrontMatter > 0 ? `, ${result.malformedFrontMatter} malformed` : "";
    out.write(
      `  governed  ${result.totalDocs} doc(s) across ${result.types.length} type(s), ` +
        `${result.missingFrontMatter} without a front-matter block${malformed}\n`,
    );
    if (result.types.length > 0) {
      // Padded columns so a type's dir and count are scannable in one pass; the status enum is
      // printed in full because "which values are legal here" is otherwise a second tool call.
      const nameWidth = Math.max(4, ...result.types.map((t) => t.name.length));
      const dirWidth = Math.max(3, ...result.types.map((t) => t.dir.length));
      const startWidth = Math.max(0, ...result.types.map((t) => (t.startStatus ?? "").length));
      out.write("\n");
      for (const t of result.types) {
        const flags = [
          t.missingFrontMatter > 0 ? `${t.missingFrontMatter} need adopt` : "",
          t.malformedFrontMatter > 0 ? `${t.malformedFrontMatter} malformed block` : "",
        ].filter((f) => f !== "");
        const missing = flags.length > 0 ? `  ← ${flags.join(", ")}` : "";
        const statuses = t.statuses ? `statuses: ${t.statuses.join(", ")}` : "";
        const start = `start: ${(t.startStatus ?? "—").padEnd(startWidth)}`;
        out.write(
          `  ${t.name.padEnd(nameWidth)}  ${t.dir.padEnd(dirWidth)}  ` +
            `${String(t.docs).padStart(4)} doc(s)  ${start}  ${statuses}${missing}\n`,
        );
      }
    }
    if (result.ungoverned.length > 0) {
      // Reported, never recommended: "markdown beside your doc dirs" is a guess, and the
      // recommendation ladder deliberately refuses to act on a guess (see doctor.ts).
      out.write("\n  ungoverned markdown beside your doc dirs (no docs.types entry claims it):\n");
      for (const u of result.ungoverned) {
        out.write(`    ${u.dir}  ${u.markdown}${u.capped ? "+" : ""} file(s)\n`);
      }
    }
  }
  // Always exits 0 — a map, not a gate. Said out loud so nobody wires it into CI as one.
  out.write("\n(read-only: doctor never writes, never gates, always exits 0.)\n");
  writeNext(out, nextActionLine(result.next));
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
