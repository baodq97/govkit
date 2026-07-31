#!/usr/bin/env python3
"""Validate a mining coverage manifest against the corpus it claims to have scanned.

A mined number is only arguable if the manifest behind it accounts for every file: parsed,
skipped-with-a-reason, or failed-with-an-error. This checks that arithmetic and refuses to stay
quiet about anything it cannot classify — including keys in the manifest it does not recognise.

That last rule is the point. The most expensive bug found while building this plugin was a state
script reporting "nothing done yet" on a repo that already held documents, because one filename fell
outside its glob and it said nothing. Silence read as absence. So this script declares its own blind
spots rather than skipping them.

Run:
  python3 mine_coverage.py --manifest .ddd-flow/mine/out/manifest.yaml --corpus 'src/**/*.xml'
  python3 mine_coverage.py --manifest out/manifest.json --corpus 'src/**/*.xml' --strict --json

Exit 0 always unless --strict, which exits 1 when a high finding is present.
Stdlib only. YAML manifests need PyYAML; without it, emit JSON instead (see manifest-unreadable).
"""

from __future__ import annotations

import argparse
import glob as globlib
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

STEP = "2-discover"

# Keys this validator understands. Anything else is reported, never ignored — an unrecognised key is
# either a manifest the corpus outgrew or a typo silently disabling a check.
KNOWN_KEYS = {
    "source", "invocation", "total", "parsed", "skipped", "failed",
    "filters", "fields", "stage", "notes",
}
REQUIRED_KEYS = ("source", "invocation", "total", "parsed", "skipped", "failed")


@dataclass(frozen=True)
class Finding:
    id: str
    severity: str  # high | medium | info
    title: str
    evidence: list[str] = field(default_factory=list)
    fix_owner: str = STEP


def load_manifest(path: Path) -> tuple[dict[str, Any] | None, str | None]:
    """Return (manifest, error). Never raises — a malformed manifest is a finding, not a crash."""
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        return None, f"cannot read {path}: {exc}"

    if path.suffix.lower() == ".json":
        try:
            data = json.loads(text)
        except ValueError as exc:
            return None, f"invalid JSON: {exc}"
    else:
        try:
            import yaml  # noqa: PLC0415
        except ImportError:
            # Deliberately not hand-rolling a YAML subset here: a fragile parser silently
            # misreading the artifact that exists to prevent silent misreads is the wrong trade.
            return None, (
                "PyYAML is not installed, so this YAML manifest cannot be parsed. Either install it "
                "or emit the manifest as .json — both are fine, guessing at the YAML is not."
            )
        try:
            data = yaml.safe_load(text)
        except Exception as exc:  # yaml raises several types
            return None, f"invalid YAML: {exc}"

    if not isinstance(data, dict):
        return None, f"expected a mapping at the top level, got {type(data).__name__}"
    return data, None


