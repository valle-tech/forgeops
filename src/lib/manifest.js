import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MANIFEST_FILE = '.forgeops-manifest.json';

export async function readManifest(dir) {
  const p = path.join(dir, MANIFEST_FILE);
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}

export async function writeManifest(dir, data) {
  const m = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  await writeFile(path.join(dir, MANIFEST_FILE), JSON.stringify(m, null, 2), 'utf8');
}
