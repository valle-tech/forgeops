import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { BUILTIN_TEMPLATES, copyTree, replacements } from './shared.js';

export async function writePulumi(dest, v) {
  const src = path.join(BUILTIN_TEMPLATES, '_pulumi-aws');
  const infra = path.join(dest, 'infra');
  await mkdir(infra, { recursive: true });
  const rep = replacements(v);
  await copyTree(src, infra, rep);
}
