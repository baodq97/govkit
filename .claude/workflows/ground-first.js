// .claude/workflows/ground-first.js — the UPSTREAM capstone workflow.
// The mirror image of sdlc.js. sdlc.js automates the DOWNSTREAM half (PRD -> RFC ->
// ADR -> US -> Foundation -> Code) and STRUCTURALLY ASSUMES a grounded PRD/RFC already
// exists. This script automates the UPSTREAM half that produces that grounded input:
//   DIAGNOSE -> GROUND-INVENTORY -> VISION-FIRST -> DECOMPOSE(grounding-driven) ->
//   WALKING-SKELETON  ->  hand off to sdlc.js.
// It deliberately STOPS at a grounded walking-skeleton RFC. It never runs the downstream
// half — the handoff is a human act (see the final log()).
//
// WHY THIS EXISTS (ground truth, this session): btm-systems passed `govkit verify` (exit 0)
// and `govkit eval` (100/100) while it was STALLED two days at the domain->RFC edge and
// then fully rolled back — because it ran DECOMPOSE breadth-first on 0 confirmed events.
// The gate was BLIND to grounding. mandat stayed healthy because it authored a
// walking-skeleton RFC FIRST, then deepened slices. This workflow encodes that difference:
// it makes the grounding ratio VISIBLE before decompose and HALTS rather than let a
// breadth-first decompose run on unconfirmed evidence.
//
// MANDATORY FALLBACK — workflows are research-preview and globally disableable
// (disableWorkflows / CLAUDE_CODE_DISABLE_WORKFLOWS=1), and cannot be bundled in a plugin
// (no `workflows` field in plugin.json). If this script does not run, drive the SAME order
// BY HAND: (1) fan out readers to run `ddd_state.py --json` + `ddd_check.py --json` and
// `npx govkit verify` / `npx govkit eval` capturing EXIT codes, and read LEARNING-LOOP.md
// + journals for the stall edge; join them into one warning-only diagnose report by hand.
// (2) run the ddd-flow:2-discover DISCOVER mode over the legacy corpus and validate with
// `mine_coverage.py --strict`. (3) follow ddd-flow:1-understand then a COARSE
// ddd-flow:3-decompose, land a C4-L1 vision map via swe-flow:spec-author at draft.
// (4) COMPUTE the grounding ratio yourself and STOP if confirmed events/rules are below
// floor — do NOT decompose on thin grounding. (5) follow ddd-flow:3-decompose +
// measure-playbook Stages 6/7 to emit a CANDIDATE model at draft. (6) author ONE thin
// walking-skeleton RFC via swe-flow:spec-author + swe-flow:work-breakdown, then run the
// sdlc workflow. Nothing is lost — the govkit PreToolUse hook + CI `govkit verify` enforce
// every structural gate regardless. The workflow is an accelerant, not the source of truth.
//
// VERIFIED CONSTRAINT (a): this script has NO filesystem/shell access. Every read, script
// run (ddd_state/ddd_check/mine_coverage, `govkit verify`/`eval`), and every draft write is
// done by a dispatched agent; the script only sequences them and reasons over their
// returned structured payloads.
// VERIFIED CONSTRAINT (b): this script NEVER flips a governed-doc `status:` and NEVER
// assigns an owner. Every artifact it causes to be written lands `owner: TBD` at its START
// status (draft). AGENT-FIRST, HUMAN-SECOND: the workflow ACTS on the reversible, on-draft
// judgements itself — root cause A/B/C (D8, routing only) and the core/supporting/generic tags
// (V2, proposed into the draft) — surfacing them for a human only if it flags low confidence.
// Only the two IRREDUCIBLE gates stay human, as a thin confirm the agent has fully packeted:
// candidate->confirmed + slice ratification (DC5), and the terminal status flips (the vision PRD
// draft->approved, the walking-skeleton RFC ->accepted at handoff). An agent cannot confirm a
// domain fact and cannot own the accountability of an approval — those a human ratifies in a
// separate accept commit citing authorization (root AGENTS.md § Agent constraints; sdlc.js same).
// VERIFIED CONSTRAINT (c): the GROUNDING-READINESS signal is WARNING-FIRST. It does not
// harden govkit's verify/eval gate to fail (that is a human decision after a measured slip
// rate — DB2). It only controls THIS workflow's control flow: below floor it emits a loud
// warning and HALTS before DECOMPOSE, unless the human passes an explicit override arg.
//
// AGENT DISPATCH: plugin-namespaced agentTypes only (swe-flow:reviewer, :red-teamer,
// :doc-keeper, :analyst). Project .claude/agents are NOT in the workflow agentType registry
// — only built-in + plugin agents are — so swe-flow / ddd-flow must be installed. A SKILL
// (ddd-flow:1-understand, :2-discover, :3-decompose, :design, swe-flow:spec-author,
// :work-breakdown) is NOT a dispatchable agentType; skill DISCIPLINE is run by guiding a
// default agent to read and obey the SKILL.md (see followSkill), exactly as sdlc.js's
// authorArtifact guides a default agent to follow spec-author.

