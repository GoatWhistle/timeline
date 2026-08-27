#!/usr/bin/env bash
# Второй слой храповика golangci-lint (часть V.1 плана рефакторинга).
#
# Основной храповик — `--new-from-merge-base=origin/main` — проверяет только то,
# что внесено самим изменением. У него есть дыра: при push в main база сравнения
# пуста, и не проверяется ничего. Этот скрипт закрывает её счётчиком: общее
# число замечаний не должно превышать базовый уровень.
#
# Падает, если замечаний стало больше. Если стало меньше — печатает новый
# уровень: базовый уровень опускается вручную, чтобы уменьшение было осознанным
# и попадало в обзор изменений.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/docs/baselines/lint.json"

if [ ! -f "$BASELINE" ]; then
  echo "нет базового уровня: $BASELINE" >&2
  exit 1
fi

expected="$(grep -oE '"total"[[:space:]]*:[[:space:]]*[0-9]+' "$BASELINE" | grep -oE '[0-9]+')"

cd "$ROOT/backend"
actual="$(golangci-lint run --output.text.path=stdout ./... 2>/dev/null | grep -cE '^[^[:space:]].*:[0-9]+:[0-9]+:' || true)"

if [ "$actual" -gt "$expected" ]; then
  echo "замечаний golangci-lint: $actual, базовый уровень $expected" >&2
  echo "долг вырос на $((actual - expected)); исправьте новые замечания" >&2
  exit 1
fi

if [ "$actual" -lt "$expected" ]; then
  echo "замечаний стало меньше: $actual против $expected"
  echo "обновите \"total\" в docs/baselines/lint.json"
  exit 0
fi

echo "golangci-lint: $actual замечаний, базовый уровень не превышен"
