# Backend image: API, worker and operational commands in a single binary.
# The build context is the monorepo root, so paths start with backend/.
#
#   runtime (default) - static binary in a minimal image.
#   dev               - `go run` over sources mounted as a volume
#                       (deploy/docker-compose.dev.yml). Recompilation
#                       happens when the container restarts.

# Dependencies live in a separate layer: it is not rebuilt until
# go.mod and go.sum change.
FROM golang:1.25-alpine AS deps
WORKDIR /src
RUN apk add --no-cache git ca-certificates tzdata
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Development: code is mounted as a volume, build caches live in compose volumes.
FROM deps AS dev
COPY backend/ ./
EXPOSE 8080
CMD ["go", "run", "./cmd/timeline", "serve"]

# Static binary build.
FROM deps AS build
COPY backend/ ./
ARG VERSION=0.8.0
RUN CGO_ENABLED=0 go build -trimpath \
    -ldflags "-s -w -X github.com/GoatWhistle/timeline/internal/cli.Version=${VERSION}" \
    -o /out/timeline ./cmd/timeline

# Runtime image.
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
COPY --from=build /out/timeline /usr/local/bin/timeline
USER app
ENV HTTP_ADDR=:8080
EXPOSE 8080
ENTRYPOINT ["timeline"]
CMD ["serve"]
