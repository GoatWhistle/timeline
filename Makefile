# Hackathon Tracker — команды разработки.
#
# Пока из компонентов реализован только frontend, поэтому `up` поднимает его
# dev-сервер с моками MSW: backend для работы над экранами не требуется
# (см. «Интеграционные зависимости frontend» в docs/tasks.md).
# Когда появятся backend и worker, `up`/`down` переключатся на Docker Compose
# из задачи INF-01, а состав целей останется прежним.

FRONTEND  := frontend
RUN_DIR   := .run
PID_FILE  := $(RUN_DIR)/frontend.pid
LOG_FILE  := $(RUN_DIR)/frontend.log
PORT      ?= 5173
URL       := http://localhost:$(PORT)

# Не даём make трактовать цели как имена файлов.
.PHONY: help up down restart status logs install types types-check typecheck lint format test verify build preview clean

.DEFAULT_GOAL := help

help: ## Показать список команд
	@echo "Hackathon Tracker"
	@echo ""
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Порт переопределяется так: make up PORT=5199"

$(RUN_DIR):
	@mkdir -p $(RUN_DIR)

install: ## Установить зависимости frontend
	@cd $(FRONTEND) && if [ -f package-lock.json ]; then npm ci; else npm install; fi

$(FRONTEND)/node_modules:
	@$(MAKE) --no-print-directory install

$(FRONTEND)/.env.local:
	@cp $(FRONTEND)/.env.example $(FRONTEND)/.env.local
	@echo "создан $(FRONTEND)/.env.local из .env.example"

# vite запускается напрямую, а не через `npm run dev`: npm добавляет обёртку
# `sh -c`, из-за которой сам сервер становится внуком и переживает остановку
# по записанному PID. Скрипт dev в package.json делает ровно то же самое.
up: $(RUN_DIR) $(FRONTEND)/node_modules $(FRONTEND)/.env.local ## Запустить приложение в фоне
	@if [ -f $(PID_FILE) ] && kill -0 "$$(cat $(PID_FILE))" 2>/dev/null; then \
		echo "уже запущено (PID $$(cat $(PID_FILE))) → $(URL)"; \
	elif curl -sf -o /dev/null --max-time 2 $(URL) 2>/dev/null; then \
		echo "порт $(PORT) занят посторонним процессом — освободите его или задайте другой:"; \
		echo "  make up PORT=5174"; \
		exit 1; \
	else \
		rm -f $(PID_FILE); \
		( cd $(FRONTEND) && exec ./node_modules/.bin/vite --port $(PORT) --strictPort ) \
			> $(LOG_FILE) 2>&1 & \
		echo $$! > $(PID_FILE); \
		started=0; \
		for i in $$(seq 1 60); do \
			kill -0 "$$(cat $(PID_FILE))" 2>/dev/null || break; \
			if curl -sf -o /dev/null $(URL) 2>/dev/null; then started=1; break; fi; \
			sleep 0.5; \
		done; \
		if [ "$$started" = "1" ]; then \
			echo "запущено (PID $$(cat $(PID_FILE))) → $(URL)"; \
			echo "вход: admin@example.com или user@example.com, пароль password123"; \
			echo "логи: make logs"; \
		else \
			echo "не удалось запустить, последние строки $(LOG_FILE):"; \
			tail -20 $(LOG_FILE); \
			rm -f $(PID_FILE); \
			exit 1; \
		fi; \
	fi

down: ## Остановить приложение
	@if [ ! -f $(PID_FILE) ]; then \
		echo "не запущено"; \
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
			echo "остановлено (PID $$PID)"; \
		else \
			echo "процесс уже завершён, убираю PID-файл"; \
		fi; \
		rm -f $(PID_FILE); \
	fi

restart: ## Перезапустить приложение
	@$(MAKE) --no-print-directory down
	@$(MAKE) --no-print-directory up

status: ## Показать состояние
	@if [ -f $(PID_FILE) ] && kill -0 "$$(cat $(PID_FILE))" 2>/dev/null; then \
		echo "работает (PID $$(cat $(PID_FILE))) → $(URL)"; \
	else \
		echo "остановлено"; \
	fi

logs: ## Смотреть логи dev-сервера
	@touch $(LOG_FILE)
	@tail -f $(LOG_FILE)

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

test: ## Прогнать тесты
	@cd $(FRONTEND) && npm run test

verify: ## Полная проверка: контракт, типы, линтер, тесты
	@cd $(FRONTEND) && npm run verify

build: ## Собрать production-сборку
	@cd $(FRONTEND) && npm run build

preview: ## Посмотреть production-сборку
	@cd $(FRONTEND) && npm run preview

clean: ## Удалить сборку, кэши и служебные файлы запуска
	@$(MAKE) --no-print-directory down
	@rm -rf $(RUN_DIR) $(FRONTEND)/dist $(FRONTEND)/coverage
	@echo "очищено"
