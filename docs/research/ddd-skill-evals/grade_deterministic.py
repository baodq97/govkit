#!/usr/bin/env python3
"""The assertions a script can settle, so a human only judges the ones that need judgement.

Roughly half of each eval's assertions are objective — is there a message table, is every message
typed, does any output leak HTTP verbs, is a name in the output absent from the fixture. Grading
those by reading is slow, drifts between iterations, and is exactly the kind of check that quietly
gets softer the third time you run it. The rest (does the critique actually bite, is the purpose in
business language) stay for a human or a grader agent — this script does not pretend to score them.

    python3 grade_deterministic.py <iteration-dir> [--fixture <path>] [--json]

Writes `grading_deterministic.json` next to each run's outputs and prints a table.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Transport and implementation detail. A domain message flow and a Bounded Context Canvas are
# design-level artefacts: the moment a status code appears, the conversation has moved from what the
# business does to how a service is wired, and the reviewer who could have caught a boundary problem
# is now reviewing an API.
LEAKS = re.compile(
    r"\b(GET|POST|PUT|PATCH|DELETE)\s+/|"
    r"\b(?:HTTP/1|HTTP/2|OpenAPI|Swagger|gRPC|GraphQL)\b|"
    r"\b(?:200|201|202|204|400|401|403|404|409|422|500|503)\s+(?:OK|Created|Accepted|No Content|Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Unprocessable|Internal|Service Unavailable)\b|"
    r"\b(?:Kafka|RabbitMQ|SQS|Kinesis|protobuf|Avro|JSON schema|exponential backoff|retry policy)\b",
    re.I)

MSG_TYPE = re.compile(r"\b(command|event|query)\b", re.I)
NUMBERED = re.compile(r"^\|\s*\d{1,2}(\.\d+)?\s*\|")
SECTION = lambda name: re.compile(rf"^#{{1,6}}\s*.*{name}.*$", re.I | re.M)  # noqa: E731


def _fixture_vocabulary(fixture: Path) -> set[str]:
    """Every PascalCase name the fixture itself declares — model.yaml plus the discovery timeline.

    This is the fabrication check, and it is the one worth having: the plugin's central rule is
    "never invent an event, rule or actor", and a fabricated name is undetectable by reading because
    it looks exactly like a real one. Comparing against the fixture's own vocabulary is the only
    cheap way to see it.
    """
    vocab: set[str] = set()
    for f in list(fixture.rglob("model.yaml")) + list(fixture.rglob("discovery/*.md")) \
            + list(fixture.rglob("*.md")):
        vocab |= set(re.findall(r"\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b", f.read_text(errors="ignore")))
    return vocab


def _texts(outputs: Path) -> str:
    # rglob, not glob: runs save canvases under `docs/` and flows under `message-flows/`, and a
    # top-level-only scan reported three sections "absent" for a run that had written all three.
    return "\n".join(f.read_text(errors="ignore") for f in sorted(outputs.rglob("*.md")))


def _tokens(name: str) -> frozenset[str]:
    """PascalCase to a set of crudely-lemmatised words, so `ReserveCapacity` and `CapacityReserved`
    compare equal. Naming the command that produces a declared event is ordinary modelling — the
    fabrication this check exists to catch is a name with no relative in the domain at all."""
    words = re.findall(r"[A-Z][a-z0-9]*", name)
    return frozenset(re.sub(r"(?:ed|ing|s|d|e)$", "", w.lower()) for w in words)


def grade(outputs: Path, vocab: set[str], expect_flow: bool = True) -> list[dict]:
    text = _texts(outputs)
    if not text.strip():
        return [{"text": "outputs exist", "passed": False, "evidence": "no .md files written"}]

    out: list[dict] = []

    leaks = sorted({m.group(0).strip() for m in LEAKS.finditer(text)})
    out.append({"text": "no transport or implementation detail (HTTP verbs, status codes, OpenAPI, queues, retries)",
                "passed": not leaks,
                "evidence": "clean" if not leaks else f"{len(leaks)} leak(s): {', '.join(leaks[:6])}"})

    # Only a flow is a numbered table. A Bounded Context Canvas types its inbound and outbound
    # messages too, but does not number them — asserting a numbered table on a define run marked a
    # correct artefact as a failure, which is a defect in the instrument, not in the output.
    if expect_flow:
        rows = [l for l in text.splitlines() if NUMBERED.match(l)]
        typed = [l for l in rows if MSG_TYPE.search(l)]
        out.append({"text": "messages are numbered and every numbered row carries a type (command/event/query)",
                    "passed": bool(rows) and len(typed) == len(rows),
                    "evidence": f"{len(typed)}/{len(rows)} numbered rows typed" if rows else "no numbered message table found"})
    else:
        typed = len(MSG_TYPE.findall(text))
        out.append({"text": "messages carry a type (command/event/query)",
                    "passed": typed >= 3,
                    "evidence": f"{typed} typed mention(s)"})

    for name in (() if expect_flow else ("assumption", "open question", "verification metric")):
        m = SECTION(name).search(text)
        body = ""
        if m:
            rest = text[m.end():]
            nxt = re.search(r"^#{1,6}\s", rest, re.M)
            body = rest[: nxt.start()] if nxt else rest
        filled = len([l for l in body.splitlines() if l.strip() and not l.strip().startswith("#")]) >= 1
        out.append({"text": f"a `{name}` section exists and is not left blank",
                    "passed": bool(m) and filled,
                    "evidence": "absent" if not m else ("present, non-empty" if filled else "present but empty")})

    # Names the output asserts that the fixture never declared. Prose words in PascalCase (a heading,
    # a product name) would be false positives, so only look at names used where a domain name goes:
    # backticked, or in a table cell next to a message type.
    claimed = set(re.findall(r"`([A-Z][a-z]+(?:[A-Z][a-z0-9]+)+)`", text))
    declared_tokens = {_tokens(v) for v in vocab}
    unknown = sorted(n for n in claimed - vocab if _tokens(n) not in declared_tokens)
    out.append({"text": "no domain name is asserted with no relative in the fixture's vocabulary (fabrication check)",
                "passed": not unknown,
                "evidence": "every name traces to something declared" if not unknown
                            else f"{len(unknown)} with no declared relative: {', '.join(unknown[:8])}"})

    if expect_flow:
        cites = len(re.findall(r"(?:message|msg|step)s?\s*#?\s*\d", text, re.I))
        out.append({"text": "findings cite message numbers as evidence rather than adjectives",
                    "passed": cites >= 2,
                    "evidence": f"{cites} numeric citation(s)"})
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("iteration", help="e.g. domain-define/iteration-2")
    ap.add_argument("--fixture", default="fixtures/nordic-freight")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    it = Path(a.iteration).resolve()
    vocab = _fixture_vocabulary(Path(a.fixture).resolve())
    results = {}
    # A connect run produces a flow; a define run produces canvases. The numbering assertion only
    # belongs to the first, so take it from the skill the iteration sits under rather than guessing
    # per output.
    expect_flow = "connect" in it.parent.name
    for outputs in sorted(it.glob("*/*/outputs")):
        run = f"{outputs.parent.parent.name}/{outputs.parent.name}"
        g = grade(outputs, vocab, expect_flow)
        (outputs.parent / "grading_deterministic.json").write_text(
            json.dumps({"expectations": g}, ensure_ascii=False, indent=2))
        results[run] = g

    if a.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return 0
    if not results:
        print(f"no runs with outputs under {it}", file=sys.stderr)
        return 1
    width = max(len(r) for r in results)
    for run, g in results.items():
        p = sum(1 for x in g if x["passed"])
        print(f"{run:{width}}  {p}/{len(g)}")
        for x in g:
            if not x["passed"]:
                print(f"{'':{width}}    FAIL — {x['text']}\n{'':{width}}           {x['evidence']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
