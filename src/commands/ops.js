import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { readProjectConfig } from '../lib/manifest.js';
import { run as runCmd, whichAvailable, runDockerComposeUp } from '../lib/exec.js';
import { resolveServiceOrExit } from '../cli/service-root.js';

export function registerOpsCommands(program) {
  program
    .command('deploy <name>')
    .description('Trigger CI/CD (GitHub Actions) or build image')
    .action(async (name) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const { root } = ctx;
      const gh = await whichAvailable('gh');
      const wf = path.join(root, '.github', 'workflows', 'ci.yml');
      try {
        await readFile(wf, 'utf8');
        if (gh) {
          console.log('To trigger CI on GitHub: push this repo, then run: gh workflow run ci.yml');
        } else {
          console.log('GitHub CLI not installed. Push the repo and workflows will run on GitHub.');
        }
      } catch {
        console.log('No GitHub workflow found; building Docker image locally instead.');
      }
      if (await whichAvailable('docker')) {
        const m = await readProjectConfig(root).catch(() => ({}));
        const tag = `${m.serviceSlug || name}:latest`;
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
