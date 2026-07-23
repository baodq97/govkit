// .claude/workflows/gate-loop.js — the five-station gate loop as one reusable workflow.
// Runs before an owner advances a governed doc's status: VERIFY (independent gate re-run +
// drift reconcile) ‖, then LIVE (build/pack and run the real artifact — required at a release
// gate), then RED-TEAM (one adversarial pass per flip candidate). It assembles one ratification
// packet and logs it; it flips nothing — the human ratifies, and the accept commit lands
// separately citing the in-session authorization.
//
// MANDATORY FALLBACK — workflows are research-preview and globally disableable
// (disableWorkflows / CLAUDE_CODE_DISABLE_WORKFLOWS=1) and cannot be bundled in a plugin.
// If this does not run, drive the same order BY HAND: dispatch swe-flow:reviewer to re-run the
// real gate from scratch and prove it can fail; swe-flow:doc-keeper to propose (not apply) exact
// reconcile edits; at a release gate swe-flow:verifier to build/pack and run the real artifact in
// a scratch dir; then one swe-flow:red-teamer per flip candidate. Assemble the packet by hand.
// The owner ratifies; the status flip is a SEPARATE accept commit. This workflow never flips a
// status and never assigns an owner.
//
// CONSTRAINTS: this script has NO filesystem/shell access — the dispatched agents read, run, and
// reconcile. It composes ONLY existing swe-flow agents; it dispatches no new agent types.
// agentType is plugin-namespaced (swe-flow:*) so the plugin must be installed.

export const meta = {
  name: "gate-loop",
  description:
    "Run the five-station gate loop over one or more governed docs whose status the owner intends to advance: verify the gate, reconcile doc drift, red-team each flip, return one ratification packet",
  phases: [
    { title: "Verify", detail: "independent gate re-run + doc-keeper drift reconcile" },
    {
      title: "Live",
      detail:
        "verifier builds/packs and runs the real artifact in a scratch dir (required at a release gate)",
    },
    { title: "RedTeam", detail: "one adversarial pass per flip candidate" },
  ],
};

// args: {
//   verifyCmd: string             // REQUIRED: the repo's real gate, e.g. 'bun run check' or 'make check'
//   changeSummary: string         // what actually landed — the red-teamers reason from this
//   flips: [{ id, target, doc }]  // governed docs whose status the owner intends to advance
//   gate: 'doc' | 'slice' | 'release'   // default 'slice'; a 'release' gate REQUIRES args.live
//   live: { scenario: string, expectations: string[] }  // the real-artifact run; omit to skip Live
// }
// Callers routinely pass args as a JSON-encoded string (observed live: run wf_3ce99e82) —
// tolerate it; a malformed string still fails loud at JSON.parse.
const ARGS = typeof args === "string" ? JSON.parse(args) : (args ?? {});
const verifyCmd = ARGS.verifyCmd;
if (!verifyCmd)
  throw new Error(
    "gate-loop: args.verifyCmd is required — name the repo real gate, do not guess it",
  );
const changeSummary =
  ARGS.changeSummary ??
  "A change has landed. Read the recent commits and the cited docs to learn what it does.";
const flips = ARGS.flips ?? [];
const gateKind = ARGS.gate ?? "slice";
const liveScenario = ARGS.live ?? null;
if (gateKind === "release" && !liveScenario) {
  throw new Error(
    "gate-loop: a release gate REQUIRES a live scenario — set args.live { scenario, expectations } so the verifier can build and run the real artifact",
  );
}

// Dispatch a swe-flow role by short name. Try the installed plugin's namespaced agentType first;
// when it cannot resolve (the plugin is not installed pre-release — Round 17 F7), fall back to a
// generic agent told to read the role file on disk and embody it under the SAME prompt and schema.
// The fallback fires a one-line log() notice so the packet shows which station ran degraded.
//
// The .catch MUST discriminate: only a dispatch/agent-type-resolution failure warrants the
// fallback. A schema-validation failure or a substantive error thrown by a successfully-resolved
// agent is NOT a resolution failure and must propagate — silently swallowing it would hide a real
// finding behind a "ran degraded" notice. Match the error message against a resolution-failure
// pattern; anything else rethrows unchanged.
const AGENT_RESOLUTION_FAILURE =
  /agent ?type|unknown agent|not found|unregistered|no such agent|failed to resolve|not available/i;
const dispatchRole = (name, prompt, opts) =>
  agent(prompt, { ...opts, agentType: `swe-flow:${name}` }).catch((err) => {
    const message = String(err?.message ?? err);
    const match = message.match(AGENT_RESOLUTION_FAILURE);
    if (!match) throw err;
    log(
      `[gate-loop] agentType swe-flow:${name} did not resolve (matched "${match[0]}") — falling back to a generic agent reading plugins/swe-flow/agents/${name}.md`,
    );
    return agent(
      `FIRST read \`plugins/swe-flow/agents/${name}.md\` in full and EXECUTE that role exactly as written — the plugin version carrying it is not installed, so you embody it from the file. Honor every never-rule in it.\n${prompt}`,
      opts,
    );
  });

const GATE = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "gates", "gateProvenFallible", "findings"],
  properties: {
    verdict: { type: "string", enum: ["SAFE-TO-COMMIT", "BLOCK"] },
    gates: { type: "string", description: "the commands run and their real exit codes" },
    gateProvenFallible: { type: "boolean" },
    findings: { type: "array", items: { type: "string" } },
  },
};

