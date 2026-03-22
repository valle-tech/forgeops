import { rm } from 'node:fs/promises';
import path from 'node:path';

import { resolveServiceOrExit } from '../cli/service-root.js';
import {
  patchForgeopsJson,
  readProjectConfig,
  removeEnvKeys,
  removeForgeopsFeature,
} from '../lib/manifest.js';
import { FEATURE_IDS } from '../lib/features.js';
import { regenerateDockerCompose } from '../lib/scaffold.js';

export function registerRemoveCommands(program) {
  const remove = program.command('remove').description('Remove capabilities from a Forgeops service');
  remove
    .command('feature <service> <feature>')
    .description('Reverse add feature: logging, kafka, or rabbitmq')
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

      await removeForgeopsFeature(root, f);

      if (f === 'logging') {
        await removeEnvKeys(root, ['LOG_FORMAT']);
        await rm(path.join(root, 'FORGEOPS_LOGGING.md'), { force: true }).catch(() => {});
        console.log(`✔ removed feature logging → ${root}`);
        return;
      }

      if (f === 'kafka') {
        if (cfg.messaging === 'kafka') {
          await patchForgeopsJson(root, { messaging: 'none' });
        }
        await removeEnvKeys(root, ['KAFKA_BROKERS', 'KAFKA_CLIENT_ID']);
        await rm(path.join(root, 'FORGEOPS_MESSAGING.md'), { force: true }).catch(() => {});
        await regenerateDockerCompose(root);
        console.log(`✔ removed feature kafka → ${root}`);
        return;
      }

      if (f === 'rabbitmq') {
        if (cfg.messaging === 'rabbitmq') {
          await patchForgeopsJson(root, { messaging: 'none' });
        }
        await removeEnvKeys(root, ['RABBITMQ_URL']);
        await rm(path.join(root, 'FORGEOPS_MESSAGING.md'), { force: true }).catch(() => {});
        await regenerateDockerCompose(root);
        console.log(`✔ removed feature rabbitmq → ${root}`);
      }
    });
}
