import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { cwd } from 'node:process';

import { customTemplatesDir } from '../lib/paths.js';
import {
  listBuiltinTemplateIds,
  builtinTemplatePath,
  copyTemplateIntoCustom,
} from '../lib/scaffold.js';
import { run as runCmd } from '../lib/exec.js';

export function registerTemplatesCommands(program) {
  const templates = program.command('templates').description('Manage templates');
  templates
    .command('list')
    .description('List built-in and custom templates')
    .action(async () => {
      const built = await listBuiltinTemplateIds();
      console.log('Built-in:');
      for (const id of built) console.log(`  ${id}\t${builtinTemplatePath(id)}`);
      const cdir = customTemplatesDir();
      let custom = [];
      try {
        custom = await readdir(cdir, { withFileTypes: true });
      } catch {
        custom = [];
      }
      console.log('Custom (~/.forgeops/templates):');
      for (const d of custom) {
        if (d.isDirectory()) console.log(`  ${d.name}\t${path.join(cdir, d.name)}`);
      }
    });

  templates
    .command('add <name>')
    .description('Copy ./<name> from current directory into custom templates')
    .action(async (name) => {
      const from = path.resolve(cwd(), name);
      let st;
      try {
        st = await stat(from);
      } catch {
        console.error(`Not found: ${from}`);
        process.exitCode = 1;
        return;
      }
      if (!st.isDirectory()) {
        console.error(`Not a directory: ${from}`);
        process.exitCode = 1;
        return;
      }
      const to = await copyTemplateIntoCustom(from, name, customTemplatesDir());
      console.log(`Template added at ${to}`);
    });

  templates
    .command('update')
    .description('git pull custom templates directory when it is a clone')
    .action(async () => {
      const cdir = customTemplatesDir();
      const gitdir = path.join(cdir, '.git');
      try {
        await stat(gitdir);
      } catch {
        console.log('Custom templates folder is not a git repository; nothing to update.');
        return;
      }
      await runCmd('git', ['-C', cdir, 'pull']);
      console.log('Updated custom templates.');
    });
}
