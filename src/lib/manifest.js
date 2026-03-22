import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

export const FORGEOPS_JSON = '.forgeops.json';

export const LEGACY_MANIFEST_FILE = '.forgeops-manifest.json';

export const MANIFEST_FILE = FORGEOPS_JSON;
export function normalizeProjectConfig(j) {
  if (!j || typeof j !== 'object') return j;
  const name = j.name ?? j.serviceName ?? '';
  const slug = j.slug ?? j.serviceSlug ?? '';
  const port = j.port ?? j.httpPort ?? 3000;
  return {
    ...j,
    name,
    serviceName: name,
    slug,
    serviceSlug: slug,
    port,
    httpPort: port,
    template: j.template,
    language: j.language,
    database: j.database,
    messaging: j.messaging,
    auth: j.auth,
    ci: j.ci,
    infra: j.infra,
    repoUrl: j.repoUrl,
    rootPath: j.rootPath,
  };
}

export async function readProjectConfig(dir) {
  const primary = path.join(dir, FORGEOPS_JSON);
  try {
    const raw = await readFile(primary, 'utf8');
    return normalizeProjectConfig(JSON.parse(raw));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const legacy = path.join(dir, LEGACY_MANIFEST_FILE);
  try {
    const raw = await readFile(legacy, 'utf8');
    return normalizeProjectConfig(JSON.parse(raw));
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error(`No ${FORGEOPS_JSON} (or legacy ${LEGACY_MANIFEST_FILE}) in ${dir}`);
    }
    throw e;
  }
}

export async function readManifest(dir) {
  return readProjectConfig(dir);
}

export async function writeProjectConfig(dir, data) {
  const base = {
    name: data.name ?? data.serviceName,
    template: data.template,
    port: data.port ?? data.httpPort,
    slug: data.slug ?? data.serviceSlug,
    language: data.language,
    database: data.database ?? 'none',
    messaging: data.messaging ?? 'none',
    auth: Boolean(data.auth),
    ci: data.ci ?? 'github',
    infra: data.infra ?? 'none',
    repoUrl: data.repoUrl || '',
    createdAt: data.createdAt || new Date().toISOString(),
  };
  await writeFile(path.join(dir, FORGEOPS_JSON), JSON.stringify(base, null, 2), 'utf8');
}

export async function writeManifest(dir, data) {
  await writeProjectConfig(dir, {
    ...data,
    name: data.serviceName,
    slug: data.serviceSlug,
    port: data.httpPort,
    template: data.template,
  });
}

export async function patchForgeopsJson(dir, patch) {
  const p = path.join(dir, FORGEOPS_JSON);
  const raw = await readFile(p, 'utf8');
  const j = JSON.parse(raw);
  Object.assign(j, patch);
  await writeFile(p, JSON.stringify(j, null, 2), 'utf8');
}

/** Append unique feature id for `forgeops add feature`. */
export async function appendForgeopsFeature(dir, featureId) {
  const p = path.join(dir, FORGEOPS_JSON);
  const raw = await readFile(p, 'utf8');
  const j = JSON.parse(raw);
  const list = Array.isArray(j.features) ? j.features : [];
  if (!list.includes(featureId)) list.push(featureId);
  j.features = list;
  await writeFile(p, JSON.stringify(j, null, 2), 'utf8');
}

/** Add or replace env keys (does not remove lines; skips keys already set). */
export async function mergeEnvFile(dir, entries) {
  const p = path.join(dir, '.env');
  let content = '';
  try {
    content = await readFile(p, 'utf8');
  } catch {
    /* new file */
  }
  const lines = content.split(/\n/);
  const keys = new Set(
    lines
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => l.split('=')[0]?.trim())
      .filter(Boolean),
  );
  let changed = false;
  for (const [k, v] of Object.entries(entries)) {
    if (keys.has(k)) continue;
    lines.push(`${k}=${v}`);
    keys.add(k);
    changed = true;
  }
  const out = lines.join('\n').replace(/\n+$/, '') + '\n';
  if (changed || !content) await writeFile(p, out, 'utf8');
}

export async function projectMarkerExists(dir) {
  for (const f of [FORGEOPS_JSON, LEGACY_MANIFEST_FILE]) {
    try {
      await access(path.join(dir, f), constants.F_OK);
      return true;
    } catch {
    }
  }
  return false;
}
