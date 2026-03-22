import path from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import { cwd } from 'node:process';

import { customTemplatesDir } from '../lib/paths.js';
import {
  listBuiltinTemplateIds,
  builtinTemplatePath,
  copyTemplateIntoCustom,
  resolveTemplateSource,
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
      for (const id of built) console.log(`  ${id}   ${builtinTemplatePath(id)}`);
      const cdir = customTemplatesDir();
      let custom = [];
      try {
        custom = await readdir(cdir, { withFileTypes: true });
      } catch {
        custom = [];
      }
      console.log('Custom (~/.forgeops/templates):');
      for (const d of custom) {
        if (d.isDirectory()) console.log(`  ${d.name}   ${path.join(cdir, d.name)}`);
      }
    });

  templates
    .command('info <id>')
    .description('Show path, stack hints, and README excerpt for a template')
    .action(async (id) => {
      let resolved;
      try {
        resolved = await resolveTemplateSource(id);
      } catch (e) {
        console.error(e.message || String(e));
        process.exitCode = 1;
        return;
      }
      const root = resolved.path;
      console.log(`id       ${resolved.id}`);
      console.log(`path     ${root}`);

      let stack = 'unknown';
      try {
        await stat(path.join(root, 'package.json'));
        stack = 'node (package.json)';
      } catch {
        try {
          await stat(path.join(root, 'go.mod'));
          stack = 'go (go.mod)';
        } catch {
          try {
            await stat(path.join(root, 'requirements.txt'));
            stack = 'python (requirements.txt)';
          } catch {
            /* keep unknown */
          }
        }
      }
      console.log(`stack    ${stack}`);

      const entries = await readdir(root, { withFileTypes: true });
      const top = entries
        .filter((e) => e.isDirectory() || /\.(json|ya?ml|md|txt)$/i.test(e.name))
        .map((e) => e.name)
        .sort()
        .slice(0, 24);
      console.log(`top      ${top.join(', ') || '(empty)'}`);

      for (const readme of [`README${'.md'}`, `readme${'.md'}`]) {
        try {
          const raw = await readFile(path.join(root, readme), 'utf8');
          const snippet = raw.trim().split(/\n/).slice(0, 12).join('\n');
          console.log(`readme   (${readme}, first lines)\n${snippet}`);
          return;
        } catch {
          /* next */
        }
      }
      console.log('readme   (none)');
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
