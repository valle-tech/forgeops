import { cwd } from 'node:process';

import { listServices } from '../lib/registry.js';
import { scanForgeopsProjects } from '../lib/scan.js';

function formatColumns(rows) {
  if (!rows.length) return '';
  const colCount = rows[0].length;
  const widths = [];
  for (let c = 0; c < colCount; c++) {
    widths[c] = Math.max(...rows.map((r) => String(r[c] ?? '').length));
  }
  return rows.map((r) => r.map((cell, i) => String(cell ?? '').padEnd(widths[i])).join('   ')).join('\n');
}

export function registerListCommands(program) {
  const listCmd = program
    .command('list')
    .description(
      'List Forgeops projects under this directory (from .forgeops.json). Use `list services` for the global registry.',
    );
  listCmd
    .command('services')
    .description('List services registered in ~/.forgeops/registry.json')
    .action(async () => {
      const list = await listServices();
      if (!list.length) {
        console.log('No services registered yet. Create one with: forgeops create service <name>');
        return;
      }
      const rows = list.map((s) => [
        s.name ?? '?',
        s.template ?? '?',
        String(s.httpPort ?? s.port ?? '?'),
      ]);
      console.log(formatColumns(rows));
    });
  listCmd.action(async () => {
    const root = cwd();
    const hits = await scanForgeopsProjects(root);
    if (!hits.length) {
      console.log('No Forgeops projects found here (.forgeops.json in . or immediate subfolders).');
      console.log('Tip: forgeops list services — show the global registry');
      return;
    }
    const rows = hits.map(({ path: p, config: c }) => {
      const n = c?.serviceName ?? c?.name ?? '?';
      const t = c?.template ?? '?';
      const port = c?.port ?? c?.httpPort ?? '?';
      return [n, t, String(port)];
    });
    console.log(formatColumns(rows));
  });
}
