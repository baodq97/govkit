# Config Generality Hardening (RFC-0011) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `govkit.yml` express the three things that force `customs-platform` to keep a parallel `scripts/verify.sh`, so that consumer can delete it and run `npx govkit verify` as its single gate.

**Architecture:** Three additive, optional `DocType` fields drive behavior in `verify.ts`: `excludeBase` subtracts base-required keys for lifecycle-less types (G1); `index: false | { sync }` controls whether/which INDEX columns are synced (G1+G3); and INDEX row/cell matching becomes boundary-anchored instead of substring (G2). Every field is absent in all existing configs, so behavior is byte-identical for govkit-self and alert-triage; only customs opts in. A committed fixture mirroring customs' divergence is the n=3 generality regression.

**Tech Stack:** TypeScript (ESM), bun test, tsup build, Biome. Source in `packages/govkit/src/`, tests in `packages/govkit/test/`.

---

## Spec reference

- Spec: `docs/rfc/RFC-0011-config-generality-hardening.md`
- Evidence (read-only, sibling repos): `../customs-platform/scripts/verify.sh`, `../customs-platform/govkit.yml`, `../customs-platform/docs/known-traps.md` (KT-0004).
- Gaps: **G1** `base.required` forces `status` onto every type; **G2** INDEX match is substring-fragile (`US-1` vs `US-10`, status word in a title cell); **G3** INDEX sync only checks `status`, not `owner`.

## File structure

- **Modify** `packages/govkit/src/config.ts` — add `IndexConfig` type + two optional `DocType` fields; add a fail-loud guard in `loadConfig` for `excludeBase` excluding `id`/`title`.
- **Modify** `packages/govkit/src/commands/verify.ts` — `excludeBase` filtering in the required set; two boundary-match helpers (`rowHasId`, `rowHasCell`); `checkIndex` rewrite (opt-out, bounded id lookup, multi-key sync).
- **Create** `packages/govkit/test/generality.test.ts` — G1/G2/G3 unit tests built on the `verify-checks.test.ts` tmpdir+config pattern.
- **Create** `packages/govkit/test/fixtures/generality-repo/` — a customs-shaped fixture (status-less runbook type + multi-column INDEX + owner sync) for the n=3 regression.

## Conventions to follow (from existing tests)

- Build a temp repo with `mkdtempSync(join(tmpdir(), "govkit-..."))`, `mkdirSync(..., { recursive: true })`, `writeFileSync`.
- `runVerify({ root, config })` accepts an in-memory `GovkitConfig` — no `govkit.yml` on disk needed for unit tests.
- A doc is `---\n<k: v lines>\n---\n\nbody\n`; an INDEX row is a markdown table line `| <id-or-link> | ... |`.
- Run a single test file: `cd packages/govkit && bun test test/<file>.test.ts`.

---

### Task 1: Config schema — `IndexConfig`, `DocType` fields, `excludeBase` guard

