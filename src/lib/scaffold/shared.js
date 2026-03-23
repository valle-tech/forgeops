import { mkdir, readdir, readFile, writeFile, stat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { customTemplatesDir } from '../paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PKG_ROOT = path.resolve(__dirname, '..', '..', '..');
export const BUILTIN_TEMPLATES = path.join(PKG_ROOT, 'templates');

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

export function replacements(vars) {
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
    architecture = 'clean',
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
    '{{ARCHITECTURE}}': architecture,
  };
}

export function applyReplacements(content, map) {
  let s = content;
  for (const [k, v] of Object.entries(map)) {
    s = s.split(k).join(v ?? '');
  }
  return s;
}

export async function dirExists(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

export function builtinTemplatePath(id) {
  return path.join(BUILTIN_TEMPLATES, id);
}

export async function listBuiltinTemplateIds() {
  if (!(await dirExists(BUILTIN_TEMPLATES))) return [];
  const entries = await readdir(BUILTIN_TEMPLATES, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => e.name);
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
  }
  return [...new Set([...built, ...custom])].sort();
}

export async function copyTree(srcDir, destDir, rep) {
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

export async function mergeTemplateMissingFiles(srcDir, destDir, rep) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(srcDir, e.name);
    const to = path.join(destDir, e.name);
    if (e.isDirectory()) {
      await mergeTemplateMissingFiles(from, to, rep);
    } else {
      try {
        await access(to, constants.F_OK);
      } catch {
        const buf = await readFile(from, 'utf8');
        await writeFile(to, applyReplacements(buf, rep), 'utf8');
      }
    }
  }
}

export async function collectMissingTemplatePaths(srcDir, destDir, rel = '') {
  const missing = [];
  const absSrc = rel ? path.join(srcDir, rel) : srcDir;
  const entries = await readdir(absSrc, { withFileTypes: true });
  for (const e of entries) {
    const piece = rel ? path.join(rel, e.name) : e.name;
    const from = path.join(srcDir, piece);
    const to = path.join(destDir, piece);
    if (e.isDirectory()) {
      missing.push(...(await collectMissingTemplatePaths(srcDir, destDir, piece)));
    } else {
      try {
        await access(to, constants.F_OK);
      } catch {
        missing.push(piece.split(path.sep).join('/'));
      }
    }
  }
  return missing;
}

export async function copyTemplateIntoCustom(fromDir, templateName, customRoot) {
  const id = normalizeName(templateName) || templateName;
  const to = path.join(customRoot, id);
  await mkdir(customRoot, { recursive: true });
  if (await dirExists(to)) throw new Error(`Template already exists: ${id}`);
  await copyTree(fromDir, to, {});
  return to;
}
