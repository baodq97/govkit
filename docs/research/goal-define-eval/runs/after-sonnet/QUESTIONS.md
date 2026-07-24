# Questions the skill would have asked, and the assumption used to proceed

Per instructions, no live user was available. For every phase where SKILL.md says "Ask the
user...", the question is recorded here verbatim-ish, followed by the assumption taken so the
run could continue to a complete goal. Phase 1 (task type) and Phase 3 (context confirmation)
are not listed as questions because SKILL.md explicitly says to skip them when the answer is
already obvious from the input (Phase 1: "build"/"ship" signal phrases are unambiguous; Phase 3:
the fixture root contains exactly 5 files and all 5 are self-evidently the relevant context —
there is no CLAUDE.md, docs/, or CodeGraph index to reconcile against).

---

### Q1 — Phase 2 (Title & Scope): Does v1 include the founder's platform vision?

founder-brief.md calls the Kafka/event-streaming backbone and AI sentiment engine
"non-negotiable" and "the moat," but the same document also says "let's not overthink this,"
lists three merchant asks that need none of that infrastructure, and says "ship something
merchants can feel this quarter." These two framings of the same brief are in direct tension.

**Assumption taken:** v1 excludes the streaming backbone, AI sentiment engine, and marketplace.
Reasoning: the three merchant quotes Priya herself cites as "what merchants literally ask us
for" are all satisfiable with a send + a score + a weekly-trend screen; none requires
event-sourcing infrastructure or an ML scoring engine. Labeled `PROPOSAL` in the goal text
(Constraints) because "non-negotiable" is Priya's own word for the thing being cut, and only she
can ratify cutting it.

---

### Q2 — Phase 2/5 (Scope + Constraints): SMS or Email for v1?

Marcus (email-01, sales) wants SMS, one question, one tap — argues email is a "data graveyard."
Dana (email-02, product) wants email, multiple questions, and mandatory opt-in — argues SMS
blasts burn trust. Both emails explicitly say they've "gone back and forth" and are "not
converging." In slack-thread.txt (9:07am), Priya explicitly declines to referee on Slack and
asks that "whoever specs it put the tradeoff in front of me and I'll pick."

**Assumption taken:** goal does not silently pick a channel. It sets Email as a stopgap
`PROPOSAL` default (justified in GOAL.md's rationale section — it's the only channel of the two
that already satisfies the opt-in constraint without new consent-collection engineering) and
hard-blocks any channel-specific build behind Priya's ratification (`NO channel-specific build
... starts until Priya ratifies`, plus a matching Pause-if). This treats the decision as
genuinely reserved for the named owner, not something an intake document can settle.

---

### Q3 — Phase 5 (Constraints): What hard rules govern v1, and is opt-in really non-negotiable?

Dana wants confirmed opt-in as a hard requirement. Marcus doesn't reject it outright but worries
"'opt in' is going to kill the numbers." support-ticket.md documents a real incident: a
Brightwear customer threatened a TCPA complaint over an unconsented SMS survey text, and internal
support (Aomi) states nobody in the company can currently answer whether this is legally allowed.

**Assumption taken:** treat "log explicit opt-in before first send" as a hard `MUST`,
independent of the SMS/Email debate — this is a response to a documented external risk
(an actual complaint already happened), not a vote in the Marcus/Dana disagreement. The deeper,
unresolved legal question (is the company TCPA-compliant, what's required specifically for SMS)
is NOT resolved by this assumption — it's carried forward as a `Pause if` condition requiring
legal sign-off before any further SMS rollout, since that question is explicitly outside what
support, sales, or product can answer.

---

### Q4 — Phase 6 (Operating rules): iteration size, verification cadence, scope control?

SKILL.md's Phase 6 asks the user to confirm process preferences (batch vs. one-at-a-time,
verify-after-each-step vs. at checkpoints, stop-vs-note-and-continue on scope creep). Nothing in
the fixture speaks to this directly — it's operational preference, not product content.

**Assumption taken:** applied the Implementation task-type defaults from
references/goal-template.md verbatim: one component → verify → next, stop and ask if scope
expands beyond the defined v1 boundary, save the trade-off memo + PRD as first artifacts before
any code. Low-stakes; no stakeholder in the fixture expressed an opinion here.

---

### Q5 — Phase 7 (Done when): "How do we know this is finished?"

This is the fixture's sharpest test of SKILL.md's own hard rule. Priya says explicitly (slack,
9:10am): "can we not get bogged down in metrics and targets right now... we'll know it's working
when merchants stop churning and start telling their friends. ship first, measure later." Dana
objects on the record in the same thread (9:12am): "'measure later' is how we end up not knowing
if it worked at all." No numeric target for response rate, opt-in rate, or volume appears
anywhere in any of the five documents.

**Assumption taken:** per SKILL.md Phase 7's explicit rule ("'We'll measure later' is never the
answer — even from a stakeholder"), the deferral is NOT accepted as resolved. A concrete
`PROPOSAL` criterion is derived from what the intake does supply (the one already-named pilot
merchant, Brightwear, and a live-response floor of ≥1), and the actual rate/volume target is left
as an explicit `TBD` for the owner to set — no number is invented to fill the gap.

---

### Q6 — Phase 8 (Pause if): "What should make us stop instead of pushing through?"

SKILL.md asks the user to confirm 2-3 escape hatches.

**Assumption taken:** derived four testable conditions directly from risk signals already present
in the fixture rather than generic task-type defaults, since the fixture supplies specific,
higher-signal risks: (1) legal/compliance sign-off on SMS consent not obtained (support-ticket),
(2) the Aug 31 SendGrid cutover (email-01/02) arriving before SES migration is verified, (3)
channel-specific build starting before Priya's ratification (slack-thread), (4) any live send
found without a matching consent log row. Not separately confirmed with the user; low-stakes
relative to Q1–Q3 since these follow mechanically from constraints already established.

---

**Total questions recorded: 6**
