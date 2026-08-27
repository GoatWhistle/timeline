#!/usr/bin/env bash
# Проверка лимита 250 строк на рукописный код (часть VII.3 плана рефакторинга).
#
# Механика — храповик, а не жёсткий порог: на момент ввода проверки лимит
# превышают 25 файлов, и жёсткое падение выключило бы проверку в первый же день.
# Поэтому базовый уровень зафиксирован в docs/baselines/file-length.txt.
# Проверка падает, если:
#   а) лимит превысил файл, которого нет в базовом уровне;
#   б) файл из базового уровня вырос.
# Файл из базового уровня может только уменьшаться; при уменьшении базовый
# уровень обновляется командой `make baseline-file-length`.
#
# Не распространяется на генерируемое (*.gen.*, schema.d.ts, swagger.*) и на
# SQL-миграции: миграцию нельзя разрезать пополам.

set -euo pipefail

LIMIT=250
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/file-length.txt"

cd "$ROOT"

current() {
  git ls-files -- '*.go' '*.ts' '*.tsx' '*.css' \
    | grep -v '\.gen\.' \
    | grep -v 'schema\.d\.ts' \
    | grep -v 'swagger\.' \
    | grep -v '^backend/docs/' \
    | while read -r file; do
        lines=$(wc -l < "$file" | tr -d ' ')
        if [ "$lines" -gt "$LIMIT" ]; then
          printf '%s %s\n' "$lines" "$file"
        fi
      done \
    | sort -k2
}

if [ "${1:-}" = "--update" ]; then
  {
    echo "# Базовый уровень проверки лимита $LIMIT строк (scripts/check-file-length.sh)."
    echo "# Формат: <строк> <путь>. Обновляется только вниз."
    current
  } > "$BASELINE"
  echo "базовый уровень обновлён: $BASELINE"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  echo "нет базового уровня $BASELINE, выполните: make baseline-file-length" >&2
  exit 1
fi

failed=0

while read -r lines file; do
  base=$(awk -v f="$file" '$2 == f { print $1 }' "$BASELINE")
  if [ -z "$base" ]; then
    echo "новый файл сверх лимита $LIMIT строк: $file ($lines)" >&2
    failed=1
  elif [ "$lines" -gt "$base" ]; then
    echo "файл вырос: $file ($base → $lines, лимит $LIMIT)" >&2
    failed=1
  fi
done < <(current)

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "лимит 250 строк: разделите файл или уменьшите его до базового уровня" >&2
  exit 1
fi

echo "лимит $LIMIT строк: превышений сверх базового уровня нет"
