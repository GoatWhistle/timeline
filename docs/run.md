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
соберёт контейнеры, запустит PostgreSQL, применит миграции, создаст первого
администратора и поднимет API, worker и frontend.

После запуска доступны:

- приложение: <http://localhost:5173>;
- API: <http://localhost:8080>;
- Swagger UI: <http://localhost:8080/docs/>.

Учётная запись администратора по умолчанию:

```text
Логин:  admin@example.com
Пароль: password123
```

Значения для локального запуска можно изменить в `.env`. Если нужны другие
данные первого администратора, задайте `ADMIN_EMAIL`, `ADMIN_PASSWORD` и
`ADMIN_NAME` до первого запуска.

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