export const meta = {
  name: "ground-first",
  description:
    "Upstream capstone: DIAGNOSE the flow-block, GROUND-INVENTORY the legacy corpus, " +
    "author a coarse C4-L1 VISION map, emit a GROUNDING-READINESS signal and HALT before " +
    "a breadth-first DECOMPOSE, run a grounding-driven triangulated decompose to a CANDIDATE " +
    "model, then author ONE walking-skeleton RFC and hand off to the sdlc workflow. " +
    "Warning-first; proposes into every human ratification gate and flips nothing.",
  phases: [
    {
      title: "Diagnose",
      detail:
        "join verify/eval EXIT + grounding ratio + breadth/depth + stall edge into one warning-only report; propose root cause A/B/C",
    },
    {
      title: "GroundInventory",
      detail:
        "quantify + mine the legacy corpus (measure-playbook), validate coverage with mine_coverage.py --strict",
    },
    {
      title: "Vision",
      detail:
        "coarse C4-L1 vision map (stable capability ids, connections, honest open questions) landed at draft, owner TBD",
    },
    {
      title: "Readiness",
      detail:
        "GROUNDING-READINESS gate — halt before DECOMPOSE when confirmed events/rules are below floor (warning-first)",
    },
    {
      title: "Decompose",
      detail:
        "grounding-driven, LANGUAGE-LED triangulation (polysemy Stage 6, FK-graph cross-check-only Stage 7); emit CANDIDATE model at draft",
    },
    {
      title: "Skeleton",
      detail:
        "author ONE thin walking-skeleton RFC on the grounded slice at draft, then hand off to sdlc.js",
    },
  ],
};

// args (all optional except a seed): {
//   feature       — one-line capability/slice statement seeding the run (falls back below).
//   repoPath      — the consumer govkit repo to diagnose/ground (default: the cwd the agents see).
//   brownfield    — true when a mineable legacy corpus exists; false skips GROUND-INVENTORY (greenfield).
//   corpusGlobs   — globs the mining reads, e.g. ["solutions/**/*.xml","packages/**/*.cs"].
//   skipVision    — true when a current C4-L1 vision map already exists and verifies.
//   groundingFloor — { events, rules, ratio } overriding the defaults below.
//   acknowledgeThinGrounding — HUMAN OVERRIDE: proceed past the readiness HALT with a loud
//                    warning. Warning-first honouring — the default is to STOP.
// }
const ARGS = typeof args === "string" ? JSON.parse(args) : (args ?? {});
const feature = ARGS.feature || "the capability slice to ground";
const repoPath = ARGS.repoPath || "the consumer repo checkout (cwd)";
const brownfield = ARGS.brownfield !== false; // default: assume a legacy corpus to mine
const corpusGlobs = ARGS.corpusGlobs ?? [];

// The grounding floor. Defaults encode DC1: a slice is groundable only with >=1 confirmed
// event AND >=1 stated rule; the ratio floor guards against a candidate-only pile (btm had
// 1 confirmed vs 12+ candidate, 0 confirmed events). Owner preference is warning-first, so
// these are a HALT threshold for THIS workflow, not a govkit gate hardening.
// ratio 0.34 matches ddd_check.py check 16's `ratio_floor` (steps.yml `grounding:`) — one number
// for confirmed:candidate across the workflow halt and the warning gate. Override per run via args.
const FLOOR = { events: 1, rules: 1, ratio: 0.34, ...(ARGS.groundingFloor ?? {}) };

// Cross-cutting PROVENANCE discipline (QG1). The theme uniting this session's escapes
// ("not found became not built", a fabricated citation, recon-read-as-mined, fabricated
// model invariants, green-over-unstaged-edits): a claim is valid ONLY from real evidence
// with a locator. Appended to every grounding/diagnose prompt; surfaced warning-only.
const PROVENANCE =
  "Back every claim with a locator ('not found' is not 'not built'); mined items are candidate, " +
  "never confirmed. The skills carry the full discipline — this is the one-line reminder.";

// ---- Dispatch helpers -------------------------------------------------------

