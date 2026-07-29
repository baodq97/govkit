import { type GovkitConfig, loadConfig } from "../config";
import { frontMatterSpan, isParseError } from "../frontmatter";
import { gitAvailable, gitLineCommitTime, str, toPathspec, walkGovernedDocs } from "../util";

// The cleanup/lifecycle report (RFC-0008, advisory half). It answers the user's "which docs
// are done / outdated / need cleanup" by SURFACING the lifecycle — a per-type status histogram
// with the ids in each bucket — and NOTHING more. It deliberately does NOT invent a "retired"
// or "stale" axis: a presence-only layer cannot judge whether a doc is trash (that is the
// reviewer agent's job, RFC-0001), and a hardcoded retired-vocabulary would be a guess the
// config can't justify. The one judgment it DOES make is config-grounded: a status is "decided"
// iff it is in the type's `terminalStatuses` (opt-in, RFC-0008). Read-only, no exit-code effect.
//
// `--aging` (RFC-0029) adds the missing dimension — TIME — as the same class of judgment:
// dates from git, thresholds only from config, still advisory, still exit 0 always. The
// DEFAULT path stays git-free exactly as RFC-0021 pinned it; only the flag touches git.

/** Per-doc aging annotation (RFC-0029) — present only under `--aging` with git available. */
export interface ReportDocAging {
  id: string;
  /** ISO date (UTC) the current top-level `status:` line was last COMMITTED, or null when
   *  blame cannot answer (untracked doc, uncommitted status edit, no front-matter). */
  statusSince: string | null;
  /** Whole days from statusSince to the run's `now`, or null when statusSince is null. */
  ageDays: number | null;
}

export interface ReportStatusBucket {
  status: string;
  count: number;
  ids: string[];
  /** True iff `status` ∈ the type's configured terminalStatuses (a decided/shipped state). */
  terminal: boolean;
  /** Aging per doc, sorted by id — id-parallel with `ids` (RFC-0029, `--aging` only). */
  docs?: ReportDocAging[];
  /** Ids over the type's configured `aging` threshold for this status. Present only when a
   *  threshold IS configured for this (type, status) pair — no config, no judgment. */
  overThreshold?: string[];
}

export interface ReportTypeSummary {
  type: string;
  total: number;
  /** Whether this type opted into terminalStatuses — drives whether "decided" is meaningful. */
  hasTerminal: boolean;
  buckets: ReportStatusBucket[];
}

export interface ReportResult {
  total: number;
  types: ReportTypeSummary[];
  /** True iff this run annotated aging (`--aging` asked for AND git available). */
  aging?: boolean;
  /** Advisory note when `--aging` was asked for but git cannot answer — degrade-and-say-so,
   *  never an error (the stale/drift posture, RFC-0009/0015). */
  agingNote?: string;
}

export interface ReportOptions {
  root: string;
  config?: GovkitConfig;
  /** Annotate time-in-status from git (RFC-0029). Default false: the git-free path. */
  aging?: boolean;
  /** "Now" in epoch seconds for ageDays math — injectable so tests never race a midnight. */
  now?: number;
}

// The bucket label for a doc with no usable status — kept visible rather than dropped, so a
// status-less governed doc is not silently absent from its own lifecycle view.
const NO_STATUS = "(no status)";

// The PR-body span markers (RFC-0021) — the STABLE idempotency contract. An injector locates
// the begin…end span in an existing PR body and REPLACES it (appending only when absent), so
// re-running never duplicates the section. The markers are the API; the block content between
// them may evolve (named inner sub-sections are reserved for the gate/advisory follow-up).
export const PR_BODY_BEGIN = "<!-- govkit:report:begin -->";
export const PR_BODY_END = "<!-- govkit:report:end -->";

// 1-based file line of the TOP-LEVEL `status:` key inside the front-matter block, or null.
// Scoped to `frontMatterSpan` — the ONE block grammar (frontmatter.ts) — so this locator and
// the YAML parse can never disagree about where the block is. Top-level only by construction:
// a nested `status:` is indented and `^status` never matches it. The opening `---` is file
// line 1 (a BOM adds bytes, not a line), so block line i is file line i+1.
function statusLineNo(content: string): number | null {
  const span = frontMatterSpan(content);
  if (span === null) return null;
  const lines = content.slice(span.start, span.end).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^status\s*:/.test(lines[i] ?? "")) return i + 1;
  }
  return null;
}

