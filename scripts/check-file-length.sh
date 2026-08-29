#!/usr/bin/env bash
# Check for the 250-line limit on hand-written code (part VII.3 of the
# refactoring plan).
#
# The mechanism is a ratchet, not a hard threshold: at the time the check was
# introduced, 25 files exceed the limit, and a hard failure would switch the
# check off on the very first day. So the baseline is recorded in
# docs/baselines/file-length.txt.
# The check fails if:
#   a) a file that is not in the baseline exceeded the limit;
#   b) a file from the baseline has grown.
# A file from the baseline may only shrink; on a decrease the baseline is
# updated with `make baseline-file-length`.
#
# Does not apply to generated files (*.gen.*, schema.d.ts, swagger.*) or to SQL
# migrations: a migration cannot be cut in half.

set -euo pipefail

LIMIT=250
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/file-length.txt"

cd "$ROOT"

# A file that is not in the index yet still has to obey the limit. `git
# ls-files` alone lists only tracked paths, so a brand new file slipped past
# this check until it was staged: the check reported success on a tree that
# already broke the rule. Untracked but not ignored paths are listed too.
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
        # git ls-files also lists what has already been moved in the working
        # tree but has not reached the index yet: skip such a file rather than
        # making noise.
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