// dispatchRole — run a swe-flow AGENT by short name (reviewer/red-teamer/doc-keeper/analyst).
// Try the installed plugin's namespaced agentType first; when it cannot RESOLVE (plugin not
// installed pre-release), fall back to a default agent told to read the role file and embody
// it under the SAME prompt + schema. Adapted verbatim in spirit from gate-loop.js: the
// .catch MUST discriminate — only a dispatch/agent-type-resolution failure warrants the
// fallback; a schema-validation error or a real error from a resolved agent must propagate,
// or a genuine finding hides behind a "ran degraded" notice.
const AGENT_RESOLUTION_FAILURE =
  /agent ?type|unknown agent|not found|unregistered|no such agent|failed to resolve|not available/i;
// nn — a dispatched agent returns null when it dies on a terminal API error after retries, or the
// user skips it mid-run; every result below is dereferenced, so turn that null into a loud, named
// abort instead of a downstream "cannot read property of null". (The parent workflow that authored
// this script died exactly this way — an unguarded null verdict at r.verdict.verdict.)
const nn = (r, label) => {
  if (r == null)
    throw new Error(
      `[ground-first] ${label} returned no result (agent died or was skipped) — aborting`,
    );
  return r;
};
const dispatchRole = (name, prompt, opts) =>
  agent(prompt, { ...opts, agentType: `swe-flow:${name}` })
    .catch((err) => {
      const message = String(err?.message ?? err);
      const match = message.match(AGENT_RESOLUTION_FAILURE);
      if (!match) throw err;
      log(
        `[ground-first] agentType swe-flow:${name} did not resolve (matched "${match[0]}") — ` +
          `falling back to a default agent reading the ${name} agent definition`,
      );
      return agent(
        `FIRST read \`plugins/swe-flow/agents/${name}.md\` in full (it exists in the govkit ` +
          `monorepo). If absent, read \`~/.claude/plugins/cache/govkit/swe-flow/*/agents/${name}.md\`. ` +
          `If neither exists, use the role as summarized below. EXECUTE that role exactly — honour ` +
          `every never-rule in it (it never edits, never flips a status, never assigns an owner).\n${prompt}`,
        opts,
      );
    })
    .then((r) => nn(r, `swe-flow:${name}`));

// followSkill — run a SKILL's DISCIPLINE. A skill is NOT a dispatchable agentType (verified
// in sdlc.js), so guide a DEFAULT agent (no agentType) to read and obey the SKILL.md, exactly
// as sdlc.js's authorArtifact guides a default agent to follow spec-author. `skill` is the
// namespaced id, e.g. "ddd-flow:2-discover" or "swe-flow:spec-author".
const followSkill = (skill, prompt, opts) =>
  agent(
    `Follow the ${skill} skill. If the plugin is installed, invoke it directly; otherwise read ` +
      `its SKILL.md on disk (\`plugins/${skill.split(":")[0]}/skills/${skill.split(":")[1]}/SKILL.md\` ` +
      `in the govkit monorepo, or the installed plugin cache) and embody its rules exactly, ` +
      `including every never-rule. Target repo: ${repoPath}.\n${prompt}`,
    opts,
  ).then((r) => nn(r, skill));

// ---- Schemas ----------------------------------------------------------------

// An authored artifact (vision map, candidate model, RFC): what was written, so a reviewer
// verifies front-matter without the workflow touching the filesystem. owner MUST be "TBD".
const artifactSchema = {
  type: "object",
  required: ["path", "id", "startStatus"],
  properties: {
    path: { type: "string" },
    id: { type: "string" },
    startStatus: { type: "string" }, // "draft" — never advanced
    owner: { type: "string" }, // must be "TBD"
  },
};

