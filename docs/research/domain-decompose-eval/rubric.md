# RentField — domain-decompose scoring rubric (ground truth)

Grades one run of the `domain-decompose` skill against the `fixture/` snapshot. The runner never
sees this file (see `README.md` → Blinding).

**Total: 44 points** across 6 groups (A–F), 19 checks. Per check: **PASS = full**, **PARTIAL =
half**, **FAIL = 0**.

> **Authoritative total: 44** (the number of record for every run and every before/after diff).
> Per-group weights: A 2×2=4, B 4×3=12, C 2×3=6, D 5×2=10, E 3×2=6, F 3×2=6 → **44**, matching the
> sum of the itemised per-check weights below. An earlier corpus brief quoted "41"; that figure is
> **superseded** — it predates the current 19-check itemisation and is not used anywhere in
> grading. Do not re-derive the total at grading time; use 44.

**Grading rule (mandatory).** Every verdict must **quote the runner's output** — the exact
sentence, table row, YAML key, or Mermaid edge that earns it — or state the **explicit absence**
("no context-map edge names the ERP relationship"). No verdict from inference. If the runner asked
a clarifying question instead of deciding, grade what it *committed to on paper*, not what it
implied.

Citations key: **BC** = `fundamentals/ddd-bounded-contexts-and-subdomains.md`; **MM** =
`patterns/modular-monolith-with-ddd.md`; **AA** = `patterns/audit-authz-bounded-context-and-placement.md`;
**AC** = `patterns/architecture-constitution-boundaries-over-layers.md`; **OT** =
`skills/domain-decompose/references/output-template.md`; **SK** = `skills/domain-decompose/SKILL.md`.

---

## A. Space hygiene — problem space vs solution space (2 checks × 2 = 4 pts)

### A1 — Subdomains classified core/supporting/generic in the PROBLEM space; bounded contexts do NOT carry those labels (2 pts)
**PASS:** The Core Domain Chart classifies each area as core / supporting / generic, AND the
contexts themselves are described by context-map **relationships** (upstream/downstream/etc.), not
by a strategic label pinned onto the context as if it were a property of the solution.
**PARTIAL:** Classification present but a context is treated as if the label were intrinsic (e.g. a
"generic context" with no relationship modelling), or the core/supporting/generic split is applied
but muddled.
**FAIL:** No core/supporting/generic classification, or labels used interchangeably with contexts.
**Cite:** BC §"Subdomain vs Bounded Context" — *"Một bounded context không bao giờ mang nhãn
'core/supporting' — nó tham gia vào một context map"*; BC table (problem space discovered vs
solution space designed).

**Expected classification (ground truth for every context a runner will produce).**
*Hard anchors (planted; a runner that misses these loses credit):*
- **Core:** Allocation, Pricing — the two enforced invariants live here.
- **Supporting:** Maintenance — validation + CRUD + one interval calculation.
- **Generic:** payments (Stripe), identity (Auth0), notifications (SendGrid).
- **Master-data / reference:** Catalog, Depots, Tags — lookup CRUD.

*Latitude contexts (a real run also emits these; grade A1 on whether each is classified coherently
in the problem space, not on hitting one exact label):*
- **Rentals** — order/booking orchestration (ties a quote + reservation into an order, hands to
  billing). **Supporting** is the expected call; **core-adjacent** is defensible, plain generic is
  not.
- **Logistics** — delivery / depot-hand-off planning. **Supporting**, in a partnership with core
  Allocation (see D4).
- **Invoicing** — internal invoicing service. **Supporting** (built in-house, customer-supplier
  with Rentals per D5); **generic** is defensible only if a run argues billing is a bought
  commodity, but the fixture runs it internally.
- **Accounts / CRM-import** — customer-account data imported from an external CRM. **Supporting**,
  integrated **conformist** to the external CRM (see D2) — not a standalone core area.