def count_corpus(pattern: str) -> int:
    return sum(1 for p in globlib.iglob(pattern, recursive=True) if Path(p).is_file())


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def run_checks(manifest: dict[str, Any], corpus_pattern: str | None) -> list[Finding]:
    out: list[Finding] = []

    missing = [k for k in REQUIRED_KEYS if k not in manifest]
    if missing:
        out.append(Finding(
            "manifest-missing-key", "high",
            "manifest omits required keys — an absent key is a blind spot, not an empty result",
            [f"missing: {', '.join(missing)}"],
        ))

    unknown = sorted(set(manifest) - KNOWN_KEYS)
    if unknown:
        out.append(Finding(
            "manifest-unknown-key", "medium",
            "manifest carries keys this validator does not check — so they are unverified",
            [f"unrecognised: {', '.join(unknown)}",
             "either they are a typo disabling a check, or KNOWN_KEYS needs extending"],
        ))

    skipped, failed, filters = (_as_list(manifest.get(k)) for k in ("skipped", "failed", "filters"))

    for i, entry in enumerate(skipped):
        if not (isinstance(entry, dict) and str(entry.get("reason") or "").strip()):
            out.append(Finding(
                "skip-without-reason", "high",
                "a skipped file carries no reason — that is an unmeasured absence",
                [f"skipped[{i}]: {entry!r}"],
            ))
    for i, entry in enumerate(failed):
        if not (isinstance(entry, dict) and str(entry.get("error") or "").strip()):
            out.append(Finding(
                "fail-without-error", "high",
                "a failed file carries no error — the failure cannot be diagnosed or re-run",
                [f"failed[{i}]: {entry!r}"],
            ))
    for i, entry in enumerate(filters):
        ok = isinstance(entry, dict) and isinstance(entry.get("dropped"), int) \
            and str(entry.get("reason") or "").strip()
        if not ok:
            out.append(Finding(
                "filter-without-count", "medium",
                "a filter reports no counted, explained drop — silent truncation reads as coverage",
                [f"filters[{i}]: {entry!r}"],
            ))

    # Field coverage — the blind spot that survives every file-level check above. A manifest can
    # account for every file while a parser drops a field from every record, and nothing notices,
    # because the dropped field's absence then reads as the corpus not saying it.
    for i, entry in enumerate(_as_list(manifest.get("fields"))):
        if not isinstance(entry, dict):
            out.append(Finding(
                "field-census-malformed", "medium",
                "a fields[] entry is not a mapping, so field coverage is unverified",
                [f"fields[{i}]: {entry!r}"],
            ))
            continue
        seen, consumed = entry.get("seen"), entry.get("consumed")
        unconsumed = _as_list(entry.get("unconsumed"))
        shape = entry.get("shape") or f"fields[{i}]"
        for j, dropped in enumerate(unconsumed):
            if not (isinstance(dropped, dict) and str(dropped.get("reason") or "").strip()):
                out.append(Finding(
                    "unconsumed-field-without-reason", "high",
                    "a field present in the source reached no fact and does not say why — "
                    "an unread field is an unmeasured absence, exactly like an unscanned file",
                    [f"shape {shape}, unconsumed[{j}]: {dropped!r}"],
                ))
        if isinstance(seen, int) and isinstance(consumed, int):
            if consumed + len(unconsumed) != seen:
                out.append(Finding(
                    "field-coverage-arithmetic", "high",
                    "consumed + unconsumed does not equal seen — some field names are unaccounted for",
                    [f"shape {shape}", f"seen={seen}",
                     f"consumed={consumed} + unconsumed={len(unconsumed)} = "
                     f"{consumed + len(unconsumed)}"],
                ))
        else:
            out.append(Finding(
                "field-census-uncounted", "medium",
                "a fields[] entry reports no integer seen/consumed, so it certifies nothing",
                [f"shape {shape}: seen={seen!r}, consumed={consumed!r}"],
            ))

    total, parsed = manifest.get("total"), manifest.get("parsed")
    if isinstance(total, int) and isinstance(parsed, int):
        accounted = parsed + len(skipped) + len(failed)
        if accounted != total:
            out.append(Finding(
                "coverage-arithmetic", "high",
                "parsed + skipped + failed does not equal total — some files are unaccounted for",
                [f"total={total}", f"parsed={parsed} + skipped={len(skipped)} + "
                 f"failed={len(failed)} = {accounted}", f"unaccounted: {total - accounted}"],
            ))

    if corpus_pattern:
        actual = count_corpus(corpus_pattern)
        if actual == 0:
            out.append(Finding(
                "corpus-glob-empty", "medium",
                "the corpus pattern matched no files — the manifest is unverified against reality",
                [f"pattern: {corpus_pattern}"],
            ))
        elif isinstance(total, int) and actual != total:
            out.append(Finding(
                "coverage-total-mismatch", "high",
                "manifest total disagrees with an independent count of the corpus",
                [f"manifest total={total}", f"glob {corpus_pattern} → {actual}",
                 "either the walk missed files or the pattern differs from what was scanned"],
            ))

    return out


def render(findings: list[Finding], manifest_path: Path, corpus: str | None) -> str:
    if not findings:
        return f"mine_coverage: OK — {manifest_path} accounts for every file" + (
            f" matched by {corpus}" if corpus else "")
    order = {"high": 0, "medium": 1, "info": 2}
    findings = sorted(findings, key=lambda f: (order.get(f.severity, 3), f.id))
    counts = {s: sum(1 for f in findings if f.severity == s) for s in ("high", "medium", "info")}
    lines = [f"{len(findings)} finding(s) in {manifest_path} — "
             + ", ".join(f"{v} {k}" for k, v in counts.items() if v), ""]
    for f in findings:
        lines.append(f"[{f.severity.upper():<6}] {f.id} → fix in {f.fix_owner}")
        lines.append(f"         {f.title}")
        lines.extend(f"           · {e}" for e in f.evidence)
        lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--corpus", help="glob to count independently, e.g. 'src/**/*.xml'")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--strict", action="store_true", help="exit 1 on any high finding")
    args = ap.parse_args(argv)

    path = Path(args.manifest)
    manifest, error = load_manifest(path)
    findings = [Finding("manifest-unreadable", "high",
                        "the coverage manifest could not be read, so no number it reports is checked",
                        [error])] if error else run_checks(manifest or {}, args.corpus)

    if args.json:
        print(json.dumps({
            "manifest": str(path), "corpus": args.corpus,
            "findings": [f.__dict__ for f in findings],
            "counts": {s: sum(1 for f in findings if f.severity == s)
                       for s in ("high", "medium", "info")},
        }, indent=2))
    else:
        print(render(findings, path, args.corpus))

    return 1 if args.strict and any(f.severity == "high" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
