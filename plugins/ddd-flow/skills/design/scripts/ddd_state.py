#!/usr/bin/env python3
"""Report the state of a repo's DDD modelling effort.

Deterministic, no API key, no LLM. It reads whatever artifacts exist plus the append-only
journal, and reports SIGNALS — what is present, what is stale, what is inconsistent, what has
happened since the last entry. It deliberately does not prescribe a next step: the loop has no
fixed order, and which step to run next depends on the goal, which lives in the conversation and
not in the file tree. Candidate actions are offered with reasons, ranked, for the agent to choose
between and justify.

What counts as evidence for each step is configuration (references/steps.yml), not code.

    python ddd_state.py --root .                    # human-readable report
    python ddd_state.py --root . --json             # machine-readable
    python ddd_state.py --root . --config other.yml # a repo with different conventions
    python ddd_state.py --root . --record --step connect --skill domain-connect \
        --note "traced 3 use cases" --open "invariant spans Booking/Consolidation" \
        --deviation "skipped organise — single team"
    python ddd_state.py --root . --render-log        # regenerate MODELLING-LOG.md from the journal

Exit code is always 0 — this reports, it does not gate.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "references" / "steps.yml"


# --------------------------------------------------------------------------- config


def load_config(path: Path) -> dict:
    """Load steps.yml. Uses PyYAML when available, else a small loader for this file's shape."""
    text = path.read_text()
    try:
        import yaml  # type: ignore

        return yaml.safe_load(text)
    except ImportError:
        return _mini_yaml(text)


def _scalar(v: str):
    v = v.strip()
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        if not inner:
            return []
        return [_scalar(x) for x in inner.split(",")]
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    if v in ("true", "false"):
        return v == "true"
    if v.isdigit():
        return int(v)
    return v


def _mini_yaml(text: str) -> dict:
    """Enough YAML for steps.yml: top-level scalars and one list of flat mappings."""
    out: dict = {}
    steps: list[dict] = []
    cur: dict | None = None
    in_steps = False
    for raw in text.splitlines():
        line = raw.split(" #")[0].rstrip() if " #" in raw else raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line.startswith(" "):
            key, _, val = line.partition(":")
            if key.strip() == "steps":
                in_steps = True
                continue
            in_steps = False
            out[key.strip()] = _scalar(val)
            continue
        if not in_steps:
            continue
        stripped = line.strip()
        if stripped.startswith("- "):
            cur = {}
            steps.append(cur)
            stripped = stripped[2:]
        if cur is None:
            continue
        key, _, val = stripped.partition(":")
        cur[key.strip()] = _scalar(val)
    out["steps"] = steps
    return out


# --------------------------------------------------------------------------- state


@dataclass
class StepState:
    id: str
    loop: int
    skill: str
    question: str
    status: str = "missing"  # done | partial | missing
    evidence: list[str] = field(default_factory=list)
    mtime: float = 0.0
    stale_against: list[str] = field(default_factory=list)
    note: str = ""


def _matches(docs: Path, patterns: list[str], exclude: list[str]) -> list[Path]:
    excluded = {p.resolve() for pat in exclude for p in docs.glob(pat)}
    hits = []
    for pat in patterns:
        for p in docs.glob(pat):
            if p.is_file() and p.resolve() not in excluded:
                hits.append(p)
    return sorted(set(hits))


def _as_list(v) -> list[str]:
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def detect(root: Path, cfg: dict) -> tuple[list[StepState], list[str]]:
    docs = root / cfg.get("docs_root", "docs/domain")
    states: dict[str, StepState] = {}

    for spec in cfg["steps"]:
        s = StepState(
            id=spec["id"],
            loop=spec.get("loop", 0),
            skill=spec.get("skill", ""),
            question=spec.get("question", ""),
        )
        states[s.id] = s
        if not docs.is_dir():
            continue

        patterns = _as_list(spec.get("artifacts"))
        exclude = _as_list(spec.get("exclude"))
        markers = [m.lower() for m in _as_list(spec.get("markers"))]
        min_markers = int(spec.get("min_markers", 1) or 1)

        per_pattern = {pat: _matches(docs, [pat], exclude) for pat in patterns}
        hits = sorted({p for group in per_pattern.values() for p in group})
        if not hits:
            continue

        weak: list[Path] = []
        if markers:
            strong = []
            for p in hits:
                body = p.read_text(errors="ignore").lower()
                (strong if sum(m in body for m in markers) >= min_markers else weak).append(p)
            hits = strong

        if not hits:
            s.note = (
                f"{len(weak)} file(s) matched but lack the marks of a completed step "
                f"({', '.join(sorted({p.parent.name for p in weak}))})"
            )
            continue

        s.evidence = sorted(str(p.relative_to(root)) for p in hits)
        s.mtime = max(p.stat().st_mtime for p in hits)
        if spec.get("require_all") and not all(per_pattern.values()):
            s.status = "partial"
            missing = [pat for pat, g in per_pattern.items() if not g]
            s.note = f"no match for {', '.join(missing)}"
        elif weak:
            s.status = "partial"
            s.note = (
                f"{len(weak)} still first-pass only: "
                f"{', '.join(sorted({p.parent.name for p in weak}))}"
            )
        else:
            s.status = "done"

    for spec in cfg["steps"]:
        s = states[spec["id"]]
        if s.status == "missing" or not s.mtime:
            continue
        for upstream in _as_list(spec.get("invalidated_by")):
            u = states.get(upstream)
            if u and u.mtime and u.mtime > s.mtime:
                s.stale_against.append(upstream)

    ordered = [states[spec["id"]] for spec in cfg["steps"]]
    warnings: list[str] = []
    if not docs.is_dir():
        warnings.append(f"no domain docs at {docs} — nothing has been modelled here yet")
    else:
        done = {s.id for s in ordered if s.status != "missing"}
        if "decompose" in done and not ({"discover", "understand"} & done):
            warnings.append(
                "a decomposition exists with no discovery or business-model artifact behind it — "
                "the boundaries rest on understanding nobody wrote down"
            )
    return ordered, warnings


