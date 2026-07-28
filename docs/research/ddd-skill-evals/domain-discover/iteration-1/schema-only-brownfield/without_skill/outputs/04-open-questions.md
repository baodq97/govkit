# 04 — Open Questions

Twelve items, ranked by (what it unlocks) × (how cheap it is to close). Owner is `@platform`
for all of them — both ADRs carry that owner.

**Blocking level:**
- `HARD` — decomposition cannot produce a correct result without it
- `SOFT` — decomposition can proceed but the output will carry a known risk
- `LATER` — safe to defer past decomposition

---

## Q1 — Recover ADR-0001, ADR-0002, ADR-0003 and the `acme_foundation` schema ADR

**Blocking: HARD. Cost to close: one request.**

The repo holds ADRs 0004 and 0005 only. ADR-0004 L12 calls billing the *third* BC and ADR-0005
L11 calls contracts the *fourth*, so at least two earlier context ADRs exist. ADR-0002 is cited
as the source of the "one solution per bounded context" rule that governs every boundary in the
rebuild — and it cannot be read.

**Unlocks:** context coverage 50% → 100%; the shared kernel's real shape; the identity of the
unknown second context; probably several of the five missing concepts in
`02-ubiquitous-language.md` §D (Payment, Customer, Product, Tax, Ledger).

**Do this first.** It is a single ask that likely collapses Q4, Q5, Q9 and Q12 at once.

---

## Q2 — Pull the relationship pass forward, at minimum for `acme_contract` and `acme_invoice`

**Blocking: HARD. Cost to close: medium — requires the relationship pass to run early.**

Both ADRs defer every lookup column (ADR-0004 L44, ADR-0005 L35). The repo therefore documents
**zero** relationships. Aggregate boundaries are determined by cardinality and transactional
co-change; with no cardinality, any aggregate the decomposition proposes is invention.

**Unlocks:** aggregate boundaries, aggregate roots for the 9 unplaced tables, the
billing↔contracts coupling shape, and whether an anti-corruption layer is warranted.

**Cheapest partial:** even the lookups on just the two anchor tables (`acme_contract` 41 attrs,
`acme_invoice` 34 attrs — 36% of all attributes) would move the decomposition from guessing to
deriving for most of the corpus.

---

## Q3 — Run `scripts/phase2_billing.py` (and the contracts equivalent) to recover attribute names

**Blocking: HARD for value objects, SOFT for context boundaries. Cost to close: low.**

ADR-0004 L17 says the per-attribute mapping is *generated at materialization time* by
`scripts/phase2_billing.py`, with types mapped per `phase2_lib.py` (L32). Neither script is in
this repo, but they exist somewhere — the mapping is mechanical and reproducible.

**Unlocks:** all 209 attribute names (currently 0% recovered). Without them the decomposition
cannot identify value objects, cannot find the hidden business keys (invoice number, contract
number), and cannot test the over-loading hypothesis on the two anchor tables.

This is the highest-yield-per-effort item after Q1.

---

## Q4 — Is a renewal a new contract, or a state of the existing contract?

**Blocking: HARD for the contracts context. Cost to close: one modelling decision.**

ADR-0005 L45–46 leaves this open in its own Consequences section and notes the legacy schema
models it **both ways in different tables**. A third reading is live from the table name:
`acme_renewaloption` (9 attrs) may be the *right* to renew rather than the renewal itself.

**Unlocks:** whether `Contract` is one aggregate or two; whether `RenewalOption` is an entity,
a value object, or a lifecycle state; whether contract identity survives renewal — which in
turn decides whether billing's contract reference is stable across a renewal boundary.

This is the single most consequential domain decision in the package. It is also the one the
ADR authors already know is open, so it should be answerable without new investigation.

---

## Q5 — Does "one solution per bounded context" actually hold?

**Blocking: SOFT. Cost to close: reading ADR-0002 (see Q1) plus one review.**

ADR-0002's rule (cited at ADR-0004 L12) equates a Dataverse solution with a bounded context. A
solution is a *shipping* unit shaped by ALM, licensing and publisher ownership. That is a
plausible boundary and a common one, but it is not automatically a domain boundary.

**Concrete counter-signal already visible:** `acme_billing`'s six tables split cleanly into a
billing-document cluster (invoice, invoice line, credit note) and a receivables/collections
cluster (payment allocation, dunning run, write-off) — different actors, different cadence,
different lifecycle. See `03-context-candidates.md` §A.3. If the rule is applied
mechanically, that split can never be proposed.

**Unlocks:** permission for the decomposition to propose sub-contexts where the domain warrants
them, rather than inheriting the packaging layout.

---

## Q6 — Who is the invoice addressed to?

