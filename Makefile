
FRONTEND := frontend
BACKEND  := backend

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

SWAG_IMAGE := golang:1.25-alpine
HAVE_SWAG  := $(shell command -v swag 2>/dev/null)

ifeq ($(HAVE_SWAG),)
SWAG_RUN := MSYS_NO_PATHCONV=1 docker run --rm -v "$(CURDIR)/$(BACKEND):/src" -v "$(GO_CACHE):/go/pkg/mod" -w /src -e PATH=/go/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin $(SWAG_IMAGE) sh -c
SWAG_INSTALL := go install github.com/swaggo/swag/cmd/swag@latest &&
else
SWAG_RUN := cd $(BACKEND) && sh -c
SWAG_INSTALL :=
endif

GOLANGCI_IMAGE := golangci/golangci-lint:v2.6-alpine
HAVE_GOLANGCI  := $(shell command -v golangci-lint 2>/dev/null)

ifeq ($(HAVE_GOLANGCI),)
GOLANGCI_RUN := MSYS_NO_PATHCONV=1 docker run --rm -v "$(CURDIR):/repo" -v "$(GO_CACHE):/go/pkg/mod" -w /repo/$(BACKEND) $(GOLANGCI_IMAGE) sh -c 'git config --global --add safe.directory /repo; exec golangci-lint run "$$@"' --
else
GOLANGCI_RUN := cd $(BACKEND) && golangci-lint run
endif

COMPOSE     := docker compose -f deploy/docker-compose.yml
COMPOSE_DEV := $(COMPOSE) -f deploy/docker-compose.dev.yml
COMPOSE_CONTRACT := docker compose -f deploy/docker-compose.contract.yml

SERVICES := backend frontend worker

WEB_PORT      ?= 5173
API_PORT      ?= 8080
POSTGRES_PORT ?= 5432

CONTRACT_API_PORT ?= 55480

export WEB_PORT API_PORT POSTGRES_PORT CONTRACT_API_PORT

.PHONY: help endpoints \
	docker-up docker-down docker-build docker-restart docker-status docker-logs \
	docker-psql dev dev-down dev-restart dev-logs seed \
	install types types-check typecheck lint format test test-contract e2e verify build \
	cyrillic baseline-cyrillic import-cycles lint-baseline baseline-lint \
	package-size baseline-package-size package-subject screenshots mail-colors readme readme-preview \
	back-fmt back-vet back-test back-test-integration back-build back-cover back-cover-integration back-docs clean

.DEFAULT_GOAL := help

help: ## Show the list of commands
	@echo "Timeline"
	@echo ""
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Override ports like this: make docker-up WEB_PORT=5199 API_PORT=8099 POSTGRES_PORT=5433"

docker-up: .env ## Bring up the stack: database, migrations, API, worker and frontend
	@$(COMPOSE) up -d --build --wait $(SERVICES)
	@$(MAKE) --no-print-directory endpoints

docker-down: ## Stop the stack (the data volume is preserved)
	@$(COMPOSE) down

docker-build: .env ## Rebuild the images without starting anything
	@$(COMPOSE) build

docker-restart: ## Restart the stack
	@$(MAKE) --no-print-directory docker-down
	@$(MAKE) --no-print-directory docker-up

docker-status: ## Show container status
	@$(COMPOSE) ps

docker-logs: ## Follow container logs (make docker-logs S=backend - a single one)
	@$(COMPOSE) logs -f $(S)

docker-psql: ## Open psql in the database container
	@$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-timeline} -d $${POSTGRES_DB:-timeline}

dev: .env ## Bring up the stack in development mode: HMR and go run
	@$(COMPOSE_DEV) up -d --build --wait $(SERVICES)
	@$(MAKE) --no-print-directory endpoints

dev-down: ## Stop the development mode stack
	@$(COMPOSE_DEV) down

seed: ## Fill the running database with real hackathons
	@$(COMPOSE) run --rm --no-deps backend seed

