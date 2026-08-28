#!/usr/bin/env bash
# Check for the "code language is English" rule (part III2 of the refactoring
# plan).
#
# Everything except the JSON localisation dictionaries and docs/ is written in
# English: code, logs, names, error messages, migration texts. Russian lives in
# exactly one place - the localisation files.
#
# The mechanism is a ratchet, not a hard threshold: the backend and the
# migrations are already clean, but the frontend still holds hard-coded product
# strings that are moved into dictionaries at stage 3 (task 48). A hard failure
# would switch the check off on the very first day, so the baseline is recorded
# in docs/baselines/cyrillic.txt.
# The check fails if:
#   a) Cyrillic appeared in a file that is not in the baseline;
#   b) a file from the baseline gained more Cyrillic.
# A file from the baseline may only get cleaner; on a decrease the baseline is
# updated with `make baseline-cyrillic`.
#
# Legitimate Cyrillic, kept in the baseline: CLAUDE.md (owner-facing rules),
# *.down.sql (a rollback must restore the previous state verbatim), tests that
# assert Russian plural forms or Russian UI labels, and e2e specs that query by
# visible text. Everything else must be English.
#
# Does not apply to generated files (*.gen.*, schema.d.ts, swagger.*) or to
# backend/docs/: that is an OpenAPI dump, not hand-written code.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/cyrillic.txt"

cd "$ROOT"

current() {
  git ls-files \
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