// Render the lifecycle view as a marker-fenced GitHub-markdown block (RFC-0021). Determinism
// IS the idempotency guarantee: no timestamps, no run-ids, no absolute paths — ids and
// statuses arrive pre-sorted from runReport, so unchanged repo state renders identical bytes
// and the caller's splice is a zero-diff no-op. One table per doc type; a terminal
// (decided/shipped) status is marked ✔ per the type's terminalStatuses — same config-grounded
// judgment as the plain report, nothing invented in the rendering.
// Under `--aging` the table gains a `since` column with DATES ONLY (RFC-0029): a date changes
// exactly when a status does, so the byte-identical contract survives; `ageDays` and the
// threshold ⚠ both derive from "now" and are therefore banned from this surface.
export function renderReportPrBody(result: ReportResult): string {
  const aging = result.aging === true;
  const header = aging
    ? ["| type | status | count | ids | since |", "|---|---|---|---|---|"]
    : ["| type | status | count | ids |", "|---|---|---|---|"];
  const tables = result.types.map((t) => {
    const rows = t.buckets.map((b) => {
      const base = `| ${t.type} | ${b.status}${b.terminal ? " ✔" : ""} | ${b.count} | ${b.ids.join(", ")} |`;
      if (!aging) return base;
      // Id-parallel with the ids column (both sorted by id); an unanswerable date renders as
      // an em dash, never dropped — column alignment is the readability contract.
      const since = (b.docs ?? []).map((d) => d.statusSince ?? "—").join(", ");
      return `${base} ${since} |`;
    });
    return [...header, ...rows].join("\n");
  });
  // Blank lines BETWEEN tables only — adjacent GFM tables merge without one; the heading and
  // the markers hug the content exactly as the RFC's example block pins.
  const body = tables.join("\n\n");
  const parts = [PR_BODY_BEGIN, "### govkit governance report"];
  if (body) parts.push(body);
  parts.push(PR_BODY_END);
  return `${parts.join("\n")}\n`;
}

export function runReport(opts: ReportOptions): ReportResult {
  const config = opts.config ?? loadConfig(opts.root);
  const { types } = config.docs;
  const summaries: ReportTypeSummary[] = [];
  let total = 0;

  // Aging is asked-for AND answerable: git absent degrades to a surfaced note on an otherwise
  // normal report — never an error, never a silent plain report (the caller asked for a column
  // and must learn why it is missing).
  const agingWanted = opts.aging === true;
  const canAge = agingWanted && gitAvailable(opts.root);
  const now = opts.now ?? Math.floor(Date.now() / 1000);

  // The shared corpus walk (util.walkGovernedDocs), for the same reason verify, eval and the
  // shared id collector route through it: a lifecycle view that walks a NARROWER corpus than
  // the gate reports "1 governed doc" for a tree the gate is checking two of — the nested doc
  // is gated and graded yet invisible in its own lifecycle, which is the
  // "looks-governed-but-isn't" leak stated at util.ts typeDir.
  const statusByType = new Map<string, Map<string, string[]>>();
  const agingByType = new Map<string, Map<string, ReportDocAging[]>>();
  walkGovernedDocs(opts.root, config, ({ file, typeName, content, fm }) => {
    // Unparseable docs are verify's problem to report; here they simply have no lifecycle to
    // show, so they are excluded from the histogram (counted by verify, not double-counted).
    if (!fm || isParseError(fm)) return;
    total++;
    const byStatus = statusByType.get(typeName) ?? new Map<string, string[]>();
    statusByType.set(typeName, byStatus);
    const status = str(fm.data.status) || NO_STATUS;
    const id = str(fm.data.id) || `(${file})`;
    const ids = byStatus.get(status) ?? [];
    ids.push(id);
    byStatus.set(status, ids);

    if (!canAge) return;
    // Blame dates the ONE status line, so a body edit never resets the clock the way a
    // whole-file commit time would — that difference is the entire point of the flag.
    const lineNo = statusLineNo(content);
    const t =
      lineNo === null ? null : gitLineCommitTime(opts.root, toPathspec(opts.root, file), lineNo);
    const entry: ReportDocAging = {
      id,
      statusSince: t === null ? null : new Date(t * 1000).toISOString().slice(0, 10),
      ageDays: t === null ? null : Math.max(0, Math.floor((now - t) / 86400)),
    };
    const byStatusAging = agingByType.get(typeName) ?? new Map<string, ReportDocAging[]>();
    agingByType.set(typeName, byStatusAging);
    const docs = byStatusAging.get(status) ?? [];
    docs.push(entry);
    byStatusAging.set(status, docs);
  });

  for (const [typeName, def] of Object.entries(types)) {
    const terminal = new Set(def.terminalStatuses ?? []);
    const byStatus = statusByType.get(typeName) ?? new Map<string, string[]>();

    const buckets: ReportStatusBucket[] = [...byStatus.entries()]
      .map(([status, ids]) => {
        const bucket: ReportStatusBucket = {
          status,
          count: ids.length,
          ids: [...ids].sort(),
          terminal: terminal.has(status),
        };
        if (canAge) {
          const docs = [...(agingByType.get(typeName)?.get(status) ?? [])].sort((a, b) =>
            a.id.localeCompare(b.id),
          );
          bucket.docs = docs;
          // A threshold exists only where config says so — no default ships (a hardcoded 90
          // would be exactly the config-can't-justify guess this report refuses to make).
          const limit = def.aging?.[status];
          if (limit !== undefined) {
            bucket.overThreshold = docs
              .filter((d) => d.ageDays !== null && d.ageDays > limit)
              .map((d) => d.id);
          }
        }
        return bucket;
      })
      .sort((a, b) => a.status.localeCompare(b.status));

    summaries.push({
      type: typeName,
      total: buckets.reduce((sum, b) => sum + b.count, 0),
      hasTerminal: terminal.size > 0,
      buckets,
    });
  }

  return {
    total,
    types: summaries,
    ...(canAge ? { aging: true } : {}),
    ...(agingWanted && !canAge
      ? {
          agingNote:
            "git is not available here — time-in-status needs commit history, so ages are omitted.",
        }
      : {}),
  };
}
