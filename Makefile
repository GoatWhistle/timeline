BINARY := bin/hackathon
PKG := ./...
SWAG := swag
SPEC_REPO := ../hackathon-os

.PHONY: help build run worker docs docs-publish fmt vet lint test test-integration migrate-up migrate-down compose-up compose-down clean

help: ## Показать список целей
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: ## Собрать бинарь
	go build -o $(BINARY) ./cmd/hackathon

run: ## Запустить API
	go run ./cmd/hackathon serve

worker: ## Запустить планировщик и worker доставки
	go run ./cmd/hackathon worker

docs: docs-publish ## Пересобрать спецификацию OpenAPI из аннотаций

docs-generate:
	$(SWAG) init -g internal/controllers/router.go -o docs --parseInternal --outputTypes go,json,yaml
	$(SWAG) fmt -g internal/controllers/router.go

docs-publish: docs-generate ## Скопировать спецификацию в репозиторий с ТЗ
	@if [ -d "$(SPEC_REPO)/docs" ]; then \
		cp docs/swagger.yaml docs/swagger.json docs/api-conventions.md $(SPEC_REPO)/docs/; \
		echo "спецификация скопирована в $(SPEC_REPO)/docs"; \
	else \
		echo "репозиторий с ТЗ не найден в $(SPEC_REPO), копирование пропущено"; \
	fi

fmt: ## Форматировать код
	gofmt -w $(shell find . -name '*.go' -not -path './docs/*')

vet: ## Статический анализ
	go vet $(PKG)

test: ## Модульные тесты
	go test $(PKG)

test-integration: ## Тесты, требующие PostgreSQL
	go test -tags=integration -count=1 $(PKG)

migrate-up: ## Применить миграции
	go run ./cmd/hackathon migrate up

migrate-down: ## Откатить одну миграцию
	go run ./cmd/hackathon migrate down

compose-up: ## Поднять окружение разработки
	docker compose -f deploy/docker-compose.yml up -d --build

compose-down: ## Остановить окружение разработки
	docker compose -f deploy/docker-compose.yml down

clean: ## Удалить артефакты сборки
	rm -rf bin
