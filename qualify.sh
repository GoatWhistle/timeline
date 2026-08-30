set -e
cd /w/Projects/hacks/GoatWhistle/backend/internal/models
# domain symbols defined in package models (after the move)
grep -h "^type \|^func \|^const \|^var " *.go \
  | grep -o "^\(type\|func\|const\|var\) [A-Za-z_][A-Za-z0-9_]*" \
  | awk '{print $2}' | sort -u > /tmp/dom.txt
# also const block members (indented consts inside const ( ... ))
awk '/^const \(/,/^\)/' *.go | grep -o "^\t[A-Z][A-Za-z0-9_]*" | tr -d '\t' | sort -u >> /tmp/dom.txt
awk '/^var \(/,/^\)/' *.go | grep -o "^\t[A-Z][A-Za-z0-9_]*" | tr -d '\t' | sort -u >> /tmp/dom.txt
sort -u /tmp/dom.txt -o /tmp/dom.txt
wc -l /tmp/dom.txt