// D7 — the JOIN. The single warning-only diagnose report nothing in the codebase produces
// today (joined only in a human's head). Joins verify/eval EXIT + the grounding ratio +
// breadth/depth + the stall edge, and PROPOSES root cause A/B/C (a human ratifies at D8).
const diagnoseSchema = {
  type: "object",
  required: [
    "verifyExit",
    "evalScore",
    "confirmedEvents",
    "confirmedRules",
    "confirmedContexts",
    "candidateContexts",
    "aggregateDirs",
    "groundingBlind",
    "stallEdge",
    "warnings",
    "proposedRootCause",
  ],
  properties: {
    verifyExit: { type: "number" }, // 0 == green
    evalScore: { type: "string" }, // e.g. "100/100"
    confirmedEvents: { type: "number" },
    confirmedRules: { type: "number" },
    confirmedContexts: { type: "number" },
    candidateContexts: { type: "number" },
    aggregateDirs: { type: "number" }, // count of aggregates/ dirs — the depth tell
    // THE CORE PRODUCT FAILURE made explicit: verify green WHILE a decompose/model artifact
    // exists AND confirmedEvents == 0 (or confirmedRules == 0). btm was true here.
    groundingBlind: { type: "boolean" },
    stallEdge: { type: "string" }, // e.g. "domain->RFC"
    warnings: { type: "array", items: { type: "string" } },
    // A/B/C is a PROPOSAL the human ratifies. A=scope-too-broad, B=grounding-too-thin,
    // C=wrong-blocking-mechanism (deterministic gate vs human PO vs adversarial agent).
    proposedRootCause: {
      type: "object",
      required: ["class", "rationale"],
      properties: {
        class: {
          enum: [
            "A-scope-too-broad",
            "B-grounding-too-thin",
            "C-wrong-blocking-mechanism",
            "unclear",
          ],
        },
        rationale: { type: "string" },
      },
    },
  },
};

// GI4 — coverage-or-silence. mine_coverage.py --strict must account for every file.
const coverageSchema = {
  type: "object",
  required: ["strictExit", "filesTotal", "parsed", "skipped", "failed", "unclassified"],
  properties: {
    strictExit: { type: "number" }, // 0 == every file accounted for
    filesTotal: { type: "number" }, // the inventory floor every mined number reconciles to
    parsed: { type: "number" },
    skipped: { type: "number" },
    failed: { type: "number" },
    unclassified: { type: "number" }, // must be 0 for a clean --strict
  },
};

// The GROUNDING-READINESS signal (DC1 gate). Computed from ddd_check/ddd_state JSON + the
// mined facts.jsonl. `ready` is the workflow's PROPOSAL; the HALT/override is decided below.
const readinessSchema = {
  type: "object",
  required: ["confirmedEvents", "confirmedRules", "confirmedCandidateRatio", "belowFloorReasons"],
  properties: {
    confirmedEvents: { type: "number" },
    confirmedRules: { type: "number" },
    confirmedCandidateRatio: { type: "number" },
    modelArtifactExists: { type: "boolean" },
    belowFloorReasons: { type: "array", items: { type: "string" } },
  },
};

// DC1 slice picker PROPOSAL — scored by grounding-readiness, NOT breadth. A human ratifies
// the choice at DC5. Refuse to recommend a slice by context-count (that is the btm failure).
const sliceSchema = {
  type: "object",
  required: ["recommended", "candidates"],
  properties: {
    recommended: { type: "string" },
    candidates: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "confirmedEvents", "confirmedRules", "groundingScore"],
        properties: {
          id: { type: "string" },
          confirmedEvents: { type: "number" },
          confirmedRules: { type: "number" },
          groundingScore: { type: "number" },
          rationale: { type: "string" },
        },
      },
    },
  },
};

// =============================================================================
// PHASE 1 — DIAGNOSE (D1-D8). Fan out readers over the chain, the modelling state, and the
// gate exit codes; JOIN them into one warning-only report (D7); PROPOSE root cause A/B/C.
// =============================================================================
phase("Diagnose");

// D1 (chain enumeration) + D5 (stall evidence) + D2/D3/D6 (modelling state, breadth/depth) +
// D4 (gate-blind exhibit) — three DISJOINT reader lenses in parallel (pure reads, no judgement).
const [chain, modelState, gate] = await parallel([
  // D1 (chain enumeration) + D5 (stall evidence). Narrative, not a script.
  () =>
    followSkill(
      "ddd-flow:design",
      `DIAGNOSE lens 1 — the CHAIN + the STALL. Enumerate the govkit doc chain (PRD -> RFC -> ` +
        `ADR -> US, plus REL and the docs/domain tree). Then read LEARNING-LOOP.md, AGENTS.md, ` +
        `the journals (.ddd-journal / .govkit/journal.jsonl), and \`git log\` for the stall ` +
        `timeline: which chain EDGE stalled, for how long, and any 'drift ok:false' tells ` +
        `stamped BEFORE a merge/flip commit. Report the stall edge and the written evidence. ` +
        `Read only; interpret, do not fix. ${PROVENANCE}`,
      { label: "diagnose:chain", phase: "Diagnose" },
    ),
  // D2/D3 (modelling state) + D6 (breadth vs depth). Deterministic scripts.
  () =>
    followSkill(
      "ddd-flow:design",
      `DIAGNOSE lens 2 — the MODELLING STATE. Run the design skill's deterministic scripts and ` +
        `report their real output: \`python3 <ddd-flow>/skills/design/scripts/ddd_state.py ` +
        `--root . --json\` and \`ddd_check.py --root . --json\`. Extract the confirmed vs ` +
        `candidate tally, the discovery-state-unlabelled findings, and — the breadth/depth tell ` +
        `— the count of candidate contexts vs the count of aggregates/ directories that actually ` +
        `exist. Many candidate contexts with ZERO aggregates/ dirs is breadth-first-on-thin- ` +
        `grounding (the btm shape) not a modelled domain. ${PROVENANCE}`,
      { label: "diagnose:model", phase: "Diagnose" },
    ),
  // D4 — the gate-blind exhibit. Capture EXIT codes; a green here is the FAILURE, not readiness.
  () =>
    dispatchRole(
      "reviewer",
      `DIAGNOSE lens 3 — the GATE-BLIND EXHIBIT. In ${repoPath} run \`npx govkit verify\` and ` +
        `\`npx govkit eval\` and report their REAL exit codes and the eval score. Do not fix ` +
        `anything. Note explicitly: a green verify + a high eval score prove STRUCTURE only, ` +
        `never grounding — this is the gate that was blind while btm stalled two days at ` +
        `domain->RFC on 0 confirmed events. ${PROVENANCE}`,
      { label: "diagnose:gate", phase: "Diagnose" },
    ),
]);

