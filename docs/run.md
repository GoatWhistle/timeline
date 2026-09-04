# Запуск Timeline

Для запуска нужен только Docker с поддержкой Compose v2. Go, Node.js и
PostgreSQL устанавливать на компьютер не требуется.

## Первый запуск

Из корня репозитория выполните:

```bash
git pull --ff-only
make dev
```

При первом запуске `make dev` автоматически создаст `.env` из `.env.example`,
соберёт контейнеры, запустит PostgreSQL, применит миграции и поднимет API,
worker и frontend. Учётные записи автоматически не создаются.

После запуска доступны:

- приложение: <http://localhost:5173>;
- API: <http://localhost:8080>;
- Swagger UI: <http://localhost:8080/docs/>.

## Повседневная разработка

Frontend работает с HMR: изменения в `frontend/src` появляются в браузере
автоматически. После изменений backend перезапустите процессы Go:

```bash
make dev-restart
```

После получения новых изменений из Git, особенно при изменении зависимостей или
Dockerfile, снова выполните:

```bash
git pull --ff-only
make dev
```

Команда пересоберёт изменившиеся образы и применит новые миграции.

## Остановка и диагностика

Остановить dev-окружение, сохранив данные PostgreSQL:

```bash
make dev-down
```

Посмотреть состояние контейнеров и логи:

```bash
make docker-status
make dev-logs
make dev-logs S=backend
```

Если стандартные порты заняты, их можно переопределить:

```bash
make dev WEB_PORT=5199 API_PORT=8099 POSTGRES_PORT=5433
```

## Запуск production-сборки локально

Чтобы проверить собранный frontend за nginx вместо dev-сервера Vite:

```bash
make docker-up
```

Остановить production-окружение:

```bash
make docker-down
```

Список всех доступных команд выводит `make help`.
