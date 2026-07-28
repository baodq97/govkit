#!/usr/bin/env python3
"""The model split the way a fan-out needs it: one shared header, then one slice per context.

Built from a measured failure. An earlier version joined everything a step needed on every call, and
a single agent defining seven contexts paid 14 tool calls per context where reading the files by hand
had cost 3.2 — because reading by hand AMORTISES. One agent opens `business-model.md` once and uses
it seven times; a per-call join re-emits it seven times. Constant marginal cost is the wrong property
for one agent doing many units.

It is the right property for many agents doing one unit each, which is what this is for:

    python3 ddd_slice.py --root . --header              # cross-cutting facts, read once per agent
    python3 ddd_slice.py --root . --context Booking     # just this boundary
    python3 ddd_slice.py --root . --list                # the units to fan out over

The header carries what every unit agent would otherwise re-derive: the capability classification,
the words that mean two things, the business rules somebody actually stated. The slice carries only
what belongs to one boundary. Nothing is in both, so N agents pay the header once each and the
model once in total, instead of the model N times.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import ddd_check as C  # noqa: E402  — the design skill owns the schema; nothing here re-parses it

HEADER = ["business_model", "discovery", "contexts"]
SLICE = ["contexts", "messages", "aggregates"]
# Discovery is deliberately header-only. Stated rules and hotspots are cross-cutting, and putting
# them in both places is how a "read once" claim quietly becomes "read N times" — the exact cost
# this split exists to avoid.


# --------------------------------------------------------------------------- flow parsing


def flow_rows(docs: Path) -> list[dict]:
    """Every traced message, as a row: which flow, from, to, type, contents, when.

    `ddd_check._traced_messages` answers "is this event traced anywhere", which is all a check
    needs. A step needs the whole row — who sent it, of what type, in which scenario — so this
    parses the table properly. Columns are found by header name, so dropping the optional
    `Contents` or `When` column does not shift everything by one.
    """
    d = docs / "message-flows"
    if not d.is_dir():
        return []
    out: list[dict] = []
    for f in sorted(d.glob("*.md")):
        if f.stem.lower() in ("readme", "index") or f.stem.lower().startswith("proposed"):
            continue
        idx: dict[str, int] | None = None
        for line in f.read_text(errors="ignore").splitlines():
            if not line.lstrip().startswith("|"):
                idx = None
                continue
            cells = C._cells(line)
            low = [c.lower() for c in cells]
            if "message" in low and "to" in low:
                idx = {k: low.index(k) for k in ("from", "message", "type", "contents", "to", "when")
                       if k in low}
                continue
            if not idx or not re.match(r"^\d{1,2}(\.\d+)?$", cells[0] if cells else ""):
                continue
            get = lambda k: cells[idx[k]].strip("`* ") if k in idx and len(cells) > idx[k] else ""  # noqa: E731
            if get("message"):
                out.append({"flow": f.stem, "seq": cells[0], "from": get("from"),
                            "message": get("message"), "type": get("type").lower(),
                            "contents": get("contents"), "to": get("to"), "when": get("when")})
    return out


def _touches(cell: str, context: str) -> bool:
    """A From/To cell is prose: it can name a context plus a device, or two contexts. Ask whether
    the context occurs inside it rather than whether the cell equals it."""
    return bool(context) and C._norm(context) in C._norm(cell)


# --------------------------------------------------------------------------- resolvers
#
# Each returns (heading, rows | lines). Empty is not skipped — a step needs to know that the
# business model has no classification table as much as it needs the table itself, because the two
# lead to different work and only one of them is a gap worth naming.


def r_business_model(docs: Path, ctx: dict, scope: str | None) -> tuple[str, list]:
    caps = C.load_business_model(docs)
    rows = [{"capability": k, "role": v["business_role"], "stage": v["evolution_stage"],
             "differentiates": v["differentiation"]} for k, v in sorted(caps.items())]
    if scope:
        cap = C._match_capability(scope, caps)
        if cap:
            return "Business model — this context's capability", \
                [r for r in rows if r["capability"] == cap["capability"]]
        # Dumping thirteen unrelated capabilities to answer "which one is this" costs more than it
        # tells. The absence is the useful signal: a context with no capability row is one whose
        # classification cannot be carried down, only re-derived — which is what 5-strategize
        # exists to stop.
        return "Business model — this context's capability", \
            [f"no capability row matches `{scope}` — its classification cannot be carried from the "
             f"business model, so anything downstream that states one is re-deriving it"]
    return "Business model — capability classification", rows


def _discovery_from_markdown(docs: Path) -> tuple[dict, list[dict], list[str], list[str]]:
    """Discovery as it exists in a repo that has never run the view: markdown only.

    Reporting "nothing on disk" for such a repo is worse than reporting nothing at all — it is a
    confident falsehood, and a step that believes it goes and reads the files by hand anyway, having
    paid for the pack first. Found exactly that way: an eval run against a fixture holding only
    `timeline.md` was slower than the same run with no pack at all.

    Header names vary between repos (`Element` here, `Event` there), so the name column is found by
    trying the plausible ones rather than by position.
    """
    d = docs / "discovery"
    if not d.is_dir():
        return {}, [], [], []
    NAME_COLS = ("element", "event", "name", "term")
    HOT_COLS = ("hotspot", "question")
    rows, hotspots, terms, rules = 0, [], [], []
    confirmed = candidate = 0
    for f in sorted(d.glob("*.md")):
        section = ""
        idx: dict[str, int] | None = None
        for line in f.read_text(errors="ignore").splitlines():
            if line.startswith("#"):
                section = line.lstrip("# ").lower()
                idx = None
                continue
            if not line.lstrip().startswith("|"):
                idx = None
                continue
            cells = C._cells(line)
            low = [c.lower() for c in cells]
            if any(n in low for n in (*NAME_COLS, *HOT_COLS, "rule")):
                idx = {k: low.index(k) for k in (*NAME_COLS, *HOT_COLS, "rule", "status", "state",
                                                 "confirmed by", "held by", "who raised it",
                                                 "who could answer", "blocks", "stated by")
                       if k in low}
                continue
            if idx is None or set(cells) <= {"", "---"} or cells[0].startswith(":--"):
                continue
            get = lambda k: cells[idx[k]].strip("`* ") if k in idx and len(cells) > idx[k] else ""  # noqa: E731
            hot = next((get(h) for h in HOT_COLS if get(h)), "")
            if hot:
                hotspots.append({"question": hot, "blocks": get("blocks"),
                                 "who": get("who could answer") or get("who raised it")})
                continue
            if get("rule"):
                rules.append(f"{get('rule')} — {get('stated by') or 'source not stated'}")
                continue
            name = next((get(n) for n in NAME_COLS if get(n)), "")
            if not name:
                continue
            rows += 1
            if "term" in idx:
                terms.append(name)
            st = get("status").lower()
            joined = " ".join(cells).lower()
            # Order matters and got this wrong once: a repo with no Status column marks a candidate
            # by writing the word in the attribution cell, so `Confirmed by: *candidate* — nobody
            # confirmed when it fires` was counted as confirmed. Look for the marking first.
            if "candidate" in joined or st.startswith("cand"):
                candidate += 1
            elif st.startswith("confirm") or (not st and get("confirmed by")):
                confirmed += 1
    counts = {"elements": rows, "confirmed": confirmed, "candidate": candidate}
    dupes = sorted({t for t in terms if terms.count(t) > 1})
    return counts, hotspots, dupes, rules


def r_discovery(docs: Path, ctx: dict, scope: str | None) -> tuple[str, list]:
    f = docs / "discovery" / "model.json"
    counts: dict[str, int] = {}
    hotspots: list[dict] = []
    collisions: list[str] = []
    source = "discovery/model.json"
    if f.exists():
        try:
            d = json.loads(f.read_text(errors="ignore"))
            tl = d.get("timeline") or []
            counts = {"elements": len(tl),
                      "confirmed": sum(1 for e in tl if str(e.get("status", "")).lower() == "confirmed"),
                      "candidate": sum(1 for e in tl if str(e.get("status", "")).lower() == "candidate")}
            states = C._discovery_states(docs) or {}
            for s in C.STATES:
                counts[s] = sum(1 for v in states.values() if v == s)
            counts["state-unstated"] = len(tl) - len(states)
            hotspots = [{"question": h.get("question", ""), "blocks": h.get("blocks", ""),
                         "who": h.get("whoCouldAnswer", h.get("who", ""))}
                        for h in (d.get("hotspots") or []) if isinstance(h, dict)]
            seen: dict[str, int] = {}
            for t in (d.get("ubiquitousLanguage") or []):
                term = str(t.get("term", ""))
                seen[term] = seen.get(term, 0) + 1
            collisions = [t for t, n in seen.items() if n > 1]
        except Exception:
            pass
    rules: list[str] = []
    if not counts.get("elements"):
        counts, hotspots, collisions, rules = _discovery_from_markdown(docs)
        source = "discovery/*.md — this repo has no discovery/model.json, so these are row counts"
    if scope:
        hotspots = [h for h in hotspots if _touches(h["question"] + h["blocks"], scope)] or hotspots
    lines = [f"source: {source}"] + [f"{k}: {v}" for k, v in counts.items()]
    # Business rules someone actually stated. Every step downstream is forbidden to assert a
    # business decision beyond these, and the rule is unenforceable if the list is not in front of
    # the model at the moment it writes the decision.
    lines += [f"rule stated: {r}" for r in rules[:10]]
    if collisions:
        # One word meaning two things is the strongest boundary signal discovery produces, and it
        # is the first thing lost when a step skims the language table instead of diffing it.
        lines.append("term collisions (same word, two definitions): " + ", ".join(sorted(collisions)))
    return "Discovery", (lines + [{"hotspot": h["question"], "blocks": h["blocks"], "who": h["who"]}
                                  for h in hotspots[:12]])


def _tiers(docs: Path, ctx: dict) -> tuple[dict[str, str], str]:
    """How much canvas each context earns — decided once, across the whole set.

    This exists because a fan-out could not decide it. Seven agents each holding one context all
    deferred to their own `subdomain_type`, and the run wrote 69% more prose than one agent had:
    that agent could see four contexts labelled `core` against one capability the business model
    says differentiates, concluded the labels were inflated, and stubbed the commodity one.

    That judgement is a count, so it is computable. When more contexts claim `core` than there are
    differentiating capabilities, the labels are not carrying evidence and differentiation decides
    instead. When they agree, the label decides — it is the cheaper signal and there is nothing to
    adjudicate.

    Returned with the reason, because a tier handed down without its argument is just another label.
    """
    caps = C.load_business_model(docs)
    labelled_core = [n for n, c in ctx.items() if str(c.get("subdomain_type", "")).strip() == "core"]
    differentiating = [k for k, v in caps.items() if v["differentiation"] == "yes"]
    inflated = caps and len(labelled_core) > len(differentiating)

    tiers = {}
    for name, c in ctx.items():
        label = str(c.get("subdomain_type", "")).strip() or "unknown"
        cap = C._match_capability(name, caps)
        diff = cap["differentiation"] if cap else "unsourced"
        stage = (cap["evolution_stage"] if cap else "").lower()
        if not inflated:
            tiers[name] = {"core": "full", "supporting": "light"}.get(label, "stub")
        elif diff == "yes":
            tiers[name] = "full"
        elif label == "generic" or "commodity" in stage:
            # A stub is the correct output for something BOUGHT — that is what the right-size table
            # reserves it for. Non-differentiating is not the same claim: a compliance context can
            # carry a real invariant and still differentiate on nothing, and stubbing it would drop
            # the invariant. Evolution stage is the axis that says "bought", so it decides this.
            tiers[name] = "stub"
        else:
            tiers[name] = "light"
    why = (f"{len(labelled_core)} contexts are labelled `core` but only {len(differentiating)} "
           f"capability differentiates, so the labels are inflated and the business model decides "
           f"instead: **differentiates → full · commodity or generic → stub · everything else → "
           f"light**. A context with no capability row gets `light`; unsourced is not evidence of "
           f"importance, and stubbing it would hide the gap."
           if inflated else
           "the labels agree with the business model, so `subdomain_type` decides the tier.")
    return tiers, why


def r_contexts(docs: Path, ctx: dict, scope: str | None) -> tuple[str, list]:
    tiers, why = _tiers(docs, ctx) if not scope else ({}, "")
    rows = []
    for name, c in sorted(ctx.items()):
        if scope and C._norm(name) != C._norm(scope):
            continue
        readme = docs / c["_dir"] / "README.md"
        body = readme.read_text(errors="ignore").lower() if readme.exists() else ""
        marks = [m for m in ("assumption", "verification metric", "open question") if m in body]
        aggs = [a for a in (c.get("aggregates") or []) if isinstance(a, dict)]
        # Events and invariants live on the aggregate in most repos and on the context in some.
        # Counting only one place reported zero for a context declaring ten events, which is worse
        # than not reporting it: a step reads `0` as "nothing to carry down".
        events = len(C._names(c.get("domain_events"))) + sum(len(C._names(a.get("domain_events"))) for a in aggs)
        invariants = len(C._invariants(c))  # already walks into aggregates — summing again doubles it
        mass = C._mass(c)
        rows.append({"context": name, "type": c.get("subdomain_type", "?"),
                     "aggregates": len(aggs), "events": events, "invariants": invariants,
                     # Declared mass, never a substitute computed from something else — 5-strategize
                     # places contexts on this axis, and a silently-derived number would place them
                     # on evidence nobody wrote down.
                     "declared mass": mass or "—",
                     "canvas": f"{len(marks)}/3 falsifiable" if readme.exists() else "no README",
                     **({"TIER": tiers.get(name, "?")} if tiers else {})})
    if tiers:
        return "Contexts — with the tier each earns", rows + [
            f"Tier decides how much canvas to write: **full** = every section plus the interface "
            f"critique · **light** = purpose, language, inbound/outbound, business decisions · "
            f"**stub** = purpose, what it is bought from, the adapter's interface.",
            f"How the tier was decided: {why}",
            f"Use the tier as given. It is a decision across the whole set — one context cannot see "
            f"whether the labels around it are trustworthy, which is exactly the judgement being "
            f"made here."]
    return "Contexts", rows


def r_messages(docs: Path, ctx: dict, scope: str | None) -> tuple[str, list]:
    """The join that costs a step the most to do by hand: inbound and outbound messages per
    context, with the collaborator and the scenario each was traced in. Filling a Bounded Context
    Canvas means reading every flow file and transposing it; this is that transposition."""
    rows = []
    for r in flow_rows(docs):
        for name in sorted(ctx):
            if scope and C._norm(name) != C._norm(scope):
                continue
            out_, in_ = _touches(r["from"], name), _touches(r["to"], name)
            if out_ == in_:  # neither, or a self-loop that says nothing about a boundary
                continue
            rows.append({"context": name, "dir": "out" if out_ else "in", "message": r["message"],
                         "type": r["type"], "with": r["to"] if out_ else r["from"],
                         "flow": r["flow"], "when": r["when"]})
    return "Messages across this boundary (traced)", rows


def r_flows(docs: Path, ctx: dict, scope: str | None) -> tuple[str, list]:
    rows: dict[str, dict] = {}
    for r in flow_rows(docs):
        f = rows.setdefault(r["flow"], {"flow": r["flow"], "messages": 0, "participants": set(),
                                        "types": set(), "temporal": 0})
        f["messages"] += 1
        f["participants"].update(x for x in (r["from"], r["to"]) if x)
        f["types"].add(r["type"])
        f["temporal"] += 1 if r["when"].strip(" —-*") else 0
    return "Traced flows", [{"flow": v["flow"], "messages": v["messages"],
                             "participants": len(v["participants"]),
                             "types": "/".join(sorted(t for t in v["types"] if t)),
                             "temporal rows": v["temporal"],
                             # The 5-to-9 rule is the one flow constraint a step can breach without
                             # noticing, because each message looks reasonable on its own.
                             "over 9": "YES" if v["messages"] > 9 else ""}
                            for v in sorted(rows.values(), key=lambda x: x["flow"])]


def r_aggregates(docs: Path, ctx: dict, scope: str | None) -> tuple[str, list]:
    rows = []
    for name, c in sorted(ctx.items()):
        if scope and C._norm(name) != C._norm(scope):
            continue
        for a in (c.get("aggregates") or []):
            if not isinstance(a, dict):
                continue
            slug = str(a.get("name", "")).strip()
            canvas = list((docs / c["_dir"] / "aggregates").glob(f"*{slug}*.md")) if slug else []
            rows.append({"context": name, "aggregate": slug,
                         "entities": len(C._entity_names(a)),
                         "events": len(C._names(a.get("domain_events"))),
                         "invariants": len(C._invariants(a)),
                         "canvas": canvas[0].name if canvas else "—"})
    return "Aggregates declared", rows


RESOLVERS = {"business_model": r_business_model, "discovery": r_discovery, "contexts": r_contexts,
             "messages": r_messages, "flows": r_flows, "aggregates": r_aggregates}


# --------------------------------------------------------------------------- rendering


def _render(blocks: list[tuple[str, list]], scope: str | None, docs: Path) -> str:
    intro = (f"Everything below belongs to **{scope}** alone. Facts that span the whole model — the "
             f"capability classification, the contested words, the stated rules — are in the header, "
             f"not repeated here."
             if scope else
             "Cross-cutting facts, true for every boundary. Read once. The per-boundary detail is in "
             "each slice, and nothing appears in both.")
    out = [f"# {'Slice — ' + scope if scope else 'Model header'}", "",
           f"Read off `{docs}` by ddd_slice.py. {intro} Every row is upstream fact, not a proposal, "
           f"and nothing here has been inferred. An empty section means the artifact is missing or "
           f"silent, which is itself the finding.", ""]
    for heading, rows in blocks:
        out.append(f"## {heading}")
        lines = [r for r in rows if isinstance(r, str)]
        dicts = [r for r in rows if isinstance(r, dict)]
        if lines:
            out.append("")
            out.extend(f"- {l}" for l in lines)
        if dicts:
            cols = list(dicts[0].keys())
            out += ["", "| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
            out += ["| " + " | ".join(str(r.get(c, "")) for c in cols) + " |" for r in dicts]
        if not lines and not dicts:
            out.append("")
            out.append("_nothing on disk_")
        out.append("")
    return "\n".join(out)


def build(docs: Path, root: Path, scope: str | None) -> list[tuple[str, list]]:
    ctx = C.load_contexts(docs, root)
    wanted = SLICE if scope else HEADER
    return [RESOLVERS[w](docs, ctx, scope) for w in wanted if w in RESOLVERS]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".")
    ap.add_argument("--docs", default=None, help="default: <root>/docs/domain")
    ap.add_argument("--header", action="store_true", help="cross-cutting facts — read once per agent")
    ap.add_argument("--context", default=None, help="one boundary's slice")
    ap.add_argument("--list", action="store_true", help="the units to fan out over, one per line")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    root = Path(a.root).resolve()
    docs = Path(a.docs).resolve() if a.docs else root / "docs" / "domain"
    if not docs.is_dir():
        print(f"no docs root at {docs} — nothing upstream has been written yet", file=sys.stderr)
        return 1
    if not (a.header or a.context or a.list):
        print("pick one: --header, --context <Name>, or --list", file=sys.stderr)
        return 2

    if a.list:
        for name in sorted(C.load_contexts(docs, root)):
            print(name)
        return 0

    blocks = build(docs, root, a.context)
    if a.json:
        print(json.dumps({"context": a.context, "docs": str(docs),
                          "blocks": [{"heading": h, "rows": r} for h, r in blocks]},
                         ensure_ascii=False, indent=2))
    else:
        print(_render(blocks, a.context, docs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
