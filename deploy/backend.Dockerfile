FROM golang:1.25-alpine AS deps
WORKDIR /src
RUN apk add --no-cache git ca-certificates tzdata
COPY backend/go.mod backend/go.sum ./
RUN go mod download

FROM deps AS dev
COPY backend/ ./
EXPOSE 8080
CMD ["go", "run", "./cmd/timeline", "serve"]

FROM deps AS build
COPY backend/ ./
ARG VERSION=0.8.0
RUN CGO_ENABLED=0 go build -trimpath \
    -ldflags "-s -w -X github.com/GoatWhistle/timeline/internal/cli.Version=${VERSION}" \
    -o /out/timeline ./cmd/timeline

FROM alpine:3.20 AS geoip
ARG GEOIP_EDITION=dbip-city-lite
ARG GEOIP_RELEASE=2026-09
RUN apk add --no-cache curl \
    && mkdir -p /out \
    && curl -fsSL --retry 3 --max-time 300 \
        "https://download.db-ip.com/free/${GEOIP_EDITION}-${GEOIP_RELEASE}.mmdb.gz" \
        | gunzip > /out/geoip-city.mmdb \
    && test -s /out/geoip-city.mmdb

FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -u 10001 app \
    && mkdir -p /var/lib/timeline/avatars /var/lib/timeline/covers \
    && chown -R app:app /var/lib/timeline
COPY --from=build /out/timeline /usr/local/bin/timeline
COPY --from=geoip /out/ /usr/share/timeline/geoip/
USER app
ENV HTTP_ADDR=:8080
ENV GEOIP_DATABASE_PATH=/usr/share/timeline/geoip/geoip-city.mmdb
EXPOSE 8080
ENTRYPOINT ["timeline"]
CMD ["serve"]
