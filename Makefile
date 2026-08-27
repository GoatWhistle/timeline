# Hackathon Tracker — команды монорепозитория.
#
# Приложение работает только в контейнерах: Go, Node и PostgreSQL на машине не
# нужны, достаточно Docker.
#
#   make docker-up   боевой режим: nginx с production-сборкой фронтенда
#   make dev         режим разработки: HMR у фронтенда, `go run` у backend
#   make dev MOCKS=1 то же, но экраны работают на моках MSW
#
# Команды проверок (lint, test, types, verify) требуют Node на машине. Go нужен
# не обязательно: если его нет, проверки backend выполняются в контейнере.
# В CI выполняются те же самые команды.

FRONTEND := frontend
BACKEND  := backend

# Проверки backend идут через локальный Go, а при его отсутствии — в контейнере
# с тем же образом, что и сборка (deploy/backend.Dockerfile). Том сохраняет
# кэш модулей между запусками, иначе каждый прогон качает зависимости заново.
GO_IMAGE  := golang:1.25-alpine
GO_CACHE  := timeline-go-mod
HAVE_GO   := $(shell command -v go 2>/dev/null)

ifeq ($(HAVE_GO),)
GO_RUN := MSYS_NO_PATHCONV=1 docker run --rm \
	-v "$(CURDIR)/$(BACKEND):/src" -v "$(GO_CACHE):/go/pkg/mod" \
	-w /src $(GO_IMAGE) sh -c
else
GO_RUN := cd $(BACKEND) && sh -c
endif

# golangci-lint ставится не всегда: при отсутствии бинаря берётся официальный
# образ той же версии. Кэш модулей общий с GO_RUN. В контейнер монтируется
# корень репозитория, а не backend/: храповику --new-from-merge-base нужен .git,
# без него линтер молча сваливается на выдачу всех замечаний разом.
GOLANGCI_IMAGE := golangci/golangci-lint:v2.6-alpine
HAVE_GOLANGCI  := $(shell command -v golangci-lint 2>/dev/null)

ifeq ($(HAVE_GOLANGCI),)
GOLANGCI_RUN := MSYS_NO_PATHCONV=1 docker run --rm -v "$(CURDIR):/repo" -v "$(GO_CACHE):/go/pkg/mod" -w /repo/$(BACKEND) $(GOLANGCI_IMAGE) sh -c 'git config --global --add safe.directory /repo; exec golangci-lint run "$$@"' --
else
GOLANGCI_RUN := cd $(BACKEND) && golangci-lint run
endif

COMPOSE     := docker compose -f deploy/docker-compose.yml
COMPOSE_DEV := $(COMPOSE) -f deploy/docker-compose.dev.yml

# Долгоживущие сервисы: одноразовые migrate и bootstrap подтягиваются как их
# зависимости, но ждать их завершения через --wait нельзя.
SERVICES := api web worker

WEB_PORT      ?= 5173
API_PORT      ?= 8080
POSTGRES_PORT ?= 5432

ADMIN_EMAIL    ?= admin@example.com
ADMIN_PASSWORD ?= password123
ADMIN_NAME     ?= Администратор

# MOCKS=1 переключает фронтенд в режиме разработки на моки MSW.
MOCKS ?= 0

# docker compose читает эти значения из окружения (см. deploy/docker-compose.yml).
export WEB_PORT API_PORT POSTGRES_PORT ADMIN_EMAIL ADMIN_PASSWORD ADMIN_NAME MOCKS

.PHONY: help endpoints \
	docker-up docker-down docker-build docker-restart docker-status docker-logs \
	docker-psql dev dev-down dev-restart dev-logs \
	install types types-check typecheck lint format test verify build \
	back-fmt back-vet back-test back-test-integration back-build back-cover back-docs clean

.DEFAULT_GOAL := help

help: ## Показать список команд
	@echo "Hackathon Tracker"
	@echo ""
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Порты переопределяются так: make docker-up WEB_PORT=5199 API_PORT=8099 POSTGRES_PORT=5433"
	@echo "Разработка на моках MSW:    make dev MOCKS=1"

# --- Боевой режим -----------------------------------------------------------

docker-up: $(BACKEND)/.env ## Поднять стек: база, миграции, API, worker и фронтенд
	@$(COMPOSE) up -d --build --wait $(SERVICES)
	@$(MAKE) --no-print-directory endpoints

docker-down: ## Остановить стек (том с данными сохраняется)
	@$(COMPOSE) down

docker-build: $(BACKEND)/.env ## Пересобрать образы, ничего не запуская
	@$(COMPOSE) build

docker-restart: ## Перезапустить стек
	@$(MAKE) --no-print-directory docker-down
	@$(MAKE) --no-print-directory docker-up

docker-status: ## Показать состояние контейнеров
	@$(COMPOSE) ps

docker-logs: ## Смотреть логи контейнеров (make docker-logs S=api — одного)
	@$(COMPOSE) logs -f $(S)

docker-psql: ## Открыть psql в контейнере базы
	@$(COMPOSE) exec postgres psql -U hackathon -d hackathon

# --- Режим разработки -------------------------------------------------------
#
# Тот же стек, но исходники смонтированы в контейнеры: фронтенд обновляется
# по HMR без пересборки, backend перекомпилируется по `make dev-restart`.

dev: $(BACKEND)/.env ## Поднять стек в режиме разработки: HMR и go run
	@$(COMPOSE_DEV) up -d --build --wait $(SERVICES)
	@$(MAKE) --no-print-directory endpoints
	@if [ "$(MOCKS)" = "1" ]; then echo "фронтенд работает на моках MSW"; fi

dev-down: ## Остановить стек режима разработки
	@$(COMPOSE_DEV) down

