# Forgeops

CLI for scaffolding and day-to-day operations on small backend services (NestJS, Go, or FastAPI), in the spirit of an internal developer platform: templates, Docker Compose, optional CI and Pulumi stubs, and commands that wrap common workflows.

## Requirements

- **Node.js 18+**
- For generated services and several commands: **Docker** (with Compose v2: `docker compose`)
- Optional: **Pulumi** (`provision` / `destroy`), **GitHub CLI** (`gh`, for `delete --remove-repo` hints), **curl** (for `metrics` if you prefer it over Node’s `fetch`)

## Install

From a clone of this repository:

```bash
cd forgeops
npm install
```

Run the CLI without installing globally:

```bash
npm run forgeops -- --help
# or
node bin/forgeops.js --help
```

Install the `forgeops` command on your PATH (typical for local development):

```bash
npm link
forgeops --help
```

## Quick start

Create a service (defaults: Node/NestJS template, GitHub Actions CI, no database):

```bash
forgeops create service payments
```

This writes a folder named `{name}-service` under the current directory (for example `payments-service`), registers it under `~/.forgeops/registry.json`, and adds a manifest at `.forgeops-manifest.json` inside the project.

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
| `--language <lang>` | `node` (NestJS), `go`, or `python` (FastAPI). |
| `--db <db>` | `postgres`, `mongo`, or `none`. Adds DB service and env wiring in Compose when not `none`. |
| `--messaging <m>` | `kafka`, `rabbitmq`, or `none`. Adds broker services and env hints when set. |
| `--auth` | Enables JWT-related env vars and auth notes in the scaffold. |
| `--ci <provider>` | `github` (default), `gitlab`, or `none`. |
| `--infra <tool>` | `pulumi` adds an `infra/` placeholder stack, or `none`. |
| `--output <dir>` | Parent directory for the new service folder (default: current directory). |
| `--repo <url>` | Optional repo URL stored in the registry/manifest. |

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

Templates live under `templates/` in this repo (`nestjs-clean`, `go-clean`, `python-clean`). Files may contain placeholders such as `{{SERVICE_NAME}}`, `{{SERVICE_SLUG}}`, and `{{PORT}}`, which Forgeops replaces when copying.

## How Forgeops finds a service

Commands that take a service name resolve the project directory in this order:

1. Entry in `~/.forgeops/registry.json` (path must still exist and include `.forgeops-manifest.json`).
2. `./<name>` or `./<name>-service` under the current working directory, if a manifest is present.

So you can work inside the repo directory without registering, or rely on the registry after `create service`.

## Command reference

### Scaffolding

- `forgeops create service <name>` — generate project from template (see options above).

### Registry and project info

- `forgeops list services` — print registered services and paths.
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

- **`.forgeops-manifest.json`** — machine-readable metadata Forgeops uses for commands.
- **`.env`** — port, logging, optional `DATABASE_URL`, messaging, JWT vars when enabled.
- **`docker-compose.yml`** — app service plus optional Postgres, MongoDB, Kafka/Zookeeper, RabbitMQ, Jaeger (Node stacks).
- **`Dockerfile`** — language-specific image build.
- **CI** — `.github/workflows/ci.yml` or `.gitlab-ci.yml` when not disabled.
- **`infra/`** — minimal Pulumi TypeScript placeholder when `--infra pulumi` was used.

## Using Forgeops from Node.js (advanced)

This package is primarily a CLI. The entry point used by `bin/forgeops.js` is `runCli` in `src/index.js`. If you are developing inside this repo, you can drive the same parser programmatically:

```js
import { runCli } from './src/index.js';

await runCli(process.argv);
```

Scaffolding logic is in `src/lib/scaffold.js` (for example `scaffoldService`, `listBuiltinTemplateIds`). The service registry is in `src/lib/registry.js`. There is no stable semver “library” surface published on npm yet; treat these modules as internal unless you pin a git SHA or fork.

## Help

```bash
forgeops --help
forgeops create service --help
forgeops run --help
```

For the full product vision and CLI checklist, see `Concept.md` and `CLI.md` in this repository.