- **ErpSync** — not a business subdomain of its own but an **integration boundary (ACL)** in front
  of the external, generic legacy ERP (see D1). Don't penalise a run that models it as an adapter
  rather than a core/supporting subdomain; the ERP itself is an external/generic upstream.
- **Documents** — file storage for rentals/accounts (part of the ownership polysemy, C1).
  **Supporting**; **generic** is defensible if a run treats it as commodity blob storage.

Grade A1 against the hard anchors; on the latitude contexts, only a plainly incoherent
classification (e.g. Allocation "generic", or Catalog modelled as core) costs credit.

### A2 — An explicit subdomain ↔ context mapping is recorded (2 pts)
**PASS:** Output states which subdomain each bounded context realizes (ideally 1:1), and records
any deviation (e.g. one context spanning two subdomains, or an area that is *not* a context).
**PARTIAL:** Contexts and subdomains both listed but the correspondence is left implicit.
**FAIL:** No mapping between the problem-space classification and the solution-space contexts.
**Cite:** BC §"Subdomain vs Bounded Context" — *"Lý tưởng 1 subdomain ↔ 1 bounded context… thực tế
có 1-nhiều và nhiều-1"*; BC §Đánh đổi — *"Ghi lại độ lệch; đừng giả vờ tấm bản đồ sạch hơn địa
hình."* OT §3 (Core Domain Chart classifies **every** context).

---

## B. Right-sizing — architecture proportional to subdomain type (4 checks × 3 = 12 pts)

FAIL definition for the whole group: **uniform tactical modelling across all contexts** (every
context gets aggregates/repositories/events regardless of type) is the cargo-cult failure — cap any
such run at FAIL on the check it violates. **Cite:** MM §"Bằng chứng" — *"Ceremony là hằng số; độ
giàu domain lệch ~300%"*, `UserAccess` 0 rules yet full stack; AC §"CRUD không phải Domain".

### B1 — Core (Allocation + Pricing) → full domain model, justified by NAMED invariants (3 pts)
**PASS:** Allocation and/or Pricing modelled as a rich model with a real consistency boundary, and
the justification cites the actual invariants: no double-allocation of a unit across depots for
overlapping windows, and the utilization-based price floor. Invariants captured only because the
fixture states them (not invented).
**PARTIAL:** Treated as core but invariants named vaguely or only one of the two.
**FAIL:** Core areas modelled as thin CRUD, or no invariant named.
**Cite:** MM right-sizing table — *"Core (invariant phức tạp) → Full Domain Model + Clean layering
+ CQRS + outbox"*; BC subdomain table (core = highest investment). Fixture invariants:
`AllocationService.Commit` overlap rule; `PricingEngine.Quote` floor.

### B2 — Supporting (Maintenance) → deliberately lighter pattern, NOT full aggregate ceremony (3 pts)
**PASS:** Maintenance called out as supporting and given a simple model / transaction-script /
CRUD-plus-one-calculation shape, explicitly lighter than the core — no aggregate ceremony imposed.
**PARTIAL:** Classified supporting but still given full aggregate/event machinery, or lightness
implied but not stated.
**FAIL:** Maintenance modelled with the same weight as the core.
**Cite:** MM right-sizing table — *"Supporting đơn giản (CRUD + vài rule) → API + service mỏng
(Transaction Script); không nghi lễ aggregate root"*; MM §"Heterogeneous architecture" — Active
Record/Transaction Script for supporting.

### B3 — Generic (payments / identity / notifications) → buy + thin adapter, NO domain model built (3 pts)
**PASS:** Stripe, Auth0, SendGrid each recognized as commodity to buy/integrate behind a thin
adapter; no aggregates/entities/events modelled for them.
**PARTIAL:** Recognized as generic but a domain model is still sketched for one, or only some of
the three are handled.
**FAIL:** Any of the three given a built-out domain model, or classified as core/supporting.
**Cite:** MM right-sizing table — *"Generic (auth, gửi email, lưu file) → Mua / tích hợp; chỉ một
adapter mỏng; Tất cả — đừng build domain"*; AC R7 — *"Generic subdomains are bought, not built.
Identity is generic."*

