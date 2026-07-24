# Questions the skill would have asked (AskUserQuestion), and the assumption used instead

Per the task instructions, no live user is available. Each question below is
recorded at the SKILL.md phase that would normally trigger `AskUserQuestion`,
followed by the assumption used to proceed, grounded in fixture evidence.

## Q1 (Phase 2 — Scope boundary: "What is explicitly IN scope? What is OUT?")
The founder brief mixes a platform vision (event-streaming backbone, AI
sentiment engine, marketplace) with 3 concrete merchant-quoted asks. These are
not the same size of commitment.

**Assumption used:** IN scope = the 3 concrete asks (negative-sentiment alert,
post-shipment survey+score, weekly trend dashboard). OUT of scope = platform
vision items (Kafka/streaming backbone as infra requirement, general-purpose
"AI sentiment engine", marketplace, benchmark-sharing, third-party enrichment).
Basis: Priya's own words — "That's… kind of it, honestly, for what they'll pay
for on day one" vs. "the platform is where we win" (explicitly framed as
long-term north star, not this quarter's build).

## Q2 (Phase 5 — Constraints: is the Kafka/streaming backbone + "AI sentiment
engine" a hard v1 requirement?)
Priya calls it "non-negotiable" and "the moat," which would normally read as a
hard constraint straight into the goal.

**Assumption used:** Treated as an unvalidated founder preference, not a fixed
constraint in this goal — the functional need (score sentiment, show mood) is
kept, the specific technology (Kafka, "AI" branding) is deferred to a design
step (RFC/ADR) because: (a) none of the 3 merchant quotes require event-replay
architecture, (b) fixing it here would work against Priya's own "ship
something this quarter" / "let's not overthink this" directive, and (c) it's
exactly the anti-pattern SKILL.md flags as "scope too broad for a single goal."
**This is a judgment call, not a fact extracted from the material — flag back
to Priya if the build team believes it materially changes the timeline.**

## Q3 (Phase 5/8 — Constraints & Pause-if: SMS vs. email channel)
Marcus (Sales) and Dana (Product) each argue their case in separate emails and
in the Slack thread state on record that they are "not converging." Priya
explicitly says: "whoever specs it, put the tradeoff in front of me and I'll
pick." This is a live, contested decision this goal-definition step cannot
close on its own.

**Assumption used:** Did NOT pick a side. Encoded as a **Pause-if** condition
("channel decision not yet ratified by Priya before send-path build starts")
rather than a constraint choosing SMS or email — because Priya explicitly
reserved this decision for herself, and an agent silently picking one would
override a named human decision point. The one thing both sides plus the
support ticket agree on — that any send needs recorded opt-in consent — was
promoted to a hard Constraint regardless of which channel wins.

## Q4 (Phase 6 — Operating rules: iteration size / verification cadence /
scope control / progress tracking)
No existing codebase or test suite to anchor "verify after each step" against
(greenfield build from a requirements dump).

**Assumption used:** Applied the Implementation-type default shape adapted for
greenfield: one capability shipped and checkpointed before the next (alert →
survey+score → dashboard), stop-and-ask if scope grows past the 3 named
capabilities, and decisions (PRD/ADR) saved as they're made rather than
batched — standard defaults for this task type, no signal in the material
suggesting otherwise.

## Q5 (Phase 7 — Done when: "How do we know this is finished?")
SKILL.md requires measurable, verifiable done-when criteria. But Priya
explicitly shuts down a metrics discussion in the Slack thread: "can we not get
bogged down in metrics and targets right now?... ship first, measure later."
Dana pushes back on record ("that's how we end up not knowing if it worked at
all") but the founder's directive stands as of this material.

**Assumption used:** Done-when criteria are delivery/verification-based (a
feature fires, a record exists, a count matches) rather than business-outcome
KPIs (churn %, NPS, response rate target) — this satisfies SKILL.md's
"measurable + verifiable" rule without reopening the metrics debate Priya
explicitly closed. Dana's dissent is preserved here rather than silently
dropped, since it is a real, on-the-record risk (shipping without any outcome
measurement plan) that a future goal iteration may need to revisit.

## Q6 (Phase 8 — Pause-if: what does "this quarter" resolve to?)
No fixture document gives a calendar date for the founder brief itself or a
quarter-end date (only the Aug 31 SendGrid lapse is dated).

**Assumption used:** Left "this quarter" as an informal target in prose (not
encoded as a hard date anywhere in the goal) rather than fabricating a quarter
boundary. Only the Aug 31 SendGrid cutover — an actual dated fact from two
independent sources (Marcus + Dana) — is used as a dated constraint/pause-if.

## Q7 (Phase 3 — Context discovery: "These files look relevant — should I
include them? Any others?")
No codebase, docs/, or CLAUDE.md exist in the fixture beyond the 5 source
documents themselves.

**Assumption used:** All 5 fixture documents are included as Context (they
constitute the entire requirements source); no other candidate files exist to
ask about.
