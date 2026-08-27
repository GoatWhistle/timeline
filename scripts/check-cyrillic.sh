#!/usr/bin/env bash
# Проверка правила «язык кода — английский» (часть III2 плана рефакторинга).
#
# Всё, кроме JSON-словарей локализации и docs/, пишется по-английски: код,
# логи, имена, сообщения об ошибках, тексты миграций. Русский живёт ровно в
# одном месте — файлах локализации.
#
# Механика — храповик, а не жёсткий порог: backend и миграции уже чисты, но во
# frontend остаются вшитые продуктовые строки, которые выносятся в словари на
# этапе 3 (задача 48). Жёсткое падение выключило бы проверку в первый же день,
# поэтому базовый уровень зафиксирован в docs/baselines/cyrillic.txt.
# Проверка падает, если:
#   а) кириллица появилась в файле, которого нет в базовом уровне;
#   б) в файле из базового уровня кириллицы стало больше.
# Файл из базового уровня может только очищаться; при уменьшении базовый
# уровень обновляется командой `make baseline-cyrillic`.
#
# Не распространяется на генерируемое (*.gen.*, schema.d.ts, swagger.*) и на
# backend/docs/: это выгрузка OpenAPI, а не рукописный код.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/cyrillic.txt"

cd "$ROOT"

current() {
  git ls-files -- '*.go' '*.ts' '*.tsx' '*.sql' \
    | grep -v '\.gen\.' \
    | grep -v 'schema\.d\.ts' \
    | grep -v 'swagger\.' \
    | grep -v '^backend/docs/' \
    | while read -r file; do
        [ -f "$file" ] || continue
        hits=$(grep -c '[а-яА-ЯёЁ]' "$file" 2>/dev/null || true)
        if [ -n "$hits" ] && [ "$hits" -gt 0 ]; then
          printf '%s %s\n' "$hits" "$file"
        fi
      done \
    | sort -k2
}

if [ "${1:-}" = "--update" ]; then
  {
    echo "# Базовый уровень проверки кириллицы (scripts/check-cyrillic.sh)."
    echo "# Формат: <строк с кириллицей> <путь>. Обновляется только вниз."
    current
  } > "$BASELINE"
  echo "базовый уровень обновлён: $BASELINE"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  echo "нет базового уровня $BASELINE, выполните: make baseline-cyrillic" >&2
  exit 1
fi

failed=0

while read -r hits file; do
  base=$(awk -v f="$file" '$2 == f { print $1 }' "$BASELINE")
  if [ -z "$base" ]; then
    echo "кириллица в новом файле: $file ($hits строк)" >&2
    failed=1
  elif [ "$hits" -gt "$base" ]; then
    echo "кириллицы стало больше: $file ($base → $hits)" >&2
    failed=1
  fi
done < <(current)

if [ "$failed" -ne 0 ]; then
  echo "" >&2
  echo "язык кода — английский: продуктовые строки выносятся в словари" >&2
  echo "(frontend/src/shared/i18n, backend/internal/locale), а не пишутся в коде" >&2
  exit 1
fi

echo "кириллица: превышений сверх базового уровня нет"
