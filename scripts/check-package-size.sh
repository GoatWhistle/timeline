#!/usr/bin/env bash

set -euo pipefail

LIMIT=20
TEST_LIMIT=30
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/package-size.txt"

cd "$ROOT"

tracked_and_new() {
  {
    git ls-files "$@"
    git ls-files --others --exclude-standard "$@"
  } | sort -u
}

current() {
  tracked_and_new -- '*.go' '*.ts' '*.tsx' \
    | grep -v '\.gen\.' \
    | grep -v 'schema\.d\.ts' \
    | grep -v '^backend/docs/' \
    | awk -v limit="$LIMIT" -v test_limit="$TEST_LIMIT" '
        {
          file = $0
          dir = file
          sub(/\/[^\/]*$/, "", dir)
          if (dir == file) dir = "."
          kind = "src"
          if (file ~ /_test\.go$/ || file ~ /\.(test|spec)\.tsx?$/) kind = "test"
          count[kind " " dir]++
        }
        END {
          for (key in count) {
            split(key, part, " ")
            lim = (part[1] == "test") ? test_limit : limit
            if (count[key] > lim) print count[key], part[1], part[2]
          }
        }
      ' \
    | sort -k3
}

if [ "${1:-}" = "--update" ]; then
  {
    echo "# Baseline for the package file-count check (scripts/check-package-size.sh)."
    echo "# Limits: $LIMIT source files, $TEST_LIMIT test files per package."
    echo "# Format: <count> <src|test> <package>. Only updated downwards."
    current
  } > "$BASELINE"
  echo "baseline updated: $BASELINE"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  echo "no baseline $BASELINE, run: make baseline-package-size" >&2
  exit 1
fi

failed=0

while read -r count kind dir; do
  limit=$LIMIT
  [ "$kind" = test ] && limit=$TEST_LIMIT
  base=$(awk -v k="$kind" -v d="$dir" '$2 == k && $3 == d { print $1 }' "$BASELINE")
  if [ -z "$base" ]; then
    echo "new package over the $limit-$kind-file limit: $dir ($count)" >&2
    failed=1
  elif [ "$count" -gt "$base" ]; then
    echo "package has grown: $dir ($kind $base -> $count, limit $limit)" >&2
    failed=1
  fi
done < <(current)

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "package file-count limit: split the package along domain boundaries" >&2
  exit 1
fi

echo "package file-count limit: no excess over the baseline"