### B4 — Master-data (catalog / depots / tags) → CRUD explicitly, NO aggregates/repositories invented (3 pts)
**PASS:** Catalog/Depots/Tags called out as reference/lookup data with plain CRUD; the output
explicitly declines aggregates, repositories, domain events for them.
**PARTIAL:** Treated as lightweight but still given an aggregate or repository, or lumped into a
richer context without comment.
**FAIL:** Modelled as a full domain with aggregates/events.
**Cite:** MM right-sizing table — *"Master-data / reference → 1 project API → DbContext (Active
Record / CRUD); Không aggregate, không domain event, không repository"*; AC §"CRUD không phải
Domain" — *"Tags, Categories, Countries… không domain model, không aggregate… Minimal API cộng
DbContext là đủ."*

---

## C. Capability vs context — do not mint capabilities as contexts (2 checks × 3 = 6 pts)

### C1 — Ownership is NOT minted as a bounded context; recognized as a per-context concept / projection toward authorization (3 pts)
**PASS:** The output notices that "owner" means different things in different modules (depot that
holds the unit vs sales rep who owns the account vs user who uploaded a document) and therefore
does **not** create an "Ownership" context; ownership stays a per-context relationship (optionally
projected toward an authorization concern).
**PARTIAL:** Keeps ownership inside each context but doesn't register the polysemy, OR notes the
polysemy but wobbles on whether Ownership is a context.
**FAIL:** Creates an "Ownership"/"Owner" bounded context, or forces one global `owner` definition.
**Cite:** AA §"Vì sao Ownership không phải bounded context" — *"`owner` mang hai nghĩa khác nhau và
cả hai đều đúng… Dựng context 'Ownership' nghĩa là ép một định nghĩa `owner` toàn cục"*; AA table —
Ownership *"Không phải subdomain — là quan hệ bên trong các subdomain khác"*; AC applied-example row
Activity/ownership. Fixture: `Reservation.DepotId`, `SalesAccount.SalesRepId`, `Document.OwnerUserId`.

### C2 — Audit is NOT minted as a bounded context (non-regulated); treated as a capability, with the escalation condition noted or implied (3 pts)
**PASS:** The "activity history on orders" request + `audit_log` table are handled as a
cross-cutting capability (an append-only log / timeline owned by the business module), explicitly
**not** a bounded context, AND the output notes the condition that would change this (regulated
industry / audit-as-product / retention-legal-hold becoming real rules).
**PARTIAL:** Treats audit as a capability but omits the escalation condition, OR flags the
escalation but still spins up an Audit context "just in case".
**FAIL:** Creates an "Audit" bounded context with aggregates/invariants for a plainly non-regulated
convenience feature.
**Cite:** AA §"Audit: bounded context hay chỉ là capability?" — *"Ngành thông thường → Audit không
phải bounded context… Một bảng append-only, một writer, vài query là đủ"* and *"Ngành bị quản chặt…
lúc đó nó thành bounded context"*; AC applied-example — *"Audit → A + Type 0"*; AC §Type 0. Fixture
README explicitly says *"no legal or retention angle."*

---

## D. Context mapping — name the relationship pattern or its substance (5 checks × 2 = 10 pts)

Credit requires **naming the pattern** OR **unambiguously describing its substance**. A bare edge
with no pattern and no substance = FAIL.

### D1 — ERP (nightly SOAP sync) → anti-corruption layer (2 pts)
**PASS:** The legacy ERP relationship is an ACL — the sync translates the unstable upstream into
clean internal shapes at the boundary, isolating the rest of the system. Named "ACL" or described
as a protective translation layer against an unnegotiable, unstable upstream.
**PARTIAL:** Notes the ERP is external/legacy but doesn't capture the protective-translation
substance.
**FAIL:** No ERP relationship, or modelled as a plain upstream with no isolation.
**Cite:** BC context-map table — *"Anti-Corruption Layer (ACL): Downstream dịch model của upstream
qua một lớp bảo vệ — Dùng khi model upstream không tương thích hoặc bất ổn"*; MM §Đánh đổi — *"Legacy
phải tích hợp → DB-first sau một ACL… Cô lập; giữ nó tránh xa core."* Fixture: `NightlyErpSyncJob` +
`erp-integration-notes.txt`.