// D7 — the JOIN (the core net-new primitive). One agent assembles the warning-only report
// from the three lenses and PROPOSES root cause A/B/C. It computes groundingBlind explicitly.
const diagnose = await dispatchRole(
  "analyst",
  `Assemble the single WARNING-ONLY 'govkit diagnose' report from these three reader lenses — ` +
    `nothing in the codebase joins them today. CHAIN/STALL: ${JSON.stringify(chain)}. ` +
    `MODELLING STATE: ${JSON.stringify(modelState)}. GATE EXIT: ${JSON.stringify(gate)}. ` +
    `Join: verify/eval EXIT + the confirmed/candidate + confirmed-events/rules grounding ratio ` +
    `+ the breadth/depth (candidate contexts vs aggregates/ dirs) + the stall edge. Set ` +
    `groundingBlind = true iff a decompose/model artifact exists AND verify is green AND ` +
    `(confirmedEvents == 0 OR confirmedRules == 0) — the core product failure. Then PROPOSE a ` +
    `root cause: A-scope-too-broad / B-grounding-too-thin / C-wrong-blocking-mechanism, with a ` +
    `rationale grounded in the evidence. This is a PROPOSAL only. ${PROVENANCE}`,
  { label: "diagnose:join", phase: "Diagnose", schema: diagnoseSchema },
);
log(
  `[ground-first] DIAGNOSE report — stallEdge=${diagnose.stallEdge}; verifyExit=${diagnose.verifyExit}; ` +
    `eval=${diagnose.evalScore}; confirmedEvents=${diagnose.confirmedEvents}; ` +
    `confirmedRules=${diagnose.confirmedRules}; candidateContexts=${diagnose.candidateContexts}; ` +
    `aggregateDirs=${diagnose.aggregateDirs}; groundingBlind=${diagnose.groundingBlind}. ` +
    `${diagnose.warnings.length} warning(s): ${diagnose.warnings.join(" | ") || "none"}.`,
);

// D8 — root-cause A/B/C classification. AGENT-FIRST: this only routes the run and is reversible,
// so the workflow acts on its own classification and continues; it surfaces the call for a human
// only when the agent itself flags low confidence. No status moves here.
log(
  `[ground-first] D8 (agent-first): acting on root cause = ${diagnose.proposedRootCause.class} — ` +
    `"${diagnose.proposedRootCause.rationale}". Routing on it (reversible); flag for a human only ` +
    `if this classification is low-confidence.`,
);

