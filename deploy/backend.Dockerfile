# Сборка статического бинаря.
FROM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates tzdata
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=0.8.0
RUN CGO_ENABLED=0 go build -trimpath \
    -ldflags "-s -w -X github.com/kaifarikman/hackathon-os-backend/internal/cli.Version=${VERSION}" \
    -o /out/hackathon ./cmd/hackathon

# Рабочий образ.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
COPY --from=build /out/hackathon /usr/local/bin/hackathon
USER app
ENV HTTP_ADDR=:8080
EXPOSE 8080
ENTRYPOINT ["hackathon"]
CMD ["serve"]
