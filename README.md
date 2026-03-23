# Forgeops

[![npm version](https://img.shields.io/npm/v/forgeops.svg?cacheSeconds=60)](https://www.npmjs.com/package/forgeops)
[![npm downloads](https://img.shields.io/npm/dm/forgeops.svg)](https://www.npmjs.com/package/forgeops)
[![license](https://img.shields.io/npm/l/forgeops.svg)](https://github.com/valle-tech/forgeops/blob/main/LICENSE)
[![Socket Badge](https://badge.socket.dev/npm/package/forgeops/0.0.9)](https://badge.socket.dev/npm/package/forgeops/0.0.9)

CLI for scaffolding and day-to-day operations on small backend services (NestJS, Go, or FastAPI), in the spirit of an internal developer platform. **`forgeops create service`** copies a **built-in template**, optionally applies **feature fragments** (JWT/RBAC, GraphQL, OpenTelemetry, language-specific auth), generates **Docker Compose**, **CI** (GitHub Actions or GitLab CI), and an optional **AWS Pulumi** stack under `infra/`. Other commands wrap build, run, logs, metrics, tests, and Pulumi workflows.

## Requirements

- **Node.js 18+**
- For generated services and several commands: **Docker** (with Compose v2: `docker compose`)
- For **Go** scaffolds: **Go 1.22+** on your `PATH` is recommended — Forgeops runs **`go mod tidy`** after create when `go` is available so modules and `go.sum` are consistent.
- Optional: **Pulumi** (`provision` / `destroy`), **GitHub CLI** (`gh`, for `delete --remove-repo` hints), **curl** (for `metrics` if you prefer it over Node’s `fetch`)
- Optional: **git** and a **GitHub personal access token** (`GITHUB_TOKEN` or `GH_TOKEN`) when using `create service --github` to create a remote repository and push

## Install

Install the `forgeops` command globally from npm:

```bash
npm install -g forgeops
forgeops --help
```

Upgrade an existing global install (bumps within the semver range npm recorded when you first installed):

```bash
npm update -g forgeops
```

To always pull the newest release from the registry regardless of that range:

```bash
npm install -g forgeops@latest
```

Run once without installing globally:

```bash
npx forgeops --help
```

## Forgeops Dashboard (optional web UI)

The **[Forgeops Dashboard](https://github.com/valle-tech/forgeops-dashboard)** is a local Next.js UI that mirrors what you can do from the terminal: browse registered services, scaffold new ones with the same flags as **`forgeops create service`**, inspect templates, and run common operations against projects on **your machine**. It shells out to the **Forgeops CLI** and reads the same **`~/.forgeops/registry.json`** and **`~/.forgeops/config.json`** as the CLI.

### When to use it

- You prefer a browser over remembering every **`create service`** flag.
- You want a single place to see **recent activity**, **service health**, and links into **logs / metrics / tests / CI** views per service.

The dashboard does not replace the CLI for automation (CI, scripts); install **`forgeops`** from npm as above either way.

### Setup

1. **Install the CLI** (global or local) so the dashboard can invoke it:

   ```bash
   npm install -g forgeops
   ```

2. **Clone and run the dashboard** ([repository](https://github.com/valle-tech/forgeops-dashboard)):

   ```bash
   git clone https://github.com/valle-tech/forgeops-dashboard.git
   cd forgeops-dashboard
   npm install
   npm run dev
   ```

   Open **http://localhost:3000** (or the URL Next.js prints).

3. **Point the dashboard at your Forgeops CLI** if it is not next to the dashboard checkout. By default the app looks for **`bin/forgeops.js`** under **`../cli`** relative to the dashboard root (monorepo-style layout). Override with:

   ```bash
   export FORGEOPS_CLI_ROOT=/path/to/forgeops/cli
   ```

   That directory must contain **`bin/forgeops.js`** (the same layout as the [forgeops](https://github.com/valle-tech/forgeops) CLI package).

4. **Where new services are created** matches the CLI: projects go under the configured output directory. You can set:

   - **`FORGEOPS_SERVICES_OUTPUT`** — absolute path where **`forgeops create service`** writes **`{name}-service`**, or  
   - **`dashboard.servicesOutputPath`** in **`~/.forgeops/config.json`** (also editable under **Settings** in the UI).

After that, use **Create service**, **Services**, **Templates**, and **Settings** in the app; they call the same **`forgeops`** binary you use from the shell.

### Development (this repository)

If you are working from a clone instead of the published package:

```bash
npm install
npm link              # optional: point global `forgeops` at this checkout
npm run forgeops -- --help
# or
node bin/forgeops.js --help
```

## Quick start

Create a service. With a TTY and no `--no-interactive` flag, Forgeops **prompts** for template, database, messaging, CI, infra, port, JWT/RBAC, GraphQL (NestJS), OAuth placeholders, Redis, OpenTelemetry, and GitHub push. Pass flags to skip prompts.

```bash
forgeops create service payments
forgeops create service payments --no-interactive --template nestjs-clean --db postgres --port 3001
forgeops create service payments \
  --no-interactive \
  --language node \
  --arch clean \
  --db postgres \
  --messaging kafka \
  --auth \
  --graphql \
  --redis \
  --ci github \
  --infra pulumi \
  --output ~/src
```

### Create the GitHub repo and push (optional)

Export a fine-grained or classic PAT with **`repo`** scope (private repos). Then:

```bash
export GITHUB_TOKEN=ghp_xxxx   # or GH_TOKEN
forgeops create service payments --no-interactive --template nestjs-clean --github
```

Forgeops calls the GitHub API to create **`payments-service`**, runs `git init` / `commit` / `push` to **`main`**, and records the repo URL in **`.forgeops.json`**. Use **`--github-public`** for a public repository (default is private).

With a TTY and a token in the environment, you’ll be asked whether to create the repo unless you pass **`--no-interactive`** (then you must pass **`--github`** explicitly).

This writes a folder named `{name}-service` under the current directory (for example `payments-service`), registers it under `~/.forgeops/registry.json`, and writes **`.forgeops.json`** inside the project with metadata other commands use: `name`, `template`, `port`, `language`, `database`, `messaging`, `auth`, `graphql`, `oauth`, `redis`, `observe`, `architecture`, `ci`, `infra`, and optional `repoUrl`.

Run it with Compose:

```bash
cd payments-service
docker compose up
```

Or from anywhere, if the service is registered or discoverable (see below):

```bash
forgeops run payments
```

## `create service` options

```bash
forgeops create service <name> [options]
```

| Option | Description |
|--------|-------------|
| `--template <id>` | e.g. `nestjs-clean`, `go-clean`, `python-clean`, or a custom template under `~/.forgeops/templates`. |
| `--port <n>` | HTTP port (host and container). |
| `--language <lang>` | `node` (NestJS), `go`, or `python` — inferred from `--template` when omitted. |
| `--db <db>` | `postgres`, `mongo`, or `none`. |
| `--messaging <m>` | `kafka`, `rabbitmq`, or `none`. |
| `--arch <name>` | Architecture preset; only `clean` (Clean Architecture / DDD-style modules) is supported today. |
| `--auth` | JWT + RBAC scaffolding (Nest/Go/Python) and `FORGEOPS_AUTH.md`. |
| `--graphql` | NestJS only: GraphQL (Apollo) alongside REST. |
| `--oauth` | OAuth env placeholders + `FORGEOPS_OAUTH.md` (Google/GitHub). |
| `--redis` | Adds Redis to `docker-compose` and `REDIS_URL`. |
| `--no-observe` | Skip OpenTelemetry tracing scaffolding (default is on). |
| `--ci <provider>` | `github`, `gitlab`, or `none`. |
| `--infra <tool>` | `pulumi` (AWS starter in `infra/`) or `none`. |
| `--output <dir>` | Parent directory for the new service folder (default: current directory). |
| `--repo <url>` | Optional repo URL stored in the registry and `.forgeops.json` (overridden if `--github` succeeds). |
| `--github` | Create a GitHub repo and push the scaffold (requires `GITHUB_TOKEN` / `GH_TOKEN` and **git**). |
| `--github-public` | Make the new GitHub repository public (default: private). |
| `--no-interactive` | Non-CI: skip prompts; use defaults for any option not set on the CLI. |

**After create (Node):** run **`npm install`** in the new folder — optional features merge extra `dependencies` into `package.json`. **Go** projects run **`go mod tidy`** automatically when `go` is available.

Built-in **templates** ship under `templates/` in the npm package (`nestjs-clean`, `go-clean`, `python-clean`). Internal bundles such as `templates/_pulumi-aws` are used when generating `infra/` and are not listed as user-facing template IDs. **Fragments** (optional overlays: auth, GraphQL, OTEL, etc.) ship under `fragments/` and are merged after the base tree. Template files use placeholders such as `{{SERVICE_NAME}}`, `{{SERVICE_SLUG}}`, `{{PORT}}`, plus feature-specific tokens resolved at scaffold time.

## How Forgeops finds a service

Commands that take a service name resolve the project directory in this order:

1. Entry in `~/.forgeops/registry.json` (path must still exist and include `.forgeops.json`).
2. `./<name>` or `./<name>-service` under the current working directory, if `.forgeops.json` is present.

Legacy projects with only `.forgeops-manifest.json` are still detected.

So you can work inside the repo directory without registering, or rely on the registry after `create service`.

## Command reference

### Scaffolding

- `forgeops create service <name>` — generate project from template (see options above).

### Discovery and registry

- `forgeops list` — scan the **current directory** and **immediate subfolders** for `.forgeops.json` and print name, template, port, and path.
- `forgeops list services` — print services registered in `~/.forgeops/registry.json`.
- `forgeops info service <name>` — template, repo URL, port, DB, messaging, path, compose file; also shows **auth** / **graphql** / **observe** when set in the manifest.
- `forgeops delete service <name>` — delete the project directory and registry entry.  
  - `--remove-repo` — attempts `gh repo delete` when a repo URL was recorded (requires `gh`).

### Build, run, deploy

- `forgeops build <name>` — `docker build` in the service root.
- `forgeops run <name>` — `docker compose up` (add `-d` / `--detach` to run in the background).
- `forgeops deploy <name>` — prints CI guidance when a GitHub workflow exists; always tries a local `docker build` if Docker is available.

### Infrastructure (Pulumi)

- `forgeops provision <name>` — `pulumi up --yes` in `infra/` (requires Pulumi CLI and stack setup).
- `forgeops destroy <name>` — `pulumi destroy --yes` in `infra/`.

### Observability

- `forgeops logs <name>` — runs `docker compose logs -f <service-slug>` in the project directory (stream until you interrupt).
- `forgeops metrics <name>` — HTTP GET to `/metrics` or `/health/metrics` on the service port from the manifest.
- `forgeops trace <name>` — prints a local Jaeger UI URL (default `http://localhost:16686`) and opens it; run a Jaeger or OTLP-compatible backend yourself if nothing is listening (for example `docker run jaegertracing/all-in-one` — see command output).

### Tests and lint

- `forgeops test <name>` — runs `go test`, `pytest`, or `npm run test --if-present` depending on language.
- `forgeops lint <name>` — `golangci-lint` or `go vet`, `ruff`, or `npm run lint --if-present`.

### Templates

- `forgeops templates list` — built-in templates (directories under `templates/` in the package, excluding internal `_…` names) and custom dirs under `~/.forgeops/templates`.
- `forgeops templates add <name>` — copies `./<name>` from the current directory into `~/.forgeops/templates` (must be a directory). Use for your own template packs; wiring `create` to pick a custom template by id is something you can extend in code.
- `forgeops templates update` — runs `git pull` in `~/.forgeops/templates` when that folder is a Git clone.

### Credentials (placeholder for a future API)

- `forgeops login` — prompts for email/token (or pass `--email` / `--token`); stores JSON in `~/.forgeops/credentials.json`.
- `forgeops whoami` — shows stored email and a masked token.

## Generated project layout (typical)

- **`.forgeops.json`** — project metadata used by `run`, `build`, `list`, `info`, etc. (includes flags such as `auth`, `graphql`, `observe`, `redis`, `architecture`).
- **`.env`** — port, `LOG_FORMAT`, optional `DATABASE_URL`, messaging brokers, `JWT_*` when `--auth`, OAuth keys when `--oauth`, `REDIS_URL` when `--redis`, `OTEL_*` when observability scaffolding is enabled (`--no-observe` turns off OTEL fragments and extra env keys).
- **`docker-compose.yml`** — app service (`env_file: .env`) plus optional Postgres, MongoDB, Kafka/Zookeeper, RabbitMQ, **Redis** (`--redis`).
- **`FORGEOPS_*.md`** — short docs when relevant: `FORGEOPS_AUTH.md`, `FORGEOPS_OAUTH.md`, `FORGEOPS_MESSAGING.md`, `FORGEOPS_DATABASE.md`, `FORGEOPS_OBSERVE.md`.
- **Project readme** — run instructions, feature list, and endpoint table for the template.
- **`Dockerfile`** — language-specific image build.
- **CI** — **GitHub:** `.github/workflows/ci.yml` with jobs for **test**, **Docker build/push** to **GHCR** (`ghcr.io/<owner>/<repo>:latest` on pushes to `main`), and **manual workflow_dispatch** deploy placeholders for **dev / staging / prod** (replace echo steps with your deploy). **GitLab:** `.gitlab-ci.yml` with test, docker build, and manual deploy stages.
- **`infra/`** — when `--infra pulumi`, an **AWS-oriented** Pulumi TypeScript project (`templates/_pulumi-aws`): default VPC wiring, S3, ECR, ECS cluster, RDS (Postgres), DynamoDB table, random DB password (review before production).

## Using Forgeops from Node.js (advanced)

The supported interface for users is the **`forgeops` CLI** installed from npm. If you contribute to this repo, you can invoke the same command loop programmatically:

```js
import { runCli } from './src/index.js';

await runCli(process.argv);
```

Commands are registered from `src/cli/register-commands.js` and live under `src/commands/` (grouped by area). Scaffolding logic is split under `src/lib/scaffold/` (`scaffold-service`, `compose`, `ci`, `pulumi`, `fragments`, etc.); `src/lib/scaffold.js` re-exports the public surface. Other shared helpers sit in `src/lib/`. None of this is a semver-stable API for npm dependents; for automation, prefer shelling out to `forgeops` or open an issue if you need first-class programmatic exports.

## Help

```bash
forgeops --help
forgeops create service --help
forgeops run --help
```

For the full product vision and CLI checklist, see `Concept.md` and `CLI.md` in this repository.
