import { access, constants } from 'node:fs/promises';
import path from 'node:path';

import { resolveServiceRoot } from '../lib/registry.js';
import { readProjectConfig } from '../lib/manifest.js';

export function registerInfoCommands(program) {
  program
    .command('info <name>')
    .description('Show template, repo URL, port, and DB for a service')
    .action(async (name) => {
      const { root, entry } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      let m;
      try {
        m = await readProjectConfig(root);
      } catch {
        m = entry;
      }
      const template = m.template ?? entry?.template ?? '—';
      const repo = m.repoUrl ?? entry?.repoUrl ?? '—';
      const port = m.httpPort ?? m.port ?? entry?.httpPort ?? '—';
      const db = m.database ?? entry?.database ?? 'none';
      const messaging = m.messaging ?? entry?.messaging ?? 'none';
      const features = Array.isArray(m.features) ? m.features.join(', ') : '—';

      console.log(`template   ${template}`);
      console.log(`repo       ${repo}`);
      console.log(`port       ${port}`);
      console.log(`db         ${db}`);
      if (messaging && messaging !== 'none') console.log(`messaging  ${messaging}`);
      console.log(`path       ${root}`);
      if (features !== '—') console.log(`features   ${features}`);

      let composeLine = 'compose    (none)';
      try {
        await access(path.join(root, 'docker-compose.yml'), constants.F_OK);
        composeLine = 'compose    docker-compose.yml';
      } catch {
        try {
          await access(path.join(root, 'docker-compose.yaml'), constants.F_OK);
          composeLine = 'compose    docker-compose.yaml';
        } catch {
          /* keep (none) */
        }
      }
      console.log(composeLine);
    });
}
