<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/banner.dark.png">
    <img src="docs/readme/banner.light.png" alt="Timeline: every hackathon you are in, on one timeline" width="880" height="200">
  </picture>
</p>

<p align="center">
  For people who take part in many hackathons and the administrators who line them up:
  assignments, stages, deadlines and reminders in one place, so a registration window
  never closes while you were looking the other way.
</p>

<p align="center">
  <!-- readme:buttons -->
  <a href="#running-it"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/cta-run.dark.png"><img src="docs/readme/cta-run.light.png" alt="Run it locally" width="161" height="44"></picture></a>
  <a href="docs/swagger.yaml"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/cta-contract.dark.png"><img src="docs/readme/cta-contract.light.png" alt="API contract" width="157" height="44"></picture></a>
  <!-- /readme:buttons -->
</p>

<p align="center">
  <!-- readme:status -->
  <a href="#the-rule"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-status-1.dark.png"><img src="docs/readme/badge-status-1.light.png" alt="registration: self-reported, never verified" width="283" height="28"></picture></a>
  <a href="#how-it-works"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-status-2.dark.png"><img src="docs/readme/badge-status-2.light.png" alt="reminders: Telegram and email" width="222" height="28"></picture></a>
  <br>
  <a href="#limitations"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-status-3.dark.png"><img src="docs/readme/badge-status-3.light.png" alt="delivery: at least once" width="169" height="28"></picture></a>
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-status-4.dark.png"><img src="docs/readme/badge-status-4.light.png" alt="interface: RU and EN" width="160" height="28"></picture>
  <a href="LICENSE"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-status-5.dark.png"><img src="docs/readme/badge-status-5.light.png" alt="license: MIT" width="106" height="28"></picture></a>
  <!-- /readme:status -->
</p>

<p align="center">
  <!-- readme:stack -->
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-stack-1.dark.png"><img src="docs/readme/badge-stack-1.light.png" alt="frontend: React 19 and TypeScript" width="246" height="28"></picture>
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-stack-2.dark.png"><img src="docs/readme/badge-stack-2.light.png" alt="API: Go 1.25" width="110" height="28"></picture>
  <br>
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-stack-3.dark.png"><img src="docs/readme/badge-stack-3.light.png" alt="storage: PostgreSQL 16" width="181" height="28"></picture>
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-stack-4.dark.png"><img src="docs/readme/badge-stack-4.light.png" alt="contract: OpenAPI" width="146" height="28"></picture>
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-stack-5.dark.png"><img src="docs/readme/badge-stack-5.light.png" alt="runs in: Docker Compose" width="189" height="28"></picture>
  <!-- /readme:stack -->
</p>

<p align="center">
  <!-- readme:nav -->
  <a href="#the-rule"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-nav-1.dark.png"><img src="docs/readme/badge-nav-1.light.png" alt="The rule" width="75" height="26"></picture></a>
  <a href="#what-it-does"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-nav-2.dark.png"><img src="docs/readme/badge-nav-2.light.png" alt="What it does" width="102" height="26"></picture></a>
  <a href="#how-it-works"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-nav-3.dark.png"><img src="docs/readme/badge-nav-3.light.png" alt="How it works" width="105" height="26"></picture></a>
  <a href="#running-it"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-nav-4.dark.png"><img src="docs/readme/badge-nav-4.light.png" alt="Running it" width="88" height="26"></picture></a>
  <a href="#how-it-is-built"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-nav-5.dark.png"><img src="docs/readme/badge-nav-5.light.png" alt="How it is built" width="108" height="26"></picture></a>
  <a href="#limitations"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/badge-nav-6.dark.png"><img src="docs/readme/badge-nav-6.light.png" alt="Limitations" width="93" height="26"></picture></a>
  <!-- /readme:nav -->
</p>

<p align="center">
  <img src="docs/readme/event.png" alt="Event card as a participant sees it" width="880"><br>
  <sub>The participant's event card on a local stack. The badge reads <b>You marked it</b>, and the
  line under the form repeats why: the system does not check the external site.</sub>
</p>

## The rule

> **Timeline never checks the external registration site.** A registration status is the
> participant's own report, or a state an administrator set, never a confirmed fact.

The interface says so in as many words: "you marked it", not "confirmed". The status carries
its source (participant, administrator or system) in its own column, a bulk change by an
administrator is limited to `TODO` and `NOT_REQUIRED`, and the move from `NOT_REQUIRED` to
`DONE` is refused with `409 invalid_state_transition` instead of being applied quietly.

## What it does

An administrator creates an event, assigns participants and configures reminders. A
participant sees what they are assigned to, and marks for themselves that they have
registered. Reminders go out over Telegram or email.

Participants also form standing teams and enter an event with a lineup drawn from one; each
keeps a private layer of tasks, notes, submissions, an outcome and a retrospective against
every event they took part in.

<table>
<tr>
<td width="50%">

**Catalog**

<img src="docs/readme/catalog.png" alt="Event catalog" width="100%"/>

Every event, as tiles with the fields you pick or as a sortable table with the columns you
pick. Filters, CSV export, and a tick on the ones you are in.

</td>
<td width="50%">

**Schedule**

<img src="docs/readme/schedule.png" alt="Personal schedule" width="100%"/>

Your assignments over a week, month, quarter, year, or the whole timeline at once. Each event
keeps one colour so a crowded month still reads.

</td>
</tr>
<tr>
<td width="50%">

**Stages**

<img src="docs/readme/stages.png" alt="Stage editor" width="100%"/>

Applications, selection, build, checkpoint, submission, demo, results. A stage may sit outside
the event period: that is allowed, and only warns.

