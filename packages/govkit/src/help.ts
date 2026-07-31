/**
 * HELP is an INDEX, not a manual. The reader of `govkit --help` is an agent working inside
 * someone else's repo, and it pays a tool call for every look — so the global page names what
 * exists and where the detail is, and `govkit <cmd> --help` carries the detail for exactly the
 * one command being run. One wall listing every flag of every command costs the agent the whole
 * page to learn one flag.
 */
export const HELP = `govkit — deterministic docs-as-code governance engine

Getting started:
  1. govkit init      scaffold govkit.yml, AGENTS.md, the doc dirs and the write-time hook
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
 *  table and the dispatch switch can never disagree about what exists. */
export const COMMANDS = [
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
export type Command = (typeof COMMANDS)[number];

export function isCommand(value: string): value is Command {
  return (COMMANDS as readonly string[]).includes(value);
}

/**
 * One page per command: synopsis, flags, worked examples, and the next command. `Record<Command,
 * string>` on purpose — adding a command without writing its page is a type error, which is the
 * only reliable way a help system stays complete.
 */
export const HELP_PAGES: Record<Command, string> = {
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
(the PreToolUse write-time hook), AGENTS.md (the agent-facing contract: the doc chain, the
change-class gates, the never-self-flip constraints) and one INDEX.md stub per doc type.
Idempotent — an existing file is skipped, never clobbered, unless --force.

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
  govkit init                   # greenfield: config, contract, hook and INDEX stubs
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
