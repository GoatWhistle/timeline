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
    | grep -vE '[.](png|jpg|jpeg|gif|svg|ico|woff2?|ttf|otf|lock)$' \
    | grep -v '\.gen\.' \
    | grep -v 'schema\.d\.ts' \
    | grep -v 'swagger\.' \
    | grep -v '^backend/docs/' \
    | while read -r file; do
        [ -f "$file" ] || continue
        hits=$(LC_ALL=C.UTF-8 grep -cP '\p{Cyrillic}' "$file" 2>/dev/null || true)
        if [ -n "$hits" ] && [ "$hits" -gt 0 ]; then
          printf '%s %s\n' "$hits" "$file"
        fi
      done \
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

while read -r hits file; do
  base=$(awk -v f="$file" '$2 == f { print $1 }' "$BASELINE")
  if [ -z "$base" ]; then
    echo "Cyrillic in a new file: $file ($hits lines)" >&2
    failed=1
  elif [ "$hits" -gt "$base" ]; then
    echo "more Cyrillic than before: $file ($base -> $hits)" >&2
    failed=1
  fi
done < <(current)

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "code language is English: product strings go into the dictionaries" >&2
  echo "(frontend/src/shared/i18n, backend/internal/locale), not into the code" >&2
  exit 1
fi

echo "Cyrillic: no excess over the baseline"
