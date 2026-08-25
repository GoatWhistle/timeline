# Hackathon Tracker — команды разработки монорепозитория.
#
# `make up` поднимает всю инфраструктуру: PostgreSQL в Docker, миграции,
# HTTP API, worker доставки и dev-сервер фронтенда, настроенный на реальный
# backend. Каждый процесс пишет PID и логи в .run/, поэтому `make down`
# останавливает ровно то, что запускал `make up`.
#
# Чтобы работать над экранами без backend, поднимите только фронтенд на моках
# MSW: `make front MOCKS=1`.

FRONTEND := frontend
BACKEND  := backend
RUN_DIR  := .run
COMPOSE  := docker compose -f $(BACKEND)/deploy/docker-compose.yml

FRONT_PID  := $(RUN_DIR)/frontend.pid
API_PID    := $(RUN_DIR)/api.pid
WORKER_PID := $(RUN_DIR)/worker.pid
FRONT_LOG  := $(RUN_DIR)/frontend.log
API_LOG    := $(RUN_DIR)/api.log
WORKER_LOG := $(RUN_DIR)/worker.log

PORT     ?= 5173
API_PORT ?= 8080
URL      := http://localhost:$(PORT)
API_URL  := http://localhost:$(API_PORT)
BINARY   := $(BACKEND)/bin/hackathon

# Значения по умолчанию совпадают с deploy/docker-compose.yml и .env.example.
DATABASE_URL   ?= postgres://hackathon:hackathon@localhost:5432/hackathon?sslmode=disable
ADMIN_EMAIL    ?= admin@example.com
ADMIN_PASSWORD ?= password123
ADMIN_NAME     ?= Администратор

# MOCKS=1 переключает фронтенд на моки MSW вместо реального backend.
MOCKS ?= 0

GO_SOURCES := $(shell find $(BACKEND) -name '*.go' -not -path '*/docs/*' 2>/dev/null)

# Не даём make трактовать цели как имена файлов.
.PHONY: help up down restart status logs logs-api logs-worker logs-front \
	db db-down migrate admin api worker front stop-api stop-worker stop-front \
	install types types-check typecheck lint format test verify build preview \
	back-build back-fmt back-vet back-test back-docs docker-up docker-down clean

.DEFAULT_GOAL := help

help: ## Показать список команд
	@echo "Hackathon Tracker"
	@echo ""
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Порты переопределяются так: make up PORT=5199 API_PORT=8099"
	@echo "Только фронтенд на моках:   make front MOCKS=1"

$(RUN_DIR):
	@mkdir -p $(RUN_DIR)

# --- Инфраструктура целиком -------------------------------------------------

up: ## Поднять всю инфраструктуру: база, миграции, API, worker, фронтенд
	@$(MAKE) --no-print-directory db
	@$(MAKE) --no-print-directory migrate
	@$(MAKE) --no-print-directory admin
	@$(MAKE) --no-print-directory api
	@$(MAKE) --no-print-directory worker
	@$(MAKE) --no-print-directory front
	@echo ""
	@$(MAKE) --no-print-directory status

down: ## Остановить всё, что запускал make up
	@$(MAKE) --no-print-directory stop-front
	@$(MAKE) --no-print-directory stop-worker
	@$(MAKE) --no-print-directory stop-api
	@$(MAKE) --no-print-directory db-down

restart: ## Перезапустить всю инфраструктуру
	@$(MAKE) --no-print-directory down
	@$(MAKE) --no-print-directory up