**Files:**
- Modify: `packages/govkit/src/config.ts`
- Test: `packages/govkit/test/generality.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/govkit/test/generality.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config";

function configRepo(yml: string): string {
  const root = mkdtempSync(join(tmpdir(), "govkit-generality-"));
  writeFileSync(join(root, "govkit.yml"), yml);
  return root;
}

describe("loadConfig — RFC-0011 fields", () => {
  it("surfaces excludeBase and index on a type", () => {
    const root = configRepo(
      [
        "schemaVersion: 1",
        "docs:",
        "  ignore: [INDEX.md]",
        "  base: { required: [id, title, status, owner, date] }",
        "  types:",
        "    runbook:",
        "      dir: docs/runbooks",
        "      required: [id, title, service, severity, owner, date]",
        "      excludeBase: [status]",
        "      index: false",
        "    us:",
        "      dir: docs/issues",
        "      required: [id, title, status, owner, date]",
        "      index: { sync: [status, owner] }",
        "",
      ].join("\n"),
    );
    const cfg = loadConfig(root);
    expect(cfg.docs.types.runbook?.excludeBase).toEqual(["status"]);
    expect(cfg.docs.types.runbook?.index).toBe(false);
    expect(cfg.docs.types.us?.index).toEqual({ sync: ["status", "owner"] });
  });

  it("rejects excludeBase that drops id (breaks cross-doc checks)", () => {
    const root = configRepo(
      [
        "schemaVersion: 1",
        "docs:",
        "  ignore: [INDEX.md]",
        "  base: { required: [id, title, status, owner, date] }",
        "  types:",
        "    note:",
        "      dir: docs/notes",
        "      required: [title]",
        "      excludeBase: [id]",
        "",
      ].join("\n"),
    );
    expect(() => loadConfig(root)).toThrow(/excludeBase/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: FAIL — `excludeBase`/`index` are not typed (TS) and no guard throws.

- [ ] **Step 3: Add the schema fields and guard**

In `packages/govkit/src/config.ts`, add the `IndexConfig` type just above `interface DocType`:

```ts
/**
 * How a doc type relates to its INDEX.md (RFC-0011). `false` skips ALL index checks for the
 * type (a type that keeps no INDEX). An object lists the front-matter keys whose values must
 * each appear as a matched table cell in the doc's INDEX row. Absent ⇒ `{ sync: ["status"] }`
 * — the pre-RFC-0011 status-only behavior, so this field is purely additive / non-breaking.
 */
export type IndexConfig = false | { sync: string[] };
```

Add these two fields inside `interface DocType` (after `refs?`):

```ts
  /**
   * Keys subtracted from `base.required` for THIS type (RFC-0011). Effective required =
   * (base.required − excludeBase) ∪ required. Lets a lifecycle-less type (e.g. a runbook with
   * no `status`) opt out of a base key that otherwise can't be dropped. `id`/`title` may NOT be
   * excluded — they anchor duplicate-detection and refs — and loadConfig fails loud if they are.
   */
  excludeBase?: string[];
  /** INDEX relationship (RFC-0011). See IndexConfig. Absent ⇒ status-only sync (legacy). */
  index?: IndexConfig;
