import { spawn } from 'node:child_process';

import { readProjectConfig } from '../lib/manifest.js';
import { run as runCmd, whichAvailable, runDockerComposeLogs } from '../lib/exec.js';
import { resolveServiceOrExit } from '../cli/service-root.js';

export function registerObserveCommands(program) {
  program
    .command('logs <name>')
    .description('Stream service logs (docker compose logs for the Compose service name)')
    .option('-n, --no-follow', 'Print existing logs once and exit (no stream)')
    .action(async (name, opts) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const { root, entry } = ctx;
      let slug = `${name}-service`;
      try {
        const cfg = await readProjectConfig(root);
        slug = cfg.serviceSlug || cfg.slug || slug;
      } catch {
        slug = entry?.slug || entry?.serviceSlug || slug;
      }
      await runDockerComposeLogs(root, slug, { follow: !opts.noFollow });
    });

  program
    .command('metrics <name>')
    .description('Fetch Prometheus metrics from the running service')
    .action(async (name) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const { root } = ctx;
      const m = await readProjectConfig(root);
      const port = m.httpPort || 3000;
      const bases = [`http://localhost:${port}/metrics`, `http://localhost:${port}/health/metrics`];
      let lastErr;
      for (const url of bases) {
        try {
          if (await whichAvailable('curl')) {
            await runCmd('curl', ['-sS', '-f', url], { cwd: root });
            return;
          }
          const res = await fetch(url);
          if (res.ok) {
            console.log(await res.text());
            return;
          }
        } catch (e) {
          lastErr = e;
        }
      }
      console.error(
        lastErr?.message || `Could not reach metrics on ${bases.join(' or ')} — is the service running?`,
      );
      process.exitCode = 1;
    });

  program
    .command('trace <name>')
    .description('Open Jaeger UI in the browser (run Jaeger locally if nothing listens there)')
    .action(async (name) => {
      const ctx = await resolveServiceOrExit(name);
      if (!ctx) return;
      const url = 'http://localhost:16686';
      console.log(
        `Tracing UI: ${url} (start Jaeger if needed, e.g. docker run jaegertracing/all-in-one:1.57 -p 16686:16686)`,
      );
      if (process.platform === 'darwin') {
        spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
      } else if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true, shell: false }).unref();
      } else {
        spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
      }
    });
}
