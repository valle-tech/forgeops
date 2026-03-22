import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeProjectConfig } from './manifest.js';
import { customTemplatesDir } from './paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..', '..');
const BUILTIN_TEMPLATES = path.join(PKG_ROOT, 'templates');

export function normalizeName(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

export function serviceSlug(name) {
  const n = normalizeName(name);
  if (!n) return '';
  return n.endsWith('-service') ? n : `${n}-service`;
}

export function templateKeyForLanguage(lang) {
  const l = (lang || 'node').toLowerCase();
  if (l === 'go') return 'go-clean';
  if (l === 'python') return 'python-clean';
  return 'nestjs-clean';
}

export function languageFromTemplateId(templateId) {
  const t = String(templateId || '').toLowerCase();
  if (t.includes('go')) return 'go';
  if (t.includes('python')) return 'python';
  return 'node';
}

export async function listAllTemplateIds() {
  const built = await listBuiltinTemplateIds();
  const custom = [];
  const cdir = customTemplatesDir();
  try {
    const e = await readdir(cdir, { withFileTypes: true });
    for (const d of e) {
      if (d.isDirectory()) custom.push(d.name);
    }
  } catch {
    /* none */
  }
  return [...new Set([...built, ...custom])].sort();
}

export async function resolveTemplateSource(templateId) {
  const id = String(templateId || '').trim();
  if (!id) throw new Error('Template id is required');
  const b = builtinTemplatePath(id);
  if (await dirExists(b)) return { path: b, id };
  const c = path.join(customTemplatesDir(), id);
  if (await dirExists(c)) return { path: c, id };
  throw new Error(`Unknown template "${id}". Run: forgeops templates list`);
}

export function defaultPort(lang) {
  const l = (lang || 'node').toLowerCase();
  if (l === 'go') return 8080;
  if (l === 'python') return 8000;
  return 3000;
}

export function exampleDbUrl(db, slug) {
  const d = (db || 'none').toLowerCase();
  const safe = slug.replace(/-/g, '_');
  if (d === 'mongo' || d === 'mongodb') {
    return `mongodb://localhost:27017/${safe}`;
  }
  if (d === 'postgres' || d === 'postgresql') {
    return `postgres://postgres:postgres@localhost:5432/${safe}?sslmode=disable`;
  }
  return '';
}

function replacements(vars) {
  const {
    serviceName,
    serviceSlug,
    port,
    language,
    database,
    messaging,
    auth,
    ci,
    infra,
    modulePath,
    dbConnUrl,
  } = vars;
  return {
    '{{SERVICE_NAME}}': serviceName,
    '{{SERVICE_SLUG}}': serviceSlug,
    '{{PORT}}': String(port),
    '{{LANGUAGE}}': language,
    '{{DB_TYPE}}': database,
    '{{MESSAGING}}': messaging,
    '{{AUTH_ENABLED}}': auth ? 'true' : 'false',
    '{{MODULE_PATH}}': modulePath,
    '{{DB_CONN_URL}}': dbConnUrl,
  };
}

function applyReplacements(content, map) {
  let s = content;
  for (const [k, v] of Object.entries(map)) {
    s = s.split(k).join(v ?? '');
  }
  return s;
}

async function copyTree(srcDir, destDir, rep) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(srcDir, e.name);
    const to = path.join(destDir, e.name);
    if (e.isDirectory()) {
      await copyTree(from, to, rep);
    } else {
      const buf = await readFile(from, 'utf8');
      await writeFile(to, applyReplacements(buf, rep), 'utf8');
    }
  }
}

