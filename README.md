# Timeline

A tracker for participation in events. An administrator creates an event, assigns
participants and configures reminders; a participant sees their assignments and
marks for themselves that they have registered. Reminders go out via Telegram or
email.

Participants form standing teams and enter an event with a lineup drawn from one;
each keeps a private layer of tasks, notes, submissions, an outcome and a
retrospective against every event they took part in.

**Key caveat.** The system does not verify the external registration site. The
registration status is a user's self-report or an administratively set state, not
a confirmed fact. The wording in the interface is honest: "you marked", not
"confirmed".

Architecture: a modular monolith in Go, PostgreSQL, a REST/JSON API, a React SPA
and a separate worker/scheduler process for notification delivery.

## Quick start

The application runs in containers only: Go, Node and PostgreSQL are not needed
on the machine, Docker is enough.

```bash
make docker-up     # production mode: nginx with the production frontend build
make dev           # development mode: HMR for the frontend, go run for the backend
make dev-restart   # recompile and restart the backend
make docker-down   # stop the stack (the data volume is preserved)
make help          # the full list of commands
```

By default: the application on `http://localhost:5173`, the API on
`http://localhost:8080`, Swagger UI on `/docs/`, sign in as `admin@example.com`
with the password `password123`.

Ports are overridden through variables:

```bash
make docker-up WEB_PORT=5199 API_PORT=8099 POSTGRES_PORT=5433
```

Both modes bring up the same set of services: postgres -> migrations -> creation of
the first administrator -> API -> worker -> frontend. Only the last pair differs: in
production mode nginx serves the built SPA and proxies `/api` and `/docs` to the
API, while in development mode the Vite dev server serves the SPA with HMR and
proxies `/api` itself. In development mode the sources are mounted into the
containers: frontend edits are picked up immediately, the backend is recompiled by
`make dev-restart`.

