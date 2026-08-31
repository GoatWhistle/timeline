#!/usr/bin/env bash

set -euo pipefail

LIMIT=250
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/file-length.txt"

cd "$ROOT"

tracked_and_new() {
  {
    git ls-files "$@"
    git ls-files --others --exclude-standard "$@"
  } | sort -u
}

current() {
  tracked_and_new -- '*.go' '*.ts' '*.tsx' '*.css' \
    | grep -v '\.gen\.' \
    | grep -v 'schema\.d\.ts' \
    | grep -v 'swagger\.' \
    | grep -v '^backend/docs/' \
    | while read -r file; do
        [ -f "$file" ] || continue
        lines=$(wc -l < "$file" | tr -d ' ')
        if [ "$lines" -gt "$LIMIT" ]; then
          printf '%s %s\n' "$lines" "$file"
        fi
      done \
    | sort -k2
}

if [ "${1:-}" = "--update" ]; then
  {
    echo "# Baseline for the $LIMIT-line limit check (scripts/check-file-length.sh)."
    echo "# Format: <lines> <path>. Only updated downwards."
    current
  } > "$BASELINE"
  echo "baseline updated: $BASELINE"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  echo "no baseline $BASELINE, run: make baseline-file-length" >&2
  exit 1
fi

failed=0

while read -r lines file; do
  base=$(awk -v f="$file" '$2 == f { print $1 }' "$BASELINE")
  if [ -z "$base" ]; then
    echo "new file over the $LIMIT-line limit: $file ($lines)" >&2
    failed=1
  elif [ "$lines" -gt "$base" ]; then
    echo "file has grown: $file ($base -> $lines, limit $LIMIT)" >&2
    failed=1
  fi
done < <(current)

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "250-line limit: split the file or shrink it back to the baseline" >&2
  exit 1
fi

echo "$LIMIT-line limit: no excess over the baseline"
