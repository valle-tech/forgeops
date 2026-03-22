# Forgeops

[![npm version](https://img.shields.io/npm/v/forgeops.svg?cacheSeconds=60)](https://www.npmjs.com/package/forgeops)
[![npm downloads](https://img.shields.io/npm/dm/forgeops.svg)](https://www.npmjs.com/package/forgeops)
[![license](https://img.shields.io/npm/l/forgeops.svg)](https://github.com/valle-tech/forgeops/blob/main/LICENSE)

CLI for scaffolding and day-to-day operations on small backend services (NestJS, Go, or FastAPI), in the spirit of an internal developer platform: templates, Docker Compose, optional CI and Pulumi stubs, and commands that wrap common workflows.

**Package on npm:** [forgeops](https://www.npmjs.com/package/forgeops)

## Requirements

- **Node.js 18+**
- For generated services and several commands: **Docker** (with Compose v2: `docker compose`)
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

Create a service. With a TTY and no `--no-interactive` flag, Forgeops **prompts** for template, database, port, and other choices. Pass flags to skip prompts.

```bash
forgeops create service payments
forgeops create service payments --no-interactive --template nestjs-clean --db postgres --port 3001
```

### Create the GitHub repo and push (optional)

Export a fine-grained or classic PAT with **`repo`** scope (private repos). Then:

```bash
export GITHUB_TOKEN=ghp_xxxx   # or GH_TOKEN
forgeops create service payments --no-interactive --template nestjs-clean --github
```

Forgeops calls the GitHub API to create **`payments-service`**, runs `git init` / `commit` / `push` to **`main`**, and records the repo URL in **`.forgeops.json`**. Use **`--github-public`** for a public repository (default is private).

With a TTY and a token in the environment, you’ll be asked whether to create the repo unless you pass **`--no-interactive`** (then you must pass **`--github`** explicitly).

This writes a folder named `{name}-service` under the current directory (for example `payments-service`), registers it under `~/.forgeops/registry.json`, and writes **`.forgeops.json`** inside the project (`name`, `template`, `port`, plus metadata other commands use).

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
| `--auth` | Enables JWT-related env vars and auth notes. |
| `--ci <provider>` | `github`, `gitlab`, or `none`. |
| `--infra <tool>` | `pulumi` or `none`. |
| `--output <dir>` | Parent directory for the new service folder (default: current directory). |
| `--repo <url>` | Optional repo URL stored in the registry and `.forgeops.json` (overridden if `--github` succeeds). |
| `--github` | Create a GitHub repo and push the scaffold (requires `GITHUB_TOKEN` / `GH_TOKEN` and **git**). |
| `--github-public` | Make the new GitHub repository public (default: private). |
| `--no-interactive` | Non-CI: skip prompts; use defaults for any option not set on the CLI. |

Example:

```bash
forgeops create service orders \
  --language go \
  --db postgres \
  --messaging kafka \
  --auth \
  --ci github \
  --infra pulumi \
  --output ~/src
```

Built-in templates ship inside the npm package (`nestjs-clean`, `go-clean`, `python-clean`). Files may contain placeholders such as `{{SERVICE_NAME}}`, `{{SERVICE_SLUG}}`, and `{{PORT}}`, which Forgeops replaces when copying.

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
- `forgeops info service <name>` — language, DB, port, CI/infra flags, optional repo URL.
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
- `forgeops trace <name>` — prints the Jaeger UI URL and opens it in the default browser (Compose for Node templates includes Jaeger on port 16686 when applicable).

### Tests and lint

- `forgeops test <name>` — runs `go test`, `pytest`, or `npm run test --if-present` depending on language.
- `forgeops lint <name>` — `golangci-lint` or `go vet`, `ruff`, or `npm run lint --if-present`.

### Templates

- `forgeops templates list` — built-in templates (shipped with this package) and custom dirs under `~/.forgeops/templates`.
- `forgeops templates add <name>` — copies `./<name>` from the current directory into `~/.forgeops/templates` (must be a directory). Use for your own template packs; wiring `create` to pick a custom template by id is something you can extend in code.
- `forgeops templates update` — runs `git pull` in `~/.forgeops/templates` when that folder is a Git clone.

### Credentials (placeholder for a future API)

- `forgeops login` — prompts for email/token (or pass `--email` / `--token`); stores JSON in `~/.forgeops/credentials.json`.
- `forgeops whoami` — shows stored email and a masked token.

## Generated project layout (typical)

- **`.forgeops.json`** — project metadata (`name`, `template`, `port`, …) used by `run`, `build`, `list`, etc.
- **`.env`** — port, logging, optional `DATABASE_URL`, messaging, JWT vars when enabled.
- **`docker-compose.yml`** — app service (`env_file: .env`) plus optional Postgres, MongoDB, Kafka/Zookeeper, RabbitMQ.
- **`README.md`** — short run instructions and endpoint list for the template.
- **`Dockerfile`** — language-specific image build.
- **CI** — `.github/workflows/ci.yml` (test + Docker build; **push to GHCR** `ghcr.io/<owner>/<repo>:latest` on pushes to `main`) or `.gitlab-ci.yml` when GitLab is selected.
- **`infra/`** — minimal Pulumi TypeScript placeholder when `--infra pulumi` was used.

## Using Forgeops from Node.js (advanced)

The supported interface for users is the **`forgeops` CLI** installed from npm. If you contribute to this repo, you can invoke the same command loop programmatically:

```js
import { runCli } from './src/index.js';

await runCli(process.argv);
```

Commands are registered from `src/cli/register-commands.js` and live under `src/commands/` (grouped by area). Shared helpers sit in `src/lib/`. None of this is a semver-stable API for npm dependents; for automation, prefer shelling out to `forgeops` or open an issue if you need first-class programmatic exports.

## Help

```bash
forgeops --help
forgeops create service --help
forgeops run --help
```

For the full product vision and CLI checklist, see `Concept.md` and `CLI.md` in this repository.
