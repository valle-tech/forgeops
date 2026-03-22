import path from 'node:path';

import { run as runCmd, whichAvailable } from '../lib/exec.js';
import { resolveServiceOrExit } from '../cli/service-root.js';

export function registerInfraCommands(program) {
  program
    .command('provision <name>')
    .description('Apply Pulumi infrastructure for the service')
    .action(async (name) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const infra = path.join(ctx.root, 'infra');
      if (!(await whichAvailable('pulumi'))) {
        console.error('pulumi CLI not found. Install the Pulumi CLI (official installer or your OS package manager).');
        process.exitCode = 1;
        return;
      }
      await runCmd('pulumi', ['up', '--yes'], { cwd: infra });
    });

  program
    .command('destroy <name>')
    .description('Destroy Pulumi infrastructure for the service')
    .action(async (name) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const infra = path.join(ctx.root, 'infra');
      if (!(await whichAvailable('pulumi'))) {
        console.error('pulumi CLI not found.');
        process.exitCode = 1;
        return;
      }
      await runCmd('pulumi', ['destroy', '--yes'], { cwd: infra });
    });
}