dev-restart: ## Recompile and restart the backend
	@$(COMPOSE_DEV) up -d --force-recreate --wait backend worker
	@echo "backend restarted"

dev-logs: ## Follow development mode logs (make dev-logs S=backend - a single one)
	@$(COMPOSE_DEV) logs -f $(S)

endpoints:
	@echo ""
	@echo "application -> http://localhost:$(WEB_PORT)"
	@echo "API         -> http://localhost:$(API_PORT), Swagger UI /docs/"

.env:
	@cp .env.example .env
	@echo "created .env from .env.example"

install: ## Install frontend dependencies for checks on the machine
	@cd $(FRONTEND) && if [ -f package-lock.json ]; then npm ci; else npm install; fi

$(FRONTEND)/node_modules:
	@$(MAKE) --no-print-directory install

types: $(FRONTEND)/node_modules ## Regenerate types from docs/swagger.json
	@cd $(FRONTEND) && npm run api:types

types-check: $(FRONTEND)/node_modules ## Check that the types have not fallen behind the contract
	@cd $(FRONTEND) && npm run api:check

typecheck: $(FRONTEND)/node_modules ## Type check
	@cd $(FRONTEND) && npm run typecheck

lint: $(FRONTEND)/node_modules ## Linters for both parts: Biome and golangci-lint
	@cd $(FRONTEND) && npm run lint
	@$(MAKE) --no-print-directory back-lint-new

format: $(FRONTEND)/node_modules ## Fix formatting and apply linter autofixes
	@cd $(FRONTEND) && npm run lint:fix

test: $(FRONTEND)/node_modules ## Run the frontend tests
	@cd $(FRONTEND) && npm run test

test-cover: $(FRONTEND)/node_modules ## Frontend tests with coverage and threshold checks
	@cd $(FRONTEND) && npm run test:coverage

test-contract: $(FRONTEND)/node_modules ## Contract tests against a real API in a container
	@$(COMPOSE_CONTRACT) up -d --build --wait backend
	@cd $(FRONTEND) && npm run test:contract ; 		status=$$? ; cd .. ; $(COMPOSE_CONTRACT) down -v --remove-orphans >/dev/null 2>&1 ; exit $$status

e2e: $(FRONTEND)/node_modules ## Sign-in scenario in a real browser against a real API
	@$(COMPOSE_CONTRACT) up -d --build --wait backend
	@cd $(FRONTEND) && npm run e2e ; 		status=$$? ; cd .. ; $(COMPOSE_CONTRACT) down -v --remove-orphans >/dev/null 2>&1 ; exit $$status

build: $(FRONTEND)/node_modules ## Build the frontend production bundle on the machine
	@cd $(FRONTEND) && npm run build

back-fmt: ## Format the backend code
	@$(GO_RUN) "gofmt -w $$(find . -name '*.go' -not -path './docs/*')"

back-vet: ## Static analysis of the backend
	@$(GO_RUN) "go vet ./..."

back-lint: ## golangci-lint: all debt, including the existing one (for reference)
	@$(GOLANGCI_RUN) ./...

back-lint-new: ## golangci-lint as a ratchet: only issues introduced by this change
	@$(GOLANGCI_RUN) --new-from-merge-base=origin/main --whole-files ./...

back-test: ## Backend unit tests
	@$(GO_RUN) "go test ./..."

back-build: ## Build the backend
	@$(GO_RUN) "go build ./..."

back-test-integration: ## Database constraint tests against a temporary PostgreSQL
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

back-cover: ## Backend coverage of the unit tests alone
	@$(GO_RUN) "go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | tail -1"

