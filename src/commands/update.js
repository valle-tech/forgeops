import { resolveServiceOrExit } from '../cli/service-root.js';
import { readProjectConfig } from '../lib/manifest.js';
import {
  collectMissingTemplatePaths,
  mergeTemplateMissingFiles,
  projectVarsFromManifest,
  replacements,
  resolveTemplateSource,
  regenerateDockerCompose,
} from '../lib/scaffold.js';

export function registerUpdateCommands(program) {
  program
    .command('update <name>')
    .description('Sync missing files from the service template; refresh docker-compose from .forgeops.json')
    .option('--dry-run', 'List files that would be added without writing')
    .action(async (name, opts) => {
      const ctx = await resolveServiceOrExit(name);
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

      const templateId = cfg.template;
      if (!templateId) {
        console.error('No template id in .forgeops.json; cannot update.');
        process.exitCode = 1;
        return;
      }

      let src;
      try {
        src = await resolveTemplateSource(templateId);
      } catch (e) {
        console.error(e.message || String(e));
        process.exitCode = 1;
        return;
      }

      const vars = projectVarsFromManifest(cfg);
      const rep = replacements(vars);
      const missing = await collectMissingTemplatePaths(src.path, root);

      if (opts.dryRun) {
        if (!missing.length) {
          console.log('No missing template files (tree already includes every template path).');
        } else {
          console.log(`Would add ${missing.length} file(s) from ${templateId}:`);
          for (const m of missing) console.log(`  + ${m}`);
        }
        console.log('Would also regenerate docker-compose.yml from .forgeops.json.');
        return;
      }

      await mergeTemplateMissingFiles(src.path, root, rep);
      await regenerateDockerCompose(root);

      console.log(`✔ Updated ${root} from template ${templateId}`);
      console.log(
        missing.length
          ? `  Copied ${missing.length} missing file(s); docker-compose.yml refreshed.`
          : '  No missing files; docker-compose.yml refreshed from .forgeops.json.',
      );
    });
}
