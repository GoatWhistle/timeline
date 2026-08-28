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

if [ ! -f "$BASELINE" ]; then
  echo "no baseline: $BASELINE" >&2
  exit 1
fi

expected="$(grep -oE '"total"[[:space:]]*:[[:space:]]*[0-9]+' "$BASELINE" | grep -oE '[0-9]+')"

cd "$ROOT/backend"
actual="$(golangci-lint run --output.text.path=stdout ./... 2>/dev/null | grep -cE '^[^[:space:]].*:[0-9]+:[0-9]+:' || true)"

if [ "$actual" -gt "$expected" ]; then
  echo "golangci-lint issues: $actual, baseline $expected" >&2
  echo "debt grew by $((actual - expected)); fix the new issues" >&2
  exit 1
fi

if [ "$actual" -lt "$expected" ]; then
  echo "fewer issues than before: $actual against $expected"
  echo "update \"total\" in docs/baselines/lint.json"
  exit 0
fi

echo "golangci-lint: $actual issues, baseline not exceeded"