</td>
<td width="50%">

**Registration statuses**

<img src="docs/readme/statuses.png" alt="Registration statuses" width="100%"/>

Who reported, who did not, and who set it: the source column separates the participant from
an administrator from the system.

</td>
</tr>
</table>

## How it works

1. **Create.** An administrator adds an event: period, format, tracks and prizes, team size,
   and the stages it runs through.
2. **Assign.** Participants are added in a batch, each with a team role. Every item is its own
   transaction, so a partial failure still reports per row.
3. **Set the deadline.** A registration carries the organiser's link and a deadline, which may
   never fall after the event ends.
4. **Schedule reminders.** Up to ten rules per registration, each an offset before the
   deadline. The scheduler turns them into notifications, one per business situation: a
   versioned logical key drops the repeat.
5. **Report.** The participant opens the organiser's form, registers there, and marks it here.
6. **Deliver.** The worker takes notifications under a lease and sends them to Telegram or
   email.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryTextColor":"#1e1a14","primaryBorderColor":"#ac4600","secondaryColor":"#efeae5","tertiaryColor":"#faf7f3","lineColor":"#665f56","textColor":"#1e1a14","fontFamily":"Geist"}}}%%
flowchart LR
    SPA["React SPA"] --> Edge["nginx, one origin"]
    Edge --> API["Go API<br/>controllers"]
    API --> SVC["services<br/>domain rules"]
    SVC --> REPO["adapters<br/>SQL over pgx"]
    REPO --> DB[("PostgreSQL")]
    SCHED["scheduler"] --> DB
    DB --> WORKER["worker<br/>lease and retry"]
    WORKER --> TG["Telegram"]
    WORKER --> MAIL["email"]
```

The API and the SPA are served from one origin, so the session cookie needs no CORS and no
`SameSite=None`. The scheduler and the worker are one separate process beside the API,
reading the same database.

## Running it

Everything runs in containers: Go, Node and PostgreSQL are not needed on the machine, Docker
is enough.

```bash
make dev
```

The application comes up on `http://localhost:5173`, the API on `http://localhost:8080`, and
Swagger UI on `/docs/`. Use `make docker-up` instead for the production build behind nginx,
and `make help` for everything else.

No account is created automatically. Create the first administrator with the backend CLI,
then sign in with it:

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml \
  run --rm --no-deps backend go run ./cmd/timeline admin create \
  --email you@example.com --password 'a-long-password' --name 'Your Name' --nickname you
```

<details>
<summary>Configuration, Telegram and checks</summary>

Configuration comes only from environment variables; [`.env.example`](.env.example) is the
full list, and `make docker-up` creates `.env` from it.

Telegram setup and connection diagnostics: [Telegram deployment guide](docs/telegram.md).

Before a change counts as done, `make verify` has to pass: the contract, types, linters and
tests for both parts. `make test-contract` runs the contract tests against the real API in a
container, and `make e2e` signs in through a real browser against the same stack.

</details>

## How it is built

A modular monolith in Go behind a React SPA, with a separate worker process for delivery.

```text
backend/       Go: cmd, internal/{config,models,services,adapters,controllers,cli}, migrations
frontend/      React + TypeScript + Vite, Tailwind + shadcn/ui, TanStack Query, react-router
deploy/        Dockerfiles, nginx.conf, docker-compose.yml (+ .dev.yml)
docs/          The generated OpenAPI contract, ratchet baselines and these illustrations
scripts/       Ratchet checks and the README renderer, called from the Makefile
```

Inside the backend the layers are strict: `controllers` know about HTTP, `services` hold
domain rules and transaction boundaries, `adapters/repositories` is SQL over pgx, and
`models` is domain types and errors. A controller never reaches into a repository directly.
The frontend is organised by domain: `src/entities` for the things themselves,
`src/features` for what is done with them, shared code in `src/shared`, tokens in
`src/styles`, and the shell and routes in `src/app`.

The API contract lives in [`docs/swagger.yaml`](docs/swagger.yaml), generated from
annotations beside the controllers and never edited by hand. It is written before the
implementation, so both halves proceed from one description.

Several rules are enforced by machine rather than by review: a 250-line limit per file and a
file-count limit per package, both as ratchets over a recorded baseline that only moves down;
no import cycles, counting test imports too; no Cyrillic outside the localisation
dictionaries; and images only under `screenshots/`, `frontend/public`, `frontend/src/assets`
or `docs/`. The banner, buttons and badges above are rendered from the application's own
tokens, font and mark by `make readme`.

## Limitations

- **A registration status is not a fact.** Nothing queries the organiser's site, so a
  participant who marks `DONE` without registering stays `DONE` until someone corrects it.
- **Delivery is at least once, not exactly once.** The worker claims notifications with
  `FOR UPDATE SKIP LOCKED` under a lease; a worker that dies after sending and before
  recording the send leaves the job to the next one, and the reminder arrives twice.
- **Three defaults turn protection off so that `http://localhost` needs no setup, and all
  three must change on deployment.** `COOKIE_SECURE=false` lets session cookies travel over
  plain HTTP; an empty `METRICS_TOKEN` leaves `/metrics` open to anyone who can reach the
  port; an empty `SMTP_HOST` writes mail to the log instead of sending it. The backend warns
  about each one at start.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/mark.dark.png">
    <img src="docs/readme/mark.light.png" alt="" width="32" height="32">
  </picture>
  <br>
  <sub>Team GoatWhistle, 2026. Licensed under <a href="LICENSE">MIT</a>. Geist and Geist Mono are used under the SIL Open Font License.</sub>
</p>