const RECONCILE = {
  type: "object",
  additionalProperties: false,
  required: ["edits"],
  properties: {
    edits: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["doc", "reason", "proposed"],
        properties: {
          doc: { type: "string" },
          reason: { type: "string" },
          proposed: { type: "string" },
        },
      },
    },
  },
};

const REDTEAM = {
  type: "object",
  additionalProperties: false,
  required: ["id", "verdict", "criteriaSummary", "sourcesExist", "killCriterion"],
  properties: {
    id: { type: "string" },
    verdict: { type: "string", enum: ["flip-as-is", "flip-after-reconcile", "blocked"] },
    criteriaSummary: { type: "string" },
    reconciledText: {
      type: "string",
      description: "exact doc edits needed before the flip is honest; empty when flip-as-is",
    },
    sourcesExist: { type: "boolean" },
    killCriterion: { type: "string" },
  },
};

const VERIFIER = {
  type: "object",
  additionalProperties: false,
  required: ["liveVerdict", "ranCommands", "claims", "notMeasured"],
  properties: {
    liveVerdict: { type: "string", enum: ["pass", "fail", "skipped"] },
    ranCommands: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["cmd", "exitCode", "stdoutTail"],
        properties: {
          cmd: { type: "string" },
          exitCode: { type: "number" },
          stdoutTail: { type: "string" },
        },
      },
    },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "verdict", "evidence"],
        properties: {
          claim: { type: "string" },
          verdict: { type: "string", enum: ["proven", "refuted", "unproven"] },
          evidence: { type: "string" },
        },
      },
    },
    notMeasured: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["what", "why"],
        properties: { what: { type: "string" }, why: { type: "string" } },
      },
    },
  },
};

phase("Verify");
const [gate, reconcile] = await parallel([
  () =>
    dispatchRole(
      "reviewer",
      `Independently verify this repo is ready to advance a governed status. Re-run \`${verifyCmd}\` from scratch and report its real exit code, then \`npx govkit check\`. Prove the gate is capable of failing and report gateProvenFallible. Trust no prior summary. What landed: ${changeSummary}`,
      { phase: "Verify", label: "gate-verify", schema: GATE },
    ),
  () =>
    dispatchRole(
      "doc-keeper",
      `Reconcile governed-doc drift against what the code actually does now. What landed: ${changeSummary}. For each doc below that names a symbol, mechanism, or gap the code has since changed, propose the EXACT replacement text. Do NOT apply it and do NOT flip any status. Docs: ${flips.map((f) => f.doc).join(", ") || "(none listed — scan the governed dirs)"}`,
      {
        phase: "Verify",
        label: "reconcile drift",
        schema: RECONCILE,
      },
    ),
]);

phase("Live");
// A release gate has already thrown above if liveScenario is null. When it is null on a
// doc/slice gate we do NOT dispatch the verifier at all — liveVerdict is 'skipped'.
const live =
  liveScenario === null
    ? {
        liveVerdict: "skipped",
        ranCommands: [],
        claims: [],
        notMeasured: [{ what: "live artifact run", why: "no args.live scenario was provided" }],
      }
    : await dispatchRole(
        "verifier",
        `Produce LIVE evidence that this change works. Scenario: ${liveScenario.scenario}. Build or pack the REAL artifact, then run the consumer entrypoint in a CLEAN scratch dir (mktemp -d) — never the source tree in place. Where cheap, induce ONE failure to prove the check is fallible. Expectations to prove: ${(liveScenario.expectations ?? []).join("; ") || "(none named — prove the entrypoint runs green end to end)"}. A claim is "proven" ONLY when a ranCommands entry carries its real exit code and output tail; list everything you could not run under notMeasured. Read-only on the repo checkout; all execution happens in scratch dirs. What landed: ${changeSummary}`,
        { phase: "Live", label: "live-verify", schema: VERIFIER },
      );

phase("RedTeam");
const redTeam = (
  await parallel(
    flips.map(
      (f) => () =>
        dispatchRole(
          "red-teamer",
          `Red-team ${f.doc} BEFORE its owner advances it to "${f.target}". What landed: ${changeSummary}. Assess each acceptance criterion as met / partial / not-yet with file:line; decide whether "${f.target}" is honest; confirm every cited source exists. Steelman, then falsifiable "Fails if ___", then self-refute, then one kill criterion. If the doc must be reworded before the flip is honest, give the EXACT reconciled text. You flip nothing.`,
          {
            phase: "RedTeam",
            label: `red-team ${f.id}`,
            schema: REDTEAM,
          },
        ).then((b) => ({ ...b, id: f.id, target: f.target, doc: f.doc })),
    ),
  )
).filter(Boolean);

// Surface the ratification packet with log(), not a top-level return (workflow-author convention:
// a top-level return fails node --check and biome). The owner reads this packet and ratifies once.
const packet = {
  gate,
  live,
  reconcile,
  redTeam,
  humanGates: flips.map((f) => `${f.id} -> ${f.target}`),
};
log(
  `[gate-loop] ratification packet ready — flips: ${packet.humanGates.join(", ") || "none"}; ` +
    `gate ${gate?.verdict} (provenFallible ${gate?.gateProvenFallible}), live ${live?.liveVerdict}, ` +
    `${redTeam.length} red-team pass(es). Packet: ${JSON.stringify(packet)}`,
);
