import { readProjectConfig } from '../lib/manifest.js';
import { run as runCmd, whichAvailable } from '../lib/exec.js';
import { resolveServiceOrExit } from '../cli/service-root.js';

export function registerQualityCommands(program) {
  program
    .command('test <name>')
    .description('Run unit/integration tests in the service directory')
    .action(async (name) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const { root } = ctx;
      const m = await readProjectConfig(root);
      if (m.language === 'go') await runCmd('go', ['test', './...'], { cwd: root });
      else if (m.language === 'python') await runCmd('pytest', ['-q'], { cwd: root });
      else await runCmd('npm', ['run', 'test', '--if-present'], { cwd: root });
    });

  program
    .command('lint <name>')
    .description('Run linters for the service')
    .action(async (name) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const { root } = ctx;
      const m = await readProjectConfig(root);
      if (m.language === 'go') {
        if (await whichAvailable('golangci-lint')) await runCmd('golangci-lint', ['run'], { cwd: root });
        else await runCmd('go', ['vet', './...'], { cwd: root });
      } else if (m.language === 'python') {
        if (await whichAvailable('ruff')) await runCmd('ruff', ['check', '.'], { cwd: root });
        else console.log('Install ruff for Python linting: pip install ruff');
      } else {
        await runCmd('npm', ['run', 'lint', '--if-present'], { cwd: root });
      }
    });
}