The first administrator is created at startup from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` (`admin@example.com` / `password123` by default). There are no
other ready-made accounts: further users are created through an invite.

## Structure

```
backend/     Go: cmd, internal/{config,models,services,adapters,controllers,cli}, migrations
frontend/    React + TypeScript + Vite, Tailwind + shadcn/ui, TanStack Query, react-router
deploy/      Backend and frontend Dockerfiles, nginx.conf, docker-compose.yml (+ .dev.yml)
docs/        The generated OpenAPI contract and the ratchet baselines
scripts/     Ratchet checks: line limit, bundle size
Makefile     Monorepo development commands
```

Both Dockerfiles are multi-stage: the `runtime` stage is built by default and goes
to production, the `dev` stage is used only by the `deploy/docker-compose.dev.yml`
overlay.

Inside the backend the layers are strictly separated: `controllers` know about
HTTP, `services` hold domain rules and transaction boundaries,
`adapters/repositories` is SQL over pgx, `models` is domain types and errors. A
controller never reaches into a repository directly.

The frontend is organised into layers: `src/app` is the shell and routes,
`src/entities` and `src/features` are the domain, and shared code lives in
`src/shared` (`api`, `ui`, `lib`). Cross-imports between domain modules are
forbidden: exchange goes through `shared` and the routes.

Application configuration comes only from environment variables
(`backend/internal/config`); the application does not read `.env` files.
`.env.example` in the repository root is the full list of parameters;
`make docker-up` creates `.env` from it, which compose passes to the containers.

There is a single ignore file in the repository - the root `.gitignore`.
`.dockerignore` stays separate: it has a different job, the image build context,
and Docker reads only that one.

## Checks

Unlike running the application, the checks run on the machine and require Node. Go
is not strictly required: when it is absent the backend checks run in a container.
CI runs the same commands.

```bash
make verify      # full check: line limit, contract, types, linters, tests
make lint        # Biome for the frontend and golangci-lint for the backend
make test        # vitest
make test-cover  # vitest with coverage and threshold checks
make typecheck   # tsc --noEmit
make back-test   # go test ./...
make back-cover  # go test with a coverage profile
make back-vet    # go vet ./...
make back-lint   # golangci-lint: the whole debt, including what already exists
```

`make verify` must pass before a task counts as done.

### Ratchets

Three checks work from a recorded baseline rather than from a hard threshold. On a
repository with 25 files over the line limit and coverage around 11%, a hard
threshold would break CI on the very first day, after which the check would simply
be switched off. The baseline equals what has been achieved and never drops: every
change either holds the level or raises it.

| Check | Baseline | Command |
|----|----|----|
| 250-line limit for hand-written code | `docs/baselines/file-length.txt` | `make file-length` |
| Frontend coverage | `frontend/vitest.config.ts`, `docs/baselines/coverage.json` | `make test-cover` |
| Production bundle size | `docs/baselines/bundle-size.json` | `make bundle-size` |
| golangci-lint issues | git history (`--new-from-merge-base`) | `make back-lint-new` |

The backend linter works from history rather than from a baseline file: at the
moment it was wired up the existing code produced 88 issues (75 `lll`, 4 `funlen`,
3 `gocyclo`, 2 `unused`, 2 `gosec`, 1 `errcheck`, 1 `revive`). `make back-lint`
shows the whole debt and therefore fails - it is a reference command;
`make back-lint-new` and CI show only the issues introduced by the change itself,
and that is the one included in `make verify`. The debt is worked off by stage 6
tasks rather than blocking every commit.

The 250-line limit applies to hand-written `.go`, `.ts`, `.tsx` and `.css`. It does
not apply to generated files (`*.gen.*`, `schema.d.ts`, `swagger.*`) or to SQL
migrations: a migration cannot be cut in half. The check fails if a new file
exceeds the limit or an existing one grows.

The bundle size must not grow by more than a tenth of the baseline.

Baselines are rewritten only towards improvement:

```bash
make baseline-file-length
make baseline-bundle-size
```

## Contract

`docs/swagger.json` is produced by the backend in Swagger 2.0 format, generated
from the swag annotations next to the controller code and in
`backend/internal/controllers/router.go`. It is never edited by hand. The contract
is written before the implementation: an endpoint is first described in OpenAPI and
only then implemented - that way the frontend and the backend proceed in parallel
from a shared contract.

After an API change:

```bash
make back-docs   # rebuild swagger.yaml/json and publish them to docs/
make types       # regenerate frontend/src/shared/api/types.gen.ts
make types-check # fail if the types have fallen behind the contract (runs in CI)
```

`*.gen.*` files are never edited by hand.

The type generator (`frontend/scripts/generate-api-types.mjs`) does three things
besides converting to OpenAPI 3, and all three compensate for quirks of the source
contract:

1. **`required`.** The contract barely marks anything as required, which would make
   every field `optional`. All fields are treated as required except those listed
   in `OPTIONAL` - that list is derived from the specification.
2. **`format: date-time`.** The contract contains no such format at all, even
   though by the API conventions every moment is transferred in RFC 3339.
3. **Collapsing `enum` + `$ref`.** The contract generator duplicates the enum next
   to the reference; without collapsing it you get an intersection of types instead
   of a union.

All three patches disappear as soon as the same information appears in the contract
itself.

The contract tests in `frontend/tests-contract/` call a real API raised in a
container and validate the response body against the contract schema via ajv. This
catches what `tsc` cannot see: a divergence between the actual data and the
specification. `make test-contract` brings the stack up, runs the suite and tears
the stack down again; `make e2e` runs the sign-in scenario in a real browser
against the same stack.

## Migrations

Forward only, as a `NNNNNN_name.up.sql` / `.down.sql` pair in `backend/migrations`.
Existing applied migrations are never edited.

Rules that a plain `CHECK` cannot express are solved with explicit techniques and
must not be changed casually: `registration.deadline_at <= event.end_at` through a
denormalised `event_end_at` in the same row; "no more than 10 rules per
Registration" through numbered `slot_no` slots and the service layer; the
immutability of `audit_log` and the ban on deleting `notifications` through
triggers.

## Worth remembering

* **Cookies and CSRF.** A session is an `HttpOnly` cookie (`access_token` 15
  minutes, `refresh_token` 30 days with rotation). Every mutating request must
  carry `X-CSRF-Token` matching the `csrf_token` cookie; the token rotates, so the
  client re-reads it from the cookie after a response. That is also why the SPA and
  the API stay on one origin (the vite proxy in development, nginx in Docker).
* **403 versus 404.** The object exists but the role grants no access - `403`. The
  object belongs to someone else and its very existence must not be revealed -
  `404`.
* **Batch operations** return `200` even on partial failures, each item is processed
  in its own transaction, and the result is per-row.
* **Notification deduplication** rests on a versioned `logical_key`. Before touching
  the scheduler, the worker or the rules, re-read section 9 of the specification and
  scenarios AC-NOTIF-01...19.
* **There are no mocks.** The platform talks to a real backend, in development as
  well. The only place for stand-in data is tests: fixtures and a real API raised
  in a container (`make test-contract`, `make e2e`).
* **Tests are the weak spot.** Right now the repository has only targeted checks.
  Tasks QA-01...QA-07 from the backlog are not closed; when working on the
  notification domain, permissions and the worker, acceptance-scenario tests are
  written together with the code.

## Language and code

No comments are written in code - neither line, nor block, nor docstring.
Comments in configuration (YAML, Makefile, scripts) are allowed, but they are
written in English.

Russian lives in exactly two places: `docs/` and the JSON localisation
dictionaries (`frontend/src/shared/i18n/locales/`,
`backend/internal/locale/messages/`). Everywhere else is English.

Commit messages are `type: description` in Russian (`feat`, `fix`, `docs`,
`build`, `chore`, `refactor`, `test`).

## Documentation

* [docs/run.md](docs/run.md) - the Russian step-by-step guide to running and
  updating the project locally.

Priority order when sources disagree:

1. [CLAUDE.md](CLAUDE.md) - domain rules, states and transitions, the 403/404
   policy, layering, and the working rules. The separate specification and API
   conventions were folded in here once the product caught up with them.
2. [docs/swagger.yaml](docs/swagger.yaml) / [swagger.json](docs/swagger.json) - the
   endpoint contract. Generated from annotations in the code, never edited by hand,
   and it cannot change a domain rule.

* [docs/baselines/](docs/baselines/) - the ratchet baselines. Each one records
  what the repository already has; the counter only moves down.

The delivery plans that drove the build have been removed: everything they
described is either shipped, recorded in the specification, or kept as a rule
in `CLAUDE.md`. A plan that outlives its work becomes a lie about the code.
