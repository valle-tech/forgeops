import { resolveServiceRoot } from '../lib/registry.js';
import { readProjectConfig } from '../lib/manifest.js';

export function registerInfoCommands(program) {
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
        m = await readProjectConfig(root);
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
      if (m.template || entry?.template) console.log(`Template: ${m.template || entry?.template}`);
      if (m.repoUrl || entry?.repoUrl) console.log(`Repo:     ${m.repoUrl || entry?.repoUrl}`);
    });
}
