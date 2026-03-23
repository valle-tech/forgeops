import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function writeAuthExtras(dest, v) {
  const p = path.join(dest, 'FORGEOPS_AUTH.md');
  await writeFile(
    p,
    `# Auth (${v.serviceName})

JWT + RBAC scaffolding is included in code when \`--auth\` was used at create time.

Environment:
- \`JWT_SECRET\` — required for signing
- \`JWT_EXPIRES_IN\` — e.g. \`1h\`

Protected routes use guards / middleware; roles are example-only — map to your identity provider in production.
`,
    'utf8',
  );
}

export async function writeOAuthExtras(dest, v) {
  const p = path.join(dest, 'FORGEOPS_OAUTH.md');
  await writeFile(
    p,
    `# OAuth (optional) — ${v.serviceName}

Wire social login in your API gateway or app layer. Typical environment variables:

| Variable | Purpose |
| --- | --- |
| \`OAUTH_GOOGLE_CLIENT_ID\` | Google OAuth client id |
| \`OAUTH_GOOGLE_CLIENT_SECRET\` | Google client secret |
| \`OAUTH_GITHUB_CLIENT_ID\` | GitHub OAuth app id |
| \`OAUTH_GITHUB_CLIENT_SECRET\` | GitHub OAuth secret |
| \`OAUTH_REDIRECT_URI\` | Registered redirect URL |

After OAuth, issue your own JWTs using the same \`JWT_SECRET\` as password grants.
`,
    'utf8',
  );
}

export async function writeMessagingExtras(dest, v) {
  const p = path.join(dest, 'FORGEOPS_MESSAGING.md');
  await writeFile(
    p,
    `# Messaging (${v.messaging})

Broker configuration is injected in docker-compose and .env.
Implement producers/consumers in your service layer (application / domain).
`,
    'utf8',
  );
}

export async function writeDatabaseExtras(dest, v) {
  const p = path.join(dest, 'FORGEOPS_DATABASE.md');
  await writeFile(
    p,
    `# Database (${v.database})

Connection string: \`DATABASE_URL\` in .env / docker-compose.

Use migrations in production (choose Prisma, TypeORM, golang-migrate, Alembic, etc.).
`,
    'utf8',
  );
}

export async function writeObserveExtras(dest, v) {
  const p = path.join(dest, 'FORGEOPS_OBSERVE.md');
  await writeFile(
    p,
    `# Observability — ${v.serviceName}

## Tracing (OpenTelemetry)

Set:
- \`OTEL_EXPORTER_OTLP_ENDPOINT\` — e.g. \`http://localhost:4318/v1/traces\` (Jaeger/Tempo/Grafana Agent)
- \`OTEL_SERVICE_NAME\` — defaults to \`SERVICE_NAME\`

Disable locally: \`OTEL_SDK_DISABLED=true\`

## Metrics

Prometheus scrape: \`GET /metrics\`

## Logs

Structured JSON on stdout with correlation / request id.
`,
    'utf8',
  );
}
