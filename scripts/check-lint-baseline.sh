#!/usr/bin/env bash
# Second layer of the golangci-lint ratchet (part V.1 of the refactoring plan).
#
# The main ratchet - `--new-from-merge-base=origin/main` - checks only what the
# change itself introduced. It has a hole: on a push to main the comparison base
# is empty and nothing gets checked. This script closes it with a counter: the
# total number of issues must not exceed the baseline.
#
# Fails if the number of issues has grown. If it has dropped - prints the new
# level: the baseline is lowered by hand, so that the decrease is deliberate and
# shows up in the change review.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/lint.json"

GOLANGCI_IMAGE="golangci/golangci-lint:v2.6-alpine"
GO_CACHE="timeline-go-mod"

count() {
  if command -v golangci-lint >/dev/null 2>&1; then
    (cd "$ROOT/backend" && golangci-lint run --output.text.path=stdout ./... 2>/dev/null)       | grep -cE '^[^[:space:]].*:[0-9]+:[0-9]+:' || true
    return
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "neither golangci-lint nor docker is available: cannot count issues" >&2
    exit 1
  fi
  MSYS_NO_PATHCONV=1 docker run --rm     -v "$ROOT/backend:/src" -v "$GO_CACHE:/go/pkg/mod" -w /src "$GOLANGCI_IMAGE"     sh -c 'golangci-lint run --output.text.path=stdout ./... 2>/dev/null'     | grep -cE '^[^[:space:]].*:[0-9]+:[0-9]+:' || true
}

if [ "${1:-}" = "--update" ]; then
  total="$(count)"
  cat > "$BASELINE" <<JSON
{
  "measuredAt": "$(date -u +%Y-%m-%d)",
  "tool": "golangci-lint v2.6",
  "config": "backend/.golangci.yml",
  "target": "make back-lint",
  "total": $total,
  "note": "Second layer of the ratchet: on a push to main the merge-base is empty, so --new-from-merge-base checks nothing and only this counter holds the line. Baseline is only lowered."
}
JSON
  echo "baseline updated: $BASELINE ($total issues)"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  echo "no baseline $BASELINE, run: make baseline-lint" >&2
  exit 1
fi

expected="$(grep -oE '"total"[[:space:]]*:[[:space:]]*[0-9]+' "$BASELINE" | grep -oE '[0-9]+')"

actual="$(count)"

if [ "$actual" -gt "$expected" ]; then
  echo "golangci-lint issues: $actual, baseline $expected" >&2
  echo "debt grew by $((actual - expected)); fix the new issues" >&2
  exit 1
fi

if [ "$actual" -lt "$expected" ]; then
  echo "fewer issues than before: $actual against $expected"
  echo "run: make baseline-lint"
  exit 0
fi

echo "golangci-lint: $actual issues, baseline not exceeded"
