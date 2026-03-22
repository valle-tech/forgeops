import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { readProjectConfig, projectMarkerExists } from './manifest.js';

/**
 * Find directories under rootDir that contain .forgeops.json (or legacy manifest).
 * Checks rootDir itself and immediate children (monorepo-style).
 */
export async function scanForgeopsProjects(rootDir, { shallow = true } = {}) {
  const found = [];
  const tryAdd = async (dir) => {
    if (!(await projectMarkerExists(dir))) return;
    try {
      const cfg = await readProjectConfig(dir);
      found.push({ path: dir, config: cfg });
    } catch {
      found.push({ path: dir, config: null });
    }
  };

  await tryAdd(rootDir);

  if (!shallow) {
    const entries = await readdir(rootDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const sub = path.join(rootDir, e.name);
      await tryAdd(sub);
    }
    return found;
  }

  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const sub = path.join(rootDir, e.name);
    try {
      if ((await stat(sub)).isDirectory()) {
        await tryAdd(sub);
      }
    } catch {
      /* skip */
    }
  }

  return found;
}
