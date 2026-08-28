# The frontend image. The build context is the monorepo root.
#
#   runtime (default) - the Vite production build served by nginx.
#                       The same nginx proxies /api and /docs to the backend, so
#                       the SPA and the API live on one origin and the cookie
#                       session with CSRF never crosses a site boundary.
#   dev               - the Vite dev server with HMR for developing screens
#                       (deploy/docker-compose.dev.yml).

# Dependencies are installed once and reused by both branches.
FROM node:22-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Development: the code is mounted as a volume, so no image rebuild is needed.
FROM deps AS dev
COPY frontend/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Production build.
FROM deps AS build
COPY frontend/ ./
# In the production image the MSW mocks are always off: requests are served by
# the real backend, and MSW itself is stripped out of the bundle.
ENV VITE_ENABLE_MSW=0
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