status: ## Показать состояние компонентов
	@printf "postgres: "; \
	if [ "$$($(COMPOSE) ps -q postgres 2>/dev/null)" != "" ]; then \
		echo "работает → localhost:5432"; \
	else echo "остановлен"; fi
	@$(MAKE) --no-print-directory process-status NAME=API PID_FILE=$(API_PID) ADDR=$(API_URL)
	@$(MAKE) --no-print-directory process-status NAME=worker PID_FILE=$(WORKER_PID) ADDR=-
	@$(MAKE) --no-print-directory process-status NAME=фронтенд PID_FILE=$(FRONT_PID) ADDR=$(URL)
	@if [ -f $(FRONT_PID) ] && kill -0 "$$(cat $(FRONT_PID))" 2>/dev/null; then \
		echo ""; \
		echo "вход: $(ADMIN_EMAIL), пароль $(ADMIN_PASSWORD)"; \
		echo "Swagger UI: $(API_URL)/docs/"; \
	fi

.PHONY: process-status
process-status:
	@printf "%s: " "$(NAME)"; \
	if [ -f "$(PID_FILE)" ] && kill -0 "$$(cat $(PID_FILE))" 2>/dev/null; then \
		if [ "$(ADDR)" = "-" ]; then echo "работает (PID $$(cat $(PID_FILE)))"; \
		else echo "работает (PID $$(cat $(PID_FILE))) → $(ADDR)"; fi; \
	else echo "остановлен"; fi

# --- База данных ------------------------------------------------------------

db: ## Поднять PostgreSQL и дождаться готовности
	@$(COMPOSE) up -d postgres >/dev/null
	@for i in $$(seq 1 60); do \
		if $(COMPOSE) exec -T postgres pg_isready -U hackathon -d hackathon >/dev/null 2>&1; then \
			echo "postgres готов → localhost:5432"; exit 0; \
		fi; \
		sleep 0.5; \
	done; \
	echo "postgres не поднялся, смотрите: $(COMPOSE) logs postgres"; exit 1

db-down: ## Остановить PostgreSQL (данные в томе сохраняются)
	@$(COMPOSE) down >/dev/null 2>&1 || true
	@echo "postgres остановлен"

migrate: $(BINARY) ## Применить миграции
	@DATABASE_URL="$(DATABASE_URL)" ./$(BINARY) migrate up
	@DATABASE_URL="$(DATABASE_URL)" ./$(BINARY) migrate version

admin: $(BINARY) ## Создать администратора, если его ещё нет
	@DATABASE_URL="$(DATABASE_URL)" \
		FIRST_ADMIN_EMAIL="$(ADMIN_EMAIL)" \
		FIRST_ADMIN_PASSWORD="$(ADMIN_PASSWORD)" \
		FIRST_ADMIN_NAME="$(ADMIN_NAME)" \
		./$(BINARY) admin create

# --- Процессы приложения ----------------------------------------------------

$(BINARY): $(GO_SOURCES) $(BACKEND)/go.mod $(BACKEND)/go.sum
	@cd $(BACKEND) && go build -o bin/hackathon ./cmd/hackathon
	@echo "бинарь собран: $(BINARY)"

back-build: $(BINARY) ## Собрать бинарь backend

api: $(RUN_DIR) $(BINARY) ## Запустить HTTP API в фоне
	@if [ -f $(API_PID) ] && kill -0 "$$(cat $(API_PID))" 2>/dev/null; then \
		echo "API уже запущен (PID $$(cat $(API_PID))) → $(API_URL)"; \
	else \
		rm -f $(API_PID); \
		DATABASE_URL="$(DATABASE_URL)" HTTP_ADDR=":$(API_PORT)" \
			CORS_ALLOWED_ORIGINS="$(URL)" PUBLIC_URL="$(URL)" \
			./$(BINARY) serve > $(API_LOG) 2>&1 & \
		echo $$! > $(API_PID); \
		for i in $$(seq 1 60); do \
			kill -0 "$$(cat $(API_PID))" 2>/dev/null || break; \
			if curl -sf -o /dev/null $(API_URL)/healthz 2>/dev/null; then \
				echo "API запущен (PID $$(cat $(API_PID))) → $(API_URL)"; exit 0; \
			fi; \
			sleep 0.5; \
		done; \
		echo "API не запустился, последние строки $(API_LOG):"; \
		tail -20 $(API_LOG); rm -f $(API_PID); exit 1; \
	fi