// =============================================================================
// PHASE 2 — GROUND-INVENTORY (GI1-GI4). Brownfield only. Quantify + mine the legacy corpus,
// then validate coverage-or-silence. Skipped for greenfield.
// =============================================================================
phase("GroundInventory");
let coverage = null;
if (!brownfield) {
  log("[GroundInventory] skipped — args.brownfield=false (greenfield, no mineable legacy corpus).");
} else {
  // GI1/GI2 — quantify the inventory floor + both triangulation axes (structure FK-graph,
  // behaviour events). GI3 — mine via the measure-playbook (facts.jsonl L0 lossless + manifest).
  const mining = await followSkill(
    "ddd-flow:2-discover",
    `Run DISCOVER mode over the legacy corpus in ${repoPath}${
      corpusGlobs.length ? ` (globs: ` + `${JSON.stringify(corpusGlobs)})` : ""
    }. First set the INVENTORY FLOOR (GI1): count the ` +
      `corpus (e.g. \`find ... -name '*.xml' | wc -l\`) — every mined number must later ` +
      `reconcile to it. Quantify BOTH triangulation axes (GI2): the STRUCTURE axis (relationship ` +
      `xml / EntityRelationship FK-graph) and the BEHAVIOUR axis (plugin .cs events, legacy vs ` +
      `new). Then MINE per the references/measure-playbook.md (GI3): emit facts.jsonl (append- ` +
      `only, L0 lossless) with a per-stage coverage manifest; every filter reports its dropped ` +
      `count. Decide corpus MINEABILITY (structured AND >=20 files, or one artifact >=200 defs). ` +
      `Write facts + manifest only; confirm nothing. ${PROVENANCE}`,
    { label: "ground:mine", phase: "GroundInventory" },
  );
  // GI4 — coverage-or-silence. mine_coverage.py --strict exits 1 on any unclassified file or
  // unrecognised manifest key. Silence read as absence is the escape this formalises.
  coverage = await dispatchRole(
    "verifier",
    `Validate mining coverage: run \`python3 <ddd-flow>/skills/2-discover/scripts/mine_coverage.py ` +
      `--strict\` against the manifest + corpus glob and report its REAL exit code and counts. ` +
      `Every file must be accounted for: parsed | skipped-with-reason | failed-with-error. A ` +
      `non-zero exit means the mine is not yet coverage-complete — surface it, do not paper over ` +
      `it. Mining summary to validate against: ${JSON.stringify(mining)}. ${PROVENANCE}`,
    { label: "ground:coverage", phase: "GroundInventory", schema: coverageSchema },
  ).catch((err) => {
    // Fallback: verifier not resolvable AND not a resolution error handled by dispatchRole —
    // if the schema/analysis itself failed we still must not silently proceed. Re-log and rethrow.
    log(`[GroundInventory] coverage validation failed hard: ${String(err?.message ?? err)}`);
    throw err;
  });
  if (coverage.strictExit !== 0 || coverage.unclassified > 0) {
    log(
      `[GroundInventory] WARNING: mine_coverage --strict exit=${coverage.strictExit}, ` +
        `unclassified=${coverage.unclassified} of ${coverage.filesTotal}. The corpus is not yet ` +
        `coverage-complete; grounding computed from it is provisional (warning-only).`,
    );
  }
}

// =============================================================================
// PHASE 3 — VISION-FIRST (V1-V3). A COARSE C4-L1 vision map: stable capability ids +
// connections + core/supporting/generic + honest open questions. Must NOT deepen to
// aggregates (that collapses the altitude ladder). Lands at draft, owner TBD.
// =============================================================================
phase("Vision");
let vision = null;
if (ARGS.skipVision) {
  log(
    "[Vision] skipped — args.skipVision (a current C4-L1 vision map already exists and verifies).",
  );
} else {
  // V1 — classification inputs from 1-understand, then a COARSE decompose framing, landed as a
  // net-new vision-map artifact by spec-author. Cadence enforced: coarse, hand-drawn, rots in
  // years — the generate-don't-hand-draw layer is aggregates, which this phase must NOT touch.
  vision = await followSkill(
    "swe-flow:spec-author",
    `Author a COARSE C4-L1 VISION MAP for ${repoPath}, grounded in existing docs. First gather ` +
      `1-understand inputs (business_role, evolution_stage, differentiation) and a COARSE ` +
      `3-decompose sketch — capabilities only, NO aggregates, NO weekly-cadence depth. The map ` +
      `carries: stable capability ids, the connections between them, a core/supporting/generic ` +
      `tag PER capability, and an explicit list of honest OPEN QUESTIONS. Land it as a governed ` +
      `draft (owner: TBD, START status only, INDEX row) and run \`npx govkit verify\`, fixing ` +
      `until clean. A thin dated map beats a full stale one — do NOT over-deepen. Return the ` +
      `artifact descriptor. ${PROVENANCE}`,
    { label: "vision:author", phase: "Vision", schema: artifactSchema },
  );
  // V2 — core / supporting / generic tags. AGENT-FIRST: the agent writes its proposed tags into
  // the DRAFT vision map; they are not a separate gate. The human confirms them once, folded into
  // the single prd draft->approved ratification below — not as a standalone stop.
  log(
    `[ground-first] V2 (agent-first): vision map ${vision.id} carries the agent's proposed ` +
      `core/supporting/generic tags in the draft. They are confirmed at the prd draft->approved ` +
      `flip (the human's thin-confirm), not as a separate gate. Map stays draft/owner:TBD.`,
  );
}

