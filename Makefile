BINARY := bin/hackathon
PKG := ./...
SWAG := swag

.PHONY: help build run worker docs fmt vet lint test test-integration migrate-up migrate-down compose-up compose-down clean

help: ## Показать список целей
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: ## Собрать бинарь
	go build -o $(BINARY) ./cmd/hackathon

run: ## Запустить API
	go run ./cmd/hackathon serve

worker: ## Запустить планировщик и worker доставки
	go run ./cmd/hackathon worker

docs: ## Пересобрать спецификацию OpenAPI из аннотаций
	$(SWAG) init -g internal/controllers/router.go -o docs --parseInternal --outputTypes go,json,yaml
	$(SWAG) fmt -g internal/controllers/router.go

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
