#!/usr/bin/env python3
"""Cross-artifact checks over a docs/domain tree.

Deterministic, no API key, no LLM. Every finding here is something a skill already tells a model to
look for — moving it into a script means it runs every time instead of only when someone remembers,
and it catches the class of problem that reading markdown file-by-file cannot: a contradiction that
lives BETWEEN two files.

    python3 ddd_check.py --root .                     # human-readable
    python3 ddd_check.py --root . --json              # for the review lens
    python3 ddd_check.py --root . --strict-symmetry   # block on a one-way relationship

Exit code is 0 unless --strict is passed (then non-zero when any finding has severity=high) or
--strict-symmetry is (then non-zero on a one-way or disagreeing relationship, which is `info` and
therefore silent by default — see check 15). This reports; the gate stays `npx govkit verify`.
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Finding:
    id: str
    severity: str  # high | medium | info
    title: str
    evidence: list[str] = field(default_factory=list)
    fix_owner: str = ""  # which step skill owns the fix


# --------------------------------------------------------------------------- loading


def _yaml(text: str) -> dict:
    try:
        import yaml  # type: ignore

        return yaml.safe_load(text) or {}
    except ImportError:
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


def _names(node) -> list[str]:
    """Pull `name:` values out of whatever shape a list-of-things arrived in."""
    found = []
    if isinstance(node, list):
        for item in node:
            if isinstance(item, dict) and "name" in item:
                found.append(str(item["name"]))
            elif isinstance(item, str):
                m = re.search(r"name:\s*([A-Za-z0-9_]+)", item)
                if m:
                    found.append(m.group(1))
    return found


def _entity_names(agg) -> list[str]:
    out = []
    if isinstance(agg, list):
        for a in agg:
            if isinstance(a, dict):
                out += _names(a.get("entities"))
    return out


def _invariants(c: dict) -> list:
    """Invariants live per-aggregate in the schema 3-decompose writes; some repos put a
    context-wide list at the top level. Both count — a context protects a rule either way."""
    out = list(c.get("invariants") or [])
    for a in (c.get("aggregates") or []):
        if isinstance(a, dict):
            out += list(a.get("invariants") or [])
    return out


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


def _roles(node) -> list[str]:
    """One side's roles from a relationship. A side can carry several — Open Host Service and
    Published Language co-occur constantly — so the field is a list, and a repo writing a single
    role unbracketed is read the same way rather than treated as a schema error."""
    if isinstance(node, str):
        return [node.strip().lower()] if node.strip() else []
    return [str(x).strip().lower() for x in (node or []) if str(x).strip()]


# The mirror of a relationship is not the relationship copied — it is the same edge seen from the
# other side, so the direction flips. `peer` is its own mirror. See check 15.
MIRROR_DIRECTION = {"upstream": "downstream", "downstream": "upstream", "peer": "peer"}

# The findings `--strict-symmetry` blocks on. Kept next to the rule rather than in main() so that
# adding a symmetry finding cannot silently escape the flag.
SYMMETRY_IDS = ("relationship-one-way", "relationship-asymmetric")


def _direction(r: dict) -> str:
    return str(r.get("direction") or "").strip().lower()


def _side(r: dict) -> str:
    """One side rendered so a mismatch is readable without opening the other file."""
    return (f"direction {_direction(r) or '—'}, "
            f"ours [{', '.join(_roles(r.get('our_roles'))) or '—'}], "
            f"theirs [{', '.join(_roles(r.get('their_roles'))) or '—'}]")


def _same_side(a: list[str], b: list[str]) -> bool:
    """Do two files describe ONE side of a boundary compatibly? Overlap, not equality.

    A side may name itself more fully than its counterpart names it — GovernanceSchema calls itself
    `published-language, open-host` toward FeatureLedger, which names only `published-language`.
    Less specific is not wrong. An empty side is check 14's finding, not this one's, and `other` is
    the open-enum wildcard check 14 defends, so both read as compatible here.
    """
    sa, sb = set(a), set(b)
    if not sa or not sb or "other" in sa or "other" in sb:
        return True
    return bool(sa & sb)


def _mirrors(a: dict, b: dict) -> bool:
    """Is `b` (the counterpart's entry) the same edge as `a`, seen from the other side?

    Direction flips; roles CROSS — a's `our_roles` and b's `their_roles` describe the same side.
    An unrecognised direction is not judged: the vocabulary is open, and a rule must degrade rather
    than explode on a value it has no opinion about.
    """
    da, db = _direction(a), _direction(b)
    if da in MIRROR_DIRECTION and db in MIRROR_DIRECTION and MIRROR_DIRECTION[da] != db:
        return False
    return (_same_side(_roles(a.get("our_roles")), _roles(b.get("their_roles")))
            and _same_side(_roles(a.get("their_roles")), _roles(b.get("our_roles"))))


def _cap(lines: list[str], keep: int = 8) -> list[str]:
    """Evidence trimmed to a readable head. A finding that prints forty lines is not read."""
    return lines[:keep] + ([f"…and {len(lines) - keep} more"] if len(lines) > keep else [])


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _traced_messages(docs: Path) -> dict[str, list[str]] | None:
    """message name -> the `To` values every traced scenario delivers it to.

    Returns None when 4-connect has not run, so callers can tell "no flows exist yet" from
    "flows exist and this message is in none of them". Reads the table 4-connect prescribes
    (`| # | From | Message | Type | Contents | To |`) by column name, not position, so a repo
    that drops the Contents column still parses.
    """
    d = docs / "message-flows"
    if not d.is_dir():
        return None
    files = [f for f in sorted(d.glob("*.md"))
             if f.stem.lower() not in ("readme", "index") and not f.stem.lower().startswith("proposed")]
    if not files:
        return None
    seen: dict[str, list[str]] = {}
    for f in files:
        i_msg = i_to = None
        for line in f.read_text(errors="ignore").splitlines():
            if not line.lstrip().startswith("|"):
                i_msg = i_to = None
                continue
            cells = _cells(line)
            low = [c.lower() for c in cells]
            if "message" in low and "to" in low:
                i_msg, i_to = low.index("message"), low.index("to")
                continue
            if i_msg is None or not re.match(r"^\d{1,2}$", cells[0] if cells else ""):
                continue
            if len(cells) <= max(i_msg, i_to):
                continue
            name = cells[i_msg].strip("`* ")
            if name:
                seen.setdefault(name, []).append(cells[i_to].strip("`* "))
    return seen


STATES = ("as-is", "to-be", "could-be")


def _discovery_states(docs: Path) -> dict[str, str] | None:
    """element name -> `as-is` / `to-be` / `could-be`, as discovery declared it.

    Three return values, and the difference between them is the whole point: `None` means
    2-discover has not run, `{}` means it ran and never said which elements happen today, and a
    populated dict means the axis is being used. Reads model.json first, then the `State` column of
    timeline.md by header name, so a repo that orders its columns differently still parses.
    """
    f = docs / "discovery" / "model.json"
    if f.exists():
        try:
            tl = json.loads(f.read_text(errors="ignore")).get("timeline")
            if isinstance(tl, list):
                return {str(e["name"]): str(e["state"]).strip().lower() for e in tl
                        if isinstance(e, dict) and e.get("name") and e.get("state")}
        except Exception:
            pass
    f = docs / "discovery" / "timeline.md"
    if not f.exists():
        return None
    out: dict[str, str] = {}
    i_el = i_st = None
    for line in f.read_text(errors="ignore").splitlines():
        if not line.lstrip().startswith("|"):
            i_el = i_st = None
            continue
        cells = _cells(line)
        low = [c.lower() for c in cells]
        if "element" in low and "state" in low:
            i_el, i_st = low.index("element"), low.index("state")
            continue
        if i_el is None or i_st is None or len(cells) <= max(i_el, i_st):
            continue
        name, st = cells[i_el].strip("`* "), cells[i_st].strip("`* ").lower()
        if name and st in STATES:
            out[name] = st
    return out


def discovery_from_markdown(docs: Path) -> tuple[dict, list[dict], list[str], list[str]]:
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
            cells = _cells(line)
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


def load_contexts(docs: Path, root: Path | None = None) -> dict[str, dict]:
    ctx = {}
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


def load_business_model(docs: Path) -> dict[str, dict]:
    """Capability -> {business_role, evolution_stage, differentiation} from the classification table."""
    rows: dict[str, dict] = {}
    for f in docs.glob("business-model*.md"):
        for line in f.read_text(errors="ignore").splitlines():
            cells = [c.strip() for c in line.strip().strip("|").split("|")] if "|" in line else []
            if len(cells) < 4 or cells[0].lower().startswith(("capability", "---", ":--")):
                continue
            diff = cells[3].lower()
            if diff.startswith(("yes", "no", "partial", "unknown", "**yes", "**no")):
                rows[cells[0].strip("*` ")] = {
                    "business_role": cells[1],
                    "evolution_stage": cells[2],
                    "differentiation": "yes" if diff.startswith(("yes", "**yes")) else
                                       "no" if diff.startswith(("no", "**no")) else
                                       "partial" if diff.startswith("partial") else "unknown",
                    "source": str(f.name),
                }
    return rows


def _match_capability(context: str, caps: dict[str, dict]) -> dict | None:
    lc = context.lower()
    for name, row in caps.items():
        n = name.lower()
        if lc == n or lc in n or n.startswith(lc) or lc.startswith(n.split()[0]):
            return row | {"capability": name}
    return None


def _mass(c: dict) -> int:
    m = c.get("mass")
    if isinstance(m, dict):
        return int(m.get("attributes") or m.get("tables") or 0)
    if isinstance(m, str):
        n = re.search(r"attributes:\s*(\d+)", m)
        if n:
            return int(n.group(1))
    return 0


# --------------------------------------------------------------------------- checks


def run_checks(root: Path, docs: Path) -> list[Finding]:
    ctx = load_contexts(docs, root)
    caps = load_business_model(docs)
    out: list[Finding] = []

    # 1 — the label and the business evidence disagree
    for name, c in ctx.items():
        cap = _match_capability(name, caps)
        if not cap:
            continue
        st = str(c.get("subdomain_type", "")).strip()
        if st == "core" and cap["differentiation"] == "no":
            out.append(Finding(
                "classification-mismatch", "high",
                f"{name} is labelled `core` but the business model says it differentiates on nothing",
                [f"{c['_path']}: subdomain_type: core",
                 f"{cap['source']}: {cap['capability']} → differentiation: no"],
                "5-strategize"))
        if st in ("supporting", "generic") and cap["differentiation"] == "yes":
            out.append(Finding(
                "classification-mismatch", "high",
                f"{name} carries the differentiation the business charges for, but is labelled `{st}`",
                [f"{c['_path']}: subdomain_type: {st}",
                 f"{cap['source']}: {cap['capability']} → differentiation: yes"],
                "5-strategize"))

    # 2 — everything is core
    cores = [n for n, c in ctx.items() if str(c.get("subdomain_type", "")).strip() == "core"]
    if len(cores) > 2:
        out.append(Finding(
            "too-many-core", "high",
            f"{len(cores)} of {len(ctx)} contexts are labelled `core` — differentiation was assumed, not assessed",
            [", ".join(sorted(cores))], "5-strategize"))

    # 3 — the mass is not where the differentiation is
    masses = {n: _mass(c) for n, c in ctx.items()}
    if any(masses.values()):
        med = statistics.median([v for v in masses.values() if v] or [0])
        total = sum(masses.values()) or 1
        for name, m in masses.items():
            cap = _match_capability(name, caps)
            if not cap or not m:
                continue
            share = 100 * m / total
            if cap["differentiation"] == "no" and share >= 35:
                out.append(Finding(
                    "investment-mismatch", "high",
                    f"{name} holds {share:.0f}% of the modelled mass and differentiates on nothing",
                    [f"{m} attributes of {total} across {len(ctx)} contexts",
                     f"{cap['source']}: differentiation: no"], "5-strategize"))
            if cap["differentiation"] == "yes" and m < med:
                out.append(Finding(
                    "under-invested-core", "high",
                    f"{name} is what the business differentiates on, and carries below-median model mass",
                    [f"{m} attributes vs median {med:.0f}"], "3-decompose"))

    # 4 — a context that owns no rule is a capability, not a context
    for name, c in ctx.items():
        aggs = c.get("aggregates")
        has_aggs = bool(aggs) and aggs != []
        inv = _invariants(c)
        if has_aggs and not inv:
            out.append(Finding(
                "context-without-invariant", "medium",
                f"{name} declares aggregates but states no invariant — aggregates with nothing to protect",
                [c["_path"]], "3-decompose"))
        if not has_aggs and not (c.get("aggregates_rationale") or c.get("notes")):
            out.append(Finding(
                "empty-without-reason", "medium",
                f"{name} has no aggregates and no stated reason — a deliberate decision reads the same as a gap",
                [c["_path"]], "3-decompose"))

    # 5 — the same entity written by two contexts is Shared Kernel arriving by stealth
    owners: dict[str, list[str]] = {}
    for name, c in ctx.items():
        for e in _entity_names(c.get("aggregates")):
            owners.setdefault(e, []).append(name)
    for entity, holders in owners.items():
        if len(holders) > 1:
            out.append(Finding(
                "shared-entity", "high",
                f"`{entity}` is modelled inside {len(holders)} contexts — Shared Kernel coupling unless labelled",
                [", ".join(sorted(holders))], "3-decompose"))

    # 6 — an emitted event nobody consumes
    emitted: dict[str, str] = {}
    for name, c in ctx.items():
        for a in (c.get("aggregates") or []):
            if isinstance(a, dict):
                for ev in _names(a.get("domain_events")):
                    emitted[ev] = name
        for ev in _names(c.get("domain_events")):
            emitted[ev] = name
    traced = _traced_messages(docs)
    if emitted and traced is not None:
        # Once flows exist, the question is not "is this name written down anywhere" — prose
        # discussing an event mentions it, which silences a name-counting check exactly when the
        # model is rich enough for orphans to matter. The question is whether any traced scenario
        # carries it, and to whom.
        others = {_norm(k) for k in ctx}
        untraced, unconsumed = [], []
        for ev, src in sorted(emitted.items()):
            rows = traced.get(ev)
            if not rows:
                untraced.append(f"{ev} ({src})")
                continue
            # A `To` cell is prose: it can name two contexts, or a context plus a device. Ask
            # whether any context name occurs inside it, not whether the cell equals one.
            reached = {o for t in rows for o in others if o and o != _norm(src) and o in _norm(t)}
            if not reached:
                unconsumed.append(f"{ev} → {'; '.join(sorted({t for t in rows if t})) or 'nobody'}")
        if untraced:
            # 4-connect traces three to five scenarios on purpose, so a peripheral event being
            # absent is expected. It is worth one line, not one finding each.
            out.append(Finding(
                "event-untraced", "info",
                f"{len(untraced)} of {len(emitted)} declared events appear in no traced scenario",
                untraced + ["expected for peripheral events; a core-path event here is a gap in the flows"],
                "4-connect"))
        if unconsumed:
            out.append(Finding(
                "event-no-context-consumer", "info",
                f"{len(unconsumed)} traced event(s) reach no bounded context — they end at an actor or a device",
                unconsumed, "4-connect"))
    elif emitted:
        # No flows yet: fall back to the weak signal, which is all there is before 4-connect runs.
        corpus = "\n".join(
            p.read_text(errors="ignore")
            for p in list(docs.rglob("*.md")) + list(docs.rglob("*.yaml")) + list(docs.rglob("*.yml"))
        )
        for ev, src in sorted(emitted.items()):
            if len(re.findall(rf"\b{re.escape(ev)}\b", corpus)) <= 1:
                out.append(Finding(
                    "event-untraced", "medium",
                    f"`{ev}` is emitted by {src} and named nowhere else — no consumer, no flow",
                    [f"emitted in {src}"], "4-connect"))

    # 7 — a flow that needed more than nine messages refutes the cut
    for f in (docs / "message-flows").glob("*.md") if (docs / "message-flows").is_dir() else []:
        # An index summarises every flow in one table and a delta proposal lists changes, so both
        # blow the nine-message limit without any single scenario doing so. steps.yml excludes the
        # index from evidence for the same reason.
        if f.stem.lower() in ("readme", "index") or f.stem.lower().startswith("proposed"):
            continue
        body = f.read_text(errors="ignore")
        nums = set(re.findall(r"^\|\s*(\d{1,2})\s*\|", body, re.M))
        if len(nums) > 9:
            out.append(Finding(
                "flow-overflow", "high",
                f"{f.name} needs {len(nums)} messages — over the 5-to-9 limit, the cut is refuted",
                [str(f.relative_to(root))], "3-decompose"))

        # 7b — a temporal rule stated in the scenario paragraph but on no message row. Prose can
        # say "within fifteen minutes"; only a row can say WHICH message that binds, and only a row
        # can be drawn or checked. Requires a keyword next to a duration — the bare word "after"
        # is ordinary English and firing on it would train people to ignore this.
        scenario = re.search(r"^##\s*Scenario\s*$(.*?)^##", body, re.M | re.S)
        if scenario:
            stated = {m[0].lower() for m in re.findall(
                r"\b(within|after|every)\b[^.]{0,24}?\b\d+\s*(min|minute|hour|day|week|month|second)",
                scenario.group(1), re.I)}
            # Only the message table's own `When` column counts. Scanning every table row instead
            # matched the word "after" inside a Findings sentence and silenced the check on a flow
            # that has no When column at all — the exact case it exists to catch.
            i_when = None
            carried = False
            for line in body.splitlines():
                if not line.lstrip().startswith("|"):
                    i_when = None
                    continue
                cells = _cells(line)
                low = [c.lower() for c in cells]
                if "message" in low and "to" in low:
                    i_when = low.index("when") if "when" in low else None
                    continue
                if i_when is None or not re.match(r"^\d{1,2}(\.\d+)?$", cells[0] if cells else ""):
                    continue
                if len(cells) > i_when and cells[i_when].strip(" —-*"):
                    carried = True
            if stated and not carried:
                out.append(Finding(
                    "temporal-rule-in-prose", "medium",
                    f"{f.name} states a '{'/'.join(sorted(stated))}' rule in the scenario but no "
                    "message row carries it — the rule cannot be drawn or checked",
                    [str(f.relative_to(root))], "4-connect"))

    # 8 — a canvas without its falsifiable sections is an opinion presented tidily
    for name, c in ctx.items():
        readme = docs / c["_dir"] / "README.md"
        if not readme.exists():
            continue
        body = readme.read_text(errors="ignore").lower()
        marks = ("assumption", "verification metric", "open question")
        missing = [s for s in marks if s not in body]
        # steps.yml calls a context `defined` at two of the three marks. Below that, 7-define has
        # not run here and the file is 3-decompose's first-pass canvas — flagging it would report
        # the process being incomplete as if the canvas were defective.
        if len(marks) - len(missing) < 2:
            continue
        if missing:
            out.append(Finding(
                "canvas-incomplete", "medium",
                f"{name}'s canvas is missing: {', '.join(missing)}",
                [str(readme.relative_to(root))], "7-define"))

    # 9 — a context nobody owns will rot
    topo = docs / "team-topology.md"
    if topo.exists():
        # model.yaml carries the id (`ParkingGuidance`); prose writes the name ("Parking Guidance").
        # Match on letters and digits only so the two spellings are the same context.
        body = re.sub(r"[^a-z0-9]", "", topo.read_text(errors="ignore").lower())
        for name in ctx:
            if re.sub(r"[^a-z0-9]", "", name.lower()) not in body:
                out.append(Finding(
                    "unowned-context", "high",
                    f"{name} appears in no team's ownership table",
                    [str(topo.relative_to(root))], "6-organise"))

    # 10 — a relaxed invariant with no repair path is an unhandled defect with a schedule
    for name, c in ctx.items():
        for canvas in (docs / c["_dir"] / "aggregates").glob("*.md") if (docs / c["_dir"] / "aggregates").is_dir() else []:
            body = canvas.read_text(errors="ignore").lower()
            relaxed = any(w in body for w in ("relax", "not enforced", "eventual"))
            if relaxed and "corrective polic" not in body:
                out.append(Finding(
                    "relaxed-without-policy", "high",
                    f"{canvas.stem} relaxes a rule with no corrective policy — nobody decided what repairs it",
                    [str(canvas.relative_to(root))], "8-code"))

    # 11 — a citation that resolves to nothing. Q-nn and H-nn are the only thread tying a boundary
    # back to the question it rests on; the failure is silent, because the sentence still reads
    # fine once the id it points at has been dropped or renumbered.
    defined: set[str] = set()
    for f in list(docs.glob("business-model*.md")) + list(docs.glob("discovery/*.md")):
        for line in f.read_text(errors="ignore").splitlines():
            m = re.match(r"^\s*[-|*#]*\s*\**\s*\b([QH]\d{1,3})\b\s*(?:—|-|\.|\||:|\*)", line)
            if m:
                defined.add(m.group(1))
    if defined:
        cited: dict[str, set[str]] = {}
        for f in sorted(docs.rglob("*.md")):
            if f.name.startswith("business-model") or f.parent.name == "discovery":
                continue
            for ref in set(re.findall(r"\b([QH]\d{1,3})\b", f.read_text(errors="ignore"))):
                cited.setdefault(ref, set()).add(f.relative_to(docs).as_posix())
        for ref, where in sorted(cited.items()):
            if ref not in defined:
                out.append(Finding(
                    "dangling-reference", "medium",
                    f"`{ref}` is cited in {len(where)} file(s) and defined nowhere upstream",
                    sorted(where)[:4], "2-discover" if ref.startswith("H") else "1-understand"))

    # 12 — right-sizing is the doctrine that stops happening silently. A generic context that was
    # bought and a core context that carries the model should not produce canvases of the same
    # size; without a number, nothing notices when they do.
    budgets = _budgets()
    if budgets:
        ctx_budget = budgets.get("context_readme") or {}
        for name, c in ctx.items():
            readme = docs / c["_dir"] / "README.md"
            cap = ctx_budget.get(str(c.get("subdomain_type", "")).strip())
            if not readme.exists() or not cap:
                continue
            n = len(readme.read_text(errors="ignore").splitlines())
            if n > int(cap) * 1.15:  # 15% slack — this is a smell, not a linter
                out.append(Finding(
                    "artifact-over-budget", "medium" if n > int(cap) * 1.5 else "info",
                    f"{name}'s canvas is {n} lines against a {cap}-line budget for `{c.get('subdomain_type')}`",
                    [str(readme.relative_to(root)),
                     "cut rationale and restated upstream content — never open questions or provenance"],
                    "7-define"))
        agg_cap = budgets.get("aggregate_canvas")
        for f in sorted(docs.rglob("aggregates/*.md")) if agg_cap else []:
            n = len(f.read_text(errors="ignore").splitlines())
            if n > int(agg_cap) * 1.15:
                out.append(Finding(
                    "artifact-over-budget", "info",
                    f"{f.stem}'s aggregate canvas is {n} lines against a {agg_cap}-line budget",
                    [str(f.relative_to(root))], "8-code"))
        for pattern, spec in (budgets.get("files") or {}).items():
            cap = int(spec["lines"] if isinstance(spec, dict) else spec)
            owner = spec.get("owner", "") if isinstance(spec, dict) else ""
            for f in sorted(docs.glob(pattern)):
                n = len(f.read_text(errors="ignore").splitlines())
                if n > cap * 1.15:
                    rel = f.relative_to(docs).as_posix()
                    out.append(Finding(
                        "artifact-over-budget", "medium" if n > cap * 1.5 else "info",
                        f"{rel} is {n} lines against a {cap}-line budget",
                        [str(f.relative_to(root))], owner))

    # 13 — as-is versus to-be versus could-be. A timeline that mixes what happens today with what
    # someone wishes happened reads identically either way, and every step downstream inherits the
    # confusion: 3-decompose can draw a boundary around behaviour that does not exist, 5-strategize
    # can source differentiation from an idea nobody committed to. The axis is orthogonal to
    # confirmed-versus-candidate — a person can confirm, on the record, that something is only an
    # idea, and that element is `confirmed` and `could-be` at once.
    states = _discovery_states(docs)
    if states is not None and not states:
        out.append(Finding(
            "discovery-state-unlabelled", "medium",
            "the discovery timeline never says which elements happen today — as-is, to-be and "
            "could-be are indistinguishable",
            ["discovery/timeline.md: add a `State` column; discovery/model.json: a `state` field per element",
             "until then a boundary drawn around future behaviour looks exactly like one drawn "
             "around a running system"],
            "2-discover"))
    elif states:
        for name in sorted(ctx):
            known = {e: states[e] for e, src in emitted.items() if src == name and e in states}
            if len(known) >= 2 and all(v != "as-is" for v in known.values()):
                out.append(Finding(
                    "context-is-future-only", "info",
                    f"{name}'s boundary rests entirely on behaviour that does not happen yet — "
                    f"{len(known)} events, none `as-is`",
                    [ctx[name]["_path"], *(f"{e} → {v}" for e, v in sorted(known.items())[:4]),
                     "expected on greenfield; on a migration it is a boundary nothing running can "
                     "falsify"],
                    "3-decompose"))

    # 14 — direction and pattern are two axes, and one field cannot carry both. Which way the
    # dependency runs is independent of how the relationship is governed: the same downstream is
    # free to conform or to build an ACL, and an upstream may be an Open Host, publish a language,
    # both, or neither. A corpus of `type: downstream` therefore says who depends on whom and
    # nothing about the contract — and an API generator reading it cannot tell a context that
    # publishes from one that does not. Second instance of this class in this repo: `status`
    # (confirmed/candidate — evidence strength) was split from `state` (as-is/to-be/could-be — time)
    # for exactly the same reason, and the split is what made either axis checkable.
    #
    # Presence, not shape. Roles are an OPEN enum: `other` plus a `note` is a correct answer for a
    # relationship DDD has no name for, and an unknown value must degrade rather than explode. So
    # this asks only that both axes were considered. A presence check costs ~nothing in
    # flexibility; a closed-enum check would reject correct models to catch nothing.
    #
    # Severity `info` on purpose, for this round. A rule graduates to medium/high only once there is
    # evidence it catches a real defect rather than a file nobody has migrated yet.
    unsplit, unnamed, counted = [], [], 0
    for name in sorted(ctx):
        for r in (ctx[name].get("relationships") or []):
            # A relationship that did not parse as a mapping cannot be judged — the no-PyYAML
            # fallback parser reads an entry as a string. Say nothing rather than say it wrongly.
            if not isinstance(r, dict) or not r.get("to"):
                continue
            counted += 1
            gaps = [axis for axis, v in (("direction", r.get("direction")),
                                         ("our_roles", r.get("our_roles")),
                                         ("their_roles", r.get("their_roles"))) if not v]
            if gaps:
                unsplit.append(f"{name} → {r['to']}: missing {', '.join(gaps)}")
                continue
            sides = [s for s, k in (("ours", "our_roles"), ("theirs", "their_roles"))
                     if set(_roles(r.get(k))) <= {"other"}]
            if sides:
                unnamed.append(f"{name} → {r['to']}: {' and '.join(sides)} named only `other`")
    if unsplit:
        out.append(Finding(
            "relationship-axis-unsplit", "info",
            f"{len(unsplit)} of {counted} relationships declare no direction or no role on a side",
            _cap(unsplit) + [
                "`direction: upstream|downstream|peer` says who depends on whom; `our_roles` and "
                "`their_roles` say how each side governs it. Roles are open — `other` plus a `note` "
                "is a valid answer for a relationship DDD has no name for."],
            "3-decompose"))
    if unnamed:
        out.append(Finding(
            "relationship-role-unnamed", "info",
            f"{len(unnamed)} of {counted} relationships name a side `other` — the axes are split, "
            "the pattern is still unstated",
            _cap(unnamed) + [
                "not a defect: `other` is a legitimate value and the `note` carries what is known. "
                "It is the residue of the split — an unstated side is a side no contract can be "
                "generated from, and an upstream that names nothing is why its consumers each "
                "build their own ACL."],
            "3-decompose"))

    # 15 — a relationship is a claim about TWO contexts, and until now nothing asked the second one
    # whether it agreed. `output-template.md` has stated the symmetry convention in prose since the
    # schema was written; prose that no rule reads is a convention, not a constraint. That is how
    # this repo's own model drifted from itself: six WaiverPolicy edges declared in one file, zero
    # declared back, and a context map drawing two of the six — three sources disagreeing about one
    # fact with every gate green, because declaring an edge is not the same as checking it.
    #
    # COMPATIBLE, NOT IDENTICAL, and the difference is the whole design of the rule. Customer /
    # Supplier and upstream / downstream are asymmetric BY DESIGN — the two sides SHOULD read
    # differently while the edge is mutual. So:
    #   · direction flips (`MIRROR_DIRECTION`): upstream faces downstream, peer faces peer;
    #   · roles CROSS: A's `our_roles` and B's `their_roles` describe the same side of the boundary;
    #   · and they cross by OVERLAP, not equality (`_same_side`), because a side may name itself
    #     more fully than its counterpart names it. Demanding equality would fire on the correct
    #     GovernanceSchema ↔ FeatureLedger pair, and a rule that fires on correct models is a rule
    #     people learn to scroll past.
    # Both sides' roles are printed in the finding for the same reason: a mismatch a reader has to
    # open two files to see is a mismatch that does not get fixed.
    #
    # A `to:` outside the model — `to: Site manager`, an actor — is skipped, not reported. An
    # unmodelled counterpart has no file to declare anything back in, and calling that one-way would
    # be this rule answering for a different defect class.
    #
    # Severity `info`, per the graduation rule: a new rule earns promotion with evidence, and on a
    # corpus nobody has migrated it would otherwise block on process, not on defect. But an `info`
    # finding cannot fail anything, so `--strict-symmetry` makes exactly these two ids blocking on
    # request — a rule with no way to fail changes no behaviour. PROMOTE to `high` by default once
    # `--strict-symmetry` has run green in CI across a release on a corpus that was NOT hand-fixed
    # for it, i.e. once the one-way count stays 0 without anyone chasing it; until then the flag is
    # opt-in and the finding is advisory.
    by_norm = {_norm(n): n for n in ctx}
    one_way, asymmetric, judged = [], [], 0
    for name in sorted(ctx):
        for r in (ctx[name].get("relationships") or []):
            if not isinstance(r, dict) or not r.get("to"):
                continue
            target = by_norm.get(_norm(r["to"]))
            if target is None or target == name:
                continue
            judged += 1
            back = [b for b in (ctx[target].get("relationships") or [])
                    if isinstance(b, dict) and _norm(b.get("to") or "") == _norm(name)]
            if not back:
                one_way.append(f"{name} → {target} ({_side(r)}) — {target} declares nothing back")
                continue
            if any(_mirrors(r, b) for b in back):
                continue
            b = back[0]
            why = []
            da, db = _direction(r), _direction(b)
            if da in MIRROR_DIRECTION and db in MIRROR_DIRECTION and MIRROR_DIRECTION[da] != db:
                why.append(f"`{da}` must face `{MIRROR_DIRECTION[da]}`, not `{db}`")
            if not _same_side(_roles(r.get("our_roles")), _roles(b.get("their_roles"))):
                why.append(f"{name}'s own role is unrecognised by {target}")
            if not _same_side(_roles(r.get("their_roles")), _roles(b.get("our_roles"))):
                why.append(f"{name}'s view of {target} is not the role {target} claims")
            asymmetric.append(f"{name} → {target}: {'; '.join(why)} · "
                              f"{name} says {_side(r)} · {target} says {_side(b)}")
    if one_way:
        out.append(Finding(
            "relationship-one-way", "info",
            f"{len(one_way)} of {judged} relationships are declared by one side only",
            _cap(one_way) + [
                "the counterpart's own model.yaml needs the mirror entry: opposite `direction`, "
                "`our_roles` and `their_roles` swapped. A boundary only one side has agreed to is a "
                "boundary the other side can change without knowing it broke anything."],
            "3-decompose"))
    if asymmetric:
        out.append(Finding(
            "relationship-asymmetric", "info",
            f"{len(asymmetric)} of {judged} relationships are declared by both sides, which "
            "disagree about the edge",
            _cap(asymmetric) + [
                "compatible, not identical: upstream faces downstream, peer faces peer, and each "
                "side's `our_roles` must be a role the other side names in `their_roles`. Roles "
                "need only overlap — naming yourself more fully than your counterpart does is not "
                "a conflict."],
            "3-decompose"))

    # 16 — grounding-readiness: the number every other gate is blind to. `govkit verify` is green on
    # a decompose built from a schema nobody confirmed and `govkit eval` scores it 100/100, yet the
    # author stalls because there is nothing under the boundary to cut on. btm-systems shipped exactly
    # that — a context map over 0 confirmed events, 1 confirmed / 12+ candidate, a two-day stall, then
    # a full rollback — every structural gate green throughout. This reads how much of the sliced
    # timeline a PERSON confirmed vs a mining run proposed. Fires only when a decompose artifact
    # already exists (a bare, still-thin discovery is honestly mid-flight; the 3-decompose skill hard-
    # rule covers the moment BEFORE decompose). `info` per the graduation rule: warning-only until the
    # slip rate is measured, blocking on opt-in --strict-grounding (mirrors --strict-symmetry).
    g = _grounding(docs)
    if g is not None and (bool(ctx) or (docs / "context-map.md").exists()):
        fl = _grounding_floors()
        conf, cand = g["confirmed"], g["candidate"]
        ce, cr = g["confirmed_events"], g["confirmed_rules"]
        ratio = conf / cand if cand else float("inf")
        why = []
        if ce is not None and ce < fl["min_confirmed_events"]:
            why.append(f"{ce} confirmed event(s), floor {fl['min_confirmed_events']}")
        if cr is not None and cr < fl["min_confirmed_rules"]:
            why.append(f"{cr} confirmed rule(s), floor {fl['min_confirmed_rules']}")
        if cand and ratio < fl["ratio_floor"]:
            why.append(f"confirmed:candidate {conf}:{cand} below floor {fl['ratio_floor']:.2f}")
        if why:
            slice_x = next(iter(ctx)) if len(ctx) == 1 else "the discovery timeline"
            out.append(Finding(
                "grounding-under-ratified", "info",
                f"under-grounded: {conf} confirmed / {cand} candidate on {slice_x} — "
                "ratify or mine before deepening",
                [f"{g['source']}: " + "; ".join(why),
                 f"open hotspots still on the wall: {g['hotspots']}",
                 "a boundary cut from candidates reproduces the source it was mined from; only a "
                 "person flips candidate->confirmed (structure cross-checks language, never leads it)",
                 "warning-only — run with --strict-grounding to block once the slip rate is measured"],
                "2-discover"))

    order = {"high": 0, "medium": 1, "info": 2}
    return sorted(out, key=lambda f: (order[f.severity], f.id))


def _steps_config(config: Path | None = None) -> dict:
    """steps.yml is the shared configuration: artifact conventions, staleness edges, budgets.
    Reading it here means a repo overrides a file, not the script. Delegates to
    ddd_state.load_config, whose _mini_yaml fallback handles steps.yml's shape — a bare
    `except ImportError: return {}` here used to silently drop EVERY budget check (the
    right-sizing doctrine, check 12) on machines without PyYAML, with no warning."""
    p = config or Path(__file__).resolve().parent.parent / "references" / "steps.yml"
    if not p.exists():
        return {}
    import ddd_state

    return ddd_state.load_config(p) or {}


def _budgets(config: Path | None = None) -> dict:
    return _steps_config(config).get("budgets") or {}


def _grounding(docs: Path) -> dict | None:
    """Confirmed-vs-candidate strength on the discovery timeline, split by element type.

    None when 2-discover has not run. Reads discovery/model.json first — the canonical source, the
    only one carrying a `type` per element, so confirmed EVENTS and confirmed RULES (policies) are
    told apart from the rest. Falls back to the markdown tally, which cannot split by type, so it
    degrades to the whole-timeline ratio and reports the event/rule counts as None rather than guess.
    """
    d = docs / "discovery"
    if not d.is_dir():
        return None
    f = d / "model.json"
    if f.exists():
        try:
            doc = json.loads(f.read_text(errors="ignore"))
            tl = doc.get("timeline")
            if isinstance(tl, list):
                rows = [e for e in tl if isinstance(e, dict)]
                st = lambda e: str(e.get("status", "")).strip().lower()  # noqa: E731
                ty = lambda e: str(e.get("type", "")).strip().lower()    # noqa: E731
                conf = sum(1 for e in rows if st(e).startswith("confirm"))
                cand = sum(1 for e in rows if st(e).startswith("cand"))
                ce = sum(1 for e in rows if ty(e) == "event" and st(e).startswith("confirm"))
                cr = sum(1 for e in rows if ty(e) == "policy" and st(e).startswith("confirm"))
                hots = doc.get("hotspots")
                return {"confirmed": conf, "candidate": cand, "confirmed_events": ce,
                        "confirmed_rules": cr,
                        "hotspots": len(hots) if isinstance(hots, list) else 0,
                        "source": "discovery/model.json"}
        except Exception:
            pass
    counts, hotspots, _dupes, _rules = discovery_from_markdown(docs)
    if not counts:
        return None
    return {"confirmed": counts.get("confirmed", 0), "candidate": counts.get("candidate", 0),
            "confirmed_events": None, "confirmed_rules": None, "hotspots": len(hotspots),
            "source": "discovery/*.md (no model.json — event/rule split unavailable)"}


def _grounding_floors(config: Path | None = None) -> dict:
    """The readiness floor, config-not-code. Defaults ARE the design skill's decompose heuristic:
    one human-confirmed event and one stated rule. steps.yml `grounding:` overrides any of them."""
    g = _steps_config(config).get("grounding") or {}
    return {"min_confirmed_events": int(g.get("min_confirmed_events", 1)),
            "min_confirmed_rules": int(g.get("min_confirmed_rules", 1)),
            "ratio_floor": float(g.get("ratio_floor", 0.34))}




# --------------------------------------------------------------------------- cli


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--docs", default=None)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--strict", action="store_true", help="exit 1 when a high-severity finding exists")
    ap.add_argument("--strict-symmetry", action="store_true",
                    help="exit 1 when a relationship is one-way or its two sides disagree "
                         "(check 15 is `info` by default, so it cannot block without this)")
    ap.add_argument("--strict-grounding", action="store_true",
                    help="exit 1 when the sliced discovery is under-ratified "
                         "(check 16 is `info` by default, so it cannot block without this)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    docs = Path(args.docs).resolve() if args.docs else root / "docs" / "domain"
    findings = run_checks(root, docs)

    if args.json:
        print(json.dumps({
            "root": str(root),
            "docs": str(docs),
            "findings": [f.__dict__ for f in findings],
            "counts": {s: sum(1 for f in findings if f.severity == s) for s in ("high", "medium", "info")},
        }, indent=2, ensure_ascii=False))
    elif not findings:
        print(f"No cross-artifact findings in {docs}.")
    else:
        counts = {s: sum(1 for f in findings if f.severity == s) for s in ("high", "medium", "info")}
        print(f"{len(findings)} finding(s) in {docs} — "
              f"{counts['high']} high, {counts['medium']} medium, {counts['info']} info\n")
        for f in findings:
            print(f"[{f.severity.upper():<6}] {f.id} → fix in {f.fix_owner}")
            print(f"         {f.title}")
            for e in f.evidence:
                print(f"           · {e}")
            print()

    if args.strict and any(f.severity == "high" for f in findings):
        return 1
    if args.strict_symmetry and any(f.id in SYMMETRY_IDS for f in findings):
        return 1
    if args.strict_grounding and any(f.id == "grounding-under-ratified" for f in findings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
