# Образ фронтенда. Контекст сборки — корень монорепозитория.
#
#   runtime (по умолчанию) — production-сборка Vite, которую раздаёт nginx.
#                            Тот же nginx проксирует /api и /docs на backend,
#                            поэтому SPA и API живут на одном origin и
#                            cookie-сессия с CSRF не пересекает границу сайта.
#   dev                    — dev-сервер Vite с HMR для разработки экранов
#                            (deploy/docker-compose.dev.yml).

# Зависимости ставятся один раз и переиспользуются обеими ветками.
FROM node:22-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Разработка: код монтируется томом, поэтому пересборка образа не нужна.
FROM deps AS dev
COPY frontend/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Production-сборка.
FROM deps AS build
COPY frontend/ ./
# В production-образе моки MSW всегда выключены: запросы обслуживает
# настоящий backend, а сам MSW вырезается из бандла.
ENV VITE_ENABLE_MSW=0
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
