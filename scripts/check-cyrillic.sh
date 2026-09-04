#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/cyrillic.txt"

cd "$ROOT"

tracked_and_new() {
  {
    git ls-files
    git ls-files --others --exclude-standard
  } | sort -u
}

current() {
  tracked_and_new \
    | grep -vE '^(docs/|frontend/src/shared/i18n/|backend/internal/locale/messages/)' \
    | grep -vE '^(CLAUDE|TODO)\.md$' \
    | grep -vE '[.](png|jpg|jpeg|gif|svg|ico|woff2?|ttf|otf|lock)$' \
    | grep -v '\.gen\.' \
    | grep -v 'schema\.d\.ts' \
    | grep -v 'swagger\.' \
    | grep -v '^backend/docs/' \
    | while IFS= read -r file; do
        [ -f "$file" ] && printf '%s\n' "$file"
      done \
    | LC_ALL=C.UTF-8 xargs -d '\n' -r sh -c 'grep -cHP "\p{Cyrillic}" -- "$@" || [ $? -eq 1 ]' sh \
    | awk '
        {
          pos = 0
          for (i = length($0); i > 0; i--) {
            if (substr($0, i, 1) == ":") { pos = i; break }
          }
          if (pos == 0) next
          file = substr($0, 1, pos - 1)
          hits = substr($0, pos + 1)
          if (hits + 0 > 0) printf "%s %s\n", hits, file
        }
      ' \
    | sort -k2
}

if [ "${1:-}" = "--update" ]; then
  {
    echo "# Baseline for the Cyrillic check (scripts/check-cyrillic.sh)."
    echo "# Format: <lines with Cyrillic> <path>. Only updated downwards."
    current
  } > "$BASELINE"
  echo "baseline updated: $BASELINE"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  echo "no baseline $BASELINE, run: make baseline-cyrillic" >&2
  exit 1
fi

failed=0

report=$(current | awk '
  NR == FNR {
    if ($0 ~ /^#/ || NF == 0) next
    base[$2] = $1
    next
  }
  {
    if (!($2 in base)) {
      printf "Cyrillic in a new file: %s (%s lines)\n", $2, $1
      next
    }
    if ($1 > base[$2]) {
      printf "more Cyrillic than before: %s (%s -> %s)\n", $2, base[$2], $1
    }
  }
' "$BASELINE" -)

if [ -n "$report" ]; then
  echo "$report" >&2
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "code language is English: product strings go into the dictionaries" >&2
  echo "(frontend/src/shared/i18n, backend/internal/locale), not into the code" >&2
  exit 1
fi

echo "Cyrillic: no excess over the baseline"