worker: $(RUN_DIR) $(BINARY) ## Запустить планировщик и worker доставки в фоне
	@if [ -f $(WORKER_PID) ] && kill -0 "$$(cat $(WORKER_PID))" 2>/dev/null; then \
		echo "worker уже запущен (PID $$(cat $(WORKER_PID)))"; \
	else \
		rm -f $(WORKER_PID); \
		DATABASE_URL="$(DATABASE_URL)" PUBLIC_URL="$(URL)" \
			./$(BINARY) worker > $(WORKER_LOG) 2>&1 & \
		echo $$! > $(WORKER_PID); \
		sleep 1; \
		if kill -0 "$$(cat $(WORKER_PID))" 2>/dev/null; then \
			echo "worker запущен (PID $$(cat $(WORKER_PID)))"; \
		else \
			echo "worker не запустился, последние строки $(WORKER_LOG):"; \
			tail -20 $(WORKER_LOG); rm -f $(WORKER_PID); exit 1; \
		fi; \
	fi

# vite запускается напрямую, а не через `npm run dev`: npm добавляет обёртку
# `sh -c`, из-за которой сам сервер становится внуком и переживает остановку
# по записанному PID. Переменные передаются окружением и перекрывают .env.local.
front: $(RUN_DIR) $(FRONTEND)/node_modules $(FRONTEND)/.env.local ## Запустить фронтенд в фоне
	@if [ -f $(FRONT_PID) ] && kill -0 "$$(cat $(FRONT_PID))" 2>/dev/null; then \
		echo "фронтенд уже запущен (PID $$(cat $(FRONT_PID))) → $(URL)"; \
	elif curl -sf -o /dev/null --max-time 2 $(URL) 2>/dev/null; then \
		echo "порт $(PORT) занят посторонним процессом — освободите его или задайте другой:"; \
		echo "  make front PORT=5174"; \
		exit 1; \
	else \
		rm -f $(FRONT_PID); \
		if [ "$(MOCKS)" = "1" ]; then msw=1; proxy=""; else msw=0; proxy="$(API_URL)"; fi; \
		( cd $(FRONTEND) \
			&& export VITE_ENABLE_MSW="$$msw" VITE_API_PROXY="$$proxy" \
			&& exec ./node_modules/.bin/vite --port $(PORT) --strictPort ) > $(FRONT_LOG) 2>&1 & \
		echo $$! > $(FRONT_PID); \
		for i in $$(seq 1 60); do \
			kill -0 "$$(cat $(FRONT_PID))" 2>/dev/null || break; \
			if curl -sf -o /dev/null $(URL) 2>/dev/null; then \
				if [ "$(MOCKS)" = "1" ]; then \
					echo "фронтенд запущен на моках MSW (PID $$(cat $(FRONT_PID))) → $(URL)"; \
				else \
					echo "фронтенд запущен (PID $$(cat $(FRONT_PID))) → $(URL), API $(API_URL)"; \
				fi; \
				exit 0; \
			fi; \
			sleep 0.5; \
		done; \
		echo "фронтенд не запустился, последние строки $(FRONT_LOG):"; \
		tail -20 $(FRONT_LOG); rm -f $(FRONT_PID); exit 1; \
	fi

stop-api: ## Остановить API
	@$(MAKE) --no-print-directory stop-process NAME=API PID_FILE=$(API_PID)

stop-worker: ## Остановить worker
	@$(MAKE) --no-print-directory stop-process NAME=worker PID_FILE=$(WORKER_PID)

stop-front: ## Остановить фронтенд
	@$(MAKE) --no-print-directory stop-process NAME=фронтенд PID_FILE=$(FRONT_PID)

