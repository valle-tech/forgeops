import { cwd } from 'node:process';

import { listServices } from '../lib/registry.js';
import { scanForgeopsProjects } from '../lib/scan.js';

export function registerListCommands(program) {
  const listCmd = program
    .command('list')
    .description(
      'Discover projects with .forgeops.json in this directory and subfolders; use `list services` for the global registry',
    );
  listCmd
    .command('services')
    .description('List registered services (~/.forgeops/registry.json)')
    .action(async () => {
      const list = await listServices();
      if (!list.length) {
        console.log('No services registered yet. Create one with: forgeops create service <name>');
        return;
      }
      for (const s of list) {
        console.log(`${s.name}\t${s.path}${s.repoUrl ? `\t${s.repoUrl}` : ''}`);
      }
    });
  listCmd.action(async () => {
    const root = cwd();
    const hits = await scanForgeopsProjects(root);
    if (!hits.length) {
      console.log('No Forgeops projects found here (.forgeops.json in . or immediate subfolders).');
      console.log('Tip: forgeops list services — show the global registry');
      return;
    }
    for (const { path: p, config: c } of hits) {
      const n = c?.name ?? '?';
      const t = c?.template ?? '?';
      const port = c?.port ?? c?.httpPort ?? '?';
      console.log(`${n}\t${t}\tport ${port}\t${p}`);
    }
  });
}
