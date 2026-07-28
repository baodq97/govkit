#!/usr/bin/env bash
# Emit the baseline + denominator block for a multi-agent round, ready to paste into a prompt.
#
# Why this exists: across three rounds, eight pre-registered bars rested on a number nobody
# re-measured — 605 citations were 652, "five readers" were seven, "nine kinds" were eleven.
# Writing "re-measure the denominator" into the prompt did not fix it; the instruction was there
# and still missed eight times. What a script can establish, do not ask an agent to remember.
#
#   ./measure-bars.sh [--root DIR]
#
# Edit MEASUREMENTS for your repo. Each row is  label | command  and the command must print ONE
# line — the number or headline that a bar will quote.

set -uo pipefail
ROOT="."
[ "${1:-}" = "--root" ] && ROOT="${2:?--root needs a directory}"
cd "$ROOT" || exit 1

# ── Baselines: what every agent must be able to reproduce before it changes anything ──────────
BASELINES=(
  "verify|bun run verify 2>&1 | grep -o 'govkit verify: .*'"
  "eval|bun run eval 2>&1 | grep -o 'govkit eval: .*'"
  "tests|bun run test 2>&1 | grep -oE '[0-9]+ pass' | head -1"
  "check-sync|node scripts/check-sync.mjs >/dev/null 2>&1 && echo OK || echo FAIL"
  "calibrate|bun run govkit-calibrate 2>&1 | grep -o 'floor matrix: .*'"
)

# ── Denominators: the counts a bar is tempted to state from memory ───────────────────────────
DENOMINATORS=(
  "governed docs|bun run verify 2>&1 | grep -oE '[0-9]+ doc\\(s\\) checked' | grep -oE '^[0-9]+'"
  "citations in docs/domain|grep -rohE '[A-Za-z0-9_./-]+\\.(ts|py|mjs|yml):[0-9]+' docs/domain 2>/dev/null | cnt"
  "path-resolution sites|grep -rlE 'typeDir\\(|listMarkdown\\(|isInside\\(' packages/*/src --include=*.ts 2>/dev/null | cnt"
  "violation kinds|sed -n '/export const VIOLATION_KINDS/,/^]/p' packages/*/src/config.ts 2>/dev/null | grep -cE '^\\s+\"[a-z-]+\",?\$' | cnt2"
  "relationship entries|grep -h '^  - to:' docs/domain/*/model.yaml 2>/dev/null | cnt"
  "test files|ls packages/*/test/*.test.ts 2>/dev/null | cnt"
)

# Count stdin lines, but NEVER report a broken pipeline as the number 0 — that is the exact way a
# stale denominator gets laundered into a bar. `wc -l` answers 0 whether the pattern matched
# nothing or the file moved, and those need opposite responses.
cnt() { cnt2 < <(wc -l); }          # count stdin lines, then guard the zero
cnt2() {                            # guard a number that is already on stdin (e.g. from grep -c)
  local n; read -r n
  if [ "${n:-0}" -eq 0 ]; then echo "0  ← NOTHING MATCHED: fix the pattern, do not write a bar on this"
  else echo "$n"; fi
}
export -f cnt cnt2

run_row() { # label|command  ->  "  label ......... value"
  local label="${1%%|*}" cmd="${1#*|}" out
  out="$(eval "$cmd" 2>/dev/null | head -1)"
  printf '  %-28s %s\n' "$label" "${out:-<no output — the command found nothing>}"
}

echo "## Baseline — reproduce these before changing anything"
echo '```'
for row in "${BASELINES[@]}"; do run_row "$row"; done
echo '```'
echo
echo "## Denominators — measured $(git log -1 --format=%h 2>/dev/null || echo 'no-git'), use these in bars"
echo '```'
for row in "${DENOMINATORS[@]}"; do run_row "$row"; done
echo '```'
echo
cat <<'BLIND'
## What this script does NOT measure

A script that is a source of truth for an agent has to say where it is blind, or the agent will
read silence as zero:

- Only the rows above. A bar quoting anything else is still quoting memory — add a row for it.
- `<no output>` means the command matched nothing. That is a broken measurement, NOT a count of
  zero, and a bar must not be written against it.
- Counts are lexical (grep over source), so they disagree with a real parser in both directions:
  they cannot tell a live call site from a comment, and they miss forms the pattern never
  anticipated. On this repo the citation row reads 601 where the parser finds 652. Use them to
  catch a STALE number, not to state an exact one — and when a bar needs the exact figure, quote
  the parser and say which one.
- Nothing here judges whether a number is the RIGHT denominator for the bar you are writing —
  it only guarantees the number is current.
BLIND
