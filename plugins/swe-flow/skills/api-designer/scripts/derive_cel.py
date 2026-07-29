#!/usr/bin/env python3
"""Derive a Candidate Endpoint List from a docs/domain tree.

Deterministic, no API key, no LLM. The Design Practice Repository's Stepwise Service Design puts a
CEL (step 4) and a Refined Endpoint List (step 5) *before* any contract is specified (step 6), and
that ordering is the whole point: a table is reviewed while it is still cheap to move a boundary,
whereas a YAML file opened too early lets REST resources define the bounded contexts instead of the
other way round.

Everything in the table below is already on disk — the message flows say who sends what to whom and
of which kind, and model.yaml says which aggregate roots exist, which rules they protect, how each
relationship is governed, and what is published. A model that re-derives that by reading markdown
is doing arithmetic, badly and differently each run. This script does the derivation; the human
does the one column it cannot: `Public?`.

    python3 derive_cel.py --root examples/euro-parking   # markdown (default)
    python3 derive_cel.py --root . --json                                 # for a downstream step

Exit code is 0 whenever the tree could be read; 2 when it could not. This derives; the gate stays
`npx govkit verify`.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------- vocabulary
#
# Every value a cell can hold is named once, here. The taxonomy is not this script's invention:
# the four operation responsibilities are the Microservice API Patterns / Design Practice Repository
# set that `references/rest-patterns.md` § Operation-responsibility taxonomy already pins.

STATE_CREATION = "State Creation"
STATE_TRANSITION = "State Transition"
RETRIEVAL = "Retrieval"
COMPUTATION = "Computation"

COMMAND = "command"
QUERY = "query"
EVENT = "event"

METHOD_BY_TYPE = {COMMAND: "POST", QUERY: "GET", EVENT: "webhook"}

# A command that brings an instance into existence is State Creation even though it also trips an
# invariant — MAP distinguishes creation from transition by what happens to identity, not by
# whether a rule fires. Verb list, not a name list: the check is on the leading CamelCase word.
CREATION_VERBS = frozenset({
    "create", "register", "open", "start", "issue", "declare", "add", "submit", "initiate", "begin",
})

# Which roles make a context the side others CALL. This is the filter the script exists for.
#
# The rule itself is stated in exactly one place — `references/rest-patterns.md` § Relationship role
# → does this context get a contract at all — and this set is that section's provider rows, read off
# `our_roles`: the provider is the UPSTREAM side, so Open Host Service, Published Language, Supplier
# and both ends of a Partnership make one. The downstream roles (`conformist`, `acl`, `customer`)
# are absent for the same reason, and `NO_CONTRACT_REASON` names it per role rather than re-deriving
# it here. Do not widen this set without changing that section first; two copies of a rule is how
# the ACL row and this frozenset came to disagree in the first place.
#
# Two notes the prose does not carry. `open-host-service` and `ohs` are accepted spellings of
# `open-host`, because a tolerant reader beats a corpus rejected over a synonym. And this set is
# coupled to the `exposed_to_api` filter below: dropping `published-language` would mark ParkingVisit
# and TerminalOperations ineligible while their `CardStripeRecord` / `OfflineExitLog` stay the only
# elements the corpus flags as publishable — a table with schema components and no endpoint to hang
# them on.
PROVIDER_ROLES = frozenset({
    "open-host", "open-host-service", "ohs", "published-language", "supplier", "partnership",
})

# Why a role that is NOT a provider role designs nothing. Printed verbatim in the not-eligible
# section: a context dropped without a reason reads as a bug, and a context dropped silently reads
# as coverage.
NO_CONTRACT_REASON = {
    "conformist": "Conformist — accepts the upstream's model as-is, so it designs nothing",
    "shared-kernel": "Shared Kernel — shared code, not an API; a forked contract re-adds the coupling",
    "separate-ways": "Separate Ways — no integration at all, so no API at all",
    "acl": "ACL — a downstream act: a private translation of an upstream it does not control, so it "
           "publishes nothing by holding one (`references/rest-patterns.md` § Relationship role)",
    "customer": "Customer of a Customer/Supplier pair — it negotiates the supplier's contract, not its own",
    "other": "role stated as `other` — the model has not said how this side is governed",
}

UNNAMED = "(no name in the model)"
UNRESOLVED = "—"

DEGRADED_NOTE = (
    "> **Read without PyYAML.** `model.yaml` was parsed by the fallback reader, which cannot see "
    "nested fields — so `relationships[].our_roles` and `exposed_to_api` were invisible to both "
    "filters. Eligibility and schema components below are **unknown, not empty**. Install PyYAML "
    "and re-run before reviewing this table."
)

# Words too common to prove a message touches an invariant. Everything shorter than four characters
# is dropped anyway, which already removes `pay`, `may`, `at`, `of`.
STOPWORDS = frozenset({"this", "that", "from", "with", "into", "when", "what", "does", "been",
                       "they", "their", "there", "which", "some", "each", "then", "than"})


# --------------------------------------------------------------------------- loading


DEGRADED = False  # set when model.yaml had to be read by the fallback parser


def _yaml(text: str) -> dict:
    """PyYAML when it is installed, a mini-parser when it is not.

    Guarded the same way `ddd_check.py` guards it, and duplicated rather than imported on purpose:
    this script lives in a different plugin, and reaching across plugin roots for a loader would
    make swe-flow refuse to run wherever ddd-flow is not installed — for a fifteen-line function.

    The fallback reads scalars and flat lists, which is NOT enough for the two nested fields both
    filters run on (`relationships[].our_roles`, `exposed_to_api`). Without the flag, the run
    prints "no context declares a provider role" — a confident falsehood produced by a missing
    dependency rather than by the model, and the reader has no way to tell the two apart.
    """
    global DEGRADED
    try:
        import yaml  # type: ignore

        return yaml.safe_load(text) or {}
    except ImportError:
        DEGRADED = True
        return _mini(text)


def _mini(text: str) -> dict:
    """Enough YAML for model.yaml: scalars, flow maps, and lists of flow maps."""
    out: dict = {}
    key = None
    for raw in text.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if not raw.startswith((" ", "-", "\t")):
            k, _, v = raw.partition(":")
            key = k.strip()
            v = v.strip()
            out[key] = v if v else []
        elif key and raw.lstrip().startswith("- "):
            item = raw.lstrip()[2:].strip()
            if isinstance(out.get(key), list):
                out[key].append(item)
    return out


def _roles(node) -> list[str]:
    """One side's roles. A side can carry several — Open Host Service and Published Language
    co-occur constantly — so the field is a list, and a repo writing a single role unbracketed is
    read the same way rather than treated as a schema error."""
    if isinstance(node, str):
        return [node.strip().lower()] if node.strip() else []
    return [str(x).strip().lower() for x in (node or []) if str(x).strip()]


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


def load_contexts(docs: Path, root: Path | None = None) -> dict[str, dict]:
    ctx: dict[str, dict] = {}
    if not docs.is_dir():
        return ctx
    for d in sorted(p for p in docs.iterdir() if p.is_dir()):
        f = d / "model.yaml"
        if f.exists():
            data = _yaml(f.read_text(errors="ignore"))
            data["_dir"] = d.name
            data["_path"] = str(f.relative_to(root)) if root else str(f)
            ctx[str(data.get("context") or d.name)] = data
    return ctx


@dataclass
class Message:
    """One numbered row of one message-flow table — the unit that carries provenance."""
    flow: str          # DOMAIN-FLOW-0002
    number: str        # 7
    sender: str        # raw `From` cell
    name: str          # raw `Message` cell
    type: str          # command | query | event
    to: str            # raw `To` cell

    @property
    def source(self) -> str:
        return f"{self.flow} #{self.number}"

    @property
    def triple(self) -> tuple[str, str, str]:
        return (self.sender, self.type, self.to)


def load_messages(docs: Path) -> list[Message]:
    """Every numbered message row under docs/domain/message-flows.

    Reads the table 4-connect prescribes (`| # | From | Message | Type | Contents | To |`) by column
    NAME, not position, so a repo that drops the Contents column still parses. The index and any
    delta proposal are skipped for the reason `ddd_check` skips them: they restate other files'
    rows, and counting a restatement as a second occurrence would inflate every number below.
    """
    d = docs / "message-flows"
    if not d.is_dir():
        return []
    out: list[Message] = []
    for f in sorted(d.glob("*.md")):
        if f.stem.lower() in ("readme", "index") or f.stem.lower().startswith("proposed"):
            continue
        flow = re.match(r"(DOMAIN-FLOW-\d+)", f.stem, re.I)
        idx: dict[str, int] | None = None
        for line in f.read_text(errors="ignore").splitlines():
            if not line.lstrip().startswith("|"):
                idx = None
                continue
            cells = _cells(line)
            low = [c.lower() for c in cells]
            if "message" in low and "to" in low:
                idx = {k: low.index(k) for k in ("#", "from", "message", "type", "to") if k in low}
                continue
            if idx is None or not cells or not re.match(r"^\d{1,2}(\.\d+)?$", cells[0]):
                continue
            get = lambda k: cells[idx[k]].strip("`* ") if k in idx and len(cells) > idx[k] else ""  # noqa: E731
            mtype = get("type").lower()
            if mtype not in METHOD_BY_TYPE:
                continue  # a row whose kind is unstated cannot be given a method hint honestly
            out.append(Message(flow.group(1) if flow else f.stem, get("#"), get("from"),
                               get("message"), mtype, get("to")))
    return out


# --------------------------------------------------------------------------- naming


def _words(name: str) -> list[str]:
    """Significant lowercase words of a CamelCase message or element name."""
    plain = re.sub(r"[^A-Za-z0-9]+", " ", name)
    parts = re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+", plain)
    return [p.lower() for p in parts if len(p) >= 4 and p.lower() not in STOPWORDS]


def _kebab(name: str) -> str:
    plain = re.sub(r"[^A-Za-z0-9]+", " ", name).strip()
    parts = re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+", plain)
    return "-".join(p.lower() for p in parts) or _norm(name)


def _plural(kebab: str) -> str:
    """Naive English plural on the last word only. A resource name a reviewer has to correct is
    cheaper than one they have to invent, and this is a candidate list."""
    head, _, last = kebab.rpartition("-")
    if last.endswith(("s", "x", "z")) or last.endswith(("ch", "sh")):
        p = last + "es"
    elif re.search(r"[^aeiou]y$", last):
        p = last[:-1] + "ies"
    else:
        p = last + "s"
    return f"{head}-{p}" if head else p


def _aggregates(c: dict) -> list[dict]:
    return [a for a in (c.get("aggregates") or []) if isinstance(a, dict)]


def _element_names(agg: dict) -> set[str]:
    names = {str(agg.get("root") or ""), str(agg.get("name") or "")}
    for key in ("entities", "value_objects"):
        for e in (agg.get(key) or []):
            if isinstance(e, dict) and e.get("name"):
                names.add(str(e["name"]))
    return {n for n in names if n}


def pick_aggregate(c: dict, msg: Message) -> dict | None:
    """Which aggregate a message lands on, most specific evidence first.

    An event named in an aggregate's `domain_events` pins that aggregate exactly — no heuristic
    beats the model saying so. Only then fall back to word overlap with the aggregate's own
    elements, and only then to the single/first aggregate. TerminalOperations is why the order
    matters: it holds two aggregates, and `OfflineExitLogged` belongs to the second one.
    """
    aggs = _aggregates(c)
    if not aggs:
        return None
    for a in aggs:
        for ev in (a.get("domain_events") or []):
            evname = ev.get("name") if isinstance(ev, dict) else str(ev)
            if evname and _norm(evname) == _norm(msg.name):
                return a
    words = set(_words(msg.name))
    for a in aggs:
        if any(w in words for e in _element_names(a) for w in _words(e)):
            return a
    return aggs[0]


# --------------------------------------------------------------------------- derivation


@dataclass
class Row:
    endpoint: str
    context: str
    our_roles: list[str]
    their_roles: list[str]
    roles_are_context_wide: bool
    method: str
    responsibility: str
    sources: list[str]
    message: str
    message_type: str
    counterparts: list[str]
    basis: str                                    # where the endpoint name came from
    invariants: list[str] = field(default_factory=list)
    triples: list[tuple[str, str, str]] = field(default_factory=list)

    @property
    def key(self) -> tuple:
        return (self.context, self.endpoint, self.method, _norm(self.message))


def resolve_contexts(cell: str, names: list[str]) -> list[str]:
    """Which bounded contexts a `From`/`To` cell names.

    A cell is prose: `TerminalOperations (entrance)`, `OccupancyInsight, FiscalRecord`, or
    `free-bays read model`. Ask which context names occur inside it — the same containment test
    `ddd_check` uses for the consumer check — rather than whether the cell equals one. Longest
    first, so a context whose name contains another's is not shadowed.
    """
    n = _norm(cell)
    return [c for c in sorted(names, key=lambda x: -len(x)) if _norm(c) and _norm(c) in n]


def owning_context(msg: Message, names: list[str]) -> tuple[str, list[str]]:
    """(the context that would host the endpoint, the contexts on the other end).

    A command or a query is served by its RECEIVER — that is the side with the endpoint. An event
    is offered by its EMITTER: consumers subscribe, so the webhook is published by the sender.
    That split is what lets a row survive a `To` cell like `(nobody, until 5)` — an offline event
    still has a publisher even when nothing consumes it yet.
    """
    if msg.type == EVENT:
        owners = resolve_contexts(msg.sender, names)
        return (owners[0] if owners else UNRESOLVED, resolve_contexts(msg.to, names))
    owners = resolve_contexts(msg.to, names)
    return (owners[0] if owners else UNRESOLVED, resolve_contexts(msg.sender, names))


def edge_roles(c: dict, counterparts: list[str]) -> tuple[list[str], list[str], bool]:
    """Roles on the edges to the contexts at the other end of this message.

    When the other end is an actor or a device (`Driver`, `the stripe`) there is no edge to read,
    so fall back to the union of this context's roles across all its relationships and say so —
    a role shown without that flag would claim an edge that the model never wrote.
    """
    rels = [r for r in (c.get("relationships") or []) if isinstance(r, dict)]
    matched = [r for r in rels if r.get("to") and str(r["to"]) in counterparts]
    if matched:
        ours = sorted({x for r in matched for x in _roles(r.get("our_roles"))})
        theirs = sorted({x for r in matched for x in _roles(r.get("their_roles"))})
        return ours, theirs, False
    ours = sorted({x for r in rels for x in _roles(r.get("our_roles"))})
    theirs = sorted({x for r in rels for x in _roles(r.get("their_roles"))})
    return ours, theirs, True


def invariants_touched(c: dict, agg: dict | None, msg: Message) -> list[str]:
    """Which invariants this message plausibly moves.

    Word-prefix overlap between the message name and the invariant text. It over-matches rather
    than under-matches on purpose: a false positive sends a row to the reviewer labelled State
    Transition, a false negative hides that a write crosses a rule. Prefix, not equality, so
    `Reconcile` reaches `Reconciliation` and `Ticket` reaches `ticket`.
    """
    pool = list(c.get("invariants") or [])
    pool += list((agg or {}).get("invariants") or [])
    words = _words(msg.name)
    hits = []
    for inv in pool:
        text = str(inv).lower()
        if any(re.search(rf"\b{re.escape(w[:5])}", text) for w in words):
            hits.append(str(inv))
    return hits


def responsibility_of(msg: Message, c: dict | None) -> str:
    """command → creation or transition; query → retrieval or computation."""
    if msg.type == QUERY:
        # A Computation Function reads no provider-side state (MAP). The model says which contexts
        # have none to read: a `transaction-script` context that declares no aggregate is a
        # calculation — Tariff answers `PriceOfStay?` and keeps nothing. A `crud` or
        # `bought-adapter` context with no aggregate still holds or proxies state, so it retrieves.
        stateless = c is not None and not _aggregates(c)
        if stateless and str(c.get("tactical_pattern", "")) == "transaction-script":
            return COMPUTATION
        return RETRIEVAL
    if msg.type == EVENT:
        # An event is a fact already committed; the endpoint publishes the transition that produced
        # it. Labelling it Retrieval would suggest a caller can ask for it, which a webhook is not.
        return STATE_TRANSITION
    first = re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+", msg.name)
    if first and first[0].lower() in CREATION_VERBS:
        return STATE_CREATION
    # A command that matched no invariant is still a write — the invariant list is evidence carried
    # on the row (`invariants` in --json), not the classifier. Inventing a fifth label for
    # "writes, guards nothing" would hide the real finding, which is that a command crosses no
    # stated rule and the model may simply not have written the rule down yet.
    return STATE_TRANSITION


def derive_rows(ctx: dict[str, dict], messages: list[Message]) -> list[Row]:
    """One row per distinct (context, endpoint, method, message). A message repeated across flows
    merges into one candidate carrying every source — `PresentCardAtExit` appears in three flows
    and is one endpoint, not three."""
    names = list(ctx)
    merged: dict[tuple, Row] = {}
    for msg in messages:
        owner, counterparts = owning_context(msg, names)
        c = ctx.get(owner)
        agg = pick_aggregate(c, msg) if c else None
        if agg and agg.get("root"):
            endpoint = "/" + _plural(_kebab(str(agg["root"])))
            basis = f"aggregate root `{agg['root']}` → collection"
        elif not msg.name or not _words(msg.name):
            endpoint = UNNAMED
            basis = "the flow names no message — nothing to name a resource after"
        else:
            endpoint = "/" + _kebab(msg.name.rstrip("?"))
            basis = ("message name — the context declares no aggregate" if c
                     else "message name — the other end names no bounded context")
        invs = invariants_touched(c, agg, msg) if c else []
        ours, theirs, wide = edge_roles(c, counterparts) if c else ([], [], True)
        row = Row(
            endpoint=endpoint, context=owner, our_roles=ours, their_roles=theirs,
            roles_are_context_wide=wide, method=METHOD_BY_TYPE[msg.type],
            responsibility=responsibility_of(msg, c),
            sources=[msg.source], message=msg.name or UNNAMED, message_type=msg.type,
            counterparts=counterparts, basis=basis, invariants=invs, triples=[msg.triple],
        )
        prior = merged.get(row.key)
        if prior is None:
            merged[row.key] = row
            continue
        for s in row.sources:
            if s not in prior.sources:
                prior.sources.append(s)
        for t in row.triples:
            if t not in prior.triples:
                prior.triples.append(t)
        for cp in row.counterparts:
            if cp not in prior.counterparts:
                prior.counterparts.append(cp)
    return sorted(merged.values(), key=lambda r: (r.context == UNRESOLVED, r.context, r.endpoint,
                                                  r.method, r.message))


# --------------------------------------------------------------------------- the two filters


def eligibility(ctx: dict[str, dict]) -> dict[str, dict]:
    """context -> {eligible, provider_roles, reason}.

    Presence of a provider role in `our_roles` on ANY relationship, because that is the question:
    is this context ever the side someone else calls. A context is not made eligible by holding a
    role on the other side of an edge — that role belongs to the other context's contract.
    """
    out: dict[str, dict] = {}
    for name, c in ctx.items():
        held = sorted({x for r in (c.get("relationships") or []) if isinstance(r, dict)
                       for x in _roles(r.get("our_roles"))})
        provider = [r for r in held if r in PROVIDER_ROLES]
        if provider:
            out[name] = {"eligible": True, "roles": held, "provider_roles": provider, "reason": ""}
            continue
        # Say WHY, in the vocabulary of the roles this context actually holds. A context with no
        # relationships at all is a different failure from one that only conforms.
        if not held:
            reason = "declares no relationships — nothing says anyone calls it"
        else:
            reason = "; ".join(NO_CONTRACT_REASON.get(r, f"role `{r}` is not a provider role")
                               for r in held)
        out[name] = {"eligible": False, "roles": held, "provider_roles": [], "reason": reason}
    return out


def schema_components(ctx: dict[str, dict], elig: dict[str, dict]) -> list[dict]:
    """Elements marked `exposed_to_api: true` — the API model subset, chosen in the domain artifact.

    EuroPLoP'21 §5.2 names the failure this closes: an API facade whose exposed subset was never
    designated, only implied. Choosing what to publish is a Published Language decision, so this
    script reads it and never widens it — an element outside this list has no justification on
    disk, and inventing one here would be the same defect with an extra step.
    """
    out: list[dict] = []
    for name in sorted(ctx):
        for a in _aggregates(ctx[name]):
            if a.get("exposed_to_api") is True:
                out.append({"element": str(a.get("root") or a.get("name")), "kind": "aggregate",
                            "context": name, "aggregate": str(a.get("name") or ""),
                            "context_eligible": elig.get(name, {}).get("eligible", False)})
            for vo in (a.get("value_objects") or []):
                if isinstance(vo, dict) and vo.get("exposed_to_api") is True:
                    out.append({"element": str(vo.get("name")), "kind": "value object",
                                "context": name, "aggregate": str(a.get("name") or ""),
                                "context_eligible": elig.get(name, {}).get("eligible", False)})
    return out


# --------------------------------------------------------------------------- rendering


def _roles_cell(r: Row) -> str:
    if not r.our_roles and not r.their_roles:
        return UNRESOLVED
    star = "*" if r.roles_are_context_wide else ""
    ours, theirs = ", ".join(r.our_roles) or UNRESOLVED, ", ".join(r.their_roles) or UNRESOLVED
    return f"ours{star}: {ours} / theirs{star}: {theirs}"


def _row_cells(r: Row) -> list[str]:
    return [f"`{r.endpoint}`", r.context, _roles_cell(r), f"`{r.method}`", r.responsibility,
            f"{'; '.join(r.sources)} — `{r.message}`", ""]


HEADERS = ["Endpoint candidate", "Owning context", "Roles", "Method", "Operation responsibility",
           "Source", "Public?"]


def _table(rows: list[Row]) -> list[str]:
    out = ["| " + " | ".join(HEADERS) + " |", "|" + "---|" * len(HEADERS)]
    out += ["| " + " | ".join(_row_cells(r)) + " |" for r in rows]
    return out


def coverage(rows: list[Row], all_msgs: list[Message]) -> dict:
    """How much of the traced cross-boundary traffic reached a row. A triple counts as covered
    only when a row cites a source from it — the same reason the `Source` column is required."""
    triples = {m.triple for m in all_msgs}
    covered = {t for r in rows for t in r.triples}
    return {"triples": len(triples), "covered": len(covered),
            "pct": round(100 * len(covered) / len(triples), 1) if triples else 0.0,
            "uncovered": sorted(" → ".join(t) for t in triples - covered)}


def render_markdown(root: Path, docs: Path, ctx: dict[str, dict], elig: dict[str, dict],
                    rows: list[Row], messages: list[Message], comps: list[dict]) -> str:
    ok = [r for r in rows if elig.get(r.context, {}).get("eligible")]
    parked = [r for r in rows if r not in ok]
    n_ok = sum(1 for v in elig.values() if v["eligible"])
    L = [f"# Candidate Endpoint List — {docs.relative_to(root) if docs.is_relative_to(root) else docs}",
         "",
         "Derived, not decided. Every cell below is computed from `docs/domain/`; the `Public?` "
         "column is blank on purpose — exposure is the human's decision and the only one this table "
         "asks for. Review this table BEFORE any contract exists (Stepwise Service Design steps "
         "4–5 precede step 6).",
         ""]
    if DEGRADED:
        L += [DEGRADED_NOTE, ""]
    L += [f"## Contract-eligible ({n_ok} of {len(ctx)} contexts, {len(ok)} candidate endpoints)",
          ""]
    if ok:
        L += _table(ok) + [
            "",
            "`*` on a roles cell means the other end of the message is an actor or a device, so "
            "the roles shown are this context's across all its relationships, not one edge's."]
    else:
        L += ["_No context declares a provider role — nothing is eligible._"]
    L += [""]

    L += [f"## Not eligible for a contract ({len(ctx) - n_ok} of {len(ctx)} contexts)", ""]
    if n_ok == len(ctx):
        L += ["_Every context holds a provider role._", ""]
    else:
        L += ["| Context | Roles held | Why no contract | Messages parked |", "|---|---|---|---|"]
        for name in sorted(ctx):
            v = elig[name]
            if v["eligible"]:
                continue
            n = sum(1 for r in parked if r.context == name)
            L.append(f"| {name} | {', '.join(v['roles']) or UNRESOLVED} | {v['reason']} | {n} |")
        L.append("")

    if parked:
        L += [f"### Parked rows ({len(parked)}) — deferred, never dropped", "",
              "These messages exist and are sourced; their owning context has no role that gives it "
              "a contract. A silent cap here would read as coverage.", ""]
        L += _table(parked) + [""]

    L += ["## Schema components — elements marked `exposed_to_api`", ""]
    if comps:
        L += ["| Element | Kind | Owning context | Aggregate | Context eligible |", "|---|---|---|---|---|"]
        L += [f"| `{c['element']}` | {c['kind']} | {c['context']} | {c['aggregate']} | "
              f"{'yes' if c['context_eligible'] else 'no'} |" for c in comps]
    else:
        L += ["_No element is marked `exposed_to_api: true` — no API model subset has been "
              "designated, so no schema component can be derived._"]
    L += [""]

    cov_all, cov_ok = coverage(rows, messages), coverage(ok, messages)
    empty = [r for r in rows if not r.sources or not any(s.strip() for s in r.sources)]
    L += ["## Coverage", ""]
    if not messages:
        # No flows, no rows — and that is the correct output, not a bug. A candidate endpoint with
        # no source is a guess, and the column that would carry the guess is the one this table
        # refuses to leave empty. Run 4-connect first.
        L += ["- no message rows under `docs/domain/message-flows` — nothing to source a row from, "
              "so no endpoint is proposed. Trace the flows first."]
    else:
        L += [f"- {len(messages)} message rows parsed → {cov_all['triples']} distinct "
              f"(from, type, to) triples → {len(rows)} candidate endpoints",
              f"- eligible table covers {cov_ok['covered']}/{cov_all['triples']} triples "
              f"({cov_ok['pct']}%); with parked rows, {cov_all['covered']}/{cov_all['triples']} "
              f"({cov_all['pct']}%)",
              f"- rows with an empty source: {len(empty)}"]
    if cov_all["uncovered"]:
        L += ["- uncovered triples:"] + [f"  - {t}" for t in cov_all["uncovered"]]
    roots = [(n, str(a.get("root"))) for n in sorted(ctx) for a in _aggregates(ctx[n]) if a.get("root")]
    orphan = [f"{n}.{r}" for n, r in roots
              if not any(x.context == n and _kebab(r) in x.endpoint for x in rows)]
    if orphan:
        # An aggregate root no message reaches gets no row, because a row needs a source and the
        # source is a flow. That is a finding for 4-connect, not a row to invent.
        L += [f"- aggregate roots with no traced message (no row, by design): {', '.join(orphan)}"]
    return "\n".join(L) + "\n"


def render_json(root: Path, docs: Path, ctx: dict[str, dict], elig: dict[str, dict],
                rows: list[Row], messages: list[Message], comps: list[dict]) -> dict:
    ok = [r for r in rows if elig.get(r.context, {}).get("eligible")]
    parked = [r for r in rows if r not in ok]
    return {
        "root": str(root), "docs": str(docs),
        "parser": "mini-fallback (nested fields unreadable)" if DEGRADED else "pyyaml",
        "contexts": {n: elig[n] for n in sorted(elig)},
        "cel": [r.__dict__ | {"eligible": True} for r in ok],
        "parked": [r.__dict__ | {"eligible": False,
                                 "reason": elig.get(r.context, {}).get(
                                     "reason", "the message names no bounded context on that end")}
                   for r in parked],
        "schema_components": comps,
        "coverage": {"messages": len(messages),
                     "eligible": coverage(ok, messages), "all": coverage(rows, messages),
                     "rows_without_source": sum(1 for r in rows if not r.sources)},
    }


# --------------------------------------------------------------------------- cli


def main() -> int:
    ap = argparse.ArgumentParser(description="Derive a Candidate Endpoint List from docs/domain.")
    ap.add_argument("--root", default=".")
    ap.add_argument("--docs", default=None)
    fmt = ap.add_mutually_exclusive_group()
    fmt.add_argument("--json", action="store_true")
    fmt.add_argument("--markdown", action="store_true", help="the default")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    docs = Path(args.docs).resolve() if args.docs else root / "docs" / "domain"
    ctx = load_contexts(docs, root)
    if not ctx:
        print(f"No bounded contexts under {docs} — nothing to derive.", file=sys.stderr)
        return 2

    messages = load_messages(docs)
    elig = eligibility(ctx)
    rows = derive_rows(ctx, messages)
    comps = schema_components(ctx, elig)

    if args.json:
        print(json.dumps(render_json(root, docs, ctx, elig, rows, messages, comps),
                         indent=2, ensure_ascii=False))
    else:
        print(render_markdown(root, docs, ctx, elig, rows, messages, comps), end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())
