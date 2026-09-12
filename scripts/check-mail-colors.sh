#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PALETTE="$ROOT/frontend/src/styles/tokens/palette.css"
THEME_GO="$ROOT/backend/internal/services/shared/mail/theme.go"

cd "$ROOT"

oklch_of() {
  grep -E -- "--$1: oklch\(" "$PALETTE" | head -1 \
    | sed -E 's/^[^(]*oklch\(([^)]*)\).*/\1/' | tr -d ';'
}

convert() {
  awk -v L="$1" -v C="$2" -v H="$3" '
    function to_srgb(c,   v) {
      if (c < 0) c = 0
      if (c > 1) c = 1
      if (c <= 0.0031308) v = 12.92*c
      else v = 1.055*(c^(1/2.4)) - 0.055
      v = v*255
      if (v < 0) v = 0
      if (v > 255) v = 255
      return int(v + 0.5)
    }
    BEGIN {
      h = H * 3.14159265358979 / 180
      a = C * cos(h)
      b = C * sin(h)
      l_ = L + 0.3963377774*a + 0.2158037573*b
      m_ = L - 0.1055613458*a - 0.0638541728*b
      s_ = L - 0.0894841775*a - 1.2914855480*b
      l = l_*l_*l_
      m = m_*m_*m_
      s = s_*s_*s_
      r = 4.0767416621*l - 3.3077115913*m + 0.2309699292*s
      g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
      bl = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
      printf "#%02x%02x%02x", to_srgb(r), to_srgb(g), to_srgb(bl)
    }'
}

hex_of_token() {
  values=$(oklch_of "$1")
  convert $values
}

go_const() {
  grep -E "^\s*$1\s*=" "$THEME_GO" | head -1 | sed -E 's/^[^"]*"([^"]*)".*/\1/'
}

failed=0

check() {
  token="$1"
  const="$2"
  want=$(hex_of_token "$token")
  got=$(go_const "$const")
  if [ "$want" != "$got" ]; then
    echo "mismatch: $const = $got, but --$token converts to $want" >&2
    failed=1
  fi
}

check "brand-amber-600" "colorLogoLight"
check "brand-amber-300" "colorLogoDark"
check "brand-amber-600" "colorAccentLight"
check "brand-amber-300" "colorAccentDark"
check "sunlit-linen"    "colorShellLight"
check "linear-void"     "colorShellDark"
check "sunlit-paper"    "colorCardLight"
check "linear-carbon"   "colorCardDark"
check "sunlit-tan"      "colorBorderLight"
check "linear-smoke"    "colorBorderDark"
check "sunlit-ink"      "colorHeadingLight"
check "sunlit-umber"    "colorMutedLight"
check "linear-fog"      "colorMutedDark"
check "linear-mist"     "colorTextDark"

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "the mail template hardcodes hex values pulled from the app palette;" >&2
  echo "when a token in frontend/src/styles/tokens/palette.css changes," >&2
  echo "backend/internal/services/shared/mail/theme.go must be updated to match" >&2
  exit 1
fi

echo "mail colors: match the app palette tokens"
