# Screens, states, and copy

## Derive the inventory, don't invent it

Walk the upstream artifacts; each yields screens mechanically:

- Each **aggregate** in `docs/domain/` → a view family (list + detail), named in the
  ubiquitous language, verbatim.
- Each **API Retrieval operation** → a read view.
- Each **State Creation / State Transition operation** → a form or action flow.
- Each user-facing **domain event** → a notification/toast/activity entry.
- The **PRD's target action** → the screen that hosts it is the primary screen; every other
  screen must have a path toward it.

A screen with no upstream source is either a gap in the upstream (report it) or an invention
(delete it). Open each `screens/<context>.md` with a Mermaid flow diagram showing how the
screens chain toward the target action — the flow is the user-side mirror of the domain's
process, and where the two disagree is a finding for the human.

**A section is a screen when it declares a primary action.** Both the scaffold and the gate use
that rule, so prose sections in the same file (a flow diagram, an assumed-domain note, binding
notes) are free to use `##` without being mistaken for screens — but a screen that forgets its
primary action will silently vanish from the prototype. If a frame you expected is missing, look
for the missing `**Primary action**` line first.

## The per-screen contract

Every screen entry declares, as a table or list:

| Field | Rule |
|---|---|
| **Primary action** | Exactly ONE per screen — the one thing this screen asks of the person. On a transient system-driven screen (a payment in flight) that is an instruction rather than a tap target, and that is fine; what is not fine is a screen asking two things at once. Split it or demote one. |
| **Empty state** | An invitation to act, not a shrug — say what belongs here and give the action that creates it. |
| **Loading state** | What holds the layout (skeleton, spinner, optimistic echo) so nothing shifts. |
| **Error states** | One entry per RFC 9457 problem type the bound operations can return, with the user-vocabulary copy. |
| **API bindings** | Which `docs/api/` operations this screen calls — the traceability that lets a reviewer check state coverage against the error catalog. |

A happy-path-only screen is half-written; the gate for this is the pre-flight, and the
reviewer checks the error states against the API error catalog line by line.

## Copy rules

Words are design material with one job: making the interface easier to use.

- **User vocabulary, never system vocabulary.** A person manages notifications, not webhook
  config. Names come from the domain's ubiquitous language — the user-facing register of it.
- **Active voice, exact verbs.** A control says what it does: "Save changes", not "Submit".
  The name stays stable through the flow: a "Publish" button produces a "Published" toast.
- **Errors direct, they don't apologize.** What went wrong, and what to do next, in the
  interface's voice. Never vague, never blaming.
- **One element, one job.** A label labels; an example demonstrates; nothing quietly does
  double duty. Placeholder text is never the label.
- **Countable limits** (from the brief's density dial, defaults shown): primary CTA label ≤ 3
  words; a list over ~5 items becomes a different component (table, tabs, search), not a
  longer list.

## Structure encodes truth

Structural devices — numbering, eyebrows, dividers — must encode something true about the
content. Numbered markers (01/02/03) only where order carries information. If a device would
survive being applied to any other product's page unchanged, it is decoration, not structure.