**Blocking: HARD for billing. Cost to close: low once Q2 or Q3 lands.**

`acme_billing` has no customer, account, or party table (`01-evidence-inventory.md` §B). An
invoice must be raised against a payer. Three possibilities, each with a different boundary
consequence:

1. Billing reaches into `acme_foundation.acme_company` → foundation is a customer master, and
   the shared kernel is far more volatile than reference data.
2. Billing reaches into `acme_contracts.acme_contractparty` → billing's coupling to contracts is
   much deeper than "invoices are raised against a contract".
3. The payer is one of the 34 unnamed `acme_invoice` attributes → billing is self-contained.

**Unlocks:** the real weight of the billing→foundation and billing→contracts edges.

---

## Q7 — Do invoice lines derive from contract lines?

**Blocking: SOFT. Cost to close: low once Q2 lands.**

`acme_contractline` (23 attrs) and `acme_invoiceline` (19 attrs) share a word and may share a
lifecycle (collision C3). If invoice lines are generated from contract lines, that derivation is
the primary functional coupling between the two contexts and needs an explicit contract. If they
are independent, the shared vocabulary is a trap that will mislead every future reader.

**Unlocks:** whether the billing→contracts edge needs an anti-corruption layer; whether the two
contexts can be deployed and versioned independently.

---

## Q8 — Where do Payments live?

**Blocking: SOFT. Cost to close: likely answered by Q1.**

`acme_paymentallocation` (16 attrs) exists; no `acme_payment` exists anywhere. An allocation
presupposes the money being allocated. Either payments sit in an undocumented context (a
candidate identity for the unknown BC #1/#2), in an external system, or folded into the
allocation table's 16 attributes.

**Unlocks:** the identity of the unknown context; whether billing has an upstream integration
boundary that no ADR currently records.

---

## Q9 — Run the optionset pass for the four named picklists

**Blocking: SOFT for boundaries, HARD for lifecycle modelling. Cost to close: medium.**

Four picklists are named and none has values: *invoice status*, *dunning stage* (ADR-0004 L45),
*contract status*, *renewal type* (ADR-0005 L36).

**Unlocks:** the state machines for the two anchor aggregates, and therefore the domain events
they emit. `renewal type` in particular may partly answer Q4 — the set of renewal types will
reveal whether the model treats renewal as a new agreement or a continuation.

---

## Q10 — What distinguishes a Credit Note from a Write-Off?

**Blocking: SOFT. Cost to close: one conversation with finance.**

Both reduce a receivable. `acme_creditnote` carries 22 attributes — nearly a full document —
while `acme_writeoff` carries 8. The convention (credit note = commercial correction issued to
the customer; write-off = internal recognition of bad debt) is plausible but unstated.

**Unlocks:** whether they belong to the same aggregate cluster, and whether the write-off has a
downstream ledger integration that no ADR records.

---

## Q11 — What is `DMOEntities`?

**Blocking: SOFT. Cost to close: trivial — one question.**

Mentioned once (ADR-0005 L12) and never expanded. It matters only because it is credited with
having shipped the renewal slice separately — the exact slice whose modelling is unresolved in
Q4. Its prior boundary may encode a reason the renewal slice was kept apart, which is a
Chesterton's-fence check worth doing before the decomposition folds it into `Contract`.

---

## Q12 — Pull one behavioural sample forward from the legacy workflows

**Blocking: LATER by the ADR's plan; recommend pulling forward. Cost to close: low for a sample.**

ADR-0005 L37 defers `solutions/legacy/Contracts/src/Workflows/` to Phase 4. That directory is
the **only** source of behaviour cited anywhere in the corpus. Everything else is structure.

The full Phase 4 migration can stay deferred. But reading two or three workflow definitions
would give the decomposition its first and only evidence of invariants, transaction boundaries,
and domain events — three of the ten input categories currently at zero. Sampling is much
cheaper than migrating, and the return is disproportionate.

---

## Recommended sequence

| Step | Items | Effect |
|---|---|---|
| **1** | Q1, Q11 | One request to `@platform`. Closes context coverage; probably resolves Q4-context, Q8 |
| **2** | Q3, Q12 | Recovers 209 attribute names + first behavioural evidence. Both are sampling, not migration |
| **3** | Q2 (anchors only), Q9 | Relationships and states for the two anchor tables — 36% of the corpus |
| **4** | Q4, Q5 | Two modelling decisions, now evidence-backed rather than guessed |
| **5** | Q6, Q7, Q8, Q10 | Fall out cheaply once steps 1–3 land |

After steps 1–3, the input coverage moves from **1.5/10** to roughly **6/10** — enough to
decompose with named residual risk. Running decomposition before step 1 completes will produce
boundaries that shift as soon as the missing ADRs surface.