back-cover-integration: ## Backend coverage including the integration suites
	@docker rm -f timeline-cover-pg >/dev/null 2>&1 || true
	@docker run -d --rm --name timeline-cover-pg 		-e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=test 		-p 55434:5432 postgres:16-alpine >/dev/null
	@sleep 8
	@MSYS_NO_PATHCONV=1 docker run --rm --network host 		-v "$(CURDIR)/$(BACKEND):/src" -v "$(GO_CACHE):/go/pkg/mod" -w /src 		-e DATABASE_URL="postgres://test:test@127.0.0.1:55434/test?sslmode=disable" 		$(GO_IMAGE) sh -c "go test -tags=integration -coverpkg=./internal/... 			-coverprofile=coverage-integration.out ./... >/dev/null && 			go tool cover -func=coverage-integration.out | tail -1" ; 		status=$$? ; docker stop timeline-cover-pg >/dev/null 2>&1 ; exit $$status

back-docs: ## Rebuild the OpenAPI specification and publish it to docs/
	@$(SWAG_RUN) "$(SWAG_INSTALL) swag init -g internal/controllers/router.go -o docs --parseInternal --outputTypes go,json,yaml && swag fmt -g internal/controllers/router.go"
	@cp $(BACKEND)/docs/swagger.yaml $(BACKEND)/docs/swagger.json docs/
	@echo "specification published to docs/"

file-length: ## 250-line limit for hand-written code (ratchet)
	@bash scripts/check-file-length.sh

package-size: ## File-count limit per package (ratchet)
	@bash scripts/check-package-size.sh

cyrillic: ## Code language is English, Cyrillic only in dictionaries (ratchet)
	@bash scripts/check-cyrillic.sh

mail-colors: ## Mail template hex values match the app palette tokens
	@bash scripts/check-mail-colors.sh

import-cycles: ## No import cycles between internal packages, tests included
	@bash scripts/check-import-cycles.sh

package-subject: ## Every package is named by its subject, never "shared" or "utils"
	@bash scripts/check-package-subject.sh

screenshots: ## Images only in screenshots/, assets and docs
	@bash scripts/check-screenshots.sh

bundle-size: ## Production bundle size against the baseline
	@node scripts/bundle-size.mjs

readme: $(FRONTEND)/node_modules ## Render the README banner, buttons and badges from the app tokens
	@node scripts/readme/render.mjs

readme-preview: $(FRONTEND)/node_modules ## Show the README header as GitHub renders it, in screenshots/readme
	@node scripts/readme/preview.mjs

vendor-flags: $(FRONTEND)/node_modules ## Copy the affordable country flags into frontend/public
	@node scripts/vendor-flags.mjs

lint-baseline: ## Total golangci-lint issues against the baseline (ratchet)
	@bash scripts/check-lint-baseline.sh

baseline-file-length: ## Rewrite the line-limit baseline
	@bash scripts/check-file-length.sh --update

baseline-package-size: ## Rewrite the package file-count baseline
	@bash scripts/check-package-size.sh --update

baseline-cyrillic: ## Rewrite the Cyrillic check baseline
	@bash scripts/check-cyrillic.sh --update

baseline-bundle-size: build ## Rewrite the bundle size baseline
	@node scripts/bundle-size.mjs --update

baseline-lint: ## Rewrite the golangci-lint issue baseline
	@bash scripts/check-lint-baseline.sh --update

verify: ## Full check of both parts: contract, types, linter, tests, build
	@$(MAKE) --no-print-directory package-size
	@$(MAKE) --no-print-directory file-length
	@$(MAKE) --no-print-directory cyrillic
	@$(MAKE) --no-print-directory import-cycles
	@$(MAKE) --no-print-directory package-subject
	@$(MAKE) --no-print-directory screenshots
	@$(MAKE) --no-print-directory mail-colors
	@cd $(FRONTEND) && npm run verify
	@$(MAKE) --no-print-directory test-contract
	@$(GO_RUN) "go build ./... && go vet ./... && go test ./..."
	@$(MAKE) --no-print-directory back-lint-new
	@echo "checks passed"

clean: ## Stop containers, remove volumes and build artifacts
	@$(COMPOSE_DEV) down -v --remove-orphans 2>/dev/null || true
	@rm -rf $(FRONTEND)/dist $(FRONTEND)/coverage $(BACKEND)/bin $(BACKEND)/coverage.out $(BACKEND)/coverage-integration.out
	@echo "cleaned"
