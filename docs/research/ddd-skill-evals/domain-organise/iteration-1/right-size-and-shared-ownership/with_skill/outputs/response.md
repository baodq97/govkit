Wrote `docs/domain/team-topology.md` (status: draft, owner: TBD). The short version:

**The arithmetic first.** 9 engineers, 7 contexts. That supports **two teams**, which is what you
already have — so this is a re-cut, not a reorg. But one number dominates everything: `Invoicing` is
**51% of the system's attributes and 5 of its 9 aggregates**. Whoever owns it is mostly doing that.

**Proposed cut — by phase, not by layer:**

| Team (from) | Owns | Intrinsic load | Verdict |
|---|---|---|---|
| **Container Fill** (from "Customer", 4) | Quoting, Booking, Consolidation | 3 aggs · 25 tables · 173 attrs | within budget, headroom for the fill goal |
| **Clear & Settle** (from "Core Systems", 5) | Routing, Customs, Invoicing, Notifications | 6 aggs · 51 tables · 435 attrs | **over budget** — `Invoicing` is 71% of it |

**The cut you'd expect is the one the model forbids.** Customer-facing vs operations splits `Booking`
from `Consolidation` — but they share `ConsignmentLine` as a Shared Kernel *both sides write*,
`Booking` does a synchronous capacity check while `Consolidation` owns the no-overbooking invariant,
and hotspot 1 says two shipments already hit the same slot in March with nobody agreeing where the
check belonged. Split across teams that becomes a **permanent collaboration edge** — the one thing
worth redesigning a topology to avoid. Same team, it's an internal problem one team can fix on its
own schedule.

**On the shared invoicing codebase:** single owner, Clear & Settle. Container Fill's billing needs go
in through a Customer/Supplier agreement, not direct commits. One caveat — the repo has **no
CODEOWNERS or commit data**, so "both teams commit there" is your statement, not something I could
verify. Run `git shortlog` per directory before acting on it.

**Cross-team interaction:** steady state is **X-as-a-Service** (`BookingConfirmed` → Routing,
`ContainerSealed` → Customs — one event each, no back-and-forth). Two **time-boxed collaborations**,
one quarter each, with explicit exits: publish `ShipmentRef` as a versioned contract owned by
Container Fill (today it's a shared kernel spanning the team line, unlabelled anywhere), and write
down who owns the Guaranteed Consolidation premium's billing rule — it's sold in Booking, delivered
by Consolidation, charged by Invoicing, and owned by no context.

**Three findings I'd escalate above the topology:**

1. **Half your cognitive load buys zero differentiation.** `Invoicing` is labelled `core` in the
   context map while the business says *"nobody has ever chosen us because of our invoices"* — and 3
   of its 5 aggregates only exist to model VAT variations. No cut of 7 contexts across 2 teams makes
   that go away; it's a `domain-strategize` buy/shrink decision. Clear & Settle is over budget *by
   design* until it's made.
2. **Your differentiator is labelled `supporting`.** `Consolidation` is what the +18% premium is sold
   on, and it has the smallest model of any real context. A `supporting` label predicts it gets
   whatever attention is left over — so its capacity has to be protected explicitly, not left to
   prioritisation.
3. **The headcount ratio is backwards.** 5 engineers on the commodity side, 4 on the differentiator,
   while your only stated short-term goal is fill 71% → 80%. Inverting it is only affordable after
   finding 1 is acted on.

Also: **`TariffData` has no owner** — it's on the context map as a `Quoting` dependency with no model
file, no classification row, and unlike `PartnerNetwork` it isn't marked external. And nobody owns a
carrier refusing a sealed container (hotspot 3), a gap that crosses the proposed team line.

**No platform or enabling team.** A third team needs ~13–15 engineers; at 9 you'd be running two
2-person product teams behind a ticket queue. Buy platform capability instead — and measure extrinsic
load first, because none of it is recorded today.

**What I couldn't know, and said so in the doc:** what each team actually knows today (this decides
whether moving `Consolidation` is cheap or expensive), on-call and deploy load — so the load verdicts
are intrinsic-only and therefore optimistic, and there's no `core-domain-chart.md` or
`message-flows/` in the repo, so the interaction modes are read off the context map and the discovery
timeline rather than real flows. Running `domain-connect` first would confirm or refute two of the
three.

Seven open decisions are listed at the end with who makes each — decision 1 (does `Invoicing` get one
owner) blocks the rest. And nobody on either team has seen this: no engineer, none of the four senior
planners, no P&L owner, no customer. It's written to be argued with.
