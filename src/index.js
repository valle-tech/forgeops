import { Command } from 'commander';
import { rm, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { cwd } from 'node:process';

import { ensureForgeOpsDir, customTemplatesDir, credentialsPath } from './lib/paths.js';
import {
  upsertService,
  removeService,
  getService,
  listServices,
  resolveServiceRoot,
} from './lib/registry.js';
import {
  scaffoldService,
  listBuiltinTemplateIds,
  builtinTemplatePath,
  copyTemplateIntoCustom,
  normalizeName,
} from './lib/scaffold.js';
import { run as runCmd, whichAvailable } from './lib/exec.js';
import { readManifest } from './lib/manifest.js';

export async function runCli(argv) {
  await ensureForgeOpsDir();

  const program = new Command();
  program.name('forgeops').description('Internal developer platform CLI').version('0.1.0');

  const create = program.command('create').description('Scaffold new resources');
  create
    .command('service <name>')
    .description('Generate a service from a template')
    .option('--language <lang>', 'node | go | python', 'node')
    .option('--db <db>', 'postgres | mongo | none', 'none')
    .option('--messaging <m>', 'kafka | rabbitmq | none', 'none')
    .option('--auth', 'Enable JWT auth scaffolding')
    .option('--ci <provider>', 'github | gitlab | none', 'github')
    .option('--infra <tool>', 'pulumi | none', 'none')
    .option('--output <dir>', 'Parent directory', cwd())
    .option('--repo <url>', 'Optional repository URL to record')
    .action(async (name, opts) => {
      const auth = Boolean(opts.auth);
      const { dest, slug, name: svcName, vars } = await scaffoldService({
        outDir: path.resolve(opts.output),
        name,
        language: opts.language,
        database: opts.db,
        messaging: opts.messaging,
        auth,
        ci: opts.ci,
        infra: opts.infra,
        repoUrl: opts.repo || '',
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
      });
      console.log(`✔ Service created: ${slug}`);
      console.log('✔ Ready to run: docker compose up');
    });

  const listCmd = program.command('list').description('List resources');
  listCmd
    .command('services')
    .description('List registered services')
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

  const infoCmd = program.command('info').description('Show details for a resource');
  infoCmd
    .command('service <name>')
    .description('Show language, DB, ports, repo')
    .action(async (name) => {
      const { root, entry } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      let m;
      try {
        m = await readManifest(root);
      } catch {
        m = entry;
      }
      console.log(`Name:     ${m.serviceName || entry?.name || name}`);
      console.log(`Slug:     ${m.serviceSlug || entry?.slug || ''}`);
      console.log(`Path:     ${root}`);
      console.log(`Language: ${m.language || entry?.language || ''}`);
      console.log(`DB:       ${m.database || entry?.database || 'none'}`);
      console.log(`Messaging:${m.messaging || entry?.messaging || 'none'}`);
      console.log(`Port:     ${m.httpPort ?? entry?.httpPort ?? ''}`);
      console.log(`Auth:     ${m.auth ?? entry?.auth ?? false}`);
      console.log(`CI:       ${m.ci || entry?.ci || ''}`);
      console.log(`Infra:    ${m.infra || entry?.infra || ''}`);
      if (m.repoUrl || entry?.repoUrl) console.log(`Repo:     ${m.repoUrl || entry?.repoUrl}`);
    });

  const delCmd = program.command('delete').description('Remove resources');
  delCmd
    .command('service <name>')
    .description('Remove local folder and registry entry')
    .option('--remove-repo', 'Attempt to delete remote repo (requires gh)', false)
    .action(async (name, opts) => {
      const reg = await getService(normalizeName(name) || name);
      const { root } = await resolveServiceRoot(name);
      const dir = reg?.path || root;
      if (!dir) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      if (opts.removeRepo && reg?.repoUrl) {
        const ok = await whichAvailable('gh');
        if (ok) {
          await runCmd('gh', ['repo', 'delete', reg.repoUrl, '--yes']).catch(() =>
            console.warn('gh repo delete failed; remove repo manually.'),
          );
        } else {
          console.warn('gh not found; skipping remote repo deletion.');
        }
      }
      await rm(dir, { recursive: true, force: true });
      await removeService(normalizeName(name) || name);
      console.log(`Removed service ${name} at ${dir}`);
    });

  program
    .command('deploy <name>')
    .description('Trigger CI/CD (GitHub Actions) or build image')
    .action(async (name) => {
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
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
        const m = await readManifest(root).catch(() => ({}));
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
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const m = await readManifest(root).catch(() => ({}));
      const tag = `${m.serviceSlug || name}-service:latest`;
      await runCmd('docker', ['build', '-t', tag, '.'], { cwd: root });
      console.log(`Built ${tag}`);
    });

  program
    .command('run <name>')
    .description('Run service with docker compose')
    .option('-d, --detach', 'Run in background', false)
    .action(async (name, opts) => {
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const args = ['compose', 'up'];
      if (opts.detach) args.push('-d');
      await runCmd('docker', args, { cwd: root });
    });

  program
    .command('provision <name>')
    .description('Apply Pulumi infrastructure for the service')
    .action(async (name) => {
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const infra = path.join(root, 'infra');
      if (!(await whichAvailable('pulumi'))) {
        console.error('pulumi CLI not found. Install from https://www.pulumi.com/docs/install/');
        process.exitCode = 1;
        return;
      }
      await runCmd('pulumi', ['up', '--yes'], { cwd: infra });
    });

  program
    .command('destroy <name>')
    .description('Destroy Pulumi infrastructure for the service')
    .action(async (name) => {
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const infra = path.join(root, 'infra');
      if (!(await whichAvailable('pulumi'))) {
        console.error('pulumi CLI not found.');
        process.exitCode = 1;
        return;
      }
      await runCmd('pulumi', ['destroy', '--yes'], { cwd: infra });
    });

  program
    .command('logs <name>')
    .description('Tail docker compose logs')
    .option('-f, --follow', 'Follow', true)
    .action(async (name, opts) => {
      const { root, entry } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const slug = (await readManifest(root).catch(() => entry))?.serviceSlug || `${name}-service`;
      const args = ['compose', 'logs'];
      if (opts.follow) args.push('-f');
      args.push(slug);
      await runCmd('docker', args, { cwd: root });
    });

  program
    .command('metrics <name>')
    .description('Fetch Prometheus metrics from the running service')
    .action(async (name) => {
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const m = await readManifest(root);
      const port = m.httpPort || 3000;
      const bases = [`http://127.0.0.1:${port}/metrics`, `http://127.0.0.1:${port}/health/metrics`];
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
      console.error(lastErr?.message || `Could not reach metrics on ${bases.join(' or ')} — is the service running?`);
      process.exitCode = 1;
    });

  program
    .command('trace <name>')
    .description('Open Jaeger UI (compose exposes 16686 for Node templates)')
    .action(async (name) => {
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const url = 'http://localhost:16686';
      console.log(`Tracing UI: ${url}`);
      if (process.platform === 'darwin') {
        spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
      } else if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true, shell: false }).unref();
      } else {
        spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
      }
    });

  program
    .command('test <name>')
    .description('Run unit/integration tests in the service directory')
    .action(async (name) => {
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const m = await readManifest(root);
      if (m.language === 'go') await runCmd('go', ['test', './...'], { cwd: root });
      else if (m.language === 'python') await runCmd('pytest', ['-q'], { cwd: root });
      else await runCmd('npm', ['run', 'test', '--if-present'], { cwd: root });
    });

  program
    .command('lint <name>')
    .description('Run linters for the service')
    .action(async (name) => {
      const { root } = await resolveServiceRoot(name);
      if (!root) {
        console.error(`Unknown service: ${name}`);
        process.exitCode = 1;
        return;
      }
      const m = await readManifest(root);
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

  program
    .command('login')
    .description('Store platform credentials locally (stub for future API auth)')
    .option('--email <email>')
    .option('--token <token>')
    .action(async (opts) => {
      let email = opts.email;
      let token = opts.token;
      if (!email) {
        email = await promptLine('Email: ');
      }
      if (!token) {
        token = await promptLine('Token: ', true);
      }
      const cred = { email, token, savedAt: new Date().toISOString() };
      await writeFile(credentialsPath(), JSON.stringify(cred, null, 2), 'utf8');
      console.log('Credentials saved to ~/.forgeops/credentials.json');
    });

  program
    .command('whoami')
    .description('Show saved login identity')
    .action(async () => {
      try {
        const raw = await readFile(credentialsPath(), 'utf8');
        const c = JSON.parse(raw);
        console.log(`Email: ${c.email || '(none)'}`);
        console.log(`Token: ${c.token ? '********' + String(c.token).slice(-4) : '(none)'}`);
      } catch {
        console.log('Not logged in. Run forgeops login');
      }
    });

  await program.parseAsync(argv);
}

function promptLine(q, hidden = false) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(q);
    if (hidden && stdin.isTTY) {
      stdin.setRawMode(true);
    }
    let buf = '';
    const onData = (b) => {
      const s = b.toString('utf8');
      if (hidden && stdin.isTTY) {
        for (const ch of s) {
          if (ch === '\n' || ch === '\r' || ch === '\u0004') {
            cleanup();
            stdin.setRawMode(false);
            stdout.write('\n');
            resolve(buf);
            return;
          }
          buf += ch;
        }
        return;
      }
      buf += s;
      if (buf.endsWith('\n')) {
        cleanup();
        resolve(buf.trim());
      }
    };
    function cleanup() {
      stdin.off('data', onData);
    }
    stdin.on('data', onData);
  });
}
