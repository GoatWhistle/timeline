set -u
for i in $(seq 1 25); do
  out=$(MSYS_NO_PATHCONV=1 docker run --rm -v "w:/Projects/hacks/GoatWhistle/backend:/src" -v "gomodcache:/go/pkg/mod" -w /src golang:1.25-alpine go build ./internal/models/... 2>&1)
  echo "$out" | grep -q "undefined:" || { echo "NO_MORE_UNDEFINED"; echo "$out" | head -20; break; }
  # parse: internal/models/dto/file.go:LINE:COL: undefined: Sym
  echo "$out" | grep -o "internal/models/dto/[a-z_]*\.go:[0-9]*:[0-9]*: undefined: [A-Za-z0-9_]*" | while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    ln=$(echo "$line" | cut -d: -f2)
    col=$(echo "$line" | cut -d: -f3)
    sym=$(echo "$line" | sed 's/.*undefined: //')
    f="/w/Projects/hacks/GoatWhistle/backend/$file"
    # insert "models." at the given column on the given line
    awk -v L="$ln" -v C="$col" -v NR_="" 'NR==L{ printf "%s%s%s\n", substr($0,1,C-1), "models.", substr($0,C); next } {print}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  done
  echo "--- iteration $i applied"
done
