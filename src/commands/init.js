import { access, constants, writeFile } from 'node:fs/promises';

import { ensureForgeOpsDir, userConfigPath } from '../lib/paths.js';

export function registerInitCommands(program) {
  program
    .command('init')
    .description('Create ~/.forgeops and default config.json if missing')
    .action(async () => {
      await ensureForgeOpsDir();
      try {
        await access(userConfigPath(), constants.F_OK);
        console.log(`Already initialized: ${userConfigPath()}`);
        return;
      } catch {
        const data = { version: 1, createdAt: new Date().toISOString() };
        await writeFile(userConfigPath(), JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`Created ${userConfigPath()}`);
      }
    });
}
