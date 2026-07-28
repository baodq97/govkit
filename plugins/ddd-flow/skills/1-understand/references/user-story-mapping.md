# User Story Mapping

Jeff Patton's technique for organising user work into a two-dimensional map instead of a flat
backlog — <https://www.jpattonassociates.com/user-story-mapping/>.

The canvas tells you how the business captures value. The story map tells you **what the user
actually does, in what order, and where it hurts**. Both are needed: a healthy-looking business
model can sit on top of user work that is miserable, and that misery is usually where the current
boundaries are wrong.

## The shape

```
BACKBONE     Browse catalogue → Reserve unit → Collect → Use → Return → Get invoiced
              (the narrative flow, left to right, in the order the user experiences it)

ACTIVITIES    search        pick dates      sign out     extend    drop off    dispute
  ↓           filter        choose depot    inspect      report    inspect     pay
TASKS         compare       check price     photograph   fault     photograph
  ↓
(priority)    ─────────────────── release slice ───────────────────
```

- **Backbone** — the sequence of high-level things a user does. Read left to right, it should tell
  a story someone outside the team recognises.
- **Activities / tasks** — what the user does within each backbone step, arranged vertically by
  priority (most necessary at the top).
- **Slices** — horizontal cuts across the whole map. Each slice is a coherent release: thin, but
  it goes end to end. This is the same instinct as vertical slicing in `work-breakdown`.

## Why a flat backlog loses information

A list has one dimension, so it cannot express two things at once: the *narrative order* of the
user's work and the *priority* within each step. Flatten the map and both are gone — which is how
teams end up building all of one step perfectly while the story has no ending.

## Building it

1. **Frame the user.** Which segment from the canvas? Different segments get different maps; a
   single map covering "all users" usually describes none of them.
2. **Tell the story out loud, in order.** Capture each step as it is spoken. Verbs, not screens —
   "collect the equipment", not "collection page".
3. **Fill in beneath each step.** What does the user do here? What can go wrong?
4. **Mark pain.** Where does the user work around the system, wait, re-key data, phone someone?
   Pain points cluster, and the clusters are informative — see below.
5. **Slice.** Cut a release that reaches the end of the backbone.

## What it feeds into DDD

**Pain clusters mark boundary problems.** When one backbone step generates most of the workarounds,
either the model there is wrong or a capability nobody owns is being done by hand. Both are worth
knowing before contexts get drawn.

**Backbone steps are candidate capabilities.** They are not bounded contexts — that decision comes
later, after discovery, and needs the language test rather than the workflow order. But they are a
good first list of what the domain must do.

**The user's vocabulary is evidence.** Note the words users actually use for each step. When they
differ from the words in the code or the docs, one of the two is not the ubiquitous language, and
`2-discover` will need to settle which.

## Honest limits

The map describes work as it is done **today**, including all the workarounds people invented to
cope with the current system. That makes it excellent for finding pain and risky as a specification
— building tomorrow's model to match today's workarounds cements the problem.

And it needs real users. A map built from internal proxies documents what the organisation believes
its users do. That is worth having, but label it as such rather than letting it pass as user
evidence.
