import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { registryPath, ensureForgeOpsDir } from './paths.js';
import { readProjectConfig, projectMarkerExists } from './manifest.js';
import { normalizeName } from './scaffold.js';

async function load() {
  try {
    const raw = await readFile(registryPath(), 'utf8');
    const j = JSON.parse(raw);
    return j.services && typeof j.services === 'object' ? j : { services: {} };
  } catch (e) {
    if (e.code === 'ENOENT') return { services: {} };
    throw e;
  }
}

async function save(data) {
  await ensureForgeOpsDir();
  await writeFile(registryPath(), JSON.stringify(data, null, 2), 'utf8');
}

export async function upsertService(entry) {
  const data = await load();
  data.services = data.services || {};
  data.services[entry.name] = {
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
  };
  await save(data);
}

export async function removeService(name) {
  const data = await load();
  if (data.services?.[name]) {
    delete data.services[name];
    await save(data);
  }
}

export async function getService(name) {
  const data = await load();
  return data.services?.[name] ?? null;
}

export async function listServices() {
  const data = await load();
  return Object.values(data.services || {});
}

async function fileExists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Resolve service directory: registry → cwd/name → cwd/name-service, with manifest. */
export async function resolveServiceRoot(name, cwd = process.cwd()) {
  const key = normalizeName(name) || name;
  const reg = await getService(key);
  if (reg?.path && (await projectMarkerExists(reg.path))) {
    return { root: reg.path, entry: reg, source: 'registry' };
  }
  const candidates = [
    path.join(cwd, name),
    path.join(cwd, `${name}-service`),
    reg?.path,
  ].filter(Boolean);

  for (const root of candidates) {
    if (await projectMarkerExists(root)) {
      let entry = reg;
      if (!entry || entry.path !== root) {
        try {
          const m = await readProjectConfig(root);
          entry = manifestToEntry(m, root);
        } catch {
          entry = { name, path: root };
        }
      }
      return { root, entry, source: 'manifest' };
    }
  }
  return { root: null, entry: reg, source: null };
}

function manifestToEntry(m, root) {
  return {
    name: m.serviceName ?? m.name,
    slug: m.serviceSlug ?? m.slug,
    path: root,
    language: m.language,
    database: m.database,
    messaging: m.messaging,
    auth: m.auth,
    ci: m.ci,
    infra: m.infra,
    httpPort: m.httpPort ?? m.port,
    repoUrl: m.repoUrl,
    template: m.template,
  };
}
