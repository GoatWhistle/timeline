# Образ backend: API, worker и операционные команды в одном бинаре.
# Контекст сборки — корень монорепозитория, поэтому пути начинаются с backend/.
#
#   runtime (по умолчанию) — статический бинарь в минимальном образе.
#   dev                    — `go run` поверх исходников, смонтированных томом
#                            (deploy/docker-compose.dev.yml). Перекомпиляция
#                            происходит при перезапуске контейнера.

# Зависимости выносятся в отдельный слой: он не пересобирается, пока не
# менялись go.mod и go.sum.
FROM golang:1.25-alpine AS deps
WORKDIR /src
RUN apk add --no-cache git ca-certificates tzdata
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Разработка: код монтируется томом, кэши сборки живут в томах compose.
FROM deps AS dev
COPY backend/ ./
EXPOSE 8080
CMD ["go", "run", "./cmd/hackathon", "serve"]

# Сборка статического бинаря.
FROM deps AS build
COPY backend/ ./
ARG VERSION=0.8.0
RUN CGO_ENABLED=0 go build -trimpath \
    -ldflags "-s -w -X github.com/kaifarikman/hackathon-os-backend/internal/cli.Version=${VERSION}" \
    -o /out/hackathon ./cmd/hackathon

# Рабочий образ.
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
COPY --from=build /out/hackathon /usr/local/bin/hackathon
USER app
ENV HTTP_ADDR=:8080
EXPOSE 8080
ENTRYPOINT ["hackathon"]
CMD ["serve"]
