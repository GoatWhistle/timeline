BINARY := bin/hackathon
PKG := ./...
SWAG := swag
# Спецификация публикуется в docs/ монорепозитория: фронтенд генерирует
# из неё типы.
SPEC_REPO := ..

# Запуск приложения живёт в корневом Makefile: и API, и worker, и база
# поднимаются только в контейнерах (`make docker-up`, `make dev`). Здесь
# остаются сборка, проверки и генерация спецификации.
.PHONY: help build docs docs-publish fmt vet lint test test-integration clean

help: ## Показать список целей
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: ## Собрать бинарь
	go build -o $(BINARY) ./cmd/hackathon

docs: docs-publish ## Пересобрать спецификацию OpenAPI из аннотаций

docs-generate:
	$(SWAG) init -g internal/controllers/router.go -o docs --parseInternal --outputTypes go,json,yaml
	$(SWAG) fmt -g internal/controllers/router.go

docs-publish: docs-generate ## Скопировать спецификацию в репозиторий с ТЗ
	@if [ -d "$(SPEC_REPO)/docs" ]; then \
		cp docs/swagger.yaml docs/swagger.json docs/api-conventions.md $(SPEC_REPO)/docs/; \
		echo "спецификация скопирована в docs/"; \
	else \
		echo "каталог docs не найден в $(SPEC_REPO), копирование пропущено"; \
	fi

fmt: ## Форматировать код
	gofmt -w $(shell find . -name '*.go' -not -path './docs/*')

vet: ## Статический анализ
	go vet $(PKG)

test: ## Модульные тесты
	go test $(PKG)

test-integration: ## Тесты, требующие PostgreSQL
	go test -tags=integration -count=1 $(PKG)

clean: ## Удалить артефакты сборки
	rm -rf bin
