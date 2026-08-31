#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODULE="github.com/GoatWhistle/timeline"
IMAGE="${GO_IMAGE:-golang:1.25-alpine}"

cd "$ROOT"

graph() {
  if command -v go >/dev/null 2>&1; then
    (cd "$ROOT/backend" && go list -tags=integration \
      -f '{{.ImportPath}} {{join .Imports " "}} {{join .TestImports " "}}' \
      ./internal/...)
    return
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "neither go nor docker is available: cannot check import cycles" >&2
    exit 1
  fi
  MSYS_NO_PATHCONV=1 docker run --rm \
    -v "$ROOT/backend:/src" -v "gomodcache:/go/pkg/mod" -w /src "$IMAGE" \
    go list -tags=integration \
    -f '{{.ImportPath}} {{join .Imports " "}} {{join .TestImports " "}}' \
    ./internal/...
}

GRAPH="$(graph)"

if [ -z "$GRAPH" ]; then
  echo "go list produced nothing: the tree does not build, fix that first" >&2
  exit 1
fi

printf '%s
' "$GRAPH" | awk -v module="$MODULE" '
  {
    pkg = $1
    for (i = 2; i <= NF; i++) {
      dep = $i
      if (index(dep, module "/internal/") != 1) continue
      if (dep == pkg) continue
      edge[pkg, dep] = 1
      nodes[pkg] = 1
      nodes[dep] = 1
      if (!(pkg in adj)) adj[pkg] = ""
      if (index(" " adj[pkg] " ", " " dep " ") == 0) adj[pkg] = adj[pkg] " " dep
    }
  }
  END {
    status = 0
    for (a in nodes) {
      n = split(adj[a], out, " ")
      for (i = 1; i <= n; i++) {
        b = out[i]
        if (b == "") continue
        if ((b SUBSEP a) in edge) {
          if (a < b) {
            a2 = a; b2 = b
            sub(module "/", "", a2); sub(module "/", "", b2)
            printf "import cycle: %s <-> %s\n", a2, b2 > "/dev/stderr"
            status = 1
          }
        }
      }
    }
    exit status
  }
' || {
  echo "" >&2
  echo "a cycle means the two packages are one package wearing two names." >&2
  echo "declare the interface at the consumer instead of importing the producer." >&2
  exit 1
}

echo "import cycles: none between internal packages"
