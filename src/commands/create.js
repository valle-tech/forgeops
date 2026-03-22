import path from 'node:path';
import { cwd } from 'node:process';

import { upsertService } from '../lib/registry.js';
import { scaffoldService, normalizeName } from '../lib/scaffold.js';
import { resolveCreateOptions } from '../lib/create-options.js';

export function registerCreateCommands(program) {
  const create = program.command('create').description('Scaffold new resources');
  create
    .command('service <name>')
    .description('Generate a service from a template')
    .option('--language <lang>', 'node | go | python')
    .option('--db <db>', 'postgres | mongo | none')
    .option('--messaging <m>', 'kafka | rabbitmq | none')
    .option('--ci <provider>', 'github | gitlab | none')
    .option('--infra <tool>', 'pulumi | none')
    .option('--template <id>', 'Template id (e.g. nestjs-clean, go-clean, python-clean)')
    .option('--port <n>', 'HTTP port (host and container)')
    .option('--auth', 'Enable JWT auth scaffolding')
    .option('--output <dir>', 'Parent directory', cwd())
    .option('--repo <url>', 'Optional repository URL to record')
    .option('--no-interactive', 'Skip prompts; use defaults for any option not passed on the CLI')
    .action(async function createServiceAction(name, opts) {
      const o = await resolveCreateOptions(opts, this);
      const displayName = normalizeName(name) || name;
      console.log(`✔ Creating service: ${displayName}`);
      console.log(`✔ Using template: ${o.template}`);
      console.log('✔ Injecting configuration');
      console.log('✔ Generating files...');
      const { dest, slug, name: svcName, vars, templateId } = await scaffoldService({
        outDir: path.resolve(opts.output),
        name,
        language: o.language,
        database: o.database,
        messaging: o.messaging,
        auth: o.auth,
        ci: o.ci,
        infra: o.infra,
        repoUrl: opts.repo || '',
        templateId: o.template,
        port: o.port,
      });
      await upsertService({
        name: svcName,
        slug,
        path: dest,
        language: vars.language,
        database: vars.database,
        messaging: vars.messaging,
        auth: vars.auth,
        ci: vars.ci,
        infra: vars.infra,
        httpPort: vars.port,
        repoUrl: opts.repo || '',
        template: templateId,
      });
      console.log('✔ Done');
      console.log('');
      console.log('→ Next steps:');
      console.log(`   cd ${slug}`);
      console.log('   docker compose up');
    });
}