def candidates(states: list[StepState], journal: list[dict]) -> list[dict]:
    """Offer possible actions with reasons. Ranked, not prescriptive — the agent chooses."""
    out: list[dict] = []
    for s in states:
        if s.stale_against:
            out.append(
                {
                    "kind": "revisit",
                    "step": s.id,
                    "skill": s.skill,
                    "rank": 1,
                    "why": f"{', '.join(s.stale_against)} changed after {s.id} was written — "
                    f"it may now describe a model that no longer exists",
                }
            )
        elif s.status == "partial":
            out.append(
                {
                    "kind": "finish",
                    "step": s.id,
                    "skill": s.skill,
                    "rank": 2,
                    "why": s.note or "partial output",
                }
            )
        elif s.status == "missing":
            out.append(
                {
                    "kind": "run",
                    "step": s.id,
                    "skill": s.skill,
                    "rank": 3,
                    "why": f"never run — answers: {s.question}",
                }
            )
    open_items = [
        (e.get("step"), o) for e in journal for o in _as_list(e.get("open")) if o
    ]
    for step, item in open_items:
        out.append(
            {
                "kind": "resolve",
                "step": step,
                "skill": None,
                "rank": 2,
                "why": f"open item carried in the journal: {item}",
            }
        )
    return sorted(out, key=lambda c: c["rank"])


# --------------------------------------------------------------------------- journal


def read_journal(path: Path) -> list[dict]:
    if not path.exists():
        return []
    entries = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if line:
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries


