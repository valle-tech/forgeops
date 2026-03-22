import { readFileSync } from 'node:fs';
import { Command } from 'commander';

import { ensureForgeOpsDir } from './lib/paths.js';
import { registerCommands } from './cli/register-commands.js';

const PKG = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

export async function runCli(argv) {
  await ensureForgeOpsDir();

  const program = new Command();
  program.name('forgeops').description('Internal developer platform CLI').version(PKG.version);

  registerCommands(program);

  await program.parseAsync(argv);
}
