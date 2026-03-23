import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function writeGeneratedReadme(dest, v, templateId) {
  const title = v.serviceName.replace(/\b\w/g, (c) => c.toUpperCase());
  const lines = [
    `# ${title} service`,
    '',
    '> Generated with Forgeops (npm package name: forgeops).',
    '',
  ];
  const feats = [];
  if (v.architecture) feats.push(`Architecture: **${v.architecture}** (clean / DDD-style modules)`);
  if (v.auth) feats.push('JWT + RBAC scaffolding');
  if (v.graphql) feats.push('GraphQL (code-first) alongside REST');
  if (v.observe !== false) feats.push('OpenTelemetry tracing hooks');
  if (v.oauth) feats.push('OAuth env placeholders (see FORGEOPS_OAUTH.md)');
  if (v.redis) feats.push('Redis URL wired in compose');
  if (feats.length) {
    lines.push('## Features', '', ...feats.map((f) => `- ${f}`), '');
  }
  lines.push(
    '## Run',
    '',
    '```bash',
    'docker compose up',
    '```',
    '',
    'Uses `docker-compose.yml` in this directory (works with `docker compose` v2 or `docker-compose` v1).',
    '',
  );
  if (v.language === 'node') {
    lines.push(
      'Local dev (requires Node 20+):',
      '',
      '```bash',
      'npm install',
      'npm run start:dev',
      '```',
      '',
      'Tests: `npm test` (unit), `npm run test:e2e` (HTTP integration).',
      '',
    );
  } else if (v.language === 'go') {
    lines.push('Local dev:', '', '```bash', 'go run ./cmd/server', '```', '', 'Tests: `go test ./...`', '');
  } else if (v.language === 'python') {
    lines.push(
      'Local dev:',
      '',
      '```bash',
      'pip install -r requirements.txt',
      `uvicorn app.main:app --reload --port ${v.port}`,
      '```',
      '',
      'Tests: `pytest tests/` (unit + integration).',
      '',
    );
  }
  lines.push(
    '## Observability',
    '',
    '- JSON logs to stdout (`level`, `service`, `message`, `requestId`, …).',
    '- `GET /metrics` — Prometheus metrics.',
    '- Tracing: set `OTEL_EXPORTER_OTLP_ENDPOINT` (see FORGEOPS_OBSERVE.md when enabled).',
    '- Configure via `.env` (validated at startup).',
    '',
    '## Endpoints',
    '',
  );
  if (v.language === 'node') {
    lines.push(
      '| Method | Path | Description |',
      '| --- | --- | --- |',
      '| GET | / | Service info |',
      '| GET | /payments | Example domain module |',
      '| GET | /health | Liveness (process up) |',
      '| GET | /ready | Readiness (e.g. DB when configured) |',
      '| GET | /metrics | Prometheus text metrics |',
      '',
    );
    if (v.graphql) {
      lines.push('| POST | /graphql | GraphQL endpoint |', '');
    }
    if (v.auth) {
      lines.push('| POST | /auth/login | JWT login (demo) |', '');
    }
  } else {
    lines.push(
      '| Method | Path | Description |',
      '| --- | --- | --- |',
      '| GET | / | Service info |',
      '| GET | /payments | Example domain module |',
      '| GET | /health | Liveness |',
      '| GET | /ready | Readiness |',
      '| GET | /metrics | Prometheus metrics |',
      '',
    );
    if (v.auth) {
      lines.push('| POST | /auth/login | JWT login (demo) |', '');
    }
  }
  lines.push(`Template: \`${templateId}\` · Port: **${v.port}**`, '');
  await writeFile(path.join(dest, 'README.md'), lines.join('\n'), 'utf8');
}