// =============================================================================
// PHASE 4 — GROUNDING-READINESS (the central STOP). Compute the grounding ratio and HALT
// before DECOMPOSE when confirmed events/rules are below floor. WARNING-FIRST: the default is
// to stop; the human may override with args.acknowledgeThinGrounding. This is the guard that
// makes the gate-blind-to-grounding failure impossible to run past unknowingly.
// =============================================================================
phase("Readiness");
const readiness = await followSkill(
  "ddd-flow:design",
  `Compute the GROUNDING-READINESS signal for the slice "${feature}" in ${repoPath}. From ` +
    `ddd_check.py/ddd_state.py --json and the mined facts.jsonl, report: confirmedEvents, ` +
    `confirmedRules, and the confirmed:candidate ratio; whether a decompose/model artifact ` +
    `already exists; and list belowFloorReasons for any dimension under the floor ` +
    `(events<${FLOOR.events}, rules<${FLOOR.rules}, ratio<${FLOOR.ratio}). Count only ` +
    `CONFIRMED (human-ratified) evidence — a candidate pile is not grounding. Do NOT flip or ` +
    `promote anything. ${PROVENANCE}`,
  { label: "readiness:compute", phase: "Readiness", schema: readinessSchema },
);
const below =
  readiness.confirmedEvents < FLOOR.events ||
  readiness.confirmedRules < FLOOR.rules ||
  readiness.confirmedCandidateRatio < FLOOR.ratio;
log(
  `[ground-first] GROUNDING-READINESS — confirmedEvents=${readiness.confirmedEvents} ` +
    `(floor ${FLOOR.events}); confirmedRules=${readiness.confirmedRules} (floor ${FLOOR.rules}); ` +
    `ratio=${readiness.confirmedCandidateRatio} (floor ${FLOOR.ratio}); belowFloor=${below}.`,
);
if (below) {
  const why = readiness.belowFloorReasons.join("; ") || "confirmed events/rules below floor";
  const halt =
    `[ground-first] GROUNDING BELOW FLOOR — ${why}. Routing back to DISCOVER: DECOMPOSE must NOT ` +
    `run breadth-first on unconfirmed evidence (GROUNDING-BEFORE-DEPTH). This is exactly the btm ` +
    `failure mode — 0 confirmed events, verify green, a two-day stall then a rollback.`;
  // HUMAN GATE (READINESS): the default is a HALT. Warning-first means the human may knowingly
  // override — but only with an explicit arg citing authorization, never silently.
  if (!ARGS.acknowledgeThinGrounding) {
    throw new Error(
      halt +
        " Halting before DECOMPOSE. To proceed anyway (a human decision), re-run with " +
        "args.acknowledgeThinGrounding set and go deepen discovery first.",
    );
  }
  log(halt);
  log(
    "[ground-first] HUMAN OVERRIDE acknowledgeThinGrounding set — proceeding into DECOMPOSE on " +
      "thin grounding, knowingly, on the human's explicit authorization. This is warning-first, " +
      "not gate-hardening: govkit's own verify/eval gate is unchanged.",
  );
}

// =============================================================================
// PHASE 5 — DECOMPOSE (DC1-DC5). Grounding-driven and LANGUAGE-LED. Pick the slice by
// grounding-readiness (not breadth); triangulate language x structure x behaviour with
// STRUCTURE ONLY AS A CROSS-CHECK; emit a CANDIDATE model at draft; hand to the human to
// confirm a subset and ratify the slice.
// =============================================================================
phase("Decompose");

// DC1 — the grounding-readiness SLICE PICKER (a scored proposal, not a breadth count). The
// human ratifies at DC5; refuse to recommend by context-count.
const pick = await dispatchRole(
  "analyst",
  `Propose the DECOMPOSE slice for "${feature}" by GROUNDING-READINESS, not breadth. Score each ` +
    `candidate slice by its confirmed events + stated rules (a slice needs >=${FLOOR.events} ` +
    `confirmed event and >=${FLOOR.rules} stated rule to be pickable). Recommend the ` +
    `best-grounded slice and show the score for each. Do NOT recommend by context-count — a pile ` +
    `of candidate contexts with 0 aggregates is the btm failure. Readiness: ` +
    `${JSON.stringify(readiness)}. This is a PROPOSAL the human ratifies. ${PROVENANCE}`,
  { label: "decompose:pick", phase: "Decompose", schema: sliceSchema },
);
log(
  `[ground-first] DECOMPOSE slice proposed: ${pick.recommended} (grounding-scored, human ratifies).`,
);

