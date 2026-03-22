import { rm } from 'node:fs/promises';

import { getService, removeService, resolveServiceRoot } from '../lib/registry.js';
import { normalizeName } from '../lib/scaffold.js';
import { run as runCmd, whichAvailable } from '../lib/exec.js';

export function registerDeleteCommands(program) {
  const delCmd = program.command('delete').description('Remove resources');
  delCmd
    .command('service <name>')
    .description('Remove local folder and registry entry')
    .option('--remove-repo', 'Attempt to delete remote repo (requires gh)', false)
    .action(async (name, opts) => {
      const reg = await getService(normalizeName(name) || name);
      const { root } = await resolveServiceRoot(name);
      const dir = reg?.path || root;
      if (!dir) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      if (opts.removeRepo && reg?.repoUrl) {
        const ok = await whichAvailable('gh');
        if (ok) {
          await runCmd('gh', ['repo', 'delete', reg.repoUrl, '--yes']).catch(() =>
            console.warn('gh repo delete failed; remove repo manually.'),
          );
        } else {
          console.warn('gh not found; skipping remote repo deletion.');
        }
      }
      await rm(dir, { recursive: true, force: true });
      await removeService(normalizeName(name) || name);
      console.log(`Removed service ${name} at ${dir}`);
    });
}
