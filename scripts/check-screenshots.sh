#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

present() {
  {
    git ls-files
    git ls-files --others
  } | sort -u
}

stray() {
  present \
    | grep -iE '[.](png|jpg|jpeg|webp|gif|bmp|tiff?|avif)$' \
    | grep -vE '(^|/)(node_modules|coverage|dist|playwright-report|test-results)/' \
    | grep -vE '^screenshots/' \
    | grep -vE '^frontend/public/' \
    | grep -vE '^frontend/src/assets/' \
    | grep -vE '^docs/'
}

found=$(stray || true)

if [ -n "$found" ]; then
  echo "images outside the places that may hold them:" >&2
  echo "$found" | sed 's/^/  /' >&2
  echo "" >&2
  echo "screenshots belong in screenshots/ which is ignored wholesale;" >&2
  echo "product assets go to frontend/public or frontend/src/assets," >&2
  echo "illustrations for the docs go next to them in docs/" >&2
  exit 1
fi

echo "screenshots: none outside screenshots/"