// DC2/DC3/DC4 — triangulate LANGUAGE-LED, structure cross-checks only, emit CANDIDATE model.
const model = await followSkill(
  "ddd-flow:3-decompose",
  `Decompose the slice "${pick.recommended}", LANGUAGE-LED, from the mined facts.jsonl. ` +
    `(DC2) Run the measure-playbook Stage 6 POLYSEMY probe on the core nouns: a same-named field ` +
    `with divergent type/target is an UNRESOLVED boundary candidate — emit it, do NOT collapse it ` +
    `to one meaning (a one-meaning glossary leaves no seam). (DC3) Use the Stage 7 FK-graph ` +
    `(louvain communities / articulation points / bridges) as a CROSS-CHECK ONLY, labelled ` +
    `'reconcile with Stage 6' — FK community-detection reproduces the legacy's clusters, the exact ` +
    `error this exercise exists to avoid; language leads, structure never leads. (DC4) Emit the ` +
    `context/aggregate model to docs/domain/discovery TAGGED CANDIDATE, at draft — never a ` +
    `model.yaml from a mine, never 'confirmed'. A schema confirms nothing; only a person does. ` +
    `Return the artifact descriptor. ${PROVENANCE}`,
  { label: "decompose:model", phase: "Decompose", schema: artifactSchema },
);

// HUMAN GATE DC5 (irreducible) — candidate -> confirmed + slice ratification. An agent cannot
// confirm a domain fact: a discovery round with no domain expert has discovered nothing. The
// workflow wrote candidates ONLY and packeted exactly what needs confirming, so the human's act is
// a THIN confirm over a tight list, not a from-scratch review.
log(
  `[ground-first] HUMAN GATE (DC5, thin-confirm): the agent packeted model ${model.id} — confirm ` +
    `the SUBSET it flags (candidate -> confirmed) and ratify slice "${pick.recommended}" before ` +
    `deepening. Kept human on purpose: only a person confirms a domain fact.`,
);

// =============================================================================
// PHASE 6 — WALKING-SKELETON (WS1). Author ONE thin end-to-end RFC on the grounded slice — a
// VERTICAL slice, not a horizontal layer. This is the mandat-healthy discipline btm skipped.
// Lands at draft, owner TBD, then HANDS OFF to sdlc.js. The workflow stops here.
// =============================================================================
phase("Skeleton");

// Decompose the slice into a thin vertical cut FIRST (work-breakdown: an end-to-end skeleton,
// not a horizontal layer), then author the single walking-skeleton RFC on it.
const skeleton = await followSkill(
  "swe-flow:spec-author",
  `Author ONE thin WALKING-SKELETON RFC on the grounded slice "${pick.recommended}" (from the ` +
    `CONFIRMED subset of model ${model.id}). First apply swe-flow:work-breakdown to cut a ` +
    `VERTICAL end-to-end slice (a walking skeleton), NOT a horizontal layer and NOT the whole ` +
    `slice — this walking-skeleton-first discipline is why mandat stayed healthy and btm did ` +
    `not. Land the RFC as a governed draft (owner: TBD, START status only, INDEX row) and run ` +
    `\`npx govkit verify\`, fixing until clean. Cite the confirmed grounding it rests on. Return ` +
    `the artifact descriptor. ${PROVENANCE}`,
  { label: "skeleton:rfc", phase: "Skeleton", schema: artifactSchema },
);

// HUMAN GATE (HANDOFF, thin-confirm) — the RFC lands at draft/owner:TBD. Terminal status flips
// carry accountability an agent cannot hold, so a human ratifies the ->accepted flip (a separate
// accept commit citing authorization) — a thin confirm over the packet below — THEN runs the sdlc
// workflow. This workflow does NOT invoke sdlc.js and flips nothing.
log(
  `[ground-first] UPSTREAM COMPLETE — grounded walking-skeleton RFC ${skeleton.id} at ` +
    `${skeleton.startStatus}, owner TBD. HUMAN GATE (HANDOFF): ratify the RFC status flip in a ` +
    `separate accept commit citing authorization, then run the sdlc workflow with ` +
    `args.feature="${pick.recommended}" to drive RFC -> ADR -> US -> Foundation -> Code. ` +
    `This workflow stops at a grounded skeleton by design — sdlc.js assumes exactly this input. ` +
    `Handoff packet: ${JSON.stringify({ diagnose: diagnose.stallEdge, coverage, readiness, slice: pick.recommended, rfc: skeleton })}`,
);