### D2 — CRM import → conformist (distinguished from customer-supplier) (2 pts)
**PASS:** The CRM relationship is conformist — RentField accepts the vendor's model as-is with zero
leverage to change it; explicitly distinguished from customer-supplier (where the downstream sets
the contract). Named "conformist" or its substance ("we take their shape verbatim, no say").
**PARTIAL:** Notes we accept the CRM shape but conflates it with customer-supplier, or leaves the
power dynamic implicit.
**FAIL:** No CRM relationship, or modelled as one where RentField dictates the contract.
**Cite:** BC context-map table — *"Conformist: Downstream tuân theo model của upstream, không có
quyền thương lượng — Dùng khi upstream bị áp đặt (legacy, vendor ngoài)"* vs *"Customer–Supplier:
downstream (customer) định nghĩa hợp đồng."* Fixture: `CustomerAccountService.ImportFromCrm`,
`CrmAccountRow` mirrored verbatim.

### D3 — Pricing → Rentals → open-host service / published language (2 pts)
**PASS:** Pricing exposes a stable, versioned published contract (`PriceQuoted`) that Rentals
consumes without depending on Pricing internals — named OHS/Published Language or described as a
versioned integration contract serving consumers.
**PARTIAL:** Notes Pricing emits an event to Rentals but misses the stable/versioned published-
contract nature.
**FAIL:** No Pricing→Rentals edge, or Rentals modelled as reaching into Pricing internals.
**Cite:** BC context-map table — *"Open Host Service: Upstream công bố một protocol ổn định cho
nhiều consumer"*, *"Published Language: format trao đổi có tài liệu, có version"*; MM §"Domain event
vs Integration event" — *"Integration event… là Published Language của module (contract)."* Fixture:
`PriceQuoted.cs` (versioned contract, "known consumers: Rentals"); `Rentals.csproj` references
`Pricing.Contracts` only.

### D4 — Allocation + Logistics → partnership (or explicit shared-kernel with justification) (2 pts)
**PASS:** Allocation and Logistics modelled as a partnership — one team builds both, intertwined
models, they succeed/ship together. Named "partnership", or (acceptably) an **explicitly
justified** shared kernel between two peers under one owner.
**PARTIAL:** Notes they're closely coupled but doesn't reach for partnership/justified-shared-kernel,
or proposes a shared kernel with no justification.
**FAIL:** No Allocation↔Logistics relationship, or modelled as arm's-length upstream/downstream.
**Cite:** BC context-map table — *"Partnership: Hai team cùng thành hoặc cùng bại; phối hợp chặt —
không context nào ship độc lập được"*; BC §Đánh đổi (shared kernel *"lý tưởng một team sở hữu cả
hai, hoặc Partnership"*). Fixture: `teams.yaml` fulfilment squad owns both, shared release;
`LogisticsService` references `RentField.Allocation` types directly.

### D5 — Invoicing → customer-supplier (2 pts)
**PASS:** The internal invoicing relationship is customer-supplier — Rentals (downstream/customer)
drives the contract and the invoicing team plans around its requests. Named "customer-supplier" or
its substance (downstream defines the contract, upstream cooperates).
**PARTIAL:** Notes Rentals calls invoicing but misses that Rentals sets the contract / distinguishes
it from conformist.
**FAIL:** No invoicing relationship, or modelled as conformist / Rentals forced to accept invoicing's
shape.
**Cite:** BC context-map table — *"Customer–Supplier: Upstream phục vụ downstream; downstream
(customer) định nghĩa hợp đồng — Dùng khi team đồng thuận, upstream lên kế hoạch được cho nhu cầu
customer."* Fixture: `InvoicingClient` ("Rentals is its main customer… they add it to their API…
we agree the contract together"); `teams.yaml` billing note.