def record(path: Path, entry: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def render_log(entries: list[dict]) -> str:
    lines = [
        "# Domain modelling log",
        "",
        "<!-- Generated from .ddd-journal.jsonl by ddd_state.py --render-log. Do not hand-edit:",
        "     append a journal entry instead, so the record stays append-only. -->",
        "",
        "| Date | Step | Skill | Who was there | Artifact | Decisions | Carried forward |",
        "|---|---|---|---|---|---|---|",
    ]
    for e in entries:
        lines.append(
            "| {date} | {step} | {skill} | {room} | {artifact} | {note} | {open} |".format(
                date=e.get("date", ""),
                step=e.get("step", ""),
                skill=e.get("skill", ""),
                room=", ".join(_as_list(e.get("room"))) or "—",
                artifact=", ".join(_as_list(e.get("artifact"))) or "—",
                note=e.get("note", "") or "—",
                open="; ".join(_as_list(e.get("open"))) or "—",
            )
        )
    deviations = [
        (e.get("date", ""), e.get("step", ""), d)
        for e in entries
        for d in _as_list(e.get("deviation"))
        if d
    ]
    lines += ["", "## Deviations", ""]
    if deviations:
        lines += [f"- **{d[0]} · {d[1]}** — {d[2]}" for d in deviations]
    else:
        lines.append("_None recorded._")
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------- cli


def review_payload(root: Path, cfg: dict, journal: list) -> dict:
    """One payload, two questions: what has been done, and what is wrong with it. This is what
    `/ddd-flow:view` renders as the Review lens. It is a function rather than inline in `main` so
    the view can call it directly instead of paying for a second interpreter."""
    states, warnings = detect(root, cfg)
    try:
        from ddd_check import run_checks  # same directory

        findings = [f.__dict__ for f in run_checks(root, root / cfg.get("docs_root", "docs/domain"))]
    except Exception as exc:  # a broken check must not take the state report down with it
        findings = []
        warnings = warnings + [f"cross-artifact checks did not run: {exc}"]
    return {
        "schemaVersion": 1,
        "kind": "review",
        "source": {"mode": "review", "docsRoot": cfg.get("docs_root")},
        "steps": [
            {"step": s.id, "loop": s.loop, "skill": s.skill, "question": s.question,
             "status": s.status, "evidence": s.evidence, "stale_against": s.stale_against,
             "note": s.note}
            for s in states
        ],
        "candidates": candidates(states, journal),
        "findings": findings,
        "warnings": warnings,
        "journalEntries": len(journal),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--config", default=None)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--record", action="store_true", help="append a journal entry")
    ap.add_argument("--render-log", action="store_true", help="regenerate the markdown log")
    ap.add_argument("--review", action="store_true",
                    help="emit a review payload (state + cross-artifact findings) for the view lens")
    ap.add_argument("--step")
    ap.add_argument("--skill")
    ap.add_argument("--note")
    ap.add_argument("--room", action="append", default=[])
    ap.add_argument("--artifact", action="append", default=[])
    ap.add_argument("--open", action="append", default=[], dest="open_items")
    ap.add_argument("--deviation", action="append", default=[])
    ap.add_argument("--date", default=None, help="YYYY-MM-DD (defaults to today, local time)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    cfg = load_config(Path(args.config).resolve() if args.config else DEFAULT_CONFIG)
    journal_path = root / cfg.get("journal", "docs/domain/.ddd-journal.jsonl")
    log_path = root / cfg.get("log", "docs/domain/MODELLING-LOG.md")

    if args.record:
        if not args.step:
            print("--record needs --step", file=sys.stderr)
            return 0
        entry = {
            "date": args.date or time.strftime("%Y-%m-%d"),
            "step": args.step,
            "skill": args.skill or "",
            "room": args.room,
            "artifact": args.artifact,
            "note": args.note or "",
            "open": args.open_items,
            "deviation": args.deviation,
        }
        record(journal_path, entry)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(render_log(read_journal(journal_path)))
        print(f"recorded {args.step} -> {journal_path.relative_to(root)}")
        print(f"log regenerated -> {log_path.relative_to(root)}")
        return 0

    journal = read_journal(journal_path)

    if args.review:
        print(json.dumps(review_payload(root, cfg, journal), indent=2, ensure_ascii=False))
        return 0

    if args.render_log:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(render_log(journal))
        print(f"log regenerated from {len(journal)} entries -> {log_path.relative_to(root)}")
        return 0

    states, warnings = detect(root, cfg)
    cands = candidates(states, journal)

    if args.json:
        print(
            json.dumps(
                {
                    "root": str(root),
                    "docs_root": cfg.get("docs_root"),
                    "steps": [
                        {
                            "step": s.id,
                            "loop": s.loop,
                            "skill": s.skill,
                            "question": s.question,
                            "status": s.status,
                            "evidence": s.evidence,
                            "stale_against": s.stale_against,
                            "note": s.note,
                        }
                        for s in states
                    ],
                    "candidates": cands,
                    "journal_entries": len(journal),
                    "last_entry": journal[-1] if journal else None,
                    "warnings": warnings,
                },
                indent=2,
                ensure_ascii=False,
            )
        )
        return 0

    print(f"DDD modelling state — {root / cfg.get('docs_root', 'docs/domain')}\n")
    print(f"{'loop':<5}{'step':<12}{'status':<10}evidence")
    for s in states:
        mark = "STALE" if s.stale_against else {"done": "done", "partial": "partial", "missing": "-"}[s.status]
        ev = ", ".join(s.evidence[:3]) or "—"
        if len(s.evidence) > 3:
            ev += f" (+{len(s.evidence) - 3} more)"
        print(f"{s.loop:<5}{s.id:<12}{mark:<10}{ev}")
        if s.note:
            print(f"{'':<27}note: {s.note}")
        if s.stale_against:
            print(f"{'':<27}stale against: {', '.join(s.stale_against)}")

    for w in warnings:
        print(f"\nwarning: {w}")

    print(f"\njournal: {len(journal)} entr{'y' if len(journal) == 1 else 'ies'}", end="")
    if journal:
        last = journal[-1]
        print(f" — last: {last.get('date')} {last.get('step')} ({last.get('note', '')})")
    else:
        print(" — nothing recorded yet")

    print("\ncandidate actions (choose against the goal; this is not an order):")
    for c in cands:
        who = f" via {c['skill']}" if c.get("skill") else ""
        print(f"  [{c['kind']}] {c['step']}{who}\n      {c['why']}")
    if not cands:
        print("  none — every step has run and nothing upstream has changed since")
    return 0


if __name__ == "__main__":
    sys.exit(main())