async function dirExists(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

export async function listBuiltinTemplateIds() {
  if (!(await dirExists(BUILTIN_TEMPLATES))) return [];
  const entries = await readdir(BUILTIN_TEMPLATES, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export function builtinTemplatePath(id) {
  return path.join(BUILTIN_TEMPLATES, id);
}

/**
 * @param {object} opts
 * @param {string} opts.outDir - parent directory for new folder
 * @param {string} opts.name - service name e.g. payments
 * @param {string} opts.language - node | go | python
 * @param {string} opts.database - postgres | mongo | none
 * @param {string} opts.messaging - kafka | rabbitmq | none
 * @param {boolean} opts.auth
 * @param {string} opts.ci - github | gitlab | none
 * @param {string} opts.infra - pulumi | none
 * @param {string} [opts.templatePath] - override template directory
 * @param {number} [opts.port] - HTTP port (host + container)
 * @param {string} [opts.templateId] - e.g. nestjs-clean
 */
export async function scaffoldService(opts) {
  const name = normalizeName(opts.name);
  if (!name) throw new Error('Invalid service name');
  const slug = serviceSlug(name);
  const tkey = opts.templateId || templateKeyForLanguage(opts.language || 'node');
  const srcResolved = opts.templatePath
    ? { path: opts.templatePath, id: tkey }
    : await resolveTemplateSource(tkey);
  const srcBase = srcResolved.path;
  const templateId = srcResolved.id;

  let lang = (opts.language || languageFromTemplateId(templateId)).toLowerCase();
  if (lang === 'nodejs') lang = 'node';

  const database = (opts.database || 'none').toLowerCase();
  const messaging = (opts.messaging || 'none').toLowerCase();
  const ci = (opts.ci || 'github').toLowerCase();
  const infra = (opts.infra || 'none').toLowerCase();
  let port =
    opts.port !== undefined && opts.port !== null && !Number.isNaN(Number(opts.port))
      ? Number(opts.port)
      : defaultPort(lang);
  if (port < 1 || port > 65535) throw new Error(`Invalid port: ${opts.port}`);

  const dest = path.join(opts.outDir, slug);
  if (await dirExists(dest)) {
    throw new Error(`Directory already exists: ${dest}`);
  }

  const modulePath = lang === 'go' ? `github.com/local/${slug}` : '';
  const dbConn = database !== 'none' ? exampleDbUrl(database, slug) : '';

  const vars = {
    serviceName: name,
    serviceSlug: slug,
    port,
    language: lang,
    database,
    messaging,
    auth: !!opts.auth,
    ci,
    infra,
    modulePath,
    dbConnUrl: dbConn,
  };
  const rep = replacements(vars);

  await copyTree(srcBase, dest, rep);

  await writeDockerCompose(dest, vars);
  if (ci === 'github') await writeGitHubCI(dest, vars);
  else if (ci === 'gitlab') await writeGitLabCI(dest, vars);
  if (infra === 'pulumi') await writePulumi(dest, vars);
  if (opts.auth) await writeAuthExtras(dest, vars);
  if (messaging === 'kafka' || messaging === 'rabbitmq') await writeMessagingExtras(dest, vars);
  if (database === 'postgres' || database === 'mongo' || database === 'mongodb' || database === 'postgresql') {
    await writeDatabaseExtras(dest, vars);
  }

  await writeFile(
    path.join(dest, '.env'),
    buildEnvFile(vars),
    'utf8',
  );

  await writeProjectConfig(dest, {
    name,
    slug,
    template: templateId,
    port,
    language: lang,
    database,
    messaging,
    auth: !!opts.auth,
    ci,
    infra,
    repoUrl: opts.repoUrl || '',
    rootPath: dest,
  });

  await writeGeneratedReadme(dest, vars, templateId);

  return { dest, slug, name, vars, templateId };
}

function buildEnvFile(v) {
  const lines = [
    `SERVICE_NAME=${v.serviceName}`,
    `PORT=${v.port}`,
    `LOG_FORMAT=json`,
  ];
  if (v.dbConnUrl) lines.push(`DATABASE_URL=${v.dbConnUrl}`);
  if (v.messaging === 'kafka') {
    lines.push('KAFKA_BROKERS=localhost:9092');
    lines.push(`KAFKA_CLIENT_ID=${v.serviceSlug}`);
  }
  if (v.messaging === 'rabbitmq') {
    lines.push('RABBITMQ_URL=amqp://guest:guest@localhost:5672/');
  }
  if (v.auth) {
    lines.push('JWT_SECRET=change-me-in-production');
    lines.push('JWT_EXPIRES_IN=1h');
  }
  lines.push('');
  return lines.join('\n');
}

async function writeGeneratedReadme(dest, v, templateId) {
  const title = v.serviceName.replace(/\b\w/g, (c) => c.toUpperCase());
  const lines = [
    `# ${title} service`,
    '',
    '> Generated with [Forgeops](https://www.npmjs.com/package/forgeops).',
    '',
    '## Run',
    '',
    '```bash',
    'docker compose up',
    '```',
    '',
    'Uses `docker-compose.yml` in this directory (works with `docker compose` v2 or `docker-compose` v1).',
    '',
  ];
  if (v.language === 'node') {
    lines.push('Local dev (requires Node 20+):', '', '```bash', 'npm install', 'npm run start:dev', '```', '');
  } else if (v.language === 'go') {
    lines.push('Local dev:', '', '```bash', 'go run ./cmd/server', '```', '');
  } else if (v.language === 'python') {
    lines.push('Local dev:', '', '```bash', 'pip install -r requirements.txt', 'uvicorn app.main:app --reload --port ' + v.port, '```', '');
  }
  lines.push('## Endpoints', '');
  if (v.language === 'node') {
    lines.push('| Method | Path | Description |', '| --- | --- | --- |', '| GET | / | Service info |', '| GET | /health | Liveness |', '| GET | /health/metrics | Prometheus text metrics |', '');
  } else {
    lines.push('| Method | Path | Description |', '| --- | --- | --- |', '| GET | / | Service info |', '| GET | /health | Liveness |', '| GET | /metrics | Prometheus metrics |', '');
  }
  lines.push(`Template: \`${templateId}\` · Port: **${v.port}**`, '');
  await writeFile(path.join(dest, 'README.md'), lines.join('\n'), 'utf8');
}

async function writeDockerCompose(dest, v) {
  const services = {
    [v.serviceSlug]: {
      build: '.',
      env_file: ['.env'],
      ports: [`${v.port}:${v.port}`],
      environment: {
        PORT: String(v.port),
        SERVICE_NAME: v.serviceName,
        LOG_FORMAT: 'json',
      },
    },
  };

  if (v.database === 'postgres' || v.database === 'postgresql') {
    services.postgres = {
      image: 'postgres:16-alpine',
      environment: {
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'postgres',
        POSTGRES_DB: v.serviceSlug.replace(/-/g, '_'),
      },
      ports: ['5432:5432'],
    };
    services[v.serviceSlug].depends_on = ['postgres'];
    services[v.serviceSlug].environment.DATABASE_URL = exampleDbUrl('postgres', v.serviceSlug);
  }

  if (v.database === 'mongo' || v.database === 'mongodb') {
    services.mongodb = { image: 'mongo:7', ports: ['27017:27017'] };
    services[v.serviceSlug].depends_on = ['mongodb'];
    services[v.serviceSlug].environment.DATABASE_URL = exampleDbUrl('mongo', v.serviceSlug);
  }

  if (v.messaging === 'kafka') {
    services.zookeeper = { image: 'confluentinc/cp-zookeeper:7.6.1', environment: { ZOOKEEPER_CLIENT_PORT: 2181 } };
    services.kafka = {
      image: 'confluentinc/cp-kafka:7.6.1',
      depends_on: ['zookeeper'],
      ports: ['9092:9092'],
      environment: {
        KAFKA_BROKER_ID: 1,
        KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
        KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092',
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1,
      },
    };
    services[v.serviceSlug].environment.KAFKA_BROKERS = 'kafka:9092';
    services[v.serviceSlug].depends_on = [...(services[v.serviceSlug].depends_on || []), 'kafka'];
  }

  if (v.messaging === 'rabbitmq') {
    services.rabbitmq = { image: 'rabbitmq:3-management-alpine', ports: ['5672:5672', '15672:15672'] };
    services[v.serviceSlug].environment.RABBITMQ_URL = 'amqp://guest:guest@rabbitmq:5672/';
    services[v.serviceSlug].depends_on = [...(services[v.serviceSlug].depends_on || []), 'rabbitmq'];
  }

  const doc = { services };
  const yml = toYaml(doc, 0);
  await writeFile(path.join(dest, 'docker-compose.yml'), yml, 'utf8');
}

function toYaml(obj, indent) {
  const pad = '  '.repeat(indent);
  let out = '';
  if (Array.isArray(obj)) {
    for (const item of obj) {
      out += `${pad}- ${String(item)}\n`;
    }
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      out += `${pad}${k}:\n${toYaml(v, indent + 1)}`;
    } else if (Array.isArray(v)) {
      out += `${pad}${k}:\n`;
      for (const item of v) {
        out += `${pad}  - ${String(item)}\n`;
      }
    } else {
      const esc = String(v).replace(/'/g, "''");
      out += `${pad}${k}: ${/[:#\n]/.test(esc) ? `'${esc}'` : esc}\n`;
    }
  }
  return out;
}

async function writeGitHubCI(dest, v) {
  const wfDir = path.join(dest, '.github', 'workflows');
  await mkdir(wfDir, { recursive: true });
  let content = '';
  if (v.language === 'go') {
    content = `name: ci
on:
  push:
    branches: [main, master]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - run: go test ./...
      - run: go build -o bin/server ./cmd/server
  docker:
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build image
        run: docker build -t ${v.serviceSlug}:ci .
`;
  } else if (v.language === 'python') {
    content = `name: ci
on:
  push:
    branches: [main, master]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt pytest ruff
      - run: pytest -q || true
      - run: ruff check . || true
  docker:
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker build -t ${v.serviceSlug}:ci .
`;
  } else {
    content = `name: ci
on:
  push:
    branches: [main, master]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - run: npm test --if-present
  docker:
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker build -t ${v.serviceSlug}:ci .
`;
  }
  await writeFile(path.join(wfDir, 'ci.yml'), content, 'utf8');
}

async function writeGitLabCI(dest, v) {
  const img =
    v.language === 'go'
      ? 'golang:1.22'
      : v.language === 'python'
        ? 'python:3.12'
        : 'node:20';
  const script =
    v.language === 'go'
      ? ['go test ./...', 'go build -o bin/server ./cmd/server']
        : v.language === 'python'
        ? ['pip install -r requirements.txt', 'pytest -q || true']
        : ['npm install', 'npm run build', 'npm test --if-present'];
  const yml = `image: ${img}
stages: [test, build]
test:
  stage: test
  script:
${script.map((s) => `    - ${s}`).join('\n')}
docker-build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t ${v.serviceSlug}:ci .
`;
  await writeFile(path.join(dest, '.gitlab-ci.yml'), yml, 'utf8');
}

async function writePulumi(dest, v) {
  const infra = path.join(dest, 'infra');
  await mkdir(infra, { recursive: true });
  await writeFile(
    path.join(infra, 'Pulumi.yaml'),
    `name: ${v.serviceSlug}
runtime: nodejs
description: Forgeops-generated stack for ${v.serviceName}
`,
    'utf8',
  );
  await writeFile(
    path.join(infra, 'index.ts'),
    `import * as pulumi from "@pulumi/pulumi";
// Minimal placeholder — replace with real AWS resources (ECS, RDS, etc.)
export const serviceName = "${v.serviceName}";
export const stack = pulumi.getStack();
`,
    'utf8',
  );
  await writeFile(
    path.join(infra, 'package.json'),
    JSON.stringify(
      {
        name: `${v.serviceSlug}-infra`,
        private: true,
        dependencies: { '@pulumi/pulumi': '^3.0.0' },
      },
      null,
      2,
    ),
    'utf8',
  );
}

async function writeAuthExtras(dest, v) {
  const p = path.join(dest, 'FORGEOPS_AUTH.md');
  await writeFile(
    p,
    `# Auth (${v.serviceName})

JWT is enabled via environment variables:
- JWT_SECRET
- JWT_EXPIRES_IN

Add route guards / middleware in your stack for protected routes.
`,
    'utf8',
  );
}

async function writeMessagingExtras(dest, v) {
  const p = path.join(dest, 'FORGEOPS_MESSAGING.md');
  await writeFile(
    p,
    `# Messaging (${v.messaging})

Broker configuration is injected in docker-compose and .env.
Implement producers/consumers in your service layer.
`,
    'utf8',
  );
}

async function writeDatabaseExtras(dest, v) {
  const p = path.join(dest, 'FORGEOPS_DATABASE.md');
  await writeFile(
    p,
    `# Database (${v.database})

Connection string: DATABASE_URL in .env / docker-compose.

Use migrations in production (add your tool of choice).
`,
    'utf8',
  );
}

/** Copy user template folder into custom templates dir */
export async function copyTemplateIntoCustom(fromDir, templateName, customRoot) {
  const id = normalizeName(templateName) || templateName;
  const to = path.join(customRoot, id);
  await mkdir(customRoot, { recursive: true });
  if (await dirExists(to)) throw new Error(`Template already exists: ${id}`);
  await copyTree(fromDir, to, {});
  return to;
}