dev-restart: ## Перекомпилировать и перезапустить backend
	@$(COMPOSE_DEV) up -d --force-recreate --wait api worker
	@echo "backend перезапущен"

dev-logs: ## Смотреть логи режима разработки (make dev-logs S=api — одного)
	@$(COMPOSE_DEV) logs -f $(S)

endpoints:
	@echo ""
	@echo "приложение → http://localhost:$(WEB_PORT)"
	@echo "API        → http://localhost:$(API_PORT), Swagger UI /docs/"
	@echo "вход: $(ADMIN_EMAIL), пароль $(ADMIN_PASSWORD)"

# Прикладная конфигурация контейнеров. Без файла действуют значения по
# умолчанию из backend/internal/config (приложение C ТЗ).
$(BACKEND)/.env:
	@cp $(BACKEND)/.env.example $(BACKEND)/.env
	@echo "создан $(BACKEND)/.env из .env.example"

# --- Фронтенд ---------------------------------------------------------------

install: ## Установить зависимости frontend для проверок на машине
	@cd $(FRONTEND) && if [ -f package-lock.json ]; then npm ci; else npm install; fi

$(FRONTEND)/node_modules:
	@$(MAKE) --no-print-directory install

types: $(FRONTEND)/node_modules ## Перегенерировать типы из docs/swagger.json
	@cd $(FRONTEND) && npm run api:types

types-check: $(FRONTEND)/node_modules ## Проверить, что типы не отстали от контракта
	@cd $(FRONTEND) && npm run api:check

typecheck: $(FRONTEND)/node_modules ## Проверка типов
	@cd $(FRONTEND) && npm run typecheck

lint: $(FRONTEND)/node_modules ## Линтеры обеих частей: Biome и golangci-lint
	@cd $(FRONTEND) && npm run lint
	@$(MAKE) --no-print-directory back-lint-new

format: $(FRONTEND)/node_modules ## Исправить форматирование и автофиксы линтера
	@cd $(FRONTEND) && npm run lint:fix

test: $(FRONTEND)/node_modules ## Прогнать тесты frontend
	@cd $(FRONTEND) && npm run test

test-cover: $(FRONTEND)/node_modules ## Тесты frontend с покрытием и проверкой порогов
	@cd $(FRONTEND) && npm run test:coverage

build: $(FRONTEND)/node_modules ## Собрать production-сборку frontend на машине
	@cd $(FRONTEND) && npm run build

# --- Backend ----------------------------------------------------------------

back-fmt: ## Форматировать код backend
	@cd $(BACKEND) && $(MAKE) --no-print-directory fmt

back-vet: ## Статический анализ backend
	@$(GO_RUN) "go vet ./..."

back-lint: ## golangci-lint: весь долг, включая существующий (справочно)
	@$(GOLANGCI_RUN) ./...

back-lint-new: ## golangci-lint храповиком: только замечания этого изменения
	@$(GOLANGCI_RUN) --new-from-merge-base=origin/main --whole-files ./...

back-test: ## Модульные тесты backend
	@$(GO_RUN) "go test ./..."

back-build: ## Сборка backend
	@$(GO_RUN) "go build ./..."

back-test-integration: ## Тесты ограничений БД на временном PostgreSQL
	@docker rm -f timeline-test-pg >/dev/null 2>&1 || true
	@docker run -d --rm --name timeline-test-pg \
		-e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=test \
		-p 55433:5432 postgres:16-alpine >/dev/null
	@sleep 8
	@MSYS_NO_PATHCONV=1 docker run --rm --network host \
		-v "$(CURDIR)/$(BACKEND):/src" -v "$(GO_CACHE):/go/pkg/mod" -w /src \
		-e DATABASE_URL="postgres://test:test@127.0.0.1:55433/test?sslmode=disable" \
		$(GO_IMAGE) go test -tags=integration ./... ; \
		status=$$? ; docker stop timeline-test-pg >/dev/null 2>&1 ; exit $$status

back-cover: ## Покрытие backend с выводом итога
	@$(GO_RUN) "go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | tail -1"

back-docs: ## Пересобрать спецификацию OpenAPI и опубликовать в docs/
	@cd $(BACKEND) && $(MAKE) --no-print-directory docs

# --- Базовые уровни ---------------------------------------------------------
#
# Три проверки работают храповиком от зафиксированного уровня, а не от жёсткого
# порога: при 25 файлах сверх лимита и покрытии около 11% жёсткий порог уронил
# бы CI в первый же день и его бы отключили. Базовые уровни лежат в
# docs/baselines/ и обновляются только в сторону улучшения.

file-length: ## Лимит 250 строк на рукописный код (храповик)
	@bash scripts/check-file-length.sh

bundle-size: ## Размер production-сборки против базового уровня
	@node scripts/bundle-size.mjs

baseline-file-length: ## Перезаписать базовый уровень лимита строк
	@bash scripts/check-file-length.sh --update

baseline-bundle-size: build ## Перезаписать базовый уровень размера сборки
	@node scripts/bundle-size.mjs --update

# --- Проверки и очистка -----------------------------------------------------

verify: ## Полная проверка обеих частей: контракт, типы, линтер, тесты, сборка
	@$(MAKE) --no-print-directory file-length
	@cd $(FRONTEND) && npm run verify
	@$(GO_RUN) "go build ./... && go vet ./... && go test ./..."
	@$(MAKE) --no-print-directory back-lint-new
	@echo "проверки пройдены"

clean: ## Остановить контейнеры, удалить тома и артефакты сборки
	@$(COMPOSE_DEV) down -v --remove-orphans 2>/dev/null || true
	@rm -rf $(FRONTEND)/dist $(FRONTEND)/coverage $(BACKEND)/bin $(BACKEND)/coverage.out
	@echo "очищено"
