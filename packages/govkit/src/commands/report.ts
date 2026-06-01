import { readFileSync } from "node:fs";
import { type GovkitConfig, loadConfig } from "../config";
import { parseFrontMatter } from "../frontmatter";
import { listMarkdown, str, typeDir } from "../util";

// The cleanup/lifecycle report (RFC-0008, advisory half). It answers the user's "which docs
// are done / outdated / need cleanup" by SURFACING the lifecycle — a per-type status histogram
// with the ids in each bucket — and NOTHING more. It deliberately does NOT invent a "retired"
// or "stale" axis: a presence-only layer cannot judge whether a doc is trash (that is the
// reviewer agent's job, RFC-0001), and a hardcoded retired-vocabulary would be a guess the
// config can't justify. The one judgment it DOES make is config-grounded: a status is "decided"
// iff it is in the type's `terminalStatuses` (opt-in, RFC-0008). Read-only, no exit-code effect.

export interface ReportStatusBucket {
  status: string;
  count: number;
  ids: string[];
  /** True iff `status` ∈ the type's configured terminalStatuses (a decided/shipped state). */
  terminal: boolean;
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
}

export interface ReportOptions {
  root: string;
  config?: GovkitConfig;
}

// The bucket label for a doc with no usable status — kept visible rather than dropped, so a
// status-less governed doc is not silently absent from its own lifecycle view.
const NO_STATUS = "(no status)";

export function runReport(opts: ReportOptions): ReportResult {
  const config = opts.config ?? loadConfig(opts.root);
  const { ignore, types, root: docsRoot = "." } = config.docs;
  const summaries: ReportTypeSummary[] = [];
  let total = 0;

  for (const [typeName, def] of Object.entries(types)) {
    const terminal = new Set(def.terminalStatuses ?? []);
    const byStatus = new Map<string, string[]>();
    let typeTotal = 0;

    for (const file of listMarkdown(typeDir(opts.root, docsRoot, def.dir), ignore)) {
      const fm = parseFrontMatter(readFileSync(file, "utf8"));
      // Unparseable docs are verify's problem to report; here they simply have no lifecycle to
      // show, so they are excluded from the histogram (counted by verify, not double-counted).
      if (!fm) continue;
      typeTotal++;
      total++;
      const status = str(fm.data.status) || NO_STATUS;
      const id = str(fm.data.id) || `(${file})`;
      const ids = byStatus.get(status) ?? [];
      ids.push(id);
      byStatus.set(status, ids);
    }

    const buckets: ReportStatusBucket[] = [...byStatus.entries()]
      .map(([status, ids]) => ({
        status,
        count: ids.length,
        ids: [...ids].sort(),
        terminal: terminal.has(status),
      }))
      .sort((a, b) => a.status.localeCompare(b.status));

    summaries.push({
      type: typeName,
      total: typeTotal,
      hasTerminal: terminal.size > 0,
      buckets,
    });
  }

  return { total, types: summaries };
}
