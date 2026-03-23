import path from 'node:path';
import { cwd } from 'node:process';

import { upsertService } from '../lib/registry.js';
import { scaffoldService, normalizeName, writeGitHubCI } from '../lib/scaffold.js';
import { resolveCreateOptions } from '../lib/create-options.js';
import { resolveGithubToken, getViewerLogin, createUserRepository } from '../lib/github.js';
import { initCommitAndPush } from '../lib/git-push.js';
import { patchForgeopsJson } from '../lib/manifest.js';
import { whichAvailable } from '../lib/exec.js';

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
    .option('--arch <name>', 'Architecture preset (only: clean)', 'clean')
    .option('--auth', 'Enable JWT auth + RBAC scaffolding')
    .option('--graphql', 'Add GraphQL (NestJS only)')
    .option('--oauth', 'Add OAuth env placeholders (Google/GitHub)')
    .option('--redis', 'Include Redis in docker-compose')
    .option('--no-observe', 'Skip OpenTelemetry tracing scaffolding')
    .option('--github', 'Create GitHub repository and push initial commit (needs GITHUB_TOKEN or GH_TOKEN)')
    .option('--github-public', 'With --github, create a public repository (default: private)')
    .option('--output <dir>', 'Parent directory', cwd())
    .option('--repo <url>', 'Optional repository URL to record (ignored when --github succeeds)')
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
        graphql: o.graphql,
        oauth: o.oauth,
        redis: o.redis,
        observe: o.observe,
        architecture: o.architecture,
        ci: o.ci,
        infra: o.infra,
        repoUrl: opts.repo || '',
        templateId: o.template,
        port: o.port,
      });

      if (o.github && vars.ci !== 'github') {
        await writeGitHubCI(dest, vars);
      }

      let repoUrl = opts.repo || '';
      let githubHtmlUrl = '';

      if (o.github) {
        const token = await resolveGithubToken();
        if (!token) {
          console.error(
            'GitHub token required for --github: set GITHUB_TOKEN or GH_TOKEN, or run: forgeops config set github.token <pat>',
          );
          process.exitCode = 1;
        } else if (!(await whichAvailable('git'))) {
          console.error('git must be installed to create and push a GitHub repository.');
          process.exitCode = 1;
        } else {
          console.log('✔ Creating GitHub repository...');
          try {
            const login = await getViewerLogin(token);
            const repo = await createUserRepository(token, {
              name: slug,
              description: `${displayName} service (forgeops)`,
              private: !o.githubPublic,
            });
            githubHtmlUrl = repo.html_url;
            console.log('✔ Pushing initial commit to main...');
            await initCommitAndPush({ dir: dest, owner: login, repo: slug, token });
            repoUrl = repo.html_url;
            await patchForgeopsJson(dest, { repoUrl });
          } catch (e) {
            console.error(e.message || String(e));
            process.exitCode = 1;
          }
        }
      }

      await upsertService({
        name: svcName,
        slug,
        path: dest,
        language: vars.language,
        database: vars.database,
        messaging: vars.messaging,
        auth: vars.auth,
        graphql: vars.graphql,
        oauth: vars.oauth,
        redis: vars.redis,
        observe: vars.observe,
        architecture: vars.architecture,
        ci: vars.ci,
        infra: vars.infra,
        httpPort: vars.port,
        repoUrl,
        template: templateId,
      });

      console.log('✔ Service created');
      if (githubHtmlUrl) {
        console.log(`✔ Repo: ${githubHtmlUrl}`);
        console.log('✔ CI/CD: .github/workflows/ci.yml (test + Docker; push image to GHCR on main)');
      }
      console.log('');
      console.log('→ Next steps:');
      console.log(`   cd ${slug}`);
      if (githubHtmlUrl) {
        console.log('   docker compose up');
        console.log('   # Workflow runs on GitHub; after merge to main: ghcr.io/<owner>/<repo>:latest');
      } else {
        console.log('   docker compose up');
      }
    });
}