---

## E. Sharing discipline — the two side-by-side traps + the TODO (3 checks × 2 = 6 pts)

### E1 — `SharedDomainRules` plant REJECTED or reclassified (governance / architecture-tests, not a shared domain model) (2 pts)
**PASS:** The output rejects `src/SharedDomainRules/` ("every module MUST inherit these business
rules") as an anti-pattern — a single universal model forced on every context — and, if it keeps
anything, reclassifies cross-cutting rules as **governance / architecture tests**, not a shared
domain model.
**PARTIAL:** Uneasy about it but keeps it as a shared domain model, or flags it without naming the
right home (governance/arch-test).
**FAIL:** Adopts `SharedDomainRules` as a legitimate shared model, or silent.
**Cite:** BC §"Ba đính chính" #3 — *"'Core logic mọi module phải tuân theo' là phản-DDD… Quy tắc
cross-cutting mà ai cũng phải theo thuộc về governance / architecture test, không phải một domain
model dùng chung."* Fixture: `SharedDomainRules/README.md` + `GlobalRules.cs`.

### E2 — `Money` / `UnitOfMeasure` ACCEPTED as low-coupling building blocks — distinct treatment from E1 (2 pts)
**PASS:** `BuildingBlocks/Money` and `UnitOfMeasure` accepted as legitimate shared **technical**
types (base value types, no business logic, ~0 coupling), and this is handled **differently** from
the `SharedDomainRules` rejection — the run distinguishes technical building blocks from a shared
domain model.
**PARTIAL:** Accepts them but conflates them with `SharedDomainRules` (treats both the same way,
either both fine or both suspect).
**FAIL:** Rejects `Money`/`UoM` as illegitimate sharing, or elevates them into a shared domain model.
**Cite:** BC §"Cái gì được chia sẻ" table + *"Building Blocks là một technical shared kernel, không
phải Shared Kernel của Evans… chứa base class, không bao giờ chứa business rule"*, coupling ~0; MM
§"Chi tiết triển khai" — Building Blocks = technical, no business logic. Fixture: `Money.cs`,
`UnitOfMeasure.cs` (explicitly "no business policy").

### E3 — The "share the Equipment entity between Rentals and Catalog" TODO flagged as high-coupling (shared-kernel risk; recommend against or scope it) (2 pts)
**PASS:** The output catches the TODO in `RentalOrderService` proposing to share Catalog's
`Equipment` class directly, and flags it as high-coupling (a shared kernel / shared mutable model
that would couple the two contexts) — recommends against it or tightly scopes it (duplicate +
map, or integrate via contract), rather than endorsing it.
**PARTIAL:** Notices the duplication but is neutral about sharing the class, or recommends sharing
without noting the coupling cost.
**FAIL:** Endorses sharing the entity to "avoid mapping", or misses the TODO.
**Cite:** BC §"Ba đính chính" #2 — *"Shared Kernel tăng coupling một cách có chủ đích… nếu mục tiêu
là bỏ trùng lặp mà vẫn lỏng, công cụ đúng là tách một context và tích hợp qua Published Language"*;
BC §Đánh đổi (duplicate preferred over a wrong shared abstraction). Fixture:
`RentalOrderService.cs` `TODO(rentals)`.

---

## F. Procedural regression — the skill's own guarantees (3 checks × 2 = 6 pts)

### F1 — Draft-doc-vs-code conflicts surfaced in a conflict table, with code winning (2 pts)
**PASS:** `context-map.md` has a Conflicts & reconciliation table recording the
`domain-notes-draft.md` divergences with the running code chosen as authoritative — at least two of:
(a) "Availability" module in the draft doesn't exist / was folded into Allocation; (b) draft's
"pricing has no minimum / rep may discount freely" contradicts the enforced utilization floor;
(c) draft's "a unit can be held at two depots at once" contradicts the no-double-allocation
invariant; (d) draft puts Maintenance inside Allocation but code has a separate module.
**PARTIAL:** Mentions the draft is stale / catches one conflict but no proper table, or doesn't
state code as authoritative.
**FAIL:** Silently blends draft + code, or ignores the draft.
**Cite:** SK §1 — *"Prefer the running/shipped code over a draft doc… always record each divergence
explicitly… in the Conflicts section… Surfacing a conflict is mandatory"*; OT §3 Conflicts table.

### F2 — Orphan event flagged by the event-flow continuity check (2 pts)
**PASS:** The output flags `DepotTransferRequested` (published in `AllocationService`, consumed by
nothing) as an orphan emit / unconsumed event — a modelling gap to resolve.
**PARTIAL:** Runs a continuity check but misses this event, or notes "some events may be unconsumed"
without identifying it.
**FAIL:** No continuity check; orphan not surfaced. (Note: `EquipmentAllocated`, `PriceQuoted`,
`RentalOrderPlaced` all HAVE consumers — flagging any of those as orphan is a false positive and
caps this check at PARTIAL.)
**Cite:** SK §4 — *"every emitted domain event should have at least one consumer… Flag orphan emits
and unconsumed events… a dropped or unconsumed edge is a real modeling bug."*

### F3 — Output contract complete per the skill's output template (2 pts)
**PASS:** Output includes `context-map.md` (Mermaid map + Core Domain Chart), a per-context
`model.yaml` following the schema (every aggregate has `entities`/`value_objects`/`domain_events`
keys, `[]` when empty), per-context `README.md` canvases, an `INDEX.md`, and stable `DOMAIN-NNNN`
ids with `status: draft` / `owner: TBD`.
**PARTIAL:** Most artifacts present but one required piece missing (no Core Domain Chart, or
`model.yaml` omits required keys, or no stable ids / INDEX).
**FAIL:** Free-form prose only; no `context-map.md` / `model.yaml` structure.
**Cite:** OT §2 (layout), §3 (context-map blocks), §4 (model.yaml schema + *"every aggregate MUST
include the keys entities, value_objects, and domain_events"*), §5 (frontmatter), §6 (INDEX).

---

## Results table (fill per run — quote the runner's output for every verdict)

| Check | Pts | Verdict (PASS/PARTIAL/FAIL) | Score | Evidence — quoted runner output (or explicit absence) |
|---|---:|---|---:|---|
| A1 Subdomain labels in problem space only | 2 | | | |
| A2 Subdomain↔context mapping recorded | 2 | | | |
| B1 Core → full model, named invariants | 3 | | | |
| B2 Supporting → lighter, no ceremony | 3 | | | |
| B3 Generic → buy + thin adapter | 3 | | | |
| B4 Master-data → CRUD, no aggregates | 3 | | | |
| C1 Ownership not a context | 3 | | | |
| C2 Audit not a context (+ escalation) | 3 | | | |
| D1 ERP → ACL | 2 | | | |
| D2 CRM → conformist | 2 | | | |
| D3 Pricing→Rentals → OHS/published | 2 | | | |
| D4 Allocation+Logistics → partnership | 2 | | | |
| D5 Invoicing → customer-supplier | 2 | | | |
| E1 SharedDomainRules rejected/reclassified | 2 | | | |
| E2 Money/UoM accepted as building blocks | 2 | | | |
| E3 Share-Equipment TODO flagged | 2 | | | |
| F1 Draft-vs-code conflict table, code wins | 2 | | | |
| F2 Orphan event flagged | 2 | | | |
| F3 Output contract complete | 2 | | | |
| **TOTAL** | **44** | | | |

Scoring: PASS = full points, PARTIAL = half (round to 0.5), FAIL = 0. Record the total and, for any
non-PASS, one line on what a full-credit answer would have said.
