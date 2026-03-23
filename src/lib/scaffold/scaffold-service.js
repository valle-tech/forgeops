import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { run, whichAvailable } from '../exec.js';
import { writeProjectConfig } from '../manifest.js';
import { applyLanguageFragments } from './fragments.js';
import { writeGitHubCI, writeGitLabCI } from './ci.js';
import { writeDockerCompose } from './compose.js';
import { writePulumi } from './pulumi.js';
import {
  writeAuthExtras,
  writeOAuthExtras,
  writeMessagingExtras,
  writeDatabaseExtras,
  writeObserveExtras,
} from './extras.js';
import { writeGeneratedReadme } from './readme.js';
import { buildReplacements } from './scaffold-vars.js';
import {
  normalizeName,
  serviceSlug,
  templateKeyForLanguage,
  languageFromTemplateId,
  defaultPort,
  exampleDbUrl,
  replacements,
  resolveTemplateSource,
  copyTree,
  mergeTemplateMissingFiles,
  collectMissingTemplatePaths,
  copyTemplateIntoCustom,
  dirExists,
  listBuiltinTemplateIds,
  builtinTemplatePath,
} from './shared.js';

export function projectVarsFromManifest(cfg) {
  const rawName = cfg.serviceName || cfg.name || 'service';
  const name = normalizeName(rawName) || rawName;
  const slug = cfg.serviceSlug || cfg.slug || serviceSlug(name);
  let lang = String(cfg.language || 'node').toLowerCase();
  if (lang === 'nodejs') lang = 'node';
  const port = Number(cfg.httpPort ?? cfg.port ?? defaultPort(lang));
  const database = String(cfg.database || 'none').toLowerCase();
  const messaging = String(cfg.messaging || 'none').toLowerCase();
  const modulePath = lang === 'go' ? `example.com/local/${slug}` : '';
  const dbConn = database !== 'none' ? exampleDbUrl(database, slug) : '';
  return {
    serviceName: name,
    serviceSlug: slug,
    port,
    language: lang,
    database,
    messaging,
    auth: Boolean(cfg.auth),
    ci: String(cfg.ci || 'github').toLowerCase(),
    infra: String(cfg.infra || 'none').toLowerCase(),
    modulePath,
    dbConnUrl: dbConn,
    graphql: Boolean(cfg.graphql),
    oauth: Boolean(cfg.oauth),
    redis: Boolean(cfg.redis),
    observe: cfg.observe !== false,
    architecture: String(cfg.architecture || 'clean').toLowerCase(),
  };
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
  if (v.oauth) {
    lines.push('OAUTH_GOOGLE_CLIENT_ID=');
    lines.push('OAUTH_GOOGLE_CLIENT_SECRET=');
    lines.push('OAUTH_GITHUB_CLIENT_ID=');
    lines.push('OAUTH_GITHUB_CLIENT_SECRET=');
    lines.push('OAUTH_REDIRECT_URI=http://localhost:' + String(v.port) + '/auth/callback');
  }
  if (v.redis) {
    lines.push('REDIS_URL=redis://localhost:6379/0');
  }
  if (v.observe !== false) {
    lines.push('OTEL_EXPORTER_OTLP_ENDPOINT=');
    lines.push(`OTEL_SERVICE_NAME=${v.serviceSlug}`);
  }
  lines.push('');
  return lines.join('\n');
}

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
  let graphql = Boolean(opts.graphql) && lang === 'node';
  let port =
    opts.port !== undefined && opts.port !== null && !Number.isNaN(Number(opts.port))
      ? Number(opts.port)
      : defaultPort(lang);
  if (port < 1 || port > 65535) throw new Error(`Invalid port: ${opts.port}`);

  const dest = path.join(opts.outDir, slug);
  if (await dirExists(dest)) {
    throw new Error(`Directory already exists: ${dest}`);
  }

  const modulePath = lang === 'go' ? `example.com/local/${slug}` : '';
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
    graphql,
    oauth: Boolean(opts.oauth),
    redis: Boolean(opts.redis),
    observe: opts.observe !== false,
    architecture: String(opts.architecture || 'clean').toLowerCase(),
  };

  const baseRep = replacements(vars);
  const rep = buildReplacements(vars, baseRep);

  await copyTree(srcBase, dest, rep);
  await applyLanguageFragments(dest, vars);

  if (lang === 'go' && (await whichAvailable('go'))) {
    try {
      await run('go', ['mod', 'tidy'], { cwd: dest, stdio: 'ignore' });
    } catch {
    }
  }

  await writeDockerCompose(dest, vars);
  if (ci === 'github') await writeGitHubCI(dest, vars);
  else if (ci === 'gitlab') await writeGitLabCI(dest, vars);
  if (infra === 'pulumi') await writePulumi(dest, vars);
  if (opts.auth) await writeAuthExtras(dest, vars);
  if (opts.oauth) await writeOAuthExtras(dest, vars);
  if (messaging === 'kafka' || messaging === 'rabbitmq') await writeMessagingExtras(dest, vars);
  if (database === 'postgres' || database === 'mongo' || database === 'mongodb' || database === 'postgresql') {
    await writeDatabaseExtras(dest, vars);
  }
  if (vars.observe !== false) await writeObserveExtras(dest, vars);

  await writeFile(path.join(dest, '.env'), buildEnvFile(vars), 'utf8');

  await writeProjectConfig(dest, {
    name,
    slug,
    template: templateId,
    port,
    language: lang,
    database,
    messaging,
    auth: !!opts.auth,
    graphql,
    oauth: Boolean(opts.oauth),
    redis: Boolean(opts.redis),
    observe: vars.observe,
    architecture: vars.architecture,
    ci,
    infra,
    repoUrl: opts.repoUrl || '',
    rootPath: dest,
  });

  await writeGeneratedReadme(dest, vars, templateId);

  return { dest, slug, name, vars, templateId };
}

export {
  normalizeName,
  serviceSlug,
  templateKeyForLanguage,
  languageFromTemplateId,
  defaultPort,
  exampleDbUrl,
  replacements,
  resolveTemplateSource,
  mergeTemplateMissingFiles,
  collectMissingTemplatePaths,
  copyTemplateIntoCustom,
  listBuiltinTemplateIds,
  builtinTemplatePath,
};
