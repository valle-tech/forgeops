import { readFileSync } from 'node:fs';

import { run, whichAvailable } from '../lib/exec.js';

const PKG = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);

export function registerUpgradeCommands(program) {
  program
    .command('upgrade')
    .description(`Install latest global ${PKG.name} via npm (same as: npm i -g ${PKG.name}@latest)`)
    .action(async () => {
      const npm = (await whichAvailable('npm')) ? 'npm' : null;
      if (!npm) {
        console.error('npm not found. Install Node.js or run: npm install -g ' + PKG.name + '@latest');
        process.exitCode = 1;
        return;
      }
      console.log(`Running: npm install -g ${PKG.name}@latest`);
      await run(npm, ['install', '-g', `${PKG.name}@latest`], { stdio: 'inherit' });
      console.log('Done. Check version: forgeops --version');
    });
}
