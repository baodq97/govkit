import type { AdoptResult } from "./commands/adopt";
import type { AuditDecision } from "./commands/audit-write";
import type { CalibrateResult } from "./commands/calibrate";
import type { DoctorResult, NextAction } from "./commands/doctor";
import type { DriftAckResult, DriftResult } from "./commands/drift";
import { type ArtifactScore, type EvalResult, evalFloorLine } from "./commands/eval";
import type { InitResult } from "./commands/init";
import type { LedgerResult } from "./commands/ledger";
import type { ReportResult } from "./commands/report";
import type { StaleResult } from "./commands/stale";
import { type VerifyResult, type Violation, verifySummaryLine } from "./commands/verify";
import type { ViolationKind } from "./config";

// The human rendering layer: every print* renderer, the VIOLATION_REMEDY table, and the
// *Next() footer builders. Pure (result, stream-choice) => void over an already-computed
// result — no renderer runs a command, reads a file, or decides an exit code; cli.ts owns
// dispatch and wiring, and the commands own the numbers these renderers narrate.

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
export function writeNext(stream: NodeJS.WritableStream, line: string): void {
  stream.write(`\nNext: ${line}\n`);
}

/** verify's next step: on FAIL the fix, on OK the next gate. A corpus whose docs have no
 *  front-matter at all has a MIGRATION available, which is a different action from repairing
 *  a key by hand — so it is detected and named rather than folded into "fix the files above". */
export function verifyNext(result: VerifyResult): string {
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
export function evalNext(result: EvalResult): string {
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
export function driftNext(result: DriftResult): string {
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
export function checkNext(verify: VerifyResult, evaluation: EvalResult): string {
  if (!verify.ok) return verifyNext(verify);
  if (!evaluation.ok) return evalNext(evaluation);
  return "govkit drift   (the spec↔code claim gate — the one gate `check` does not run; needs git)";
}

export function printVerify(result: VerifyResult, toStderr = false): void {
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

export function printEval(result: EvalResult, toStderr = false): void {
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
export function emitDecision(decision: AuditDecision): void {
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

export function printInit(result: InitResult): void {
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
export function nextActionLine(action: NextAction): string {
  return action.command ? `${action.command}   (${action.detail})` : action.detail;
}

export function printDoctor(result: DoctorResult): void {
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

export function printAdopt(result: AdoptResult): void {
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

export function printReport(result: ReportResult): void {
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

export function printStale(result: StaleResult): void {
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

export function printDrift(result: DriftResult, toStderr = false): void {
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

export function printDriftAck(result: DriftAckResult, toStderr = false): void {
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

export function printLedger(result: LedgerResult, toStderr = false): void {
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

export function printCalibrate(result: CalibrateResult): void {
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
