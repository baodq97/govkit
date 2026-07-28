#!/usr/bin/env python3
"""Build one review workspace payload from a docs/domain tree.

Deterministic, no API key, no LLM. The modelling steps write markdown for people; this reads that
markdown back and emits the JSON the view shell renders — every artifact as its own document, in
one payload, so a review meeting is one screen rather than thirty files.

Why extract rather than have each step emit JSON: the artifacts already exist, the headings are
prescribed by the skills that wrote them, and a parser in one place cannot drift the way eight
skills can. What it cannot parse it reports as a gap, which is itself a review finding — a canvas
with no Verification Metrics section shows up as a missing section, not as a blank box.

    python3 ddd_view.py --root . --out .ddd-flow/preview/model.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DESIGN = HERE.parent.parent / "design" / "scripts"


def _design():
    """The design skill owns the model.yaml schema and the state/finding checks; the view reads
    them rather than keeping a second opinion about either."""
    if str(DESIGN) not in sys.path:
        sys.path.insert(0, str(DESIGN))
    import ddd_check  # noqa: E402  — same plugin, same schema

    return ddd_check

# --------------------------------------------------------------------------- markdown primitives


def front_matter(text: str) -> dict:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    out: dict = {}
    for line in text[3:end if end > 0 else 0].splitlines():
        k, _, v = line.partition(":")
        if k.strip() and v.strip():
            out[k.strip()] = v.strip().strip("\"'")
    return out


def sections(text: str) -> dict[str, str]:
    """`## Heading` -> body. Keys are lowercased and stripped of numbering, so `## 3. Enforced
    invariants — within one transaction` is reachable as the prefix `enforced invariants`."""
    out: dict[str, str] = {}
    key, buf = None, []
    for line in text.splitlines():
        m = re.match(r"^##\s+(.*?)\s*$", line)
        if m and not line.startswith("###"):
            if key:
                out[key] = "\n".join(buf).strip()
            raw = m.group(1)
            raw = re.sub(r"^[\d.&\s]+", "", raw)          # "5 & 6. Handled commands" -> "Handled commands"
            raw = re.split(r"\s+[—–-]\s+", raw)[0]        # drop the editorial subtitle
            key, buf = raw.strip().lower(), []
        elif key is not None:
            buf.append(line)
    if key:
        out[key] = "\n".join(buf).strip()
    return out


def find_section(secs: dict[str, str], *prefixes: str) -> str:
    for p in prefixes:
        for k, v in secs.items():
            if k.startswith(p.lower()):
                return v
    return ""


def tables(text: str) -> list[list[dict]]:
    """Every markdown table in a block, as a list of row dicts keyed by header."""
    out, header, rows = [], None, []
    for line in text.splitlines():
        if line.lstrip().startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
                continue
            if header is None:
                header = cells
            else:
                rows.append({header[i] if i < len(header) else f"c{i}": c for i, c in enumerate(cells)})
        else:
            if header and rows:
                out.append(rows)
            header, rows = None, []
    if header and rows:
        out.append(rows)
    return out


def bullets(text: str) -> list[str]:
    out = []
    for line in text.splitlines():
        m = re.match(r"^\s*[-*]\s+(.*)$", line)
        if m and m.group(1).strip():
            out.append(_plain(m.group(1)))
    return out


def _plain(s: str) -> str:
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    return re.sub(r"[`*]", "", s).strip()


def prose(text: str, limit: int = 3) -> list[str]:
    """Paragraphs, for the sections that are prose rather than a table or a list."""
    paras = [p.strip().replace("\n", " ") for p in re.split(r"\n\s*\n", text) if p.strip()]
    # `*Domain* — a visit has an identity…` is emphasis, not a list. Only a marker FOLLOWED BY A
    # SPACE starts a bullet; treating every leading asterisk as one silently drops whole sections.
    skip = re.compile(r"^(\||>|```|[-*+]\s|\d+\.\s)")
    return [_plain(p) for p in paras if not skip.match(p.lstrip())][:limit]


def _fenced(text: str) -> list[str]:
    """The state-transition diagram is drawn in a code fence. Prose parsing skips fences, which
    leaves the one block whose whole content IS the diagram looking like stray sentences."""
    out = []
    for block in re.findall(r"```[a-z]*\n(.*?)```", text, re.S):
        out += [ln.rstrip() for ln in block.splitlines() if ln.strip()]
    return out[:14]


def cells_or_bullets(text: str, limit: int = 12) -> list[str]:
    """A section is filled in as a table, a list, or prose depending on the step. Take whichever."""
    t = tables(text)
    if t:
        # A finding row truncated mid-sentence loses its conclusion, which is the only part a
        # reviewer needs. Keep the whole row; the CSS wraps it.
        return [" · ".join(_plain(v) for v in row.values() if v and v not in ("—", "-"))[:600]
                for row in t[0][:limit]]
    b = bullets(text)
    return (b or prose(text))[:limit]


# --------------------------------------------------------------------------- documents


def _lower_row(row: dict) -> dict[str, str]:
    """A table row keyed by lowercased header, with the markdown stripped from every cell.
    Four builders were each doing half of this and then calling `_plain` again per field."""
    return {str(k).strip().lower(): _plain(v) for k, v in row.items()}


def rows_of(secs: dict[str, str], *prefixes: str) -> list[dict]:
    """The first table under a section, or no rows. Every builder wants exactly this."""
    t = tables(find_section(secs, *prefixes))
    return t[0] if t else []


def doc(id_: str, title: str, kind: str, step: str, payload: dict) -> dict:
    return {"id": id_, "title": title, "kind": kind, "step": step, "payload": payload | {"kind": kind}}


def build_review(root: Path, config: Path | None = None) -> dict | None:
    """State and findings, in-process. This used to spawn `ddd_state.py --review`, which cost a
    second interpreter, a second `import yaml` and a second parse of every model.yaml this run had
    already read — 79% of the build time for isolation the module import does not give up anyway."""
    if str(DESIGN) not in sys.path:
        sys.path.insert(0, str(DESIGN))
    try:
        import ddd_state  # noqa: E402  — same plugin

        cfg = ddd_state.load_config(config or ddd_state.DEFAULT_CONFIG)
        journal = ddd_state.read_journal(root / cfg.get("journal", "docs/domain/.ddd-journal.jsonl"))
        return ddd_state.review_payload(root, cfg, journal)
    except Exception:  # the workspace is worth having without the Review lens
        return None


def build_domain(docs: Path) -> dict:
    """Map / Mass / Matrix, from the model.yaml files 3-decompose owns."""
    check = _design()
    ctx = check.load_contexts(docs)
    contexts, rels = [], []
    for name, c in ctx.items():
        aggs = [a for a in (c.get("aggregates") or []) if isinstance(a, dict)]
        ents = sum(len(a.get("entities") or []) for a in aggs)
        vos = sum(len(a.get("value_objects") or []) for a in aggs)
        evs = sum(len(a.get("domain_events") or []) for a in aggs)
        # ddd_check owns the schema rule for where invariants live — nested per aggregate, or a
        # context-wide list. Counting them here in a second way is how the Mass lens and the
        # Review lens come to disagree about the same file.
        invs = len(check._invariants(c))
        attrs = sum(len(x.get("attributes") or [])
                    for a in aggs for x in (a.get("entities") or []) + (a.get("value_objects") or [])
                    if isinstance(x, dict))
        contexts.append({
            "id": c.get("_dir", name), "name": name,
            "subdomainType": str(c.get("subdomain_type", "unknown")).strip() or "unknown",
            "tacticalPattern": str(c.get("tactical_pattern", "")).strip(),
            "purpose": _plain(str(c.get("notes", "")))[:300],
            # `_names` also reads the string form the no-PyYAML fallback parser produces;
            # an isinstance(dict) filter silently reports every context as empty on that path.
            "aggregates": check._names(c.get("aggregates")),
            "ubiquitousLanguage": [t.get("term") for t in (c.get("ubiquitous_language") or [])
                                   if isinstance(t, dict) and t.get("term")],
            # Model mass, not table mass: entities + value objects + events + invariants is the
            # count 5-strategize measures the complexity axis from, and it is the only weight a
            # design-time model has — there is no schema yet.
            # Model mass, derived — but only when the repo states none. A context declaring
            # `mass: {tables: 3, attributes: 17}` and holding no aggregates yet derived to zero and
            # rendered as no bar at all, which reads as "nothing here" for something measured.
            "mass": check._mass(c) or (ents + vos + evs + invs),
            "massSource": "declared" if check._mass(c) else "derived",
            "attrCount": attrs,
            "counts": {"aggregates": len(aggs), "entities": ents, "valueObjects": vos,
                       "events": evs, "invariants": invs},
        })
        for r in (c.get("relationships") or []):
            if isinstance(r, dict) and r.get("to"):
                # `type` used to carry a direction and a governing pattern at once. 3-decompose
                # split it into `direction` plus a role list per side, because a side can hold
                # several roles (Open Host and Published Language co-occur constantly) and the two
                # ends hold different ones. Both shapes are read: a repo that has not migrated still
                # renders, and its single value lands in whichever axis it actually belonged to.
                direction = str(r.get("direction", "")).strip().lower()
                ours = check._roles(r.get("our_roles"))
                theirs = check._roles(r.get("their_roles"))
                legacy = str(r.get("type", "")).strip().lower()
                if legacy and not direction and not ours:
                    direction, ours = (legacy, []) if legacy in DIRECTIONS else ("", [legacy])
                # `type` stays in the payload — it is the shell's documented edge key — but it is
                # now derived: the first role this side names that says something, else the
                # direction. `other` is a real value and never wins, or every edge would read alike.
                kind = next((x for x in ours if x != "other"), "") or direction
                rels.append({"from": name, "to": r["to"],
                             "type": PATTERN_ALIAS.get(kind, kind),
                             "direction": direction, "ourRoles": ours, "theirRoles": theirs,
                             "note": _plain(str(r.get("note", "")))[:240],
                             "teamRelation": _team_relation(direction, ours + theirs),
                             # What "sourced" claims is that ddd-crew states this team-relation
                             # classification, not that it states the pattern name. Their own
                             # grouping IS the direction axis — Mutually Dependent, Upstream/
                             # Downstream, Free — so a declared direction is sourced by
                             # construction, and only a pattern-only edge falls back to the table.
                             "sourced": bool(direction) or kind in STATED_BY_DDD_CREW})

    # "Free" is the one team relationship you cannot see on a pattern map, because it is drawn by
    # an absence: a context nothing points at and that points at nothing.
    linked = {r["from"] for r in rels} | {r["to"] for r in rels}
    free = sorted(c["name"] for c in contexts if c["name"] not in linked)
    # A relationship can point at something that is not a bounded context — a partner
    # network, an acquirer. The edge is real and the node is not, so the shell was
    # drawing an arrow into empty space. Declare them as externals instead.
    known = {c["name"] for c in contexts}
    externals = sorted({r["to"] for r in rels if r.get("to") and r["to"] not in known})
    return {"contexts": contexts, "relationships": rels, "externals": externals, "free": free}


def build_business_model(f: Path) -> dict:
    KEYS = {"customer segments": "customerSegments", "value propositions": "valuePropositions",
            "channels": "channels", "customer relationships": "customerRelationships",
            "revenue streams": "revenueStreams", "key resources": "keyResources",
            "key activities": "keyActivities", "key partners": "keyPartners",
            "key partnerships": "keyPartners", "cost structure": "costStructure"}
    s = sections(f.read_text(errors="ignore"))
    canvas: dict[str, dict] = {}
    for row in rows_of(s, "business model canvas"):
        vals = [_plain(v) for v in row.values()]
        if len(vals) < 2:
            continue
        key = KEYS.get(vals[0].lower())
        if not key:
            continue
        body = vals[1]
        # "Not stated" is the step's own way of saying the block is empty by evidence. Rendering
        # that sentence inside a filled-looking box is how a gap stops looking like a gap.
        empty = bool(re.match(r"^(not stated|unknown|empty|—|-)\b", body.lower()))
        canvas[key] = {"status": "empty" if empty else "ok",
                       "items": [] if empty else [body[:900]],
                       "source": vals[2][:160] if len(vals) > 2 else ""}
    caps = []
    for row in rows_of(s, "capability classification"):
        vals = [_plain(v) for v in row.values()]
        if len(vals) >= 4:
            caps.append({"capability": vals[0], "businessRole": vals[1],
                         "evolutionStage": vals[2], "differentiation": vals[3]})
    goals = []
    for row in rows_of(s, "goal"):
        vals = [_plain(v) for v in row.values()]
        if len(vals) >= 2:
            goals.append({"horizon": vals[0], "goal": vals[1][:300]})
    return {"canvas": canvas, "classification": caps, "goals": goals,
            "questions": bullets(find_section(s, "open question")),
            "attendance": {"note": " ".join(prose(find_section(s, "who was in the room"), 1))[:400]}}


def build_bounded_context(d: Path) -> dict:
    f = d / "README.md"
    text = f.read_text(errors="ignore")
    s, fm = sections(text), front_matter(text)
    # The shell's canvas renderer reads `blocks[key] = {items|text}` and draws an empty box with
    # its question when a block has neither — which is the point of the canvas, so the shape is
    # matched here rather than adding a second contract to the renderer.
    def block(*prefixes: str, limit: int = 12) -> dict:
        return {"items": cells_or_bullets(find_section(s, *prefixes), limit)}

    return {
        "name": fm.get("title", d.name).replace(" bounded context", ""),
        "blocks": {
            "purpose": {"text": " ".join(prose(find_section(s, "purpose"), 2))},
            "classification": block("strategic classification", limit=6),
            "roles": block("domain role", limit=6),
            "inbound": block("inbound", limit=14),
            "outbound": block("outbound", limit=14),
            "language": block("ubiquitous language", limit=14),
            "decisions": block("business decision", limit=10),
            "assumptions": block("assumption", limit=8),
            "metrics": block("verification metric", limit=8),
            "questions": block("open question", limit=12),
        },
    }


def build_aggregate(f: Path) -> dict:
    text = f.read_text(errors="ignore")
    s, fm = sections(text), front_matter(text)
    name = fm.get("title", f.stem).split("—")[0].strip()
    bands = _bands(find_section(s, "throughput"), find_section(s, "size"))
    # Sections 5 and 6 are written as one heading ("5 & 6. Handled commands → created events"),
    # so the command table carries both columns and the canvas shows the same rows in both boxes.
    cmds = cells_or_bullets(find_section(s, "handled command"), 12)
    return {
        "name": name,
        "context": fm.get("context", f.parent.parent.name),
        "blocks": {
            "name": {"text": name},
            "description": {"text": " ".join(prose(find_section(s, "description"), 2))},
            # `pre`: the fence is a picture, so the view must not reflow it into list items.
            "transitions": {"pre": True, "items": _fenced(find_section(s, "state transition"))
                            or cells_or_bullets(find_section(s, "state transition"), 10)},
            "invariants": {"items": cells_or_bullets(find_section(s, "enforced invariant"), 10)},
            "policies": {"items": cells_or_bullets(find_section(s, "corrective polic"), 10)},
            "commands": {"items": cmds},
            "events": {"items": cells_or_bullets(find_section(s, "created event"), 12) or cmds},
            # Both shapes: the band table drives the evaluation grid when the canvas declares
            # bands, and the sentences stay as the fallback so a canvas written before the band
            # column existed still shows what it actually said instead of six `unknown` cells.
            "throughput": {"items": cells_or_bullets(find_section(s, "throughput"), 6),
                           "values": bands.get("throughput", {})},
            "size": {"items": cells_or_bullets(find_section(s, "size"), 6),
                     "values": bands.get("size", {})},
        },
    }


# ddd-crew ships two evaluation charts for sections 8 and 9 and asks for average AND maximum, so a
# prose cell cannot be plotted. The canvas template now carries a band column; this reads it, and
# reports nothing rather than guessing when the run predates the column.
def build_flow(f: Path) -> dict:
    text = f.read_text(errors="ignore")
    s, fm = sections(text), front_matter(text)
    msgs = []
    for row in rows_of(s, "flow"):
        low = _lower_row(row)
        if not low.get("message"):
            continue
        when = low.get("when", "")
        contents = low.get("contents", "")
        # 4-connect writes a query's answer after a `→` on the same row, because the notation draws
        # the question and its answer as one unit: the sender is blocked in between, and that is
        # the only interesting thing about a query. Split it so a view can show the wait.
        request, _, response = contents.partition("→")
        msgs.append({"n": low.get("#", ""), "from": low.get("from", ""),
                     "message": low.get("message", ""), "type": low.get("type", "").lower(),
                     "to": low.get("to", ""), "contents": contents,
                     "request": request.strip(), "response": response.strip() or None,
                     # within / after / every are three different systems, so the word is kept
                     # rather than reduced to "timed".
                     "when": "" if when in ("—", "-") else when})
    return {"name": fm.get("title", f.stem), "scenario": " ".join(prose(find_section(s, "scenario"), 2)),
            "messages": msgs, "findings": cells_or_bullets(find_section(s, "finding"), 10),
            "questions": cells_or_bullets(find_section(s, "open question"), 8)}


def _num(v) -> float | None:
    if v is None:
        return None
    m = re.search(r"(\d*\.?\d+)", str(v))
    return float(m.group(1)) if m else None


def build_chart(f: Path) -> dict:
    """Core Domain Chart: complexity (x) against differentiation (y).

    Coordinates come from the **Placement table** when it has them, because that table is the
    prescribed structured form and states `unknown` in words. The mermaid block is the human
    rendering of the same numbers; reading it back means a semantic claim ("nobody sourced the
    differentiation") travels as the literal suffix `(y unknown)` inside a diagram label, which
    then has to be stripped by hand in the renderer. It stays as the fallback, no more.
    """
    text = f.read_text(errors="ignore")
    s = sections(text)
    pts: dict[str, dict] = {}
    axes, quadrants = {}, []

    def key(name: str) -> str:
        return re.sub(r"[^a-z0-9]", "", name.lower())

    # 1. the table — structured, and it says `unknown` rather than encoding it as 0.5
    for row in rows_of(s, "placement"):
        low = _lower_row(row)
        name = low.get("context") or low.get("bounded context") or next(iter(low.values()), "")
        if not name or name in ("—", "-"):
            continue
        x, y = _num(low.get("complexity") or low.get("x")), _num(low.get("differentiation") or low.get("y"))
        if x is None:
            continue
        pts[key(name)] = {
            "name": name, "x": x, "y": y if y is not None else 0.5,
            "unplaced": y is None,
            "type": low.get("quadrant") or low.get("type") or "",
            "note": low.get("evidence (measured)") or low.get("evidence") or low.get("source") or "",
        }

    # 2. the diagram — axis labels and quadrant names live only here, and it is the coordinate
    #    source for a chart written before the Placement table carried numbers.
    for line in text.splitlines():
        m = re.match(r'^\s*"?(.+?)"?\s*:\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]', line)
        if m and not line.lstrip().startswith(("x-axis", "y-axis", "quadrant")):
            raw = _plain(m.group(1))
            name = re.sub(r"\s*\((?:[xy] )?unknown\)\s*$", "", raw)
            y = float(m.group(3))
            hit = pts.get(key(name))
            if hit:
                hit.setdefault("note", "")
            else:
                pts[key(name)] = {"name": name, "x": float(m.group(2)), "y": y,
                                  # the mid-line is how the diagram spells "not placed"
                                  "unplaced": abs(y - 0.5) < 1e-6 or raw != name,
                                  "type": "", "note": ""}
        a = re.match(r'^\s*([xy])-axis\s+"?(.+?)"?\s*-->\s*"?(.+?)"?\s*$', line)
        if a:
            axes[a.group(1)] = {"low": _plain(a.group(2)), "high": _plain(a.group(3))}
        q = re.match(r'^\s*quadrant-([1-4])\s+"?(.+?)"?\s*$', line)
        if q:
            quadrants.append({"n": int(q.group(1)), "label": _plain(q.group(2))})

    return {"points": list(pts.values()), "axes": axes, "quadrants": quadrants,
            "decisions": cells_or_bullets(find_section(s, "decision"), 12),
            "mismatch": cells_or_bullets(find_section(s, "investment mismatch"), 8),
            "questions": cells_or_bullets(find_section(s, "open question"), 8)}


def _band(cell: str):
    """Only a cell that IS the band counts. Searching anywhere in the text turns a sentence like
    "N exception items — N unknown" into a declared band, which is a measurement invented out of
    prose; a run made before the band column existed should yield nothing, and say so."""
    m = re.match(r"^(low|medium|high|short|long|unbounded|unknown)\b\W*$", _plain(cell).lower())
    return m.group(1) if m else None


def _bands(throughput: str, size: str) -> dict:
    """`{section: {metric label: {average, maximum, basis}}}` — the shape the canvas grid reads.
    Keyed by the label as written, because the grid rows are labelled the same way."""
    out: dict = {}
    for section, rows in (("throughput", tables(throughput)), ("size", tables(size))):
        for row in (rows[0] if rows else []):
            vals = [_plain(v) for v in row.values()]
            if len(vals) < 2:
                continue
            picked = [_band(v) for v in vals[1:3]]
            if any(picked):
                out.setdefault(section, {})[vals[0]] = {
                    "average": picked[0], "maximum": picked[1] if len(picked) > 1 else None,
                    "basis": vals[-1][:200] if len(vals) > 2 else "",
                }
    return out


# ddd-crew documents team relationships and the nine context-mapping patterns in two separate
# sections and publishes no table between them. Two edges are settled by their own prose —
# Partnership is teams that succeed or fail together, and Customer/Supplier is quoted from Evans as
# upstream-downstream — and `upstream`/`downstream` say it in their names. The rest is this
# plugin's reading, not ddd-crew's: an anticorruption layer is a downstream context defending
# itself, so it is drawn as upstream-downstream. Anything a context has no edge to is `free`.
TEAM_RELATION = {
    "partnership": "mutually-dependent",
    "shared-kernel": "mutually-dependent",
    "customer-supplier": "upstream-downstream",
    "customer": "upstream-downstream",
    "supplier": "upstream-downstream",
    "upstream": "upstream-downstream",
    "downstream": "upstream-downstream",
    "conformist": "upstream-downstream",
    "acl": "upstream-downstream",
    "open-host": "upstream-downstream",
    "published-language": "upstream-downstream",
    "separate-ways": "free",
}
STATED_BY_DDD_CREW = {"partnership", "customer-supplier", "customer", "supplier",
                      "upstream", "downstream", "separate-ways"}
DIRECTIONS = ("upstream", "downstream", "peer")
# Customer/Supplier is one pattern worn from two ends. The roles are per side, so the edge key the
# shell renders is the pattern both ends belong to.
PATTERN_ALIAS = {"customer": "customer-supplier", "supplier": "customer-supplier"}


def _team_relation(direction: str, roles: list[str]) -> str:
    """Which of ddd-crew's three team positions an edge sits in.

    `direction` decides it whenever it is stated, because that axis is ddd-crew's own grouping:
    `peer` is Mutually Dependent, up/down is Upstream/Downstream. Separate Ways is the exception —
    it is an absence of dependency, which no direction can express — so a role still overrides.
    Falls back to the pattern table for a repo whose relationships carry no direction yet.
    """
    if "separate-ways" in roles:
        return "free"
    if direction == "peer":
        return "mutually-dependent"
    if direction in DIRECTIONS:
        return "upstream-downstream"
    return TEAM_RELATION.get(next((r for r in roles if r in TEAM_RELATION), ""), "unclassified")


def build_teams(docs: Path, text: str | None = None) -> dict | None:
    """Context -> team, and the interaction modes between teams. ddd-crew names this as one of the
    three ways to use a Core Domain Chart: the portfolio chart augmented with Team Topologies."""
    f = docs / "team-topology.md"
    if text is None:
        if not f.exists():
            return None
        text = f.read_text(errors="ignore")
    s = sections(text)
    by_context: dict[str, dict] = {}
    for row in rows_of(s, "ownership"):
        low = _lower_row(row)
        name = low.get("context") or low.get("bounded context")
        if name and name not in ("—", "-"):
            by_context[name] = {"team": low.get("proposed team") or low.get("team") or "",
                                "teamType": low.get("team type", ""),
                                "note": low.get("notes", "")[:200]}
    interactions = []
    for row in rows_of(s, "interaction mode"):
        low = _lower_row(row)
        a, b, mode = low.get("team a", ""), low.get("team b", ""), low.get("mode", "")
        if a and b and b not in ("—", "-") and "not an interaction" not in mode.lower():
            interactions.append({"a": a, "b": b, "mode": mode[:120],
                                 "why": (low.get("why (flow evidence)") or low.get("why") or "")[:200],
                                 "endsWhen": low.get("ends when", "")[:200]})
    if not by_context:
        return None
    return {"byContext": by_context, "interactions": interactions,
            "caveat": " ".join(prose(find_section(s, "ownership"), 1))[:240]}


def build_timeline(docs: Path) -> dict | None:
    f = docs / "discovery" / "model.json"
    if f.exists():
        try:
            d = json.loads(f.read_text(errors="ignore"))
            tl = d.get("timeline")
            if isinstance(tl, list):
                # Count the elements rather than trusting a summary block: it is optional, and a
                # hand-written count can disagree with the wall it claims to describe. Reporting
                # "0 confirmed" over 68 confirmed stickies is the worst failure this view has.
                status = lambda e: str(e.get("status", "")).lower()  # noqa: E731
                # `state` is the second axis — as-is / to-be / could-be. Counted separately from
                # status because they answer different questions, and a wall that mixes today with
                # next year needs to say so before anyone reads a boundary off it. Absent entirely
                # is its own signal, so count declared elements rather than defaulting them.
                state = lambda e: str(e.get("state", "")).strip().lower()  # noqa: E731
                return {"elements": tl[:200], "hotspots": d.get("hotspots", [])[:60],
                        "language": d.get("ubiquitousLanguage", [])[:80],
                        "confidence": {"confirmed": sum(1 for e in tl if status(e) == "confirmed"),
                                       "candidates": sum(1 for e in tl if status(e) == "candidate"),
                                       "asIs": sum(1 for e in tl if state(e) == "as-is"),
                                       "toBe": sum(1 for e in tl if state(e) == "to-be"),
                                       "couldBe": sum(1 for e in tl if state(e) == "could-be"),
                                       "stated": sum(1 for e in tl if state(e))}}
        except Exception:
            pass
    # Markdown-only discovery — the ordinary case for a repo that has never run this view. Returning
    # empty hotspots and an empty confidence block here made the wall render "? confirmed · 0
    # hotspots" for a timeline naming three of each, and the blocker a reviewer needed was the thing
    # that disappeared. The parser lives in ddd_check because the design skill owns the schema, and
    # because the same defect was fixed once already in a sibling script and not audited across.
    if not (docs / "discovery").is_dir():
        return None
    counts, hotspots, _dupes, rules = _design().discovery_from_markdown(docs)
    if not counts.get("elements"):
        return None
    f = docs / "discovery" / "timeline.md"
    rows = tables(f.read_text(errors="ignore")) if f.exists() else []
    return {"elements": rows[0][:200] if rows else [],
            "hotspots": [h["question"] for h in hotspots][:60],
            "language": [], "rules": rules[:20],
            "confidence": {"confirmed": counts.get("confirmed", 0),
                           "candidates": counts.get("candidate", 0)}}


def build_sections_doc(f: Path, keep: int = 40, text: str | None = None) -> dict:
    """The honest fallback for an artifact with no dedicated lens: its sections, tables rendered as
    tables. Better than a link to a file, and it does not pretend to a shape the artifact lacks."""
    text = f.read_text(errors="ignore") if text is None else text
    out = []
    for name, body in sections(text).items():
        t = tables(body)
        rows = [{_plain(k): _plain(v) for k, v in row.items()} for row in t[0][:keep]] if t else []
        out.append({"heading": name, "rows": rows,
                    "lines": [] if t else cells_or_bullets(body, 14)})
    return {"title": front_matter(text).get("title", f.stem), "sections": out}


# --------------------------------------------------------------------------- assembly


def build(root: Path, docs: Path) -> dict:
    documents, gaps = [], []

    review = build_review(root)
    if review:
        documents.append(doc("review", "Review — state & findings", "review", "design", review))
    else:
        gaps.append("the in-process review build produced nothing; the Review lens is missing")

    domain = build_domain(docs)
    if domain["contexts"]:
        documents.append(doc("map", "Context map", "domain", "3-decompose", domain))
    else:
        gaps.append("no model.yaml found — Map, Mass and Matrix have nothing to draw")

    bm = next(iter(sorted(docs.glob("business-model*.md"))), None)
    if bm:
        documents.append(doc("bmc", "Business model", "business-model", "1-understand", build_business_model(bm)))
    else:
        gaps.append("no business-model.md — 1-understand has not run")

    tl = build_timeline(docs)
    if tl:
        documents.append(doc("timeline", "Discovery timeline", "timeline", "2-discover", tl))
    else:
        gaps.append("no discovery/ — 2-discover has not run")

    chart = docs / "core-domain-chart.md"
    if chart.exists():
        c = build_chart(chart)
        # ddd-crew names three ways to use the chart; the Team Topologies overlay is one of them,
        # so it travels with the chart as a second view rather than as a separate artifact.
        c["teams"] = build_teams(docs)
        documents.append(doc("chart", "Core domain chart", "chart", "5-strategize", c))
        if not c["points"]:
            gaps.append("core-domain-chart.md has no table with a complexity and a differentiation "
                        "column — the chart renders its decisions but cannot plot the dots")
    else:
        gaps.append("no core-domain-chart.md — 5-strategize has not run")

    for f in sorted(docs.glob("message-flows/*.md")):
        if f.stem.lower() in ("readme", "index") or f.stem.lower().startswith("proposed"):
            continue
        fl = build_flow(f)
        documents.append(doc(f"flow:{f.stem}", fl["name"], "flow", "4-connect", fl))
        if not fl["messages"]:
            gaps.append(f"{f.name}: no message table found under `## Flow`")

    for d in sorted(p for p in docs.iterdir() if p.is_dir() and (p / "model.yaml").exists()):
        if (d / "README.md").exists():
            bc = build_bounded_context(d)
            kind = next((c["subdomainType"] for c in domain["contexts"] if c["id"] == d.name), "unknown")
            bc["type"] = kind
            documents.append(doc(f"bc:{d.name}", bc["name"], "bounded-context", "7-define", bc))
            # A generic or master-data context is supposed to be a stub — reporting its empty
            # sections as gaps would punish the step for right-sizing correctly.
            if kind not in ("generic", "master-data"):
                empty = [k for k in ("assumptions", "metrics", "questions")
                         if not bc["blocks"][k]["items"]]
                if empty:
                    gaps.append(f"{d.name} canvas has no {', '.join(empty)}")

    for f in sorted(docs.rglob("aggregates/*.md")):
        a = build_aggregate(f)
        documents.append(doc(f"agg:{f.stem}", f"{a['name']} (aggregate)", "aggregate", "8-code", a))

    for name, title, step in (("team-topology.md", "Team topology", "6-organise"),
                              ("event-model/README.md", "Event model — slices", "8-code"),
                              ("code-structure.md", "Code structure", "8-code"),
                              ("message-flows/README.md", "Flows — findings index", "4-connect"),
                              ("message-flows/proposed-boundary-changes.md", "Proposed boundary changes", "4-connect")):
        f = docs / name
        if f.exists():
            documents.append(doc(name, title, "sections", step, build_sections_doc(f)))

    return {"schemaVersion": 2, "kind": "workspace",
            "source": {"docsRoot": str(docs), "documents": len(documents)},
            "documents": documents, "gaps": gaps}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--docs", default=None)
    ap.add_argument("--out", default=None, help="write here; default is stdout")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    docs = Path(args.docs).resolve() if args.docs else root / "docs" / "domain"
    if not docs.is_dir():
        print(f"no docs at {docs}", file=sys.stderr)
        return 2

    payload = build(root, docs)
    text = json.dumps(payload, indent=1, ensure_ascii=False)
    if args.out:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text)
        print(f"{len(payload['documents'])} document(s) -> {out}")
        for g in payload["gaps"]:
            print(f"  gap: {g}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
