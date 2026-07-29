# UI design index

Surface designed: **the Euro Parking self-service payment kiosk** — the fixed portrait touchscreen
where a driver pays before leaving. Upstream: `docs/domain/` (there is no PRD and no `docs/api/`).

| Id | Artifact | What it is | Status | Owner | Date |
|---|---|---|---|---|---|
| UI-0001 | [prototype.html](prototype.html) | **The deliverable.** 14 frames: 7 screens, their states, and 2 declared variants. Opens in any browser, no build | draft | TBD | 2026-07-29 |
| UI-0002 | [design-brief.md](design-brief.md) | Design read · affordances · dial reasons · ADR-UI-001 · signature element · rejected defaults · 16 recorded gaps | draft | TBD | 2026-07-29 |
| UI-0003 | [tokens.json](tokens.json) | 21 colour roles, 18 declared contrast pairs, type, spacing, iconography | draft | TBD | 2026-07-29 |
| UI-0004 | [screens/terminal-operations-payment.md](screens/terminal-operations-payment.md) | Flow diagram + the per-screen contract for all 7 screens | draft | TBD | 2026-07-29 |

## Gate status

| Gate | Command | Result |
|---|---|---|
| Tokens | `node <skill>/scripts/check_tokens.mjs docs/ui/tokens.json` | **exit 0** — 0 violations |
| Prototype | `node <skill>/scripts/check_prototype.mjs docs/ui/prototype.html docs/ui/tokens.json docs/ui/screens` | **exit 0** — 0 violations |

Rejected candidate directions are kept as complete token files in
`.design-flow/preview/candidates/` (`night-terminal.json`, `consumer-fintech.json`); both also
pass `check_tokens.mjs`, which is why the pick is argued in prose in the brief and not by the gate.

## What a reviewer should attack first

1. **Gap G-11** — the design starts a fresh 15-minute window after the difference is paid. Nobody
   said it does (D-3). If it does not, one frame is a lie.
2. **Gap G-12** — the lost-ticket flow asks the driver to classify their own vehicle, because H12
   has no answer. That is a leakage decision made in a UI.
3. **Gap G-6** — the HELP intercom on the payment machine is a design addition; the sources place
   the intercom at the exit. Three error states depend on it.
4. **The card / ticket collision** — screens say "card", the physical button says LOST TICKET.
   Deliberate, sourced from both sides, and it needs a human to settle.
