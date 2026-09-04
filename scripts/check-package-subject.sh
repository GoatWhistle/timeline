#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

offenders="$(
  {
    git ls-files -- 'backend/*.go'
    git ls-files --others --exclude-standard -- 'backend/*.go'
  } | sort -u | while IFS= read -r file; do
    [ -f "$file" ] && printf '%s\n' "$file"
  done | awk '
    {
      dir = $0
      sub(/\/[^\/]*$/, "", dir)
      n = split(dir, part, "/")
      name = part[n]
      parent = (n > 1) ? part[n - 1] : ""
      if (parent == "shared") next
      if (name ~ /^(shared|common|util|utils|helper|helpers|misc|core|base)$/) seen[dir] = 1
    }
    END { for (d in seen) print d }
  ' | sort
)"

if [ -n "$offenders" ]; then
  {
    echo "package named by convenience, not by subject:"
    printf '  %s\n' $offenders
    echo ""
    echo "\"common\" is not a subject. a package earns its name from what it is about:"
    echo "shared/validation, shared/crypto, shared/calendar, shared/mail, shared/audit."
    echo "controllers/shared held cookies, a rate-limit port and dto presenters at once;"
    echo "it became controllers/httpsession and controllers/presenter."
  } >&2
  exit 1
fi

echo "package names: every package is named by its subject"
