import { access, constants, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveServiceOrExit } from '../cli/service-root.js';
import {
  appendForgeopsFeature,
  mergeEnvFile,
  patchForgeopsJson,
  readProjectConfig,
} from '../lib/manifest.js';
import { FEATURE_IDS } from '../lib/features.js';
import { regenerateDockerCompose, writeMessagingExtras } from '../lib/scaffold.js';

async function writeLoggingDoc(root) {
  const doc = path.join(root, 'FORGEOPS_LOGGING.md');
  try {
    await access(doc, constants.F_OK);
    return;
  } catch {
  }
  const body = `# Structured logging

Forgeops templates emit JSON logs (level, service, message, requestId, …). Ensure HTTP middleware / interceptors stay enabled.
`;
  await writeFile(doc, body, 'utf8');
}

export function registerAddCommands(program) {
  const add = program.command('add').description('Add capabilities to an existing Forgeops service');
  add
    .command('feature <service> <feature>')
    .description('Inject config: logging (env + doc), kafka or rabbitmq (compose + .env + manifest)')
    .action(async (service, feature) => {
      const f = String(feature || '').toLowerCase();
      if (!FEATURE_IDS.includes(f)) {
        console.error(`Unknown feature "${feature}". Use: ${FEATURE_IDS.join(', ')}`);
        process.exitCode = 1;
        return;
      }

      const ctx = await resolveServiceOrExit(service);
      if (!ctx) return;
      const { root } = ctx;

      let cfg;
      try {
        cfg = await readProjectConfig(root);
      } catch (e) {
        console.error(e.message || String(e));
        process.exitCode = 1;
        return;
      }

      const slug = cfg.serviceSlug || cfg.slug || 'app';

      if (f === 'logging') {
        await appendForgeopsFeature(root, 'logging');
        await mergeEnvFile(root, { LOG_FORMAT: 'json' });
        await writeLoggingDoc(root);
        console.log(`✔ feature logging → ${root}`);
        console.log('  merged LOG_FORMAT=json into .env if missing; see FORGEOPS_LOGGING.md');
        return;
      }

      if (f === 'kafka') {
        await patchForgeopsJson(root, { messaging: 'kafka' });
        await appendForgeopsFeature(root, 'kafka');
        await mergeEnvFile(root, {
          KAFKA_BROKERS: 'localhost:9092',
          KAFKA_CLIENT_ID: slug,
        });
        await writeMessagingExtras(root, { messaging: 'kafka', serviceSlug: slug });
        await regenerateDockerCompose(root);
        console.log(`✔ feature kafka → ${root}`);
        console.log('  .forgeops.json messaging=kafka, .env, docker-compose.yml, FORGEOPS_MESSAGING.md');
        return;
      }

      if (f === 'rabbitmq') {
        await patchForgeopsJson(root, { messaging: 'rabbitmq' });
        await appendForgeopsFeature(root, 'rabbitmq');
        await mergeEnvFile(root, {
          RABBITMQ_URL: 'amqp://guest:guest@localhost:5672/',
        });
        await writeMessagingExtras(root, { messaging: 'rabbitmq', serviceSlug: slug });
        await regenerateDockerCompose(root);
        console.log(`✔ feature rabbitmq → ${root}`);
        console.log('  .forgeops.json messaging=rabbitmq, .env, docker-compose.yml, FORGEOPS_MESSAGING.md');
      }
    });
}
