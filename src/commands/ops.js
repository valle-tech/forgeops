import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { readProjectConfig } from '../lib/manifest.js';
import { run as runCmd, whichAvailable, runDockerComposeUp } from '../lib/exec.js';
import { deployPulumiService, normalizeDeployEnvironment, triggerGitHubWorkflow } from '../lib/deploy.js';
import { resolveServiceOrExit } from '../cli/service-root.js';

export function registerOpsCommands(program) {
  program
    .command('deploy <name>')
    .description('Deploy the service; Pulumi-backed services roll out to AWS ECS, others fall back to CI/local image build')
    .option('--env <environment>', 'Deploy target environment (dev | staging | prod)', 'dev')
    .option('--wait', 'Wait for ECS rollout and verify the deployed health endpoint', false)
    .option('--image-tag <tag>', 'Override the image tag used for a Pulumi-backed deployment')
    .option('--skip-ci', 'When falling back to CI mode, skip triggering GitHub Actions', false)
    .action(async (name, opts) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const { root } = ctx;
      const env = normalizeDeployEnvironment(opts.env);
      const manifest = await readProjectConfig(root).catch(() => ({}));

      if (String(manifest.infra || '').toLowerCase() === 'pulumi') {
        const result = await deployPulumiService(root, manifest, {
          env,
          wait: Boolean(opts.wait),
          imageTag: opts.imageTag,
        });
        console.log(`Deployed ${manifest.serviceName || manifest.name || name} to ${result.env} using ${result.imageUri}`);
        if (result.serviceUrl) console.log(`Service URL: ${result.serviceUrl}`);
        return;
      }

      const gh = await whichAvailable('gh');
      const wf = path.join(root, '.github', 'workflows', 'ci.yml');
      try {
        await readFile(wf, 'utf8');
        if (gh && !opts.skipCi) {
          try {
            const triggered = await triggerGitHubWorkflow(root, env);
            if (triggered) console.log(`Triggered GitHub Actions workflow ci.yml for ${env}`);
          } catch {
            console.log(`Could not trigger via gh; push to GitHub to run CI, or run: gh workflow run ci.yml -f environment=${env}`);
          }
        } else {
          console.log('GitHub CLI not installed or CI trigger skipped. Push the repo to run workflows on GitHub.');
        }
      } catch {
        console.log('No GitHub workflow found; building Docker image locally instead.');
      }
      if (await whichAvailable('docker')) {
        const tag = `${manifest.serviceSlug || name}:latest`;
        await runCmd('docker', ['build', '-t', tag, '.'], { cwd: root });
        console.log(`Built image ${tag}`);
      } else {
        console.warn('docker not found; skipping image build.');
      }
    });

  program
    .command('build <name>')
    .description('Build Docker image locally')
    .action(async (name) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const { root } = ctx;
      const m = await readProjectConfig(root).catch(() => ({}));
      const tag = `${m.serviceSlug || name}-service:latest`;
      await runCmd('docker', ['build', '-t', tag, '.'], { cwd: root });
      console.log(`Built ${tag}`);
    });

  program
    .command('run <name>')
    .description('Start the service from its directory using docker compose (reads .forgeops.json path)')
    .option('-d, --detach', 'Run in background')
    .action(async (name, opts) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const { root } = ctx;
      console.log(`→ Compose in ${root}`);
      await runDockerComposeUp(root, { detach: Boolean(opts.detach) });
    });
}
