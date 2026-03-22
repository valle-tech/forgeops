import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

/** Primary project marker (Step 4). */
export const FORGEOPS_JSON = '.forgeops.json';

/** @deprecated use FORGEOPS_JSON — still read for older scaffolds */
export const LEGACY_MANIFEST_FILE = '.forgeops-manifest.json';

export const MANIFEST_FILE = FORGEOPS_JSON;

/** Normalize config so older fields and new `.forgeops.json` shape both work. */
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

/** @deprecated alias */
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

/** @deprecated writes only .forgeops.json now */
export async function writeManifest(dir, data) {
  await writeProjectConfig(dir, {
    ...data,
    name: data.serviceName,
    slug: data.serviceSlug,
    port: data.httpPort,
    template: data.template,
  });
}

export async function projectMarkerExists(dir) {
  for (const f of [FORGEOPS_JSON, LEGACY_MANIFEST_FILE]) {
    try {
      await access(path.join(dir, f), constants.F_OK);
      return true;
    } catch {
      /* continue */
    }
  }
  return false;
}