```

In `loadConfig`, after the `escaped`/docsRoot validation block and before the `return`, add the guard:

```ts
  // RFC-0011: excluding id/title would silently disable cross-doc checks (duplicate ids, refs,
  // INDEX row lookup all key on id). Fail loud at load, same stance as the docs.root guard.
  for (const [name, def] of Object.entries(docs.types ?? {})) {
    const bad = (def.excludeBase ?? []).filter((k) => k === "id" || k === "title");
    if (bad.length > 0) {
      throw new Error(
        `govkit: type '${name}' excludeBase may not drop [${bad.join(", ")}] — these anchor cross-doc checks`,
      );
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: PASS (both `loadConfig` tests).

- [ ] **Step 5: Commit**

```bash
git add packages/govkit/src/config.ts packages/govkit/test/generality.test.ts
git commit -m "feat(config): add excludeBase + index DocType fields with id/title guard (RFC-0011)"
```

---

### Task 2: G1 — `excludeBase` drops base keys from the required set

**Files:**
- Modify: `packages/govkit/src/commands/verify.ts:371-372` (the `required` union)
- Test: `packages/govkit/test/generality.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `packages/govkit/test/generality.test.ts`:

```ts
import { mkdirSync, rmSync } from "node:fs";
import { runVerify } from "../src/commands/verify";
import type { GovkitConfig } from "../src/config";

// A repo with a single lifecycle-less `runbook` type: no `status`, INDEX opted out.
function runbookConfig(): GovkitConfig {
  return {
    schemaVersion: 1,
    docs: {
      ignore: ["INDEX.md", "_TEMPLATE.md"],
      base: { required: ["id", "title", "status", "owner", "date"] },
      types: {
        runbook: {
          dir: "docs/runbooks",
          required: ["id", "title", "service", "severity", "owner", "date"],
          idPrefix: "RB",
          excludeBase: ["status"],
          index: false,
        },
      },
    },
  };
}

function writeDoc(root: string, rel: string, fields: Record<string, string>): void {
  const fm = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  writeFileSync(join(root, rel), `---\n${fm}\n---\n\nbody text here\n`);
}

describe("runVerify — G1 excludeBase", () => {
  it("passes a status-less runbook (status dropped from required)", () => {
    const root = mkdtempSync(join(tmpdir(), "govkit-g1-"));
    mkdirSync(join(root, "docs", "runbooks"), { recursive: true });
    writeDoc(root, "docs/runbooks/RB-0001-stuck.md", {
      id: "RB-0001",
      title: "Worker job stuck",
      service: "worker",
      severity: "high",
      owner: "TBD",
      date: "2026-06-09",
    });
    const result = runVerify({ root, config: runbookConfig() });
    rmSync(root, { recursive: true, force: true });
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: FAIL — the runbook is flagged `missing or empty required front-matter key: status` because `base.required` is force-unioned.

- [ ] **Step 3: Implement excludeBase filtering**

In `packages/govkit/src/commands/verify.ts`, replace the `required` line inside the `for (const [typeName, def] of Object.entries(types))` loop:

```ts
    const required = [...new Set([...base.required, ...def.required])];
```

with:

```ts
    // RFC-0011 (G1): a type may drop base keys it has no lifecycle for (e.g. a status-less
    // runbook). Effective required = (base.required − excludeBase) ∪ def.required.
    const effectiveBase = def.excludeBase?.length
      ? base.required.filter((k) => !def.excludeBase?.includes(k))
      : base.required;
    const required = [...new Set([...effectiveBase, ...def.required])];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: PASS. (The `index: false` opt-out is needed for this to fully pass — implemented next; if the runbook test still flags a missing INDEX here, proceed to Task 3 which the same fixture depends on, then re-run.)

> Note: this fixture sets `index: false`, exercised in Task 3. If Step 4 still shows an `index` violation, that is expected until Task 3 lands — the `excludeBase` (status) violation must already be gone.

- [ ] **Step 5: Commit**

```bash
git add packages/govkit/src/commands/verify.ts packages/govkit/test/generality.test.ts
git commit -m "feat(verify): excludeBase subtracts base keys per type — G1 (RFC-0011)"
```

---

### Task 3: G1 — `index: false` skips all INDEX checks for a type

**Files:**
- Modify: `packages/govkit/src/commands/verify.ts` — `checkIndex` signature + early return; caller at the `violations.push(...checkIndex(...))` line.
- Test: `packages/govkit/test/generality.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `generality.test.ts`:

```ts
describe("runVerify — G1 index:false", () => {
  it("does not require an INDEX.md for an index:false type", () => {
    const root = mkdtempSync(join(tmpdir(), "govkit-g1idx-"));
    mkdirSync(join(root, "docs", "runbooks"), { recursive: true });
    // NOTE: no INDEX.md written on purpose.
    writeDoc(root, "docs/runbooks/RB-0001-stuck.md", {
      id: "RB-0001",
      title: "Worker job stuck",
      service: "worker",
      severity: "high",
      owner: "TBD",
      date: "2026-06-09",
    });
    const result = runVerify({ root, config: runbookConfig() });
    rmSync(root, { recursive: true, force: true });
    expect(result.violations.filter((v) => v.kind === "index")).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: FAIL — `checkIndex` reports `missing INDEX.md for 1 runbook doc(s)`.

- [ ] **Step 3: Add the opt-out**

In `packages/govkit/src/commands/verify.ts`, change the `checkIndex` signature to receive the type def, and early-return when `index === false`. Replace the function header + the first guard:

```ts
function checkIndex(dir: string, typeName: string, docs: Doc[]): Violation[] {
  if (docs.length === 0) return [];
```

with:

```ts
function checkIndex(dir: string, typeName: string, docs: Doc[], def: DocType): Violation[] {
  if (def.index === false) return []; // RFC-0011 (G1): type keeps no INDEX
  if (docs.length === 0) return [];
```

Update the caller (the line near the end of the type loop):

```ts
    violations.push(...checkIndex(dir, typeName, typeDocs));
```

to:

```ts
    violations.push(...checkIndex(dir, typeName, typeDocs, def));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: PASS — both the Task 2 runbook test and this `index:false` test are now green.

- [ ] **Step 5: Commit**

```bash
git add packages/govkit/src/commands/verify.ts packages/govkit/test/generality.test.ts
git commit -m "feat(verify): index:false opts a type out of INDEX checks — G1 (RFC-0011)"
```

---

### Task 4: G2 — bounded id row lookup (`US-1` no longer matches `US-10`)

**Files:**
- Modify: `packages/govkit/src/commands/verify.ts` — add `rowHasId`; use it in `checkIndex` row lookup.
- Test: `packages/govkit/test/generality.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `generality.test.ts`:

```ts
// Single `us` type, status-only sync (legacy default), used by G2/G3 tests.
function usConfig(index?: GovkitConfig["docs"]["types"][string]["index"]): GovkitConfig {
  return {
    schemaVersion: 1,
    docs: {
      ignore: ["INDEX.md", "_TEMPLATE.md"],
      base: { required: ["id", "title", "status", "owner", "date"] },
      types: {
        us: {
          dir: "docs/issues",
          required: ["id", "title", "status", "owner", "date"],
          idPrefix: "US",
          statuses: ["open", "done"],
          ...(index !== undefined ? { index } : {}),
        },
      },
    },
  };
}

function setupUs(prefix: string, indexBody: string, docs: Record<string, string>[]): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "docs", "issues"), { recursive: true });
  writeFileSync(join(root, "docs", "issues", "INDEX.md"), indexBody);
  for (const d of docs) writeDoc(root, `docs/issues/${d.id}-x.md`, d);
  return root;
}

describe("runVerify — G2 bounded id lookup", () => {
  it("flags US-1 as unindexed when only US-10 has a row", () => {
    const root = setupUs(
      "govkit-g2id-",
      "# US Index\n\n| ID | Title | Status |\n|---|---|---|\n| [US-10](./US-10-x.md) | t | done |\n",
      [{ id: "US-1", title: "t", status: "open", owner: "TBD", date: "2026-06-09" }],
    );
    const result = runVerify({ root, config: usConfig() });
    rmSync(root, { recursive: true, force: true });
    const idx = result.violations.find((v) => v.kind === "index");
    expect(idx?.problems.join(" ")).toContain("US-1");
    expect(idx?.problems.join(" ")).toContain("no row");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: FAIL — current `line.includes("US-1")` matches the `US-10` row, so no violation is produced.

- [ ] **Step 3: Add `rowHasId` and use it**

In `packages/govkit/src/commands/verify.ts`, add this helper just above `checkIndex`:

```ts
// RFC-0011 (G2): an id sits inside a markdown link cell (`[US-0001](./US-0001-x.md)`), so match
// it as a bounded TOKEN anywhere in the row — bounded by a non-id char so `US-1` never matches a
// `US-10` row. Replaces the substring `line.includes(id)` that silently false-passed.
function rowHasId(row: string, id: string): boolean {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9-])${esc}(?![A-Za-z0-9-])`).test(row);
}
```

Inside `checkIndex`, replace the row lookup:

```ts
    const row = lines.find((line) => line.includes(id));
```

with:

```ts
    const row = lines.find((line) => rowHasId(line, id));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/govkit/src/commands/verify.ts packages/govkit/test/generality.test.ts
git commit -m "feat(verify): bounded id row lookup in INDEX — G2 (RFC-0011)"
```

---

### Task 5: G2 + G3 — bounded cell sync over a configurable key set

**Files:**
- Modify: `packages/govkit/src/commands/verify.ts` — add `rowHasCell`; rewrite the per-doc status check in `checkIndex` into a `sync`-key loop.
- Test: `packages/govkit/test/generality.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `generality.test.ts`:

```ts
describe("runVerify — G2 bounded status cell", () => {
  it("does not accept a status that only appears inside the title cell", () => {
    // status 'done' appears as a word in the title, but the Status cell says 'open'.
    const root = setupUs(
      "govkit-g2st-",
      "# US Index\n\n| ID | Title | Status |\n|---|---|---|\n| [US-1](./US-1-x.md) | mark as done | open |\n",
      [{ id: "US-1", title: "mark as done", status: "done", owner: "TBD", date: "2026-06-09" }],
    );
    const result = runVerify({ root, config: usConfig() });
    rmSync(root, { recursive: true, force: true });
    const idx = result.violations.find((v) => v.kind === "index");
    expect(idx?.problems.join(" ")).toContain("status");
  });
});

describe("runVerify — G3 multi-key sync (owner)", () => {
  it("flags an owner-column drift when sync includes owner", () => {
    const root = setupUs(
      "govkit-g3-",
      "# US Index\n\n| ID | Title | Status | Owner |\n|---|---|---|---|\n| [US-1](./US-1-x.md) | t | open | alice |\n",
      [{ id: "US-1", title: "t", status: "open", owner: "bob", date: "2026-06-09" }],
    );
    const result = runVerify({ root, config: usConfig({ sync: ["status", "owner"] }) });
    rmSync(root, { recursive: true, force: true });
    const idx = result.violations.find((v) => v.kind === "index");
    expect(idx?.problems.join(" ")).toContain("owner");
  });

  it("default sync stays status-only (owner drift ignored without config)", () => {
    const root = setupUs(
      "govkit-g3def-",
      "# US Index\n\n| ID | Title | Status | Owner |\n|---|---|---|---|\n| [US-1](./US-1-x.md) | t | open | alice |\n",
      [{ id: "US-1", title: "t", status: "open", owner: "bob", date: "2026-06-09" }],
    );
    const result = runVerify({ root, config: usConfig() });
    rmSync(root, { recursive: true, force: true });
    expect(result.violations.find((v) => v.kind === "index")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: FAIL — the bounded-status test false-passes (`row.includes("done")` matches the title word); the owner-drift test produces no violation (status-only check).

- [ ] **Step 3: Add `rowHasCell` and rewrite the sync loop**

In `packages/govkit/src/commands/verify.ts`, add this helper directly below `rowHasId`:

```ts
// RFC-0011 (G2/G3): a synced column value (status, owner, …) occupies its OWN table cell, so we
// require some cell to equal it exactly after trimming — this is why `done` appearing inside a
// title cell no longer false-passes a `status` sync. Replaces `row.includes(status)`.
function rowHasCell(row: string, value: string): boolean {
  return row.split("|").some((cell) => cell.trim() === value);
}
```

Inside `checkIndex`, replace the per-doc body of the `for (const doc of docs)` loop. The current body is:

```ts
    const id = str(doc.data.id);
    const status = str(doc.data.status);
    if (!id) continue;
    const row = lines.find((line) => rowHasId(line, id));
    if (!row) {
      problems.push(`${id} (${basename(doc.file)}) has no row in INDEX.md`);
    } else if (status && !row.includes(status)) {
      problems.push(`${id} INDEX row status is stale (front-matter status: ${status})`);
    }
```

Replace it with:

```ts
    const id = str(doc.data.id);
    if (!id) continue;
    const row = lines.find((line) => rowHasId(line, id));
    if (!row) {
      problems.push(`${id} (${basename(doc.file)}) has no row in INDEX.md`);
      continue;
    }
    // RFC-0011 (G3): sync each configured key as a bounded cell. Default is status-only, the
    // pre-RFC-0011 behavior. An empty value is the front-matter check's concern, skipped here.
    const sync = def.index && def.index !== false ? def.index.sync : ["status"];
    for (const key of sync) {
      const value = str(doc.data[key]);
      if (value === "") continue;
      if (!rowHasCell(row, value)) {
        problems.push(`${id} INDEX row ${key} is stale or missing (front-matter ${key}: ${value})`);
      }
    }
```

> The `${id} ...` prefix on every problem is load-bearing: `scopeToChanged` extracts the id via `p.split(" ")[0]` to scope `--changed` output. Keep the id first.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: PASS — all generality tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/govkit/src/commands/verify.ts packages/govkit/test/generality.test.ts
git commit -m "feat(verify): bounded-cell sync over configurable index.sync keys — G2/G3 (RFC-0011)"
```

---

### Task 6: Backward-compat — full suite + node CLI parity

**Files:**
- No source changes expected. If any existing test fails, fix the regression (do not edit the test to pass).

- [ ] **Step 1: Run the full package test suite**

Run: `cd packages/govkit && bun test`
Expected: PASS — all prior tests (≈117 `it()` blocks) plus the new generality tests. Bounded matching is stricter; the existing `index-repo` fixture and `verify-checks.test.ts` `indexRows` use clean table cells, so they must stay green. If a prior test fails, the bounded matcher has a real regression — fix `rowHasId`/`rowHasCell`, not the test.

- [ ] **Step 2: Build and run the gate on govkit's own docs**

Run:
```bash
bun run build
node packages/govkit/dist/cli.js verify
node packages/govkit/dist/cli.js eval
```
Expected: `verify: OK — 17 doc(s) checked, 0 violations.` and `eval: OK`. govkit's own config sets neither new field, so this proves zero behavior change for the unchanged case.

- [ ] **Step 3: Commit (only if a fix was needed)**

```bash
git add -A
git commit -m "fix(verify): preserve INDEX matching parity for clean-table configs (RFC-0011)"
```

---

### Task 7: n=3 generality regression fixture (customs-shaped)

**Files:**
- Create: `packages/govkit/test/fixtures/generality-repo/govkit.yml`
- Create: `packages/govkit/test/fixtures/generality-repo/docs/runbooks/INDEX.md` (and one RB doc)
- Create: `packages/govkit/test/fixtures/generality-repo/docs/issues/INDEX.md` (and one US doc)
- Modify: `packages/govkit/test/generality.test.ts` — load the on-disk fixture and assert it passes.

> Why a committed fixture, not the live sibling repos: the published CI has no `../customs-platform`. This fixture mirrors customs' divergence (a status-less runbook type + a US type with `index.sync: [status, owner]` + a multi-column INDEX) so the generality guarantee is reproducible in govkit's own suite. The live-customs `verify.sh` deletion is the separate acceptance step performed in that repo.

- [ ] **Step 1: Write the failing test**

Append to `generality.test.ts`:

```ts
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

describe("runVerify — n=3 generality fixture (customs-shaped)", () => {
  it("passes a status-less runbook type alongside owner-synced issues", () => {
    const root = join(here, "fixtures", "generality-repo");
    const result = runVerify({ root });
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: FAIL — the fixture directory does not exist yet (`0 doc(s)` / load error).

- [ ] **Step 3: Create the fixture**

Create `packages/govkit/test/fixtures/generality-repo/govkit.yml`:

```yaml
schemaVersion: 1
docs:
  ignore: [INDEX.md, _TEMPLATE.md]
  base:
    required: [id, title, status, owner, date]
  types:
    us:
      dir: docs/issues
      required: [id, title, status, owner, date, priority]
      idPrefix: US
      startStatus: open
      statuses: [open, in_progress, done, dropped]
      index:
        sync: [status, owner]
    runbook:
      dir: docs/runbooks
      required: [id, title, service, severity, owner, date]
      idPrefix: RB
      excludeBase: [status]
      index: false
```

Create `packages/govkit/test/fixtures/generality-repo/docs/issues/INDEX.md`:

```markdown
# US Backlog Index

| Id | Title | Priority | Status | Owner |
|---|---|---|---|---|
| [US-0001](./US-0001-triage.md) | First triage story | P1 | open | baodq97 |
```

Create `packages/govkit/test/fixtures/generality-repo/docs/issues/US-0001-triage.md`:

```markdown
---
id: US-0001
title: First triage story
status: open
owner: baodq97
date: 2026-06-09
priority: P1
---

As an operator I want a triage story so that work is tracked. Body has enough prose to be real.
```

Create `packages/govkit/test/fixtures/generality-repo/docs/runbooks/INDEX.md`:

```markdown
# Runbook Index

| ID | Title | Service | Severity | Owner |
|---|---|---|---|---|
| [RB-0001](./RB-0001-worker-stuck.md) | Worker job stuck | worker | high | baodq97 |
```

Create `packages/govkit/test/fixtures/generality-repo/docs/runbooks/RB-0001-worker-stuck.md`:

```markdown
---
id: RB-0001
title: Worker job stuck
service: worker
severity: high
owner: baodq97
date: 2026-06-09
---

When the worker job is stuck, drain the queue and restart the pod. Steps follow in this body.
```

> `runbook` sets `index: false`, so its INDEX.md is not required — it is included here only to prove the opt-out does not *reject* a present INDEX. The `us` type proves owner-column sync passes when the row matches.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/govkit && bun test test/generality.test.ts`
Expected: PASS — the fixture verifies clean.

- [ ] **Step 5: Commit**

```bash
git add packages/govkit/test/fixtures/generality-repo packages/govkit/test/generality.test.ts
git commit -m "test(verify): n=3 generality regression fixture — customs-shaped runbook + owner sync (RFC-0011)"
```

---

### Task 8: Full check + reconcile RFC-0011 status

**Files:**
- No source changes. Run the full pipeline; RFC status flip is the owner's, not the agent's.

- [ ] **Step 1: Run the full repo check**

Run: `bun run check`
Expected: Biome clean, typecheck clean, build OK, all tests pass, `govkit verify` + node-CLI verify both OK.

- [ ] **Step 2: Surface the RFC for owner acceptance (do NOT self-flip)**

The implementation is complete but RFC-0011 stays `status: draft, owner: TBD`. Per govkit's governance rule, only the human owner flips status and assigns owner, via an explicit accept commit. Report completion and the verified `bun run check` output; ask the owner to authorize the accept (and, per RFC-0010, the flip target is `implemented` with an `## As-built` / `## Deviations from design` section once code has shipped + reconciled).

- [ ] **Step 3: (Owner-authorized only) record as-built and flip**

Once the owner authorizes in-session: add `## As-built` and `## Deviations from design` sections to `docs/rfc/RFC-0011-config-generality-hardening.md`, update `docs/rfc/INDEX.md` status to `implemented` and owner to the authorized handle, then:

```bash
node packages/govkit/dist/cli.js verify   # required-sections gate fires for implemented
git add docs/rfc/RFC-0011-config-generality-hardening.md docs/rfc/INDEX.md
git commit -m "docs(RFC-0011): accept + as-built — flip draft -> implemented (owner-authorized)"
```

---

## Self-review

- **Spec coverage:** G1 → Tasks 2 (excludeBase) + 3 (index:false); G2 → Tasks 4 (bounded id) + 5 (bounded cell); G3 → Task 5 (configurable sync keys). Backward-compat/risk → Task 6. n=3 proof → Task 7. RFC `governs` files (`config.ts`, `verify.ts`) both modified. Success criterion (customs deletes verify.sh) is a consumer-side acceptance step, noted in Task 7 and the RFC rollout — not code in this repo.
- **Open-question resolution:** RFC open question "forbid excluding id/title" → Task 1 guard. "postmortems carry status, only runbooks are status-less" → fixture uses `excludeBase` on runbook only, `index.sync` on the status-bearing type.
- **Type consistency:** `checkIndex(dir, typeName, docs, def)` signature is set in Task 3 and used unchanged in Tasks 4–5; helpers `rowHasId`/`rowHasCell` are named consistently across tasks; `IndexConfig` shape `{ sync: string[] }` is consistent in config, tests, and the `checkIndex` sync read.
- **No placeholders:** every code/test step shows complete content; commands include expected output.
