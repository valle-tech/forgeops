import { readFile, writeFile } from 'node:fs/promises';

import { ensureForgeOpsDir, userConfigPath } from './paths.js';

function getByPath(obj, dotPath) {
  const parts = dotPath.split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(obj, dotPath, value) {
  const parts = dotPath.split('.').filter(Boolean);
  if (!parts.length) return;
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

export async function loadUserConfig() {
  try {
    const raw = await readFile(userConfigPath(), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
}

export async function saveUserConfig(data) {
  await ensureForgeOpsDir();
  await writeFile(userConfigPath(), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function getConfigValue(dotPath) {
  const cfg = await loadUserConfig();
  return getByPath(cfg, dotPath);
}

export async function setConfigValue(dotPath, value) {
  const cfg = await loadUserConfig();
  setByPath(cfg, dotPath, value);
  await saveUserConfig(cfg);
}
