BINARY := bin/timeline
PKG := ./...
SWAG := swag
# The specification is published to the monorepo docs/: the frontend generates
# its types from it.
SPEC_REPO := ..

# Running the application lives in the root Makefile: the API, the worker and
# the database all come up in containers only (`make docker-up`, `make dev`).
# What stays here is the build, the checks and the specification generation.
.PHONY: help build docs docs-publish fmt vet lint test test-integration cover clean

help: ## Show the list of targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: ## Build the binary
	go build -o $(BINARY) ./cmd/timeline

docs: docs-publish ## Rebuild the OpenAPI specification from the annotations

docs-generate:
	$(SWAG) init -g internal/controllers/router.go -o docs --parseInternal --outputTypes go,json,yaml
	$(SWAG) fmt -g internal/controllers/router.go

docs-publish: docs-generate ## Copy the specification into the repository with the spec
	@if [ -d "$(SPEC_REPO)/docs" ]; then \
		cp docs/swagger.yaml docs/swagger.json docs/api-conventions.md $(SPEC_REPO)/docs/; \
		echo "specification copied to docs/"; \
	else \
		echo "docs directory not found in $(SPEC_REPO), copying skipped"; \
	fi

fmt: ## Format the code
	gofmt -w $(shell find . -name '*.go' -not -path './docs/*')

vet: ## Static analysis
	go vet $(PKG)

lint: ## golangci-lint against .golangci.yml
	golangci-lint run $(PKG)

test: ## Unit tests
	go test $(PKG)

test-integration: ## Tests that require PostgreSQL
	go test -tags=integration -count=1 $(PKG)

cover: ## Tests with a coverage profile
	go test -coverprofile=coverage.out -covermode=atomic $(PKG)
	go tool cover -func=coverage.out | tail -1

clean: ## Remove build artifacts
	rm -rf bin coverage.out coverage.html