.PHONY: stop-process
stop-process:
	@if [ ! -f "$(PID_FILE)" ]; then \
		echo "$(NAME): не запущен"; \
	else \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 "$$PID" 2>/dev/null; then \
			pkill -TERM -P "$$PID" 2>/dev/null || true; \
			kill -TERM "$$PID" 2>/dev/null || true; \
			for i in $$(seq 1 20); do \
				kill -0 "$$PID" 2>/dev/null || break; \
				sleep 0.25; \
			done; \
			if kill -0 "$$PID" 2>/dev/null; then \
				pkill -KILL -P "$$PID" 2>/dev/null || true; \
				kill -KILL "$$PID" 2>/dev/null || true; \
			fi; \
			echo "$(NAME): остановлен (PID $$PID)"; \
		else \
			echo "$(NAME): процесс уже завершён, убираю PID-файл"; \
		fi; \
		rm -f $(PID_FILE); \
	fi

logs: logs-front ## Логи фронтенда (см. также logs-api, logs-worker)

logs-api: ## Смотреть логи API
	@touch $(API_LOG) && tail -f $(API_LOG)

logs-worker: ## Смотреть логи worker
	@touch $(WORKER_LOG) && tail -f $(WORKER_LOG)

logs-front: ## Смотреть логи dev-сервера
	@touch $(FRONT_LOG) && tail -f $(FRONT_LOG)

# --- Вся инфраструктура в Docker -------------------------------------------

docker-up: ## Поднять базу, API и worker в Docker (фронтенд запускается отдельно)
	@$(COMPOSE) up -d --build

docker-down: ## Остановить окружение Docker
	@$(COMPOSE) down

# --- Фронтенд ---------------------------------------------------------------

install: ## Установить зависимости frontend
	@cd $(FRONTEND) && if [ -f package-lock.json ]; then npm ci; else npm install; fi

$(FRONTEND)/node_modules:
	@$(MAKE) --no-print-directory install

$(FRONTEND)/.env.local:
	@cp $(FRONTEND)/.env.example $(FRONTEND)/.env.local
	@echo "создан $(FRONTEND)/.env.local из .env.example"

types: ## Перегенерировать типы из docs/swagger.json
	@cd $(FRONTEND) && npm run api:types

types-check: ## Проверить, что типы не отстали от контракта
	@cd $(FRONTEND) && npm run api:check

typecheck: ## Проверка типов
	@cd $(FRONTEND) && npm run typecheck

lint: ## Линтер и форматирование (только проверка)
	@cd $(FRONTEND) && npm run lint

format: ## Исправить форматирование и автофиксы линтера
	@cd $(FRONTEND) && npm run lint:fix

test: ## Прогнать тесты frontend
	@cd $(FRONTEND) && npm run test

build: ## Собрать production-сборку frontend
	@cd $(FRONTEND) && npm run build

preview: ## Посмотреть production-сборку
	@cd $(FRONTEND) && npm run preview

# --- Backend ----------------------------------------------------------------

back-fmt: ## Форматировать код backend
	@cd $(BACKEND) && $(MAKE) --no-print-directory fmt

back-vet: ## Статический анализ backend
	@cd $(BACKEND) && go vet ./...

back-test: ## Модульные тесты backend
	@cd $(BACKEND) && go test ./...

back-docs: ## Пересобрать спецификацию OpenAPI и опубликовать в docs/
	@cd $(BACKEND) && $(MAKE) --no-print-directory docs

# --- Проверки и очистка -----------------------------------------------------

verify: ## Полная проверка обеих частей: контракт, типы, линтер, тесты, сборка
	@cd $(FRONTEND) && npm run verify
	@cd $(BACKEND) && go build ./... && go vet ./... && go test ./...
	@echo "проверки пройдены"

clean: ## Остановить всё и удалить сборки, кэши и служебные файлы
	@$(MAKE) --no-print-directory down
	@rm -rf $(RUN_DIR) $(FRONTEND)/dist $(FRONTEND)/coverage $(BACKEND)/bin
	@echo "очищено"
